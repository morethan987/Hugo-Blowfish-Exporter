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

interface HugoBlowfishExporterSettings {
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

	async onload() {
        this.mathExporter = new MathExporter();
        this.mermaidExporter = new MermaidExporter();
        this.calloutExporter = new CalloutExporter();
        this.imageExporter = new ImageExporter(this.app);
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
    // 显示确认对话框
    new ConfirmationModal(this.app, async () => {
        try {
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
                try {
                    // 更新进度条
                    processedCount++;
                    const progress = Math.round((processedCount / files.length) * 100);
                    progressNotice.setMessage(
                        `正在导出: ${progress}%\n` +
                        `${file.basename}\n` +
                        `(${processedCount}/${files.length})`
                    );

                    // 获取文件的元数据
                    const metadata = this.app.metadataCache.getFileCache(file);
                    if (!metadata?.frontmatter?.slug) {
                        console.warn(`文件 ${file.basename} 缺少 slug 属性，已跳过`);
                        missingSlugCount++;
                        continue;
                    }

                    // 创建文章目录
                    const slugDir = path.join(contentDir, metadata.frontmatter.slug);
                    if (!fs.existsSync(slugDir)) {
                        fs.mkdirSync(slugDir, { recursive: true });
                    }

                    // 获取文件内容
                    let content = await this.app.vault.read(file);
                    
                    // 处理文件内容中的图片
                    content = await this.handleImagesInContent(content, metadata.frontmatter.slug);
                    
                    // 处理其他内容
                    const modifiedContent = await this.modifyContent(content, 'batch');

                    // 确定输出文件名
                    let fileName: string;
                    if (this.settings.useDefaultExportName) {
                        fileName = this.settings.defaultExportName.replace('{{title}}', file.basename);
                    } else {
                        fileName = file.basename;
                    }

                    // 生成输出文件路径
                    const outputPath = path.join(slugDir, `${fileName}.md`);

                    // 写入文件
                    fs.writeFileSync(outputPath, modifiedContent, 'utf8');
                    
                    successCount++;
                } catch (error) {
                    console.error(`导出失败 ${file.path}:`, error);
                    failCount++;
                }
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
        } catch (error) {
            new Notice(`导出失败: ${error.message}`);
            console.error('Export error:', error);
        }
    }).open();
}

    // 新增：处理内容中的图片
    private async handleImagesInContent(content: string, slug: string): Promise<string> {
        const imgLinkRegex = /!\[\[(.*?)\]\]/g;
        const matches = Array.from(content.matchAll(imgLinkRegex));
        
        let modifiedContent = content;
        
        for (const match of matches) {
            const wikiPath = match[1];
            try {
                const attachmentFile = this.app.metadataCache.getFirstLinkpathDest(wikiPath, '');
                if (attachmentFile) {
                    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(path.extname(attachmentFile.path).toLowerCase());
                    if (!isImage) {
                        continue;
                    }
                }
                if (attachmentFile instanceof TFile) {
                    // 获取相对于vault根目录的路径
                    const relativePath = attachmentFile.path.replace(/\\/g, '/');
                    
                    // 构建目标路径
                    const exportDir = path.resolve(this.settings.exportPath);
                    const imagesDir = path.join(
                        exportDir,
                        this.settings.blogPath,
                        slug,
                        this.settings.imageExportPath
                    );
                    
                    // 确保图片导出目录存在
                    if (!fs.existsSync(imagesDir)) {
                        fs.mkdirSync(imagesDir, { recursive: true });
                    }
                    
                    // 获取文件内容并复制
                    const imageData = await this.app.vault.readBinary(attachmentFile);
                    const targetPath = path.join(imagesDir, attachmentFile.name);
                    fs.writeFileSync(targetPath, Buffer.from(imageData));
                    
                    // 生成新的图片引用路径（使用相对路径）
                    const hugoImagePath = `${this.settings.imageExportPath}/${attachmentFile.name}`;
                    
                    // 替换原始wiki链接
                    modifiedContent = modifiedContent.replace(
                        `![[${wikiPath}]]`,
                        this.generateImageHtml(hugoImagePath, attachmentFile.name)
                    );
                }
            } catch (error) {
                console.error(`Failed to process image ${wikiPath}:`, error);
                new Notice(`❌ 处理图片失败: ${wikiPath}\n${error.message}`);
            }
        }
        
        return modifiedContent;
    }

    private generateImageHtml(imagePath: string, imageTitle: string): string {
        return `![${imageTitle}](${imagePath})`;
    }

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
        modifiedContent = await this.transformAllWikiLinks(modifiedContent, mode);

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

    private async transformAllWikiLinks(content: string, mode: 'batch' | 'single' = 'single'): Promise<string> {
        // 匹配所有wiki链接：展示性(![[file]])和非展示性([[file|text]])
        const wikiLinkRegex = /(!?\[\[(.*?)(?:\|(.*?))?\]\])/g;
        let modifiedContent = content;
        
        const promises = Array.from(content.matchAll(wikiLinkRegex)).map(async match => {
            const [fullMatch, _, targetFile, displayText] = match;
            const isDisplayLink = fullMatch.startsWith('!');
            const actualTarget = targetFile.split('#')[0].split('|')[0].trim();
            
            try {
                const file = this.app.metadataCache.getFirstLinkpathDest(actualTarget, '');
                if (!file) {
                    if (mode === 'single') {
                        new Notice(`❌ 未找到文件: ${actualTarget}`);
                    } else {
                        console.warn(`未找到文件: ${actualTarget}`);
                    }
                    return;
                }

                // 检查如果是展示性链接且为图片，则跳过处理
                if (isDisplayLink) {
                    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(
                        file.extension.toLowerCase()
                    );
                    if (isImage) return;
                }

                const metadata = this.app.metadataCache.getFileCache(file);
                
                if (!metadata?.frontmatter?.slug) {
                    if (mode === 'single') {
                        new Notice(`⚠️ 警告: ${file.basename} 缺少slug属性\n请在文件frontmatter中添加slug字段`, 20000);
                    } else {
                        console.warn(`文件 ${file.basename} 缺少slug属性`);
                    }
                    return;
                }

                let hugoLink: string;
                if (isDisplayLink) {
                    // 处理展示性链接
                    let fileName: string;
                    if (this.settings.useDefaultDispName) {
                        fileName = this.settings.defaultDispName;
                    } else {
                        fileName = await new Promise((resolve) => {
                            new ExportDispNameModal(this.app, 'index.zh-cn.md', (name) => {
                                resolve(name);
                            }).open();
                        });
                    }
                    hugoLink = `{{< mdimporter url="content/${this.settings.blogPath}/${metadata.frontmatter.slug}/${fileName}" >}}`;
                } else {
                    // 处理非展示性链接
                    const linkText = displayText || file.basename;
                    hugoLink = `[${linkText}]({{< ref "/${this.settings.blogPath}/${metadata.frontmatter.slug}" >}})`;
                }

                modifiedContent = modifiedContent.replace(fullMatch, hugoLink);
            } catch (error) {
                if (mode === 'single') {
                    new Notice(`❌ 处理链接失败: ${actualTarget}\n${error.message}`);
                }
                console.error(`处理wiki链接时出错:`, error);
            }
        });

        await Promise.all(promises);
        return modifiedContent;
    }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
