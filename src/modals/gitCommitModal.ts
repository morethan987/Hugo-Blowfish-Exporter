import {
	App,
	Modal,
	Notice,
	MarkdownView,
	EditorPosition,
	Setting,
} from "obsidian";

export class GitCommitModal extends Modal {
	private onSubmit: (message: string) => void | Promise<void>;
	private inputEl!: HTMLInputElement; // 使用 ! 表示会在 onOpen 中初始化
	private savedCursorPos: EditorPosition | null = null;
	private savedSelection: string = "";

	constructor(app: App, onSubmit: (message: string) => void | Promise<void>) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		// 1. 保存当前编辑器状态 (严格类型)
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const editor = activeView.editor;
			this.savedCursorPos = editor.getCursor();
			this.savedSelection = editor.getSelection();
		}

		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "Git 提交" });

		// 2. 使用 Obsidian 的 Setting 组件构建 UI，这样代码更整洁且类型安全
		new Setting(contentEl)
			.setName("提交信息")
			.setDesc("请输入本次更新的说明")
			.addText((text) => {
				this.inputEl = text.inputEl;
				text.setPlaceholder("例如: update post content").onChange(
					() => {
						// 可以在这里做实时校验
					},
				);

				// 样式调整
				this.inputEl.style.width = "100%";
			});

		const buttonContainer = contentEl.createDiv();
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "10px";
		buttonContainer.style.marginTop = "20px";

		const cancelButton = buttonContainer.createEl("button", {
			text: "取消",
		});
		const confirmButton = buttonContainer.createEl("button", {
			text: "提交",
		});
		confirmButton.classList.add("mod-cta");

		// 3. 定义提交动作 (处理异步)
		const submitAction = async () => {
			const message = this.inputEl.value.trim();
			if (!message) {
				new Notice("提交信息不能为空");
				return;
			}

			this.close();

			try {
				// 执行回调（无论同步异步均支持）
				await this.onSubmit(message);
			} catch (error) {
				console.error("Submit action failed:", error);
			}
		};

		cancelButton.onclick = () => this.close();
		confirmButton.onclick = () => {
			void submitAction();
		};

		// 4. 支持回车确认
		this.inputEl.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Enter") {
				event.preventDefault();
				event.stopPropagation();
				void submitAction();
			}
		});

		// 延迟聚焦
		setTimeout(() => {
			if (this.inputEl) this.inputEl.focus();
		}, 50);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();

		// 5. 恢复编辑器状态
		// 使用 setTimeout 确保在 Modal 彻底关闭后恢复焦点
		setTimeout(() => {
			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView && this.savedCursorPos) {
				const editor = activeView.editor;
				editor.focus();
				editor.setCursor(this.savedCursorPos);

				if (this.savedSelection.length > 0) {
					const from = this.savedCursorPos;
					const to: EditorPosition = {
						line: from.line,
						ch: from.ch + this.savedSelection.length,
					};
					editor.setSelection(from, to);
				}
			}
		}, 10);
	}
}
