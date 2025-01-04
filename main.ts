import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';

interface HugoBlowfishExporterSettings {
	exportPath: string;
}

const DEFAULT_SETTINGS: HugoBlowfishExporterSettings = {
	exportPath: './content/posts'
}

export default class HugoBlowfishExporter extends Plugin {
	settings: HugoBlowfishExporterSettings;

	async onload() {
		await this.loadSettings();

		// 添加导出按钮到ribbon
		const ribbonIconEl = this.addRibbonIcon('documents', 'Export to Hugo Blowfish', (evt: MouseEvent) => {
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

	private exportToHugo() {
		// TODO: 实现批量导出功能
		// 功能描述：将所有某一个文件夹中的笔记导出到指定目录，文件名为原始文件名，内容为笔记内容
		new Notice('Export functionality will be implemented soon');
	}

	private async exportCurrentNote(editor: Editor, view: MarkdownView) {
        try {
            // 获取当前文件
            const currentFile = view.file;
            if (!currentFile) {
                new Notice('No file is currently open');
                return;
            }

            // 获取文件内容
			const content = await this.app.vault.read(currentFile);
			
			//自定义修正文件中的格式
			const modifiedContent = await this.modifyContent(content);

            // 确保导出目录存在
            const exportDir = path.resolve(this.settings.exportPath);
            if (!fs.existsSync(exportDir)) {
                fs.mkdirSync(exportDir, { recursive: true });
            }

            // 生成输出文件路径
            const outputPath = path.join(exportDir, `${currentFile.basename}.md`);

            // 写入文件
            fs.writeFileSync(outputPath,  modifiedContent, 'utf8');

            new Notice(`Successfully exported to ${outputPath}`);
        } catch (error) {
            new Notice(`Export failed: ${error.message}`);
            console.error('Export error:', error);
        }
	}
	
	//自定义修正文件中的格式
	private async modifyContent(content: string): Promise<string> {
        try {
            // 按顺序应用所有转换规则
            const transformations = [
                this.transformCallouts,
                this.transformImgLink,
                //this.transformMermaid,
                //this.transformMath
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

	// callout转换开始
    private async transformCallouts(content: string): Promise<string> {
        const calloutRegex = /^>\s*\[!(\w+)\]\s*(.*)?\n((?:>[^\n]*\n?)*)/gm;
        
        return content.replace(calloutRegex, (match, type, title, contents) => {
            const cleanContents = this.cleanCalloutContent(contents);
            const contributes = this.getCalloutAttributes(type);

            return this.generateCalloutHtml(cleanContents, contributes);
        });
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
                return '';
            case 'warning':
                return 'cardColor="#FFD700" iconColor="#8B6914" textColor="#f1faee"';
            case 'danger':
            case 'error':
                return 'icon="fire" cardColor="#e63946" iconColor="#1d3557" textColor="#f1faee"';
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
	/* 
	原版图片链接：![[全局工作理论.png]]
	转换后的图片链接：![全局工作理论](全局工作理论.png)
	*/
	private async transformImgLink(content: string): Promise<string> {
        const imgLinkRegex = /!\[\[(.*?)\]\]/g;
        
        return content.replace(imgLinkRegex, (match, imagePath) => {
            const cleanImagePath = this.cleanImagePath(imagePath);
            return this.generateImageHtml(cleanImagePath);
        });
    }

    private cleanImagePath(imagePath: string): string {
        // 移除路径中的特殊字符和空格
        return imagePath
            .trim()
            .replace(/[\r\n]/g, '')  // 移除换行符
            .split('/')              // 分割路径
            .pop() || '';            // 获取文件名
    }

    private generateImageHtml(imagePath: string): string {
        // 从文件名中提取标题（去除扩展名）
        const imageTitle = imagePath.replace(/\.[^/.]+$/, "");
        return `![${imageTitle}](${imagePath})`;
    }
	// 图片链接转换结束
	
	// mermaid转换开始
	/* 
	原版mermaid代码：
	```mermaid
graph TD

生物学 --> 化学
```
	转换后的mermaid代码：
	{{< mermaid >}}
graph LR;
A[Lemons]-->B[Lemonade];
B-->C[Profit]
{{< /mermaid >}}

	*/
	private async transformMermaid(content: string): Promise<string> {
        const calloutRegex = /^>\s*\[!(\w+)\]\s*(.*)?\n((?:>[^\n]*\n?)*)/gm;
        
        return content.replace(calloutRegex, (match, type, title, contents) => {
            const cleanContents = this.cleanCalloutContent(contents);
            const contributes = this.getCalloutAttributes(type);

            return this.generateCalloutHtml(cleanContents, contributes);
        });
    }
	// mermaid转换结束

	// 数学公式转换开始
	/* 
	转换前内联公式：$a^2 + b^2 = c^2$
	转换后的内联公式：{{< katex >}}\\(a^2 + b^2 = c^2\\){{< /katex >}}
	块级公式不用转换
	*/
	private async transformMath(content: string): Promise<string> {
        const calloutRegex = /^>\s*\[!(\w+)\]\s*(.*)?\n((?:>[^\n]*\n?)*)/gm;
        
        return content.replace(calloutRegex, (match, type, title, contents) => {
            const cleanContents = this.cleanCalloutContent(contents);
            const contributes = this.getCalloutAttributes(type);

            return this.generateCalloutHtml(cleanContents, contributes);
        });
	}
	// 数学公式转换结束

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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

		new Setting(containerEl)
			.setName('Export Path')
			.setDesc('The path where Hugo content files will be exported')
			.addText(text => text
				.setPlaceholder('./content/posts')
				.setValue(this.plugin.settings.exportPath)
				.onChange(async (value) => {
					this.plugin.settings.exportPath = value;
					await this.plugin.saveSettings();
				}));
	}
}
