import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import { MathExporter } from './exporters/mathExporter';
import { MermaidExporter } from './exporters/mermaidExporter';
import { CalloutExporter } from './exporters/calloutExporter';
import { ImageExporter } from './exporters/imageExporter';

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
    private imageExporter: ImageExporter;  // 新增

	async onload() {
        this.mathExporter = new MathExporter();
        this.mermaidExporter = new MermaidExporter();
        this.calloutExporter = new CalloutExporter();
        this.imageExporter = new ImageExporter(this.app);  // 新增
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
        // 按顺序应用所有转换规则
        let modifiedContent = content;

        // 获取当前文件的slug
        const activeFile = this.app.workspace.getActiveFile();
        const metadata = activeFile ? this.app.metadataCache.getFileCache(activeFile) : null;
        const slug = metadata?.frontmatter?.slug;

        // 转换数学公式（需要先处理，因为可能包含 $ 符号）
        modifiedContent = this.mathExporter.transformMath(modifiedContent);

        // 转换 Callouts
        modifiedContent = this.calloutExporter.transformCallouts(modifiedContent);

        // 转换展示性 wiki 链接
        modifiedContent = await this.transformDispWikiLinks(modifiedContent, mode);

        // 转换普通 wiki 链接
        modifiedContent = await this.transformWikiLinks(modifiedContent, mode);

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

    // 展示性wiki链接转换开始
    private async transformDispWikiLinks(content: string, mode: 'batch' | 'single' = 'single'): Promise<string> {
        const wikiLinkRegex = /!\[\[(.*?)(?:\|(.*?))?\]\]/g;
        let modifiedContent = content;
        
        const promises = Array.from(content.matchAll(wikiLinkRegex)).map(async match => {
            const [fullMatch, targetFile, displayText] = match;
            const actualTarget = targetFile.split('#')[0].split('|')[0].trim();
            
            try {
                const file = this.app.metadataCache.getFirstLinkpathDest(actualTarget, '');
                if (!file) {
                    console.warn(`未找到文件: ${actualTarget}`);
                    return;
                }

                // 检查文件是否为图片
                const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(
                    file.extension.toLowerCase()
                );

                if (isImage) return;

                const metadata = this.app.metadataCache.getFileCache(file);
                
                if (!metadata?.frontmatter?.slug) {
                    if (mode === 'single') {
                        new Notice(`⚠️ 警告: ${file.basename} 缺少slug属性\n请在文件frontmatter中添加slug字段`, 20000);
                    } else {
                        console.warn(`文件 ${file.basename} 缺少slug属性`);
                    }
                    return;
                }

                let fileName: string;
                if (this.settings.useDefaultDispName) {
                    fileName = this.settings.defaultDispName;
                } else {
                    // 使用模态框让用户输入文件名
                    fileName = await new Promise((resolve) => {
                        new ExportDispNameModal(this.app, 'index.zh-cn.md', (name) => {
                            resolve(name);
                        }).open();
                    });
                }

                const hugoLink = `{{< mdimporter url="content/${this.settings.blogPath}/${metadata.frontmatter.slug}/${fileName}" >}}`;
                modifiedContent = modifiedContent.replace(fullMatch, hugoLink);
            } catch (error) {
                console.error(`处理展示性wiki链接时出错:`, error);
            }
        });

        await Promise.all(promises);
        return modifiedContent;
    }
    // 展示性wiki链接转换结束

    // 非展示性wiki链接转换开始
    private async transformWikiLinks(content: string, mode: 'batch' | 'single' = 'single'): Promise<string> {
        const wikiLinkRegex = /\[\[(.*?)\|(.*?)\]\]/g;
        let modifiedContent = content;
        
        const promises = Array.from(content.matchAll(wikiLinkRegex)).map(async match => {
            const [fullMatch, targetFile, displayText] = match;
            try {
                // 查找目标文件
                const file = this.app.metadataCache.getFirstLinkpathDest(targetFile, '');
                if (!file) {
                    if (mode === 'single') {
                        new Notice(`❌ 未找到文件: ${targetFile}`);
                    } else {
                        console.warn(`未找到文件: ${targetFile}`);
                    }
                    return;
                }

                // 获取文件的元数据
                const metadata = this.app.metadataCache.getFileCache(file);
                
                // 检查是否存在slug
                if (!metadata?.frontmatter?.slug) {
                    if (mode === 'single') {
                        new Notice(`⚠️ 警告: ${file.basename} 缺少slug属性\n请在文件frontmatter中添加slug字段`, 20000);
                    } else {
                        console.warn(`文件 ${file.basename} 缺少slug属性`);
                    }
                    return;
                }

                // 构建Hugo的引用链接
                const hugoLink = `[${displayText}]({{< ref "/${this.settings.blogPath}/${metadata.frontmatter.slug}" >}})`;
                modifiedContent = modifiedContent.replace(fullMatch, hugoLink);
            } catch (error) {
                if (mode === 'single') {
                    new Notice(`❌ 处理链接失败: ${targetFile}\n${error.message}`);
                }
                console.error(`处理wiki链接时出错:`, error);
            }
        });

        await Promise.all(promises);
        return modifiedContent;
    }
    // 非展示性wiki链接转换结束

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ConfirmationModal extends Modal {
    constructor(app: App, private onConfirm: () => void) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.createEl('h2', {text: '确认导出'});
        contentEl.createEl('p', {text: '是否确认导出所有文件？此操作可能需要一些时间。'});

        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '10px';

        const cancelButton = buttonContainer.createEl('button', {text: '取消'});
        const confirmButton = buttonContainer.createEl('button', {text: '确认'});
        confirmButton.classList.add('mod-cta');

        cancelButton.onclick = () => this.close();
        confirmButton.onclick = () => {
            this.onConfirm();
            this.close();
        };
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

class ExportNameModal extends Modal {
    private fileName: string;
    private onSubmit: (fileName: string) => void;
    private inputEl: HTMLInputElement;

    constructor(app: App, defaultFileName: string, onSubmit: (fileName: string) => void) {
        super(app);
        this.fileName = defaultFileName;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();

        contentEl.createEl('h2', {text: '导出文件'});

        // 创建输入框
        const inputContainer = contentEl.createDiv();
        inputContainer.style.margin = '1em 0';

        const label = inputContainer.createEl('label', {text: '请输入导出文件名：'});
        label.style.display = 'block';
        label.style.marginBottom = '0.5em';

        this.inputEl = inputContainer.createEl('input', {
            type: 'text',
            value: this.fileName
        });
        this.inputEl.style.width = '100%';
        this.inputEl.style.marginBottom = '1em';

        // 创建按钮容器
        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '10px';

        // 添加取消和确认按钮
        const cancelButton = buttonContainer.createEl('button', {text: '取消'});
        const confirmButton = buttonContainer.createEl('button', {text: '确认'});
        confirmButton.classList.add('mod-cta');

        // 绑定事件
        cancelButton.onclick = () => this.close();
        confirmButton.onclick = () => {
            const fileName = this.inputEl.value.trim();
            if (fileName) {
                this.onSubmit(fileName);
                this.close();
            } else {
                new Notice('文件名不能为空');
            }
        };

        // 支持回车确认
        this.inputEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                confirmButton.click();
            }
        });

        // 自动聚焦输入框并选中文本
        this.inputEl.focus();
        this.inputEl.select();
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

class ExportDispNameModal extends Modal {
    private onSubmit: (fileName: string) => void;
    private selectedLanguage: string = 'zh-cn'; // 默认选择中文

    constructor(app: App, defaultFileName: string, onSubmit: (fileName: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();

        contentEl.createEl('h2', {text: '选择语言版本'});

        const inputContainer = contentEl.createDiv();
        inputContainer.style.margin = '1em 0';

        const label = inputContainer.createEl('p', {text: '检测到展示性链接，请选择该链接指向的内容语言版本：'});
        label.style.marginBottom = '1em';

        // 创建单选按钮组
        const radioGroup = inputContainer.createDiv();
        radioGroup.style.display = 'flex';
        radioGroup.style.flexDirection = 'column';
        radioGroup.style.gap = '10px';
        radioGroup.style.marginBottom = '1em';

        // 中文选项
        const zhContainer = radioGroup.createDiv();
        zhContainer.style.display = 'flex';
        zhContainer.style.alignItems = 'center';
        zhContainer.style.gap = '8px';
        const zhRadio = zhContainer.createEl('input', {
            type: 'radio',
            value: 'zh-cn',
            attr: { name: 'language' }
        });
        zhRadio.checked = true;
        zhContainer.createEl('label', {text: '中文版本 (index.zh-cn.md)'});

        // 英文选项
        const enContainer = radioGroup.createDiv();
        enContainer.style.display = 'flex';
        enContainer.style.alignItems = 'center';
        enContainer.style.gap = '8px';
        const enRadio = enContainer.createEl('input', {
            type: 'radio',
            value: 'en',
            attr: { name: 'language' }
        });
        enContainer.createEl('label', {text: '英文版本 (index.en.md)'});

        // 添加事件监听
        zhRadio.addEventListener('change', () => {
            if (zhRadio.checked) this.selectedLanguage = 'zh-cn';
        });
        enRadio.addEventListener('change', () => {
            if (enRadio.checked) this.selectedLanguage = 'en';
        });

        // 按钮容器
        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '1em';

        // 添加按钮
        const cancelButton = buttonContainer.createEl('button', {text: '取消'});
        const confirmButton = buttonContainer.createEl('button', {text: '确认'});
        confirmButton.classList.add('mod-cta');

        cancelButton.onclick = () => this.close();
        confirmButton.onclick = () => {
            const fileName = `index.${this.selectedLanguage}.md`;
            this.onSubmit(fileName);
            this.close();
        };
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

class HugoBlowfishExporterSettingTab extends PluginSettingTab {
	plugin: HugoBlowfishExporter;

	constructor(app: App, plugin: HugoBlowfishExporter) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

        containerEl.createEl('h2', {text: 'Hugo Blowfish 导出设置'});

		new Setting(containerEl)
			.setName('网站内容目录')
			.setDesc('设置content文件夹在磁盘中的绝对路径')
			.addText(text => text
				.setPlaceholder('E:/Hugo/morethan987/content')
				.setValue(this.plugin.settings.exportPath)
				.onChange(async (value) => {
					this.plugin.settings.exportPath = value;
					await this.plugin.saveSettings();
				}))
            .settingEl.addClass('export-path-setting');

        new Setting(containerEl)
            .setName('图片导出路径')
            .setDesc('设置导出图片所在文件夹名称')
            .addText(text => text
                .setPlaceholder('img')
                .setValue(this.plugin.settings.imageExportPath)
                .onChange(async (value) => {
                    this.plugin.settings.imageExportPath = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('image-path-setting');
        
        new Setting(containerEl)
            .setName('博客存放文件夹')
            .setDesc('设置博客存放文件夹（相对于content文件夹）')
            .addText(text => text
                .setPlaceholder('posts')
                .setValue(this.plugin.settings.blogPath)
                .onChange(async (value) => {
                    this.plugin.settings.blogPath = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('blog-path-setting');

        // 添加新的设置项
        new Setting(containerEl)
            .setName('使用默认导出文件名')
            .setDesc('启用后将使用默认文件名直接导出，不再弹出文件名输入框')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useDefaultExportName)
                .onChange(async (value) => {
                    this.plugin.settings.useDefaultExportName = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('default-name-toggle-setting');

        new Setting(containerEl)
            .setName('默认导出文件名')
            .setDesc('设置默认的导出文件名，支持使用 {{title}} 作为文件名占位符')
            .addText(text => text
                .setPlaceholder('{{title}}')
                .setValue(this.plugin.settings.defaultExportName)
                .onChange(async (value) => {
                    this.plugin.settings.defaultExportName = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('default-name-setting');

        new Setting(containerEl)
            .setName('使用默认展示性链接语言版本')
            .setDesc('启用后将使用默认文件名，不再弹出文件名输入框')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useDefaultDispName)
                .onChange(async (value) => {
                    this.plugin.settings.useDefaultDispName = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('default-disp-name-toggle-setting');

        new Setting(containerEl)
            .setName('默认展示性链接语言版本')
            .setDesc('设置默认的展示性链接语言版本，其实就是您的网站下不同语言文章的文件名')
            .addText(text => text
                .setPlaceholder('index.zh-cn.md')
                .setValue(this.plugin.settings.defaultDispName)
                .onChange(async (value) => {
                    this.plugin.settings.defaultDispName = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('default-disp-name-setting');

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .export-path-setting, .image-path-setting, .blog-path-setting, 
            .default-name-toggle-setting, .default-name-setting, .default-disp-name-toggle-setting, .default-disp-name-setting {
                padding: 12px;
                border-radius: 8px;
                background-color: var(--background-secondary);
                margin-bottom: 12px;
            }
            .setting-item-control input {
                width: 100%;
            }
        `;
        containerEl.appendChild(style);
	}
}
