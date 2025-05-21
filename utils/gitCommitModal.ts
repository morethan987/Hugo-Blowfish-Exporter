import { App, Modal, Notice } from 'obsidian';

export class GitCommitModal extends Modal {
    private commitMessage: string;
    private onSubmit: (message: string) => void;
    private inputEl: HTMLInputElement;

    constructor(app: App, onSubmit: (message: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
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
                submitAction();
            }
        });

        // 自动聚焦输入框
        this.inputEl.focus();
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}