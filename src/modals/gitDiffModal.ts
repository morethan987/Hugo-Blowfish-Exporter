import { App, Modal } from 'obsidian';

export class GitDiffModal extends Modal {
    constructor(
        app: App,
        private diffContent: string
    ) {
        super(app);
        this.modalEl.className = 'modal mod-sidebar-layout';
        this.modalEl.addClass("hbe-modal-full");
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
        contentEl.addClass("hbe-block", "hbe-full-width", "hbe-full-height", "hbe-p-lg", "hbe-overflow-auto");
        
        const headerDiv = contentEl.createDiv();
        headerDiv.addClass("hbe-mb-lg");
        headerDiv.createEl('h2', {
            text: '文件变更'
        }).addClass("hbe-text-normal", "hbe-border-bottom", "hbe-pb-sm");

        if (this.diffContent.trim() === '') {
            const noChangesDiv = contentEl.createDiv({
                cls: 'hbe-diff-empty'
            });
            noChangesDiv.createEl('div', { text: '没有发现任何 Markdown 文件的更改' });
            return;
        }

        // 变更统计
        const stats = this.getChangeStats(this.diffContent);
        const statsDiv = contentEl.createDiv({
            cls: 'hbe-diff-stats'
        });

        if (stats.modified > 0) {
            statsDiv.createEl('div', {
                text: `已修改: ${stats.modified} 个文件`
            });
        }
        if (stats.new > 0) {
            statsDiv.createEl('div', {
                text: `新增: ${stats.new} 个文件`
            }).addClass("hbe-text-accent");
        }

        // 将差异内容按文件分组
        const files: { fileName: string; content: string[]; isNew: boolean }[] = [];
        const lines = this.diffContent.split('\n');
        let currentFile: { fileName: string; content: string[]; isNew: boolean } | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;
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
            // 文件容器
            const fileContainer = contentEl.createDiv({
                cls: 'hbe-diff-file'
            });

            // 文件标题
            const titleContainer = fileContainer.createDiv({
                cls: 'hbe-diff-file-header'
            });
            titleContainer.addClass("hbe-flex-row", "hbe-items-center", "hbe-gap-sm");

            titleContainer.createSpan({
                text: file.fileName
            });
            if (file.isNew) {
                titleContainer.createSpan({
                    text: ' (新文件)'
                }).addClass("hbe-text-accent", "hbe-text-sm");
            }

            // 文件内容
             const contentContainer = fileContainer.createEl('pre', {
                 cls: 'hbe-diff-pre'
             });

             for (const line of file.content) {
                 if (line.startsWith('+++') || line.startsWith('---')) {
                     // 直接去掉文件头信息行
                     continue;
                 } else if (line.startsWith('+')) {
                     contentContainer.createEl('span', {
                         text: line,
                         cls: 'hbe-diff-added'
                     });
                 } else if (line.startsWith('-')) {
                     contentContainer.createEl('span', {
                         text: line,
                         cls: 'hbe-diff-removed'
                     });
                 } else {
                     contentContainer.createEl('span', {
                         text: line + '\n'
                     });
                 }
             }
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}