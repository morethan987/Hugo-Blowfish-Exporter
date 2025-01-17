import { App, PluginSettingTab, Setting } from 'obsidian';
import HugoBlowfishExporter from '../main';

export class HugoBlowfishExporterSettingTab extends PluginSettingTab {
    plugin: HugoBlowfishExporter;

    constructor(app: App, plugin: HugoBlowfishExporter) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('网站内容目录')
            .setDesc('设置content文件夹在磁盘中的绝对路径')
            .addText(text => text
                .setPlaceholder('E:/Hugo/morethan987/content')
                .setValue(this.plugin.settings.exportPath)
                .onChange(async (value) => {
                    this.plugin.settings.exportPath = value;
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
            .setName('默认导出文件名')
            .setDesc('设置默认的导出文件名，支持使用 {{title}} 作为文件名占位符')
            .addText(text => text
                .setPlaceholder('{{title}}')
                .setValue(this.plugin.settings.defaultExportName)
                .onChange(async (value) => {
                    this.plugin.settings.defaultExportName = value;
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
            .setName('默认展示性链接语言版本')
            .setDesc('设置默认的展示性链接语言版本，其实就是您的网站下不同语言文章的文件名')
            .addText(text => text
                .setPlaceholder('index.zh-cn.md')
                .setValue(this.plugin.settings.defaultDispName)
                .onChange(async (value) => {
                    this.plugin.settings.defaultDispName = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('default-disp-name-setting');
    }
}
