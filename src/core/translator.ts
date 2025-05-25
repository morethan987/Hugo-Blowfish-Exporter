import { App, MarkdownView, Notice } from 'obsidian';
import HugoBlowfishExporter from './plugin';
import {
    TranslationValidator,
    TranslationApiClient,
    TranslationFileOperations,
    DirectExportHelper,
    DiffDetector,
    FileUpdater
} from '../components/translators';
import type {
    Paragraph,
    ParagraphUpdate,
    TranslatedParagraph
} from '../components/translators';

export class Translator {
    private validator: TranslationValidator;
    private apiClient: TranslationApiClient;
    private fileOps: TranslationFileOperations;
    private directExport: DirectExportHelper;
    private diffDetector: DiffDetector;
    private fileUpdater: FileUpdater;

    constructor(
        private app: App,
        private plugin: HugoBlowfishExporter
    ) {
        this.validator = new TranslationValidator(plugin);
        this.apiClient = new TranslationApiClient(plugin);
        this.fileOps = new TranslationFileOperations(plugin);
        this.directExport = new DirectExportHelper(plugin);
        this.diffDetector = new DiffDetector(plugin);
        this.fileUpdater = new FileUpdater(plugin, app);
    }

    async translateCurrentNote() {
        let notice: Notice | null = null;
        
        try {
            // 验证配置
            if (!this.validator.validateConfiguration()) {
                return;
            }

            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) {
                new Notice('没有打开的文件');
                return;
            }

            const currentFile = activeView.file;
            if (!currentFile) {
                new Notice('无法获取当前文件');
                return;
            }

            // 获取文件的元数据和内容
            const metadata = this.app.metadataCache.getFileCache(currentFile);
            const content = await this.app.vault.read(currentFile);

            notice = new Notice('开始翻译...', 0);

            // 翻译标题
            notice.setMessage('正在翻译标题...');
            const translatedTitle = await this.apiClient.translateTitle(currentFile.basename);

            // 翻译内容
            notice.setMessage('正在翻译内容...');
            const translatedContent = await this.apiClient.translateContent(content);

            // 保存翻译文件
            notice.setMessage('正在保存翻译结果...');
            const translatedFilePath = this.fileOps.saveTranslatedFile(translatedTitle, translatedContent);
            
            notice.hide();
            new Notice(`✅ 翻译完成！\n文件已保存至:\n${translatedFilePath}`, 5000);

            // 检查是否需要直接导出
            if (this.plugin.settings.directExportAfterTranslation) {
                await this.directExport.executeDirectExport(translatedContent, metadata, translatedTitle);
            }
        } catch (error) {
            if (notice) {
                notice.hide();
            }
            new Notice(`❌ 翻译失败: ${error.message}`, 5000);
            console.error('Translation error:', error);
        }
    }

    async translateDifference() {
        let notice: Notice | null = null;
        
        try {
            // 验证配置
            if (!this.validator.validateConfiguration()) {
                return;
            }

            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) {
                new Notice('没有打开的文件');
                return;
            }

            const currentFile = activeView.file;
            if (!currentFile) {
                new Notice('无法获取当前文件');
                return;
            }

            notice = new Notice('开始差异翻译...', 0);

            // 1. 检测文件变化 TODO 这里git检测需要改进
            notice.setMessage('正在检测文件变化...');
            const diffResult = await this.diffDetector.detectGitDiff(currentFile.path);
            
            if (!diffResult.hasChanges) {
                notice.hide();
                new Notice('当前文件没有检测到变化');
                return;
            }

            // 2. 确定英文翻译文件路径
            const englishFilePath = await this.determineEnglishFilePath(currentFile.path);
            if (!englishFilePath) {
                notice.hide();
                new Notice('无法确定对应的英文翻译文件路径');
                return;
            }

            // 3. 检查英文文件是否存在
            const canUpdate = await this.fileUpdater.canSafelyUpdate(englishFilePath);
            if (!canUpdate) {
                notice.hide();
                new Notice(`英文翻译文件不存在: ${englishFilePath}`);
                return;
            }

            // 4. 读取并更新文件内容
            notice.setMessage('正在更新文件内容...');
            const chineseContent = await this.app.vault.read(currentFile);
            const englishContent = await this.readFileContent(englishFilePath);

            const chineseLines = chineseContent.split(/\r?\n/);
            const englishLines = englishContent.split(/\r?\n/);
            const updatedEnglishLines = [...englishLines];

            // 5. 遍历每个变更，直接翻译修改的行
            for (const change of diffResult.changes) {
                const { newStart, newCount, addedLines } = change;
                
                // 处理新增和修改的行
                for (let i = 0; i < newCount; i++) {
                    const lineIndex = newStart + i - 1; // 转换为0-based索引
                    const lineContent = chineseLines[lineIndex];
                    
                    // 处理空行
                    if (!lineContent || !lineContent.trim()) {
                        // 确保目标数组长度足够
                        while (updatedEnglishLines.length <= lineIndex) {
                            updatedEnglishLines.push('');
                        }
                        updatedEnglishLines[lineIndex] = '';
                        continue;
                    }

                    // 检查行是否包含特殊标记（如frontmatter、代码块等）
                    if (this.shouldSkipTranslation(lineContent)) {
                        // 确保目标数组长度足够
                        while (updatedEnglishLines.length <= lineIndex) {
                            updatedEnglishLines.push('');
                        }
                        updatedEnglishLines[lineIndex] = lineContent;
                        continue;
                    }

                    try {
                        notice.setMessage(`正在翻译第 ${lineIndex + 1} 行...`);
                        const translated = await this.apiClient.translateContent(lineContent);
                        // 确保目标数组长度足够
                        while (updatedEnglishLines.length <= lineIndex) {
                            updatedEnglishLines.push('');
                        }
                        updatedEnglishLines[lineIndex] = translated;
                    } catch (error) {
                        console.warn(`翻译第 ${lineIndex + 1} 行失败:`, error);
                        // 确保目标数组长度足够
                        while (updatedEnglishLines.length <= lineIndex) {
                            updatedEnglishLines.push('');
                        }
                        updatedEnglishLines[lineIndex] = lineContent;
                    }
                }
            }

            // 6. 构造更新并写入内容
            notice.setMessage('正在保存更新...');
            const updates: ParagraphUpdate[] = diffResult.changes.map(change => {
                const { newStart, newCount } = change;
                // 创建一个表示整个修改区域的段落对象
                const targetParagraph: Paragraph = {
                    startLine: newStart,
                    endLine: newStart + newCount - 1,
                    content: englishLines.slice(newStart - 1, newStart + newCount - 1).join('\n'),
                    type: 'text'
                };
                
                // 创建翻译后的段落对象
                const translatedContent = updatedEnglishLines.slice(newStart - 1, newStart + newCount - 1).join('\n');
                const translatedParagraph: TranslatedParagraph = {
                    ...targetParagraph,
                    translatedContent
                };
                
                return {
                    targetParagraph,
                    translatedParagraph
                };
            });

            await this.fileUpdater.updateTargetFile(englishFilePath, updates);

            notice.hide();
            new Notice(`✅ 差异翻译完成！\n已更新文件: ${englishFilePath}`, 8000);

        } catch (error) {
            if (notice) {
                notice.hide();
            }
            new Notice(`❌ 差异翻译失败: ${error.message}`, 5000);
            console.error('Difference translation error:', error);
        }
    }

    /**
     * 检查是否应该跳过翻译
     * @param line 行内容
     * @returns 是否跳过
     */
    private shouldSkipTranslation(line: string): boolean {
        // 跳过frontmatter
        if (line.trim() === '---') return true;
        
        // 跳过代码块标记
        if (line.startsWith('```')) return true;
        
        // 跳过HTML注释
        if (line.trim().startsWith('<!--') || line.trim().endsWith('-->')) return true;
        
        // 跳过纯链接、图片等Markdown语法
        if (/^(!?\[.*?\]\(.*?\))$/.test(line.trim())) return true;
        
        return false;
    }

    /**
     * 确定英文翻译文件路径
     * @param chineseFilePath 中文文件路径
     * @returns 英文文件路径
     */
    private async determineEnglishFilePath(chineseFilePath: string): Promise<string | null> {
        // 目标英文文件的文件夹路径就是this.plugin.settings.translatedExportPath，这是绝对路径
        // 英文文件和中文文件的文件名都用同样的数字开头，例如：
        // 中文文件： 21.中文名字.md
        // 英文文件： 21.English name.md

        const path = require('path');
        const fs = require('fs');
        
        // 获取中文文件的文件名（不包含路径）
        const chineseFileName = path.basename(chineseFilePath);
        
        // 提取文件名开头的数字
        const numberMatch = chineseFileName.match(/^(\d+)\./);
        if (!numberMatch) {
            return null;
        }
        
        const fileNumber = numberMatch[1];
        const translatedExportPath = this.plugin.settings.translatedExportPath;
        
        if (!translatedExportPath) {
            return null;
        }
        
        try {
            // 读取翻译文件目录下的所有文件
            const files = fs.readdirSync(translatedExportPath);
            
            // 寻找以相同数字开头的英文文件
            const englishFile = files.find((file: string) => {
                return file.startsWith(`${fileNumber}.`) && file.endsWith('.md');
            });
            
            if (englishFile) {
                return path.join(translatedExportPath, englishFile);
            }
        } catch (error) {
            console.warn('无法读取翻译文件目录:', error);
        }
        
        return null;
    }

    /**
     * 读取文件内容
     * @param filePath 文件路径
     * @returns 文件内容
     */
    private async readFileContent(filePath: string): Promise<string> {
        const fs = require('fs').promises;
        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (error) {
            throw new Error(`无法读取文件: ${filePath} - ${error.message}`);
        }
    }

}