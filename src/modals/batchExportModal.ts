import { App, Notice, TFile } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import { HugoBlowfishExporterSettings } from 'src/types/settings';
import { CoverChooser } from 'src/components/rules/hugo_blowfish/coverChooser';

// 批量导出的模态框
export class BatchExportModal {
    constructor(
        private app: App,
        private settings: HugoBlowfishExporterSettings,
        private modifyContent: (content: string, frontmatter: Record<string, any>) => Promise<string>
    ) {}

    async export() {
        const files = this.app.vault.getMarkdownFiles();
        if (files.length === 0) {
            new Notice('没有找到Markdown文件');
            return;
        }

        const progressNotice = new Notice('', 0);
        const exportDir = path.resolve(this.settings.exportPath);
        const contentDir = path.join(exportDir, this.settings.blogPath);
        
        if (!fs.existsSync(contentDir)) {
            fs.mkdirSync(contentDir, { recursive: true });
        }

        let processedCount = 0;
        let successCount = 0;
        let failCount = 0;
        let missingSlugCount = 0;

        for (const file of files) {
            processedCount++;
            const progress = Math.round((processedCount / files.length) * 100);
            progressNotice.setMessage(
                `正在导出: ${progress}%\n` +
                `${file.basename}\n` +
                `(${processedCount}/${files.length})`
            );

            const result = await this.processSingleFile(file, contentDir);
            if (result.success) successCount++;
            if (result.failed) failCount++;
            if (result.missingSlug) missingSlugCount++;
        }

        progressNotice.hide();

        new Notice(
            `导出完成!\n` +
            `✅ 成功: ${successCount}\n` +
            `❌ 失败: ${failCount}\n` +
            `⚠️ 缺少slug: ${missingSlugCount}`,
            10000
        );
    }

    // 批量导出的文件处理部分
    private async processSingleFile(file: TFile, contentDir: string): Promise<{success?: boolean, failed?: boolean, missingSlug?: boolean}> {
        try {
            const metadata = this.app.metadataCache.getFileCache(file);
            if (!metadata?.frontmatter?.slug) {
                console.warn(`文件 ${file.basename} 缺少 slug 属性，已跳过`);
                return { missingSlug: true };
            }

            const slugDir = path.join(contentDir, metadata.frontmatter.slug);
            if (!fs.existsSync(slugDir)) {
                fs.mkdirSync(slugDir, { recursive: true });
            }

            let content = await this.app.vault.read(file);
            const modifiedContent = await this.modifyContent(content, metadata.frontmatter);

            let fileName = file.basename;
            if (this.settings.useDefaultExportName) {
                fileName = this.settings.defaultExportName_zh_cn;
                if (metadata.frontmatter.language === 'en') {
                    fileName = this.settings.defaultExportName_en;
                }
            }

            const outputPath = path.join(slugDir, `${fileName}.md`);
            fs.writeFileSync(outputPath, modifiedContent, 'utf8');

            const coverChooser = new CoverChooser();
            await coverChooser.chooseCover(this.settings, slugDir);
            
            return { success: true };
        } catch (error) {
            console.error(`导出失败 ${file.path}:`, error);
            return { failed: true };
        }
    }
}
