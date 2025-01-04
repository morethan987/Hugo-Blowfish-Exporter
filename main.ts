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
	/* 
	原始内容格式：
	> [!NOTE] Title
	> Contents
	改进后格式：
	{{< alert >}}
	Contents
	{{< /alert >}}
	*/
	private async modifyContent(content: string): Promise<string> {
		try {
			// 匹配 Obsidian 提示框格式的正则表达式
			const calloutRegex = /^>\s*\[!(\w+)\]\s*(.*)?\n((?:>[^\n]*\n?)*)/gm;
			
			// 替换为 Hugo Blowfish 格式
			let modifiedContent = content.replace(calloutRegex, (match, type, title, contents) => {
				// 添加类型声明解决 TypeScript 错误
				const cleanContents = contents
					.split('\n')
					.map((line: string) => line.replace(/^>\s?/, '').trim())
					.filter((line: string) => line.length > 0)
					.join('\n');

				// 根据不同类型选择不同的提示框样式
				let contributes = '';
				switch (type.toLowerCase()) {
					case 'note':
						contributes = '';
						break;
					case 'warning':
						contributes = 'cardColor="#FFD700" iconColor="#8B6914" textColor="#f1faee"';
						break;
					case 'danger':
					case 'error':
						contributes = 'icon="fire" cardColor="#e63946" iconColor="#1d3557" textColor="#f1faee"';
						break;
					default:
						contributes = '';
				}

				// 生成 Hugo Blowfish 格式的提示框
				return `{{< alert ${contributes} >}}
${cleanContents}
{{< /alert >}}`;
			});

			return modifiedContent;
		} catch (error) {
			console.error('Error modifying content:', error);
			return content; // 如果出错，返回原始内容
		}
	}

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
