import { App, Modal, Setting, Notice } from 'obsidian';
import HugoBlowfishExporter from 'src/core/plugin';

export class ApiKeyModal extends Modal {
    private apiKey: string;
    private plugin: HugoBlowfishExporter;
    private onSave?: () => void;

    constructor(app: App, plugin: HugoBlowfishExporter, onSave?: () => void) {
        super(app);
        this.plugin = plugin;
        this.apiKey = this.plugin.settings.ApiKey || '';
        this.onSave = onSave;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: '设置API密钥' });

        new Setting(contentEl)
            .setName('API密钥')
            .setDesc('输入您的API密钥，它将被安全地保存在插件设置中')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.apiKey)
                .onChange(value => {
                    this.apiKey = value;
                }));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('保存')
                .setCta()
                .onClick(async () => {
                    if (!this.apiKey) {
                        new Notice('请输入API密钥');
                        return;
                    }

                    try {
                        // 保存到插件设置
                        this.plugin.settings.ApiKey = this.apiKey;
                        await this.plugin.saveSettings();
                        
                        // 重新初始化OpenAI客户端
                        const OpenAI = (await import('openai')).default;
                        this.plugin.client = new OpenAI({
                            baseURL: this.plugin.settings.BaseURL,
                            apiKey: this.plugin.settings.ApiKey,
                            dangerouslyAllowBrowser: true
                        });

                        new Notice('API密钥已保存成功');
                        this.onSave?.(); // 调用回调函数刷新设置页面
                        this.close();
                    } catch (error) {
                        console.error('保存API密钥失败:', error);
                        new Notice('保存API密钥失败，请检查设置');
                    }
                }))
            .addButton(btn => btn
                .setButtonText('取消')
                .onClick(() => {
                    this.close();
                }));

        // 如果已有API密钥，添加删除按钮
        if (this.plugin.settings.ApiKey) {
            new Setting(contentEl)
                .addButton(btn => btn
                    .setButtonText('删除API密钥')
                    .setWarning()
                    .onClick(async () => {
                        this.plugin.settings.ApiKey = '';
                        await this.plugin.saveSettings();
                        
                        // 重新初始化OpenAI客户端（使用空密钥）
                        const OpenAI = (await import('openai')).default;
                        this.plugin.client = new OpenAI({
                            baseURL: this.plugin.settings.BaseURL,
                            apiKey: '',
                            dangerouslyAllowBrowser: true
                        });

                        new Notice('API密钥已删除');
                        this.onSave?.(); // 调用回调函数刷新设置页面
                        this.close();
                    }));
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}