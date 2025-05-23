import { App, MarkdownView, Notice } from 'obsidian';
import HugoBlowfishExporter from './plugin';
import {
    TranslationValidator,
    TranslationApiClient,
    TranslationFileOperations,
    DirectExportHelper,
    DiffDetector,
    ParagraphMatcher,
    DiffTranslator,
    FileUpdater
} from '../components/translators';
import type {
    Paragraph,
    TranslatedParagraph,
    ParagraphUpdate,
    ParagraphInsertion
} from '../components/translators';

export class Translator {
    private validator: TranslationValidator;
    private apiClient: TranslationApiClient;
    private fileOps: TranslationFileOperations;
    private directExport: DirectExportHelper;
    private diffDetector: DiffDetector;
    private paragraphMatcher: ParagraphMatcher;
    private diffTranslator: DiffTranslator;
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
        this.paragraphMatcher = new ParagraphMatcher(plugin);
        this.diffTranslator = new DiffTranslator(plugin);
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

            // 1. 检测文件变化
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

            // 4. 创建英文文件备份
            notice.setMessage('正在创建备份...');
            const backupPath = await this.fileUpdater.createBackup(englishFilePath);

            // 5. 读取文件内容并分析段落
            notice.setMessage('正在分析段落变化...');
            const chineseContent = await this.app.vault.read(currentFile);
            const englishContent = await this.readFileContent(englishFilePath);

            const chineseParagraphs = this.paragraphMatcher.splitIntoParagraphs(chineseContent);
            const englishParagraphs = this.paragraphMatcher.splitIntoParagraphs(englishContent);

            // 6. 识别修改和新增的段落
            const { updatedParagraphs, newParagraphs } = this.identifyChangedParagraphs(
                chineseParagraphs,
                englishParagraphs,
                diffResult.changes
            );

            if (updatedParagraphs.length === 0 && newParagraphs.length === 0) {
                notice.hide();
                new Notice('没有检测到需要翻译的段落变化');
                return;
            }

            // 7. 翻译修改的段落
            notice.setMessage('正在翻译修改的段落...');
            const translatedUpdates: TranslatedParagraph[] = [];
            const translatedNews: TranslatedParagraph[] = [];

            if (updatedParagraphs.length > 0) {
                const updates = await this.diffTranslator.translateModifiedParagraphs(updatedParagraphs);
                translatedUpdates.push(...updates);
            }

            if (newParagraphs.length > 0) {
                const news = await this.diffTranslator.translateModifiedParagraphs(newParagraphs);
                translatedNews.push(...news);
            }

            // 8. 更新英文文件
            notice.setMessage('正在更新英文文件...');
            
            // 处理段落更新
            if (translatedUpdates.length > 0) {
                const updates: ParagraphUpdate[] = translatedUpdates.map(translated => {
                    const matchIndex = this.paragraphMatcher.findMatchingParagraph(translated, englishParagraphs);
                    if (matchIndex === -1) {
                        throw new Error(`无法找到段落的对应位置: ${translated.content.substring(0, 50)}...`);
                    }
                    return {
                        targetParagraph: englishParagraphs[matchIndex],
                        translatedParagraph: translated
                    };
                });
                
                await this.fileUpdater.updateTargetFile(englishFilePath, updates);
            }

            // 处理新段落插入
            if (translatedNews.length > 0) {
                const insertions: ParagraphInsertion[] = translatedNews.map(translated => {
                    // 根据在中文文件中的位置确定插入位置
                    const insertAfterLine = this.determineInsertionPoint(translated, chineseParagraphs, englishParagraphs);
                    return {
                        insertAfterLine,
                        translatedParagraph: translated
                    };
                });
                
                await this.fileUpdater.insertNewParagraphs(englishFilePath, insertions);
            }

            notice.hide();
            new Notice(`✅ 差异翻译完成！\n已更新文件: ${englishFilePath}\n备份文件: ${backupPath}`, 8000);

        } catch (error) {
            if (notice) {
                notice.hide();
            }
            new Notice(`❌ 差异翻译失败: ${error.message}`, 5000);
            console.error('Difference translation error:', error);
        }
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

    /**
     * 识别变化的段落
     * @param chineseParagraphs 中文段落
     * @param englishParagraphs 英文段落
     * @param changes git差异变化
     * @returns 更新和新增的段落
     */
    private identifyChangedParagraphs(
        chineseParagraphs: Paragraph[],
        englishParagraphs: Paragraph[],
        changes: any[]
    ): { updatedParagraphs: Paragraph[], newParagraphs: Paragraph[] } {
        const updatedParagraphs: Paragraph[] = [];
        const newParagraphs: Paragraph[] = [];

        for (const paragraph of chineseParagraphs) {
            // 检查这个段落是否在git变化范围内
            const isInChangeRange = changes.some(change =>
                paragraph.startLine >= change.newStart &&
                paragraph.endLine <= change.newStart + (change.newCount || 1)
            );

            if (isInChangeRange) {
                // 尝试在英文文件中找到对应段落
                const matchIndex = this.paragraphMatcher.findMatchingParagraph(paragraph, englishParagraphs);
                
                if (matchIndex !== -1) {
                    // 找到对应段落，标记为更新
                    updatedParagraphs.push(paragraph);
                } else {
                    // 没找到对应段落，标记为新增
                    newParagraphs.push(paragraph);
                }
            }
        }

        return { updatedParagraphs, newParagraphs };
    }

    /**
     * 确定新段落的插入位置
     * @param newParagraph 新段落
     * @param chineseParagraphs 中文段落列表
     * @param englishParagraphs 英文段落列表
     * @returns 插入位置（行号）
     */
    private determineInsertionPoint(
        newParagraph: Paragraph,
        chineseParagraphs: Paragraph[],
        englishParagraphs: Paragraph[]
    ): number {
        // 找到新段落在中文文件中的位置
        const newIndex = chineseParagraphs.findIndex(p => p === newParagraph);
        
        if (newIndex === 0) {
            // 插入到文件开头
            return 0;
        }
        
        if (newIndex === chineseParagraphs.length - 1) {
            // 插入到文件末尾
            return englishParagraphs.length > 0 ? englishParagraphs[englishParagraphs.length - 1].endLine : 0;
        }
        
        // 找到前一个段落在英文文件中的对应位置
        const prevParagraph = chineseParagraphs[newIndex - 1];
        const prevMatchIndex = this.paragraphMatcher.findMatchingParagraph(prevParagraph, englishParagraphs);
        
        if (prevMatchIndex !== -1) {
            return englishParagraphs[prevMatchIndex].endLine;
        }
        
        // 如果找不到前一个段落的对应位置，尝试找下一个段落
        const nextParagraph = chineseParagraphs[newIndex + 1];
        const nextMatchIndex = this.paragraphMatcher.findMatchingParagraph(nextParagraph, englishParagraphs);
        
        if (nextMatchIndex !== -1) {
            return englishParagraphs[nextMatchIndex].startLine - 1;
        }
        
        // 默认插入到文件末尾
        return englishParagraphs.length > 0 ? englishParagraphs[englishParagraphs.length - 1].endLine : 0;
    }
}