import { App, Modal, Setting } from "obsidian";

export class ConfirmationModal extends Modal {
	constructor(
		app: App,
		private onConfirm: () => void,
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		new Setting(contentEl).setName("确认导出").setHeading();
		contentEl.createEl("p", {
			text: "是否确认导出所有文件？提前请检查被笔记中是否有slug属性",
		});
		contentEl.createEl("p", {
			text: "Slug属性将被用于创建文件夹，确保slug属性唯一",
		});

		const buttonContainer = contentEl.createDiv();
		buttonContainer.addClass("hbe-flex-end", "hbe-gap-sm");

		const cancelButton = buttonContainer.createEl("button", {
			text: "取消",
		});
		const confirmButton = buttonContainer.createEl("button", {
			text: "确认",
		});
		confirmButton.classList.add("mod-cta");

		cancelButton.onclick = () => this.close();
		confirmButton.onclick = () => {
			this.onConfirm();
			this.close();
		};
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
