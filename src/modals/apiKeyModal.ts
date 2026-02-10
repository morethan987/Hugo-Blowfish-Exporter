import { App, Modal, Setting, Notice } from "obsidian";
import HugoBlowfishExporter from "core/plugin";

export class ApiKeyModal extends Modal {
	private apiKey: string;
	private plugin: HugoBlowfishExporter;
	private onSave?: () => void;

	constructor(app: App, plugin: HugoBlowfishExporter, onSave?: () => void) {
		super(app);
		this.plugin = plugin;
		this.apiKey = this.plugin.getApiKey();
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;

		new Setting(contentEl).setName("设置API密钥").setHeading();

		new Setting(contentEl)
			.setName("API密钥")
			.setDesc("输入您的API密钥，它将被安全地保存在 Obsidian 密钥库中")
			.addText((text) =>
				text
					.setPlaceholder("Your API key")
					.setValue(this.apiKey)
					.onChange((value) => {
						this.apiKey = value;
					}),
			);

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("保存")
					.setCta()
					.onClick(() => {
						if (!this.apiKey) {
							new Notice("请输入API密钥");
							return;
						}

						try {
							this.plugin.setApiKey(this.apiKey);
							new Notice("API密钥已保存成功");
							this.onSave?.();
							this.close();
						} catch (error) {
							console.error("保存API密钥失败:", error);
							new Notice("保存API密钥失败，请检查设置");
						}
					}),
			)
			.addButton((btn) =>
				btn.setButtonText("取消").onClick(() => {
					this.close();
				}),
			);

		if (this.plugin.getApiKey()) {
			new Setting(contentEl).addButton((btn) =>
				btn
					.setButtonText("删除API密钥")
					.setWarning()
					.onClick(() => {
						this.plugin.deleteApiKey();
						new Notice("API密钥已删除");
						this.onSave?.();
						this.close();
					}),
			);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
