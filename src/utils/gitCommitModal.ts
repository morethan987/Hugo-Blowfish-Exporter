import { App, Modal, Notice, MarkdownView } from 'obsidian';

export class GitCommitModal extends Modal {
    private commitMessage: string;
    private onSubmit: (message: string) => void;
    private inputEl: HTMLInputElement;
    private savedCursorPos: any;
    private savedSelection: any;

    constructor(app: App, onSubmit: (message: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        // 保存当前编辑器状态
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.editor) {
            this.savedCursorPos = activeView.editor.getCursor();
            this.savedSelection = activeView.editor.getSelection();
        }

        const {contentEl} = this;
        contentEl.empty();

        contentEl.createEl('h2', {text: 'Git提交'});

        // 创建输入框容器
        const inputContainer = contentEl.createDiv();
        inputContainer.style.margin = '1em 0';

        const label = inputContainer.createEl('label', {text: '请输入提交信息：'});
        label.style.display = 'block';
        label.style.marginBottom = '0.5em';

        this.inputEl = inputContainer.createEl('input', {
            type: 'text',
            placeholder: '输入提交信息...'
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
        const confirmButton = buttonContainer.createEl('button', {text: '提交'});
        confirmButton.classList.add('mod-cta');

        // 定义提交动作
        const submitAction = () => {
            const message = this.inputEl.value.trim();
            if (!message) {
                new Notice('提交信息不能为空');
                return;
            }
            this.close();
            this.onSubmit(message);
        };

        // 绑定事件
        cancelButton.onclick = () => this.close();
        confirmButton.onclick = submitAction;

        // 支持回车确认
        this.inputEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // 阻止回车键的默认行为
                event.stopPropagation(); // 阻止事件冒泡
                submitAction();
            }
        });

        // 延迟聚焦输入框，避免与编辑器焦点冲突
        setTimeout(() => {
            this.inputEl.focus();
        }, 50);
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
        
        // 恢复编辑器状态
        setTimeout(() => {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView && activeView.editor) {
                // 恢复光标位置
                if (this.savedCursorPos) {
                    activeView.editor.setCursor(this.savedCursorPos);
                }
                // 恢复选择状态
                if (this.savedSelection && this.savedSelection.length > 0) {
                    const from = this.savedCursorPos;
                    const to = {
                        line: from.line,
                        ch: from.ch + this.savedSelection.length
                    };
                    activeView.editor.setSelection(from, to);
                }
                // 重新聚焦编辑器
                activeView.editor.focus();
            }
        }, 10);
    }
    
}