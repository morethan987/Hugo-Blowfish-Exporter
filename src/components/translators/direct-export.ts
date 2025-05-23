import { Notice } from 'obsidian';
import HugoBlowfishExporter from '../../core/plugin';
import { TranslationFileOperations } from './file-operations';

/**
 * 直接导出助手
 */
export class DirectExportHelper {
    private fileOps: TranslationFileOperations;

    constructor(private plugin: HugoBlowfishExporter) {
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
     * 验证slug属性
     * @param metadata 文件元数据
     * @returns 是否有效的slug
     */
    private validateSlug(metadata: any): boolean {
        return metadata?.frontmatter?.slug;
    }
}