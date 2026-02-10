import {
	App,
	Modal,
	Notice,
	MarkdownView,
	EditorPosition,
	ButtonComponent,
	TextAreaComponent,
} from "obsidian";

export class GitCommitModal extends Modal {
	private onSubmit: (message: string) => void | Promise<void>;
	private inputComponent!: TextAreaComponent;
	private savedCursorPos: EditorPosition | null = null;
	private savedSelection: string = "";

	constructor(app: App, onSubmit: (message: string) => void | Promise<void>) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		// 1. 保存编辑器状态
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const editor = activeView.editor;
			this.savedCursorPos = editor.getCursor();
			this.savedSelection = editor.getSelection();
		}

		const { contentEl, titleEl, modalEl } = this;

		// 2. 设置弹窗基础样式类，方便 CSS 定制
		modalEl.addClass("hbe-git-commit-modal");
		titleEl.setText("Git 提交");

		contentEl.empty();

		// 3. 创建输入区域容器
		const inputContainer = contentEl.createDiv("hbe-commit-input-wrapper");

		// 描述文字
		inputContainer.createEl("p", {
			text: "请输入本次更新的说明：",
			cls: "hbe-text-muted hbe-mb-sm hbe-text-sm",
		});

		// 4. 使用 TextAreaComponent 构建多行输入框
		this.inputComponent = new TextAreaComponent(inputContainer);
		this.inputComponent
			.setPlaceholder("Update post content")
			.setValue("")
			.onChange(() => {
				// 实时校验逻辑可放在这里
			});

		// 手动添加样式类
		this.inputComponent.inputEl.addClass(
			"hbe-textarea-full",
			"hbe-commit-textarea",
		);
		this.inputComponent.inputEl.rows = 4; // 默认显示4行高度

		// 5. 底部按钮区域
		const buttonContainer = contentEl.createDiv("hbe-modal-footer");

		// 左侧提示信息
		const hintEl = buttonContainer.createDiv("hbe-commit-hint");
		hintEl.createEl("span", { text: "⏎ 换行", cls: "hbe-key-badge" });
		hintEl.createEl("span", {
			text: "Ctrl + ⏎ 提交",
			cls: "hbe-key-badge",
		});

		// 右侧按钮组
		const btnGroup = buttonContainer.createDiv("hbe-btn-group");

		new ButtonComponent(btnGroup)
			.setButtonText("取消")
			.onClick(() => this.close());

		const submitBtn = new ButtonComponent(btnGroup)
			.setButtonText("提交更改")
			.setCta() // 设置为主要按钮样式 (Call To Action)
			.onClick(() => void submitAction());

		// 6. 定义提交动作
		const submitAction = async () => {
			const message = this.inputComponent.getValue().trim();
			if (!message) {
				new Notice("提交信息不能为空");
				// 可以在这里给输入框加个红色边框震动一下的效果
				this.inputComponent.inputEl.addClass("hbe-input-error");
				setTimeout(
					() =>
						this.inputComponent.inputEl.removeClass(
							"hbe-input-error",
						),
					2000,
				);
				return;
			}

			submitBtn.setDisabled(true);
			submitBtn.setButtonText("提交中...");

			this.close();
			try {
				await this.onSubmit(message);
			} catch (error) {
				console.error("Submit action failed:", error);
				new Notice("提交失败，请检查控制台");
			}
		};

		// 7. 键盘事件监听 (支持 Ctrl/Cmd + Enter)
		this.inputComponent.inputEl.addEventListener(
			"keydown",
			(event: KeyboardEvent) => {
				if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
					event.preventDefault();
					void submitAction();
				}
			},
		);

		// 延迟聚焦
		setTimeout(() => {
			this.inputComponent.inputEl.focus();
		}, 50);
	}

	onClose() {
		const { contentEl, modalEl } = this;
		modalEl.removeClass("hbe-git-commit-modal");
		contentEl.empty();

		// 恢复焦点
		setTimeout(() => {
			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView && this.savedCursorPos) {
				const editor = activeView.editor;
				editor.focus();
				editor.setCursor(this.savedCursorPos);
				if (this.savedSelection.length > 0) {
					editor.setSelection(this.savedCursorPos, {
						line: this.savedCursorPos.line,
						ch: this.savedCursorPos.ch + this.savedSelection.length,
					});
				}
			}
		}, 10);
	}
}
