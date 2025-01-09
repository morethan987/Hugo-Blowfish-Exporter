import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import { MathExporter } from './exporters/mathExporter';
import { MermaidExporter } from './exporters/mermaidExporter';
import { CalloutExporter } from './exporters/calloutExporter';
import { ImageExporter } from './exporters/imageExporter';
import { HugoBlowfishExporterSettingTab } from './utils/settingsTab';
import { ExportDispNameModal } from './utils/exportDispNameModal';
import { ExportNameModal } from './utils/exportNameModal';
import { ConfirmationModal } from './utils/confirmationModal';
import { WikiLinkExporter } from './exporters/wikiLinkExporter';

export interface HugoBlowfishExporterSettings {
	exportPath: string; // 导出路径配置
    imageExportPath: string;  // 图片导出路径配置
    blogPath: string; // 博客文章存放文件夹配置配置
    useDefaultExportName: boolean;  // 是否使用默认导出文件名
    defaultExportName: string;      // 默认导出文件名
    useDefaultDispName: boolean;    // 是否使用默认展示性链接文件名
    defaultDispName: string;        // 默认展示性链接文件名
}

const DEFAULT_SETTINGS: HugoBlowfishExporterSettings = {
	exportPath: 'E:/Hugo/morethan987/content',
    imageExportPath: 'img',
    blogPath: 'posts',
    useDefaultExportName: false,
    defaultExportName: '{{title}}',  // 支持使用 {{title}} 作为文件名占位符
    useDefaultDispName: false,
    defaultDispName: 'index.zh-cn.md'
}

export default class HugoBlowfishExporter extends Plugin {
	settings: HugoBlowfishExporterSettings;
    private mathExporter: MathExporter;
    private mermaidExporter: MermaidExporter;
    private calloutExporter: CalloutExporter;
    private imageExporter: ImageExporter;
    private wikiLinkExporter: WikiLinkExporter;

	async onload() {
        this.mathExporter = new MathExporter();
        this.mermaidExporter = new MermaidExporter();
        this.calloutExporter = new CalloutExporter();
        this.imageExporter = new ImageExporter(this.app);
        this.wikiLinkExporter = new WikiLinkExporter(this.app);
		await this.loadSettings();

		// 添加导出按钮到ribbon
		const ribbonIconEl = this.addRibbonIcon('arrow-right-from-line', 'Export all the file in vault', (evt: MouseEvent) => {
			new Notice('Starting export...');
			this.exportToHugo();
		});
		ribbonIconEl.addClass('hugo-blowfish-exporter-ribbon-class');

		// 添加导出命令
		this.addCommand({
			id: 'export-to-hugo-blowfish',
			name: 'Export current note to Hugo Blowfish',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.exportCurrentNote(editor, view);
			}
		});

		// 添加设置选项卡
		this.addSettingTab(new HugoBlowfishExporterSettingTab(this.app, this));
	}

    // 批量导出
	private async exportToHugo() {
        new ConfirmationModal(this.app, async () => {
            try {
                await this.processFileExport();
            } catch (error) {
                new Notice(`导出失败: ${error.message}`);
                console.error('Export error:', error);
            }
        }).open();
    }

    private async processFileExport() {
        const files = this.app.vault.getMarkdownFiles();
        if (files.length === 0) {
            new Notice('没有找到Markdown文件');
            return;
        }

        // 创建进度条通知
        const progressNotice = new Notice('', 0);

        // 确保导出目录存在
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
            // 更新进度条
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

        // 关闭进度条通知
        progressNotice.hide();

        // 显示完成通知
        new Notice(
            `导出完成!\n` +
            `✅ 成功: ${successCount}\n` +
            `❌ 失败: ${failCount}\n` +
            `⚠️ 缺少slug: ${missingSlugCount}`,
            10000
        );
    }

    // 处理单个文件的导出
    private async processSingleFile(file: TFile, contentDir: string): Promise<{success?: boolean, failed?: boolean, missingSlug?: boolean}> {
        try {
            // 获取文件的元数据
            const metadata = this.app.metadataCache.getFileCache(file);
            if (!metadata?.frontmatter?.slug) {
                console.warn(`文件 ${file.basename} 缺少 slug 属性，已跳过`);
                return { missingSlug: true };
            }

            // 创建文章目录
            const slugDir = path.join(contentDir, metadata.frontmatter.slug);
            if (!fs.existsSync(slugDir)) {
                fs.mkdirSync(slugDir, { recursive: true });
            }

            // 获取和处理文件内容
            let content = await this.app.vault.read(file);
            content = await this.imageExporter.transformImages(
                content, 
                'batch', 
                this.settings, 
                metadata.frontmatter.slug
            );
            const modifiedContent = await this.modifyContent(content, 'batch');

            // 确定输出文件名
            let fileName = this.settings.useDefaultExportName
                ? this.settings.defaultExportName.replace('{{title}}', file.basename)
                : file.basename;

            // 写入文件
            const outputPath = path.join(slugDir, `${fileName}.md`);
            fs.writeFileSync(outputPath, modifiedContent, 'utf8');
            
            return { success: true };
        } catch (error) {
            console.error(`导出失败 ${file.path}:`, error);
            return { failed: true };
        }
    }

    // 导出当前笔记
	private async exportCurrentNote(editor: Editor, view: MarkdownView) {
    try {
        const currentFile = view.file;
        if (!currentFile) {
            new Notice('没有打开的文件');
            return;
        }

        // 获取文件的元数据
        const metadata = this.app.metadataCache.getFileCache(currentFile);
        if (!metadata?.frontmatter?.slug) {
            new Notice('⚠️ 当前文件缺少 slug 属性，请在 frontmatter 中添加 slug 字段');
            return;
        }

        // 读取文件内容并修改
        const content = await this.app.vault.read(currentFile);
        const modifiedContent = await this.modifyContent(content, 'single');

        // 根据slug创建目标目录
        let exportDir = path.resolve(this.settings.exportPath);
        exportDir = path.join(exportDir, this.settings.blogPath);
        const slugDir = path.join(exportDir, metadata.frontmatter.slug);
        if (!fs.existsSync(slugDir)) {
            fs.mkdirSync(slugDir, { recursive: true });
        }

        let fileName: string;
        if (this.settings.useDefaultExportName) {
            // 替换文件名中的占位符
            fileName = this.settings.defaultExportName;
            fileName = fileName.replace('{{title}}', currentFile.basename);
        } else {
            // 使用对话框获取文件名
            fileName = await new Promise((resolve) => {
                new ExportNameModal(this.app, currentFile.basename, (name) => {
                    resolve(name);
                }).open();
            });
        }

        // 构建完整的输出路径
        const outputPath = path.join(slugDir, `${fileName}.md`);

        // 写入文件
        fs.writeFileSync(outputPath, modifiedContent, 'utf8');
        new Notice(`✅ 导出成功!\n文件已保存至:\n${outputPath}`, 5000);

    } catch (error) {
        new Notice(`❌ 导出失败: ${error.message}`, 5000);
        console.error('Export error:', error);
    }
}

// 修改导出方法，添加模式参数
private async modifyContent(content: string, mode: 'batch' | 'single' = 'single'): Promise<string> {
    try {
        let modifiedContent = content;

        const activeFile = this.app.workspace.getActiveFile();
        const metadata = activeFile ? this.app.metadataCache.getFileCache(activeFile) : null;
        const slug = metadata?.frontmatter?.slug;

        // 转换数学公式
        modifiedContent = this.mathExporter.transformMath(modifiedContent);

        // 转换 Callouts
        modifiedContent = this.calloutExporter.transformCallouts(modifiedContent);

        // 转换所有 wiki 链接
        modifiedContent = await this.wikiLinkExporter.transformWikiLinks(modifiedContent, mode, this.settings);

        // 转换图片链接
        if (slug) {
            modifiedContent = await this.imageExporter.transformImages(
                modifiedContent,
                mode,
                this.settings,
                slug
            );
        }

        // 转换 Mermaid 图表
        modifiedContent = this.mermaidExporter.transformMermaid(modifiedContent);

        return modifiedContent;
    } catch (error) {
        console.error('Error modifying content:', error);
        return content;
    }
}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
