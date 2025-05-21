import { App, Modal } from 'obsidian';

export class GitDiffModal extends Modal {
    constructor(
        app: App,
        private diffContent: string
    ) {
        super(app);
        this.modalEl.className = 'modal mod-sidebar-layout';
        this.modalEl.style.width = '90vw';  // *******可调整*********
        this.modalEl.style.height = '90vh'; // *******可调整*********
        this.modalEl.style.maxWidth = '100%';
        this.modalEl.style.maxHeight = '100%';
    }

    private getChangeStats(content: string): { modified: number; new: number } {
        const lines = content.split('\n');
        let modified = 0;
        let newFiles = 0;

        for (const line of lines) {
            if (line.startsWith('diff --git')) {
                if (lines[lines.indexOf(line) + 1]?.includes('new file')) {
                    newFiles++;
                } else {
                    modified++;
                }
            }
        }

        return { modified, new: newFiles };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // 设置内容元素样式
        Object.assign(contentEl.style, {
            display: 'block',
            width: '100%',
            height: '100%',
            padding: '20px',
            overflow: 'auto',
            maxHeight: '120vh'
        });
        
        const headerDiv = contentEl.createDiv();
        headerDiv.style.marginBottom = '20px';
        headerDiv.createEl('h2', {
            text: '文件变更',
            attr: { style: 'margin: 0; color: var(--text-normal); border-bottom: 2px solid var(--background-modifier-border); padding-bottom: 10px;' }
        });

        if (this.diffContent.trim() === '') {
            const noChangesDiv = contentEl.createDiv({
                cls: 'no-changes-message',
                attr: {
                    style: 'text-align: center; padding: 40px; color: var(--text-muted);'
                }
            });
            noChangesDiv.createEl('div', { text: '没有发现任何 Markdown 文件的更改' });
            return;
        }

        // 变更统计
        const stats = this.getChangeStats(this.diffContent);
        const statsDiv = contentEl.createDiv({
            cls: 'diff-stats',
            attr: {
                style: 'display: flex; gap: 20px; margin-bottom: 20px; padding: 15px; background-color: var(--background-primary-alt); border-radius: 8px;'
            }
        });

        if (stats.modified > 0) {
            statsDiv.createEl('div', {
                text: `已修改: ${stats.modified} 个文件`,
                attr: { style: 'color: var(--text-normal);' }
            });
        }
        if (stats.new > 0) {
            statsDiv.createEl('div', {
                text: `新增: ${stats.new} 个文件`,
                attr: { style: 'color: var(--text-accent);' }
            });
        }

        // 将差异内容按文件分组
        const files: { fileName: string; content: string[]; isNew: boolean }[] = [];
        const lines = this.diffContent.split('\n');
        let currentFile: { fileName: string; content: string[]; isNew: boolean } | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('diff --git')) {
                if (currentFile) {
                    files.push(currentFile);
                }
                const fileName = line.match(/b\/(.*?)$/)?.[1] || '';
                currentFile = {
                    fileName,
                    content: [],
                    isNew: lines[i + 1]?.includes('new file') || false
                };
                i++; // 跳过下一行的 new file/deleted file/index 信息
            } else if (currentFile && !line.startsWith('index')) {
                currentFile.content.push(line);
            }
        }
        if (currentFile) {
            files.push(currentFile);
        }

        // 为每个文件创建独立的区块
        for (const file of files) {
            // 文件容器，******调整这里就可以改变显示文本的大小******
            const fileContainer = contentEl.createDiv({
                attr: {
                    style: `
                        background-color: var(--background-secondary);
                        border-radius: 8px;
                        overflow: hidden;
                        height: 500px;
                        margin-bottom: 20px;
                        display: block;
                        margin-top: 20px;
                    `
                }
            });

            // 文件标题
            const titleContainer = fileContainer.createDiv({
                attr: {
                    style: 'padding: 10px 15px; background-color: var(--background-secondary-alt); border-bottom: 1px solid var(--background-modifier-border); font-weight: 500;'
                }
            });
            titleContainer.createSpan({
                text: file.fileName,
                attr: { style: 'color: var(--text-normal);' }
            });
            if (file.isNew) {
                titleContainer.createSpan({
                    text: ' (新文件)',
                    attr: { style: 'color: var(--text-accent); margin-left: 8px; font-size: 0.9em;' }
                });
            }

            // 文件内容
            const contentContainer = fileContainer.createEl('pre', {
                attr: {
                    style: `
                        margin: 0;
                        padding: 15px;
                        font-family: var(--font-monospace);
                        font-size: 0.9em;
                        line-height: 1.5;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        overflow: auto;
                        height: 100%;
                    `
                }
            });

            let formattedContent = '';
            for (const line of file.content) {
                if (line.startsWith('+')) {
                    formattedContent += `<span style="display: block; background-color: rgba(0, 255, 0, 0.1);">${line}</span>`;
                } else if (line.startsWith('-')) {
                    formattedContent += `<span style="display: block; background-color: rgba(255, 0, 0, 0.1);">${line}</span>`;
                } else {
                    formattedContent += line + '\n';
                }
            }
            contentContainer.innerHTML = formattedContent;
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}