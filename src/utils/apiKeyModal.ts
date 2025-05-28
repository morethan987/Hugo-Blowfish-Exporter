import { App, Modal, Setting, Notice } from 'obsidian';
import { exec } from 'child_process';

export class ApiKeyModal extends Modal {
    private apiKey: string;

    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: '设置API密钥' });

        new Setting(contentEl)
            .setName('API密钥')
            .setDesc('输入您的API密钥，它将被保存为系统环境变量API_KEY')
            .addText(text => text
                .setPlaceholder('sk-...')
                .onChange(value => {
                    this.apiKey = value;
                }));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('保存')
                .setCta()
                .onClick(() => {
                    if (!this.apiKey) {
                        return;
                    }

                    // 自动检测操作系统
                    const platform = process.platform;

                    if (platform === 'win32') {
                        // Windows: 使用setx命令设置持久化环境变量
                        exec(`setx API_KEY "${this.apiKey}"`, (error, stdout, stderr) => {
                            if (error) {
                                console.error('设置环境变量失败:', error);
                                new Notice('设置环境变量失败，请检查权限');
                                return;
                            }
                            
                            // 设置当前进程的环境变量
                            process.env.API_KEY = this.apiKey;
                            new Notice('API密钥已保存到系统环境变量');
                            this.close();
                        });
                    } else if (platform === 'linux' || platform === 'darwin') {
                        process.env.API_KEY = this.apiKey;

                        const homeDir = require('os').homedir();
                        const shell = process.env.SHELL || '/bin/bash';
                        const configFile = shell.includes('zsh') ? `${homeDir}/.zshrc` : `${homeDir}/.bashrc`;
                        const exportLine = `export API_KEY="${this.apiKey}"`;

                        // 先检查是否已存在，如果存在则替换，否则追加
                        const command = `grep -q "^export API_KEY=" ${configFile} && sed -i 's/^export API_KEY=.*/export API_KEY="${this.apiKey}"/' ${configFile} || echo '${exportLine}' >> ${configFile}`;
                        
                        exec(command, (error, stdout, stderr) => {
                            if (error) {
                                console.error('自动设置失败:', error);
                                new Notice(`API密钥已设置到当前会话\n请手动添加到 ${configFile}:\n${exportLine}`);
                            } else {
                                new Notice(`API密钥已保存到 ${configFile}\n请重新启动终端或执行 source ${configFile}`);
                            }
                            this.close();
                        });
                    } else {
                        console.error('不支持的操作系统:', platform);
                        new Notice('不支持的操作系统');
                    }
                }))
            .addButton(btn => btn
                .setButtonText('取消')
                .onClick(() => {
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}