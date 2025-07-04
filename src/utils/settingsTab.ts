import { App, PluginSettingTab, Setting } from 'obsidian';
import { ApiKeyModal } from 'src/utils/apiKeyModal';
import HugoBlowfishExporter from 'src/core/plugin';

export class HugoBlowfishExporterSettingTab extends PluginSettingTab {
    plugin: HugoBlowfishExporter;
    mainPlugin: any;

    constructor(app: App, plugin: HugoBlowfishExporter) {
        super(app, plugin.plugin);
        this.plugin = plugin;
        this.mainPlugin = plugin.plugin;
        
        // 自动检测操作系统
        const platform = process.platform;
        const detectedOS = platform === 'win32' ? 'Windows' : 'Linux';
        
        // 如果检测到的操作系统与当前设置不同，则更新设置
        if (this.plugin.settings.currentOS !== detectedOS) {
            this.plugin.settings.currentOS = detectedOS;
            if (detectedOS === 'Windows') {
                this.plugin.settings.translatedExportPath = this.plugin.settings.translatedExportPathWindows;
                this.plugin.settings.exportPath = this.plugin.settings.exportPathWindows;
            } else {
                this.plugin.settings.translatedExportPath = this.plugin.settings.translatedExportPathLinux;
                this.plugin.settings.exportPath = this.plugin.settings.exportPathLinux;
            }
            this.plugin.saveSettings();
        }
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.createEl('h1', { text: '环境设置' });

        new Setting(containerEl)
            .setName('当前操作系统')
            .setDesc('系统自动检测到的操作系统类型')
            .addText(text => text
                .setValue(this.plugin.settings.currentOS)
                .setDisabled(true));

        containerEl.createEl('h1', { text: '翻译设置' });

        new Setting(containerEl)
            .setName('翻译文件导出路径')
            .setDesc('设置翻译后的文件保存路径（绝对路径）')
            .addText(text => text
                .setPlaceholder(this.plugin.settings.currentOS === 'Windows' ? 'E:/Translations' : '/home/user/translations')
                .setValue(this.plugin.settings.translatedExportPath)
                .onChange(async (value) => {
                    // 同时更新当前路径和对应操作系统的路径
                    this.plugin.settings.translatedExportPath = value;
                    if (this.plugin.settings.currentOS === 'Windows') {
                        this.plugin.settings.translatedExportPathWindows = value;
                    } else {
                        this.plugin.settings.translatedExportPathLinux = value;
                    }
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('translated-export-path-setting');
        
        new Setting(containerEl)
            .setName('BaseURL')
            .setDesc('设置用于翻译功能的大模型BaseURL，OpenAI兼容的都可以，默认指向DeepSeek')
            .addText(text => text
                .setPlaceholder('your base url')
                .setValue(this.plugin.settings.BaseURL)
                .onChange(async (value) => {
                    this.plugin.settings.BaseURL = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('baseurl-setting');
                
        const apiKeySetting = new Setting(containerEl)
            .setName('API密钥')
            .setDesc(`设置用于翻译功能的大模型API密钥${this.plugin.settings.ApiKey ? ' (已设置)' : ' (未设置)'}`)
            .addButton(button => button
                .setButtonText(this.plugin.settings.ApiKey ? '修改API密钥' : '设置API密钥')
                .setCta()
                .onClick(() => {
                    new ApiKeyModal(this.app, this.plugin, () => {
                        // 刷新API密钥设置的显示
                        this.refreshApiKeySetting(apiKeySetting);
                    }).open();
                }));
        
        apiKeySetting.settingEl.addClass('api-key-setting');
        
        new Setting(containerEl)
            .setName('模型名称')
            .setDesc('设置用于翻译功能的模型名称')
            .addText(text => text
                .setPlaceholder('your model name')
                .setValue(this.plugin.settings.ModelName)
                .onChange(async (value) => {
                    this.plugin.settings.ModelName = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('model-name-setting');

        new Setting(containerEl)
            .setName('翻译文件前缀')
            .setDesc('设置翻译后文件的文件名前缀，默认为空')
            .addText(text => text
                .setPlaceholder('')
                .setValue(this.plugin.settings.translatedFilePrefix)
                .onChange(async (value) => {
                    this.plugin.settings.translatedFilePrefix = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('翻译后自动导出')
            .setDesc('翻译后将使用默认文件名直接导出')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.directExportAfterTranslation)
                .onChange(async (value) => {
                    this.plugin.settings.directExportAfterTranslation = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('direct-export-setting');
                
        containerEl.createEl('h1', { text: '导出设置' });

        new Setting(containerEl)
            .setName('网站内容目录')
            .setDesc('设置content文件夹在磁盘中的绝对路径')
            .addText(text => text
                .setPlaceholder('E:/Hugo/morethan987/content')
                .setValue(this.plugin.settings.exportPath)
                .onChange(async (value) => {
                    // 同时更新当前路径和对应操作系统的路径
                    this.plugin.settings.exportPath = value;
                    if (this.plugin.settings.currentOS === 'Windows') {
                        this.plugin.settings.exportPathWindows = value;
                    } else {
                        this.plugin.settings.exportPathLinux = value;
                    }
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('export-path-setting');

        new Setting(containerEl)
            .setName('图片导出路径')
            .setDesc('设置导出图片所在文件夹名称')
            .addText(text => text
                .setPlaceholder('img')
                .setValue(this.plugin.settings.imageExportPath)
                .onChange(async (value) => {
                    this.plugin.settings.imageExportPath = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('image-path-setting');
        
        new Setting(containerEl)
            .setName('博客存放文件夹')
            .setDesc('设置博客存放文件夹（相对于content文件夹）')
            .addText(text => text
                .setPlaceholder('posts')
                .setValue(this.plugin.settings.blogPath)
                .onChange(async (value) => {
                    this.plugin.settings.blogPath = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('blog-path-setting');
        
        new Setting(containerEl)
            .setName('封面图片文件夹')
            .setDesc('设置封面图片文件夹（相对于content文件夹）')
            .addText(text => text
                .setPlaceholder('.featured')
                .setValue(this.plugin.settings.coverPath)
                .onChange(async (value) => {
                    this.plugin.settings.coverPath = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('blog-path-setting');

        new Setting(containerEl)
            .setName('使用默认导出文件名')
            .setDesc('启用后将使用默认文件名直接导出，不再弹出文件名输入框')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useDefaultExportName)
                .onChange(async (value) => {
                    this.plugin.settings.useDefaultExportName = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('default-name-toggle-setting');

        new Setting(containerEl)
            .setName('中文版面默认导出文件名')
            .setDesc('设置中文版面默认的导出文件名，支持使用 {{title}} 作为文件名占位符')
            .addText(text => text
                .setPlaceholder('index.zh-cn')
                .setValue(this.plugin.settings.defaultExportName_zh_cn)
                .onChange(async (value) => {
                    this.plugin.settings.defaultExportName_zh_cn = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('default-name-setting');
        
        new Setting(containerEl)
        .setName('英文版面默认导出文件名')
        .setDesc('设置英文版面默认的导出文件名，支持使用 {{title}} 作为文件名占位符')
        .addText(text => text
            .setPlaceholder('index.en')
            .setValue(this.plugin.settings.defaultExportName_en)
            .onChange(async (value) => {
                this.plugin.settings.defaultExportName_en = value;
                await this.plugin.saveSettings();
            }))
        .settingEl.addClass('default-name-setting');

        new Setting(containerEl)
            .setName('使用默认展示性链接语言版本')
            .setDesc('启用后将使用默认文件名，不再弹出文件名输入框')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useDefaultDispName)
                .onChange(async (value) => {
                    this.plugin.settings.useDefaultDispName = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('default-disp-name-toggle-setting');

        new Setting(containerEl)
            .setName('中文默认展示性链接语言版本')
            .setDesc('设置中文默认的展示性链接语言版本，其实就是您的网站下不同语言文章的文件名')
            .addText(text => text
                .setPlaceholder('index.zh-cn.md')
                .setValue(this.plugin.settings.defaultDispName_zh_cn)
                .onChange(async (value) => {
                    this.plugin.settings.defaultDispName_zh_cn = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('default-disp-name-setting');
        
        new Setting(containerEl)
        .setName('英文默认展示性链接语言版本')
        .setDesc('设置英文默认的展示性链接语言版本，其实就是您的网站下不同语言文章的文件名')
        .addText(text => text
            .setPlaceholder('index.en.md')
            .setValue(this.plugin.settings.defaultDispName_en)
            .onChange(async (value) => {
                this.plugin.settings.defaultDispName_en = value;
                await this.plugin.saveSettings();
            }))
        .settingEl.addClass('default-disp-name-setting');
    }

    private refreshApiKeySetting(apiKeySetting: Setting) {
        // 更新描述文本
        apiKeySetting.setDesc(`设置用于翻译功能的大模型API密钥${this.plugin.settings.ApiKey ? ' (已设置)' : ' (未设置)'}`);
        
        // 更新按钮文本
        const buttonEl = apiKeySetting.controlEl.querySelector('button');
        if (buttonEl) {
            buttonEl.textContent = this.plugin.settings.ApiKey ? '修改API密钥' : '设置API密钥';
        }
    }
}
