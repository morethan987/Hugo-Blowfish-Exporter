import { App, Modal, Notice } from 'obsidian';
import * as fs from 'fs';

export class CssEditorModal extends Modal {
    private cssContent: string;
    private templateName: string;
    private filePath: string;
    private onSave: () => void;
    private textArea: HTMLTextAreaElement;

    constructor(
        app: App,
        templateName: string,
        filePath: string,
        onSave: () => void
    ) {
        super(app);
        this.templateName = templateName;
        this.filePath = filePath;
        this.onSave = onSave;
        this.loadCssContent();
    }

    private loadCssContent() {
        try {
            this.cssContent = fs.readFileSync(this.filePath, 'utf8');
        } catch (error) {
            console.error('读取CSS文件失败:', error);
            this.cssContent = '/* CSS样式 */\n';
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // 设置模态框大小
        this.modalEl.addClass("hbe-modal-wide");
        contentEl.addClass("hbe-flex-col", "hbe-full-height");

        // 标题
        const header = contentEl.createDiv();
        header.addClass("hbe-flex-between", "hbe-items-center", "hbe-mb-md", "hbe-pb-sm", "hbe-border-bottom");

        header.createEl('h3', { text: `编辑模板: ${this.templateName}` });

        // 工具栏
        const toolbar = header.createDiv();
        toolbar.addClass("hbe-flex-row", "hbe-gap-sm");

        const resetBtn = toolbar.createEl('button', { text: '重置' });
        resetBtn.addClass("hbe-btn-ghost", "hbe-rounded", "hbe-p-sm");
        resetBtn.addEventListener('click', () => this.resetContent());

        const formatBtn = toolbar.createEl('button', { text: '格式化' });
        formatBtn.addClass("hbe-btn-outline", "hbe-text-accent", "hbe-rounded", "hbe-p-sm");
        formatBtn.addEventListener('click', () => this.formatCss());

        // 编辑器容器
        const editorContainer = contentEl.createDiv();
        editorContainer.addClass("hbe-panel-main");
        // eslint-disable-next-line obsidianmd/no-static-styles-assignment
        editorContainer.style.overflow = "hidden"; // Keep overflow hidden for rounded corners

        // 文本编辑器
        this.textArea = editorContainer.createEl('textarea');
        this.textArea.addClass("hbe-textarea-full", "hbe-text-mono");
        this.textArea.value = this.cssContent;

        // 底部按钮
        const buttonContainer = contentEl.createDiv();
        buttonContainer.addClass("hbe-flex-between", "hbe-items-center", "hbe-mt-md", "hbe-pt-sm", "hbe-border-top");

        // 左侧帮助文本
        const helpText = buttonContainer.createEl('div', { 
            text: '提示: 使用 Ctrl+S 快速保存' 
        });
        helpText.addClass("hbe-text-sm", "hbe-text-muted");

        // 右侧按钮组
        const buttons = buttonContainer.createDiv();
        buttons.addClass("hbe-flex-row", "hbe-gap-sm");

        const cancelBtn = buttons.createEl('button', { text: '取消' });
        cancelBtn.addClass("hbe-btn-ghost", "hbe-rounded", "hbe-p-sm");
        cancelBtn.addEventListener('click', () => this.close());

        const saveBtn = buttons.createEl('button', { text: '保存并应用' });
        saveBtn.addClass("hbe-btn-accent", "hbe-rounded", "hbe-p-sm", "hbe-text-bold");
        saveBtn.addEventListener('click', () => this.saveCss());

        // 快捷键支持
        this.textArea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveCss();
            }
            
            // Tab键插入空格
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.textArea.selectionStart;
                const end = this.textArea.selectionEnd;
                const value = this.textArea.value;
                
                this.textArea.value = value.substring(0, start) + '    ' + value.substring(end);
                this.textArea.selectionStart = this.textArea.selectionEnd = start + 4;
            }
        });

        // 自动聚焦
        this.textArea.focus();
    }

    private resetContent() {
        this.loadCssContent();
        this.textArea.value = this.cssContent;
        new Notice('已重置为原始内容');
    }

    private formatCss() {
        try {
            // 简单的CSS格式化
            let formatted = this.textArea.value;
            
            // 在 { 后添加换行和缩进
            formatted = formatted.replace(/\s*{\s*/g, ' {\n    ');
            
            // 在 } 前后添加换行
            formatted = formatted.replace(/\s*}\s*/g, '\n}\n\n');
            
            // 在 ; 后添加换行和缩进
            formatted = formatted.replace(/;\s*/g, ';\n    ');
            
            // 在 , 后添加换行和缩进（选择器）
            formatted = formatted.replace(/,\s*/g, ',\n');
            
            // 清理多余的空行
            formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n');
            
            // 清理开头和结尾的空白
            formatted = formatted.trim();
            
            this.textArea.value = formatted;
             new Notice('CSS已格式化');
             
         } catch {
             new Notice('格式化失败');
         }
    }

    private saveCss() {
        try {
            const newContent = this.textArea.value;
            fs.writeFileSync(this.filePath, newContent, 'utf8');
            new Notice(`模板 "${this.templateName}" 保存成功`);
            this.onSave();
            this.close();
        } catch (error) {
            console.error('保存CSS文件失败:', error);
            new Notice('保存失败');
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}