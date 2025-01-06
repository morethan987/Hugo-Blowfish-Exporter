import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';

interface HugoBlowfishExporterSettings {
	exportPath: string;
	imageExportPath: string;  // 新增图片导出路径配置
}

const DEFAULT_SETTINGS: HugoBlowfishExporterSettings = {
	exportPath: './output',
	imageExportPath: 'static/images'  // 默认图片导出到static/images
}

export default class HugoBlowfishExporter extends Plugin {
	settings: HugoBlowfishExporterSettings;

	async onload() {
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
                if (!fs.existsSync(exportDir)) {
                    fs.mkdirSync(exportDir, { recursive: true });
                }
                let processedCount = 0;
                let successCount = 0;
                let failCount = 0;

                // ...existing export logic...
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

                        // 获取文件内容
                        const content = await this.app.vault.read(file);
                        
                        // 处理文件内容
                        const modifiedContent = await this.modifyContent(content);

                        // 获取文件的相对路径（相对于vault根目录）
                        const relativePath = file.path;
                        const dirPath = path.dirname(relativePath);
                        
                        // 在导出目录中创建对应的子文件夹
                        const targetDir = path.join(exportDir, dirPath);
                        if (!fs.existsSync(targetDir)) {
                            fs.mkdirSync(targetDir, { recursive: true });
                        }

                        // 生成输出文件路径（保持原始文件夹结构）
                        const outputPath = path.join(exportDir, relativePath);

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
                new Notice(`导出完成!\n✅ 成功: ${successCount}\n❌ 失败: ${failCount}`, 5000);
            } catch (error) {
                new Notice(`导出失败: ${error.message}`);
                console.error('Export error:', error);
            }
        }).open();
    }

	private async exportCurrentNote(editor: Editor, view: MarkdownView) {
        try {
            const currentFile = view.file;
            if (!currentFile) {
                new Notice('没有打开的文件');
                return;
            }

            // 打开文件名询问对话框
            new ExportNameModal(this.app, currentFile.basename, async (fileName) => {
                try {
                    const content = await this.app.vault.read(currentFile);
                    const modifiedContent = await this.modifyContent(content);

                    const exportDir = path.resolve(this.settings.exportPath);
                    if (!fs.existsSync(exportDir)) {
                        fs.mkdirSync(exportDir, { recursive: true });
                    }

                    // 使用用户输入的文件名
                    const outputPath = path.join(exportDir, `${fileName}.md`);

                    fs.writeFileSync(outputPath, modifiedContent, 'utf8');
                    new Notice(`✅ 导出成功!\n文件已保存至:\n${outputPath}`, 5000);
                } catch (error) {
                    new Notice(`❌ 导出失败: ${error.message}`, 5000);
                    console.error('Export error:', error);
                }
            }).open();
        } catch (error) {
            new Notice(`❌ 导出失败: ${error.message}`, 5000);
            console.error('Export error:', error);
        }
    }

	//自定义修正文件中的格式
	private async modifyContent(content: string): Promise<string> {
        try {
            // 按顺序应用所有转换规则
            const transformations = [
                this.transformWikiLinks,  // 添加这一行
                this.transformCallouts,
                this.transformImgLink,
                this.transformMermaid,
                this.transformMath
            ];

            // 依次应用每个转换
            let modifiedContent = content;
            for (const transform of transformations) {
                modifiedContent = await transform.call(this, modifiedContent);
            }

            return modifiedContent;
        } catch (error) {
            console.error('Error modifying content:', error);
            return content;
        }
    }

    // 非展示性wiki链接转换
    private async transformWikiLinks(content: string): Promise<string> {
        const wikiLinkRegex = /\[\[(.*?)\|(.*?)\]\]/g;
        let modifiedContent = content;
        
        const promises = Array.from(content.matchAll(wikiLinkRegex)).map(async match => {
            const [fullMatch, targetFile, displayText] = match;
            try {
                // 查找目标文件
                const file = this.app.metadataCache.getFirstLinkpathDest(targetFile, '');
                if (!file) {
                    console.warn(`未找到文件: ${targetFile}`);
                    return;
                }

                // 获取文件的元数据
                const metadata = this.app.metadataCache.getFileCache(file);
                let slug = '';

                // 尝试从frontmatter中获取slug
                if (metadata?.frontmatter?.slug) {
                    slug = metadata.frontmatter.slug;
                } else {
                    // 如果没有slug，使用文件名转换为slug格式
                    slug = targetFile.toLowerCase()
                        .replace(/\s+/g, '-')     // 空格转换为连字符
                        .replace(/[^a-z0-9-]/g, '')  // 移除非字母数字和连字符的字符
                        .replace(/-+/g, '-')      // 多个连字符转换为单个
                        .replace(/^-|-$/g, '');   // 移除开头和结尾的连字符
                }

                // 构建Hugo的引用链接
                const hugoLink = `[${displayText}]({{< ref "/blog/${slug}" >}})`;
                modifiedContent = modifiedContent.replace(fullMatch, hugoLink);
            } catch (error) {
                console.error(`处理wiki链接时出错: ${error}`);
            }
        });

        await Promise.all(promises);
        return modifiedContent;
    }

    // 非展示性wiki链接转换开始

	// callout转换开始
    private async transformCallouts(content: string): Promise<string> {
        // 识别代码块的位置
        const codeBlockPositions: {start: number, end: number}[] = [];
        const codeBlockRegex = /```[\s\S]*?```/g;
        let match: RegExpExecArray | null;
        while ((match = codeBlockRegex.exec(content)) !== null) {
            codeBlockPositions.push({
                start: match.index,
                end: match.index + match[0].length
            });
        }

        const calloutRegex = /^>\s*\[!(\w+)\]\s*(.*)?\n((?:>[^\n]*\n?)*)/gm;
        let result = '';
        let lastIndex = 0;

        while ((match = calloutRegex.exec(content)) !== null) {
            // 检查当前匹配是否在任何代码块内
            const isInCodeBlock = codeBlockPositions.some(pos => 
                match !== null && match.index >= pos.start && match.index < pos.end
            );

            if (isInCodeBlock) {
                // 如果在代码块内，保持原样
                result += content.slice(lastIndex, match.index + match[0].length);
            } else {
                // 如果不在代码块内，进行转换
                result += content.slice(lastIndex, match.index);
                const type = match[1];
                const contents = match[3];
                const cleanContents = this.cleanCalloutContent(contents);
                const contributes = this.getCalloutAttributes(type);
                result += this.generateCalloutHtml(cleanContents, contributes);
            }
            lastIndex = match.index + match[0].length;
        }

        // 添加剩余内容
        result += content.slice(lastIndex);
        return result;
    }

    private cleanCalloutContent(contents: string): string {
        return contents
            .split('\n')
            .map((line: string) => line.replace(/^>\s?/, '').trim())
            .filter((line: string) => line.length > 0)
            .join('\n');
    }

    private getCalloutAttributes(type: string): string {
        switch (type.toLowerCase()) {
            case 'note':
                return 'icon="pencil"';
            case 'info':
                return 'icon="circle-info"';
            case 'todo':
                return 'icon="square-check" iconColor="#F0FFFF" cardColor="#4682B4"';
            case 'tip':
            case 'hint':
            case 'important':
                return 'icon="lightbulb" cardColor="#7FFFD4" textColor="#696969"';
            case 'success':
            case 'check':
            case 'done':
                return 'icon="check" cardColor="#00EE00" textColor="#F0FFFF" iconColor="#F0FFFF"';
            case 'warning':
            case 'caution':
            case 'attention':
                return 'cardColor="#FFD700" iconColor="#8B6914" textColor="#696969"';
            case 'question':
            case 'help':
            case 'faq':
                return 'icon="circle-question" cardColor="#FF7F24" textColor="#F0FFFF"';
            case 'danger':
            case 'error':
                return 'icon="fire" cardColor="#e63946" iconColor="#1d3557" textColor="#f1faee"';
            case 'example':
                return 'icon="list" cardColor="#9370DB" iconColor="#8B008B" textColor="#F0FFFF"';
            default:
                return '';
        }
    }

    private generateCalloutHtml(content: string, attributes: string): string {
        return `{{< alert ${attributes} >}}
${content}
{{< /alert >}}`;
	}
	// callout转换结束

	// 图片链接转换开始
	private async transformImgLink(content: string): Promise<string> {
        const imgLinkRegex = /!\[\[(.*?)\]\]/g;
        const matches = Array.from(content.matchAll(imgLinkRegex));
        
        let modifiedContent = content;
        
        for (const match of matches) {
            // 获取原始的wiki链接内容
            const wikiPath = match[1];
            try {
                // 获取附件地址
                const attachmentPath = (await this.app.fileManager.getAvailablePathForAttachment(wikiPath)).replace(/\s*\d+\.png$/, '.png');

                // 获取附件文件
                const attachmentFile = this.app.vault.getAbstractFileByPath(attachmentPath);
                if (attachmentFile instanceof TFile) {
                    // 获取相对于vault根目录的路径
                    const relativePath = attachmentFile.path.replace(/\\/g, '/');
                    console.log('Image relative path:', relativePath);
                    
                    // 构建目标路径
                    const exportDir = path.resolve(this.settings.exportPath);
                    const imageExportDir = path.join(exportDir, this.settings.imageExportPath);
                    
                    // 确保图片导出目录存在
                    if (!fs.existsSync(imageExportDir)) {
                        fs.mkdirSync(imageExportDir, { recursive: true });
                    }
                    
                    // 获取文件内容并复制
                    const imageData = await this.app.vault.readBinary(attachmentFile);
                    const targetPath = path.join(imageExportDir, attachmentFile.name);
                    fs.writeFileSync(targetPath, Buffer.from(imageData));
                    
                    // 生成新的图片引用路径（使用正斜杠）
                    const hugoImagePath = `${this.settings.imageExportPath}/${attachmentFile.name}`.replace(/^\//, '');
                    
                    // 替换原始wiki链接
                    modifiedContent = modifiedContent.replace(
                        `![[${wikiPath}]]`,
                        this.generateImageHtml(hugoImagePath, attachmentFile.name)
                    );
                }
            } catch (error) {
                console.error(`Failed to process image ${wikiPath}:`, error);
            }
        }
        
        return modifiedContent;
    }

    private generateImageHtml(imagePath: string, imageTitle: string): string {
        return `![${imageTitle}](${imagePath})`;
    }
	// 图片链接转换结束
	
	// mermaid转换开始
    private async transformMermaid(content: string): Promise<string> {
        const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
        
        return content.replace(mermaidRegex, (match, mermaidContent) => {
            const cleanMermaidContent = this.cleanMermaidContent(mermaidContent);
            return this.generateMermaidHtml(cleanMermaidContent);
        });
    }

    private cleanMermaidContent(mermaidContent: string): string {
        return mermaidContent
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0)
            .join('\n');
    }

    private generateMermaidHtml(content: string): string {
        return `{{< mermaid >}}
${content}
{{< /mermaid >}}`;
    }
    // mermaid转换结束

	// 数学公式转换开始
    private async transformMath(content: string): Promise<string> {
        // 不使用 lookbehind，改用更兼容的方式
        // 匹配单个 $，但不匹配 $$ 的情况
        const segments = content.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);
        
        return segments.map((segment, index) => {
            // 如果是双美元符号包裹的内容，保持原样
            if (segment.startsWith('$$')) {
                return segment;
            }
            // 如果是单美元符号包裹的内容
            if (segment.startsWith('$') && segment.endsWith('$')) {
                const mathContent = segment.slice(1, -1);
                const cleanMathContent = this.cleanMathContent(mathContent);
                return this.generateKatexHtml(cleanMathContent);
            }
            // 其他内容保持不变
            return segment;
        }).join('');
    }

    private cleanMathContent(mathContent: string): string {
        return mathContent
            .trim()
            .replace(/\s+/g, ' ')  // 将多个空格替换为单个空格
            .replace(/\\{2,}/g, '\\'); // 将多个反斜杠替换为单个反斜杠
    }

    private generateKatexHtml(content: string): string {
        return `{{< katex >}}\\\\(${content}\\\\)`;
    }
    // 数学公式转换结束

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
			.setName('内容导出路径')
			.setDesc('设置Hugo内容文件的导出目录路径')
			.addText(text => text
				.setPlaceholder('./output')
				.setValue(this.plugin.settings.exportPath)
				.onChange(async (value) => {
					this.plugin.settings.exportPath = value;
					await this.plugin.saveSettings();
				}))
            .settingEl.addClass('export-path-setting');

        new Setting(containerEl)
            .setName('图片导出路径')
            .setDesc('设置图片文件的导出路径（相对于导出根目录）')
            .addText(text => text
                .setPlaceholder('static/images')
                .setValue(this.plugin.settings.imageExportPath)
                .onChange(async (value) => {
                    this.plugin.settings.imageExportPath = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('image-path-setting');

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .export-path-setting, .image-path-setting {
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
