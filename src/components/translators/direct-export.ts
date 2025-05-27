import { App, Notice, MarkdownView } from 'obsidian';
import HugoBlowfishExporter from 'src/core/plugin';
import { TranslationFileOperations } from './file-operations';

/**
 * 直接导出助手
 */
export class DirectExportHelper {
    private fileOps: TranslationFileOperations;

    constructor(
        private plugin: HugoBlowfishExporter,
        private app?: App
    ) {
        this.fileOps = new TranslationFileOperations(plugin);
    }

    /**
     * 执行直接导出
     * @param translatedContent 翻译后的内容
     * @param metadata 文件元数据
     * @param translatedTitle 翻译后的标题
     */
    async executeDirectExport(translatedContent: string, metadata: any, translatedTitle: string): Promise<void> {
        const notice = new Notice('正在执行直接导出...', 0);

        try {
            // 验证slug属性
            if (!this.validateSlug(metadata)) {
                notice.hide();
                new Notice('⚠️ 当前文件缺少 slug 属性，请在 frontmatter 中添加 slug 字段', 4000);
                return;
            }

            // 创建slug目录
            const slugDir = this.fileOps.createSlugDirectory(metadata.frontmatter.slug);

            // 处理内容
            notice.setMessage('正在处理内容...');
            const modifiedContent = await this.plugin.exporter.modifyContent(translatedContent, 'single');

            // 获取文件名并保存
            const directExportFileName = this.fileOps.getDirectExportFileName();
            notice.setMessage('正在保存文件...');
            const outputPath = this.fileOps.saveDirectExportFile(slugDir, directExportFileName, modifiedContent);

            // 选择博客封面
            notice.setMessage('正在选择博客封面...');
            await this.plugin.coverChooser.chooseCover(this.plugin.settings, slugDir);

            notice.hide();
            new Notice(`✅ 直接导出成功!\n文件已保存至:\n${outputPath}`, 5000);
        } catch (error) {
            notice.hide();
            new Notice(`❌ 直接导出失败: ${error.message}`, 4000);
            console.error('Direct export error:', error);
        }
    }

    /**
     * 执行差异翻译后的直接导出
     * @param englishFilePath 英文文件路径
     */
    async executeDirectExportFromFile(englishFilePath: string): Promise<void> {
        if (!this.app) {
            throw new Error('App 实例未初始化，无法执行文件直接导出');
        }

        const notice = new Notice('正在执行直接导出...', 0);

        try {
            console.debug('📤 [DirectExportHelper] 开始执行差异翻译后的直接导出...');
            
            // 读取更新后的文件内容
            notice.setMessage('正在读取文件内容...');
            const updatedContent = await this.readFileContent(englishFilePath);
            console.debug('📄 [DirectExportHelper] 文件内容长度:', updatedContent.length);
            
            // 获取当前文件的元数据
            notice.setMessage('正在获取文件元数据...');
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView || !activeView.file) {
                throw new Error('无法获取当前文件');
            }
            
            const metadata = this.app.metadataCache.getFileCache(activeView.file);
            console.debug('📋 [DirectExportHelper] 获取元数据:', metadata?.frontmatter);
            
            // 从文件路径提取标题（去掉路径和扩展名）
            const fileName = englishFilePath.split(/[\\/]/).pop() || '';
            const translatedTitle = fileName.replace(/\.(md|markdown)$/i, '');
            console.debug('📝 [DirectExportHelper] 提取标题:', translatedTitle);
            
            // 执行直接导出
            notice.setMessage('正在执行导出...');
            await this.executeDirectExport(updatedContent, metadata, translatedTitle);
            
            console.debug('✅ [DirectExportHelper] 差异翻译后的直接导出完成');
            notice.hide();
            
        } catch (error) {
            notice.hide();
            console.error('❌ [DirectExportHelper] 差异翻译后的直接导出失败:', error);
            throw new Error(`差异翻译后的直接导出失败: ${error.message}`);
        }
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
     * 验证slug属性
     * @param metadata 文件元数据
     * @returns 是否有效的slug
     */
    private validateSlug(metadata: any): boolean {
        return metadata?.frontmatter?.slug;
    }
}