import { App } from 'obsidian';
import OpenAI from 'openai';
import { HugoBlowfishExporterSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../config/default-settings';
import { MathExporter } from '../components/exporters/mathExporter';
import { MermaidExporter } from '../components/exporters/mermaidExporter';
import { CalloutExporter } from '../components/exporters/calloutExporter';
import { ImageExporter } from '../components/exporters/imageExporter';
import { CoverChooser } from '../components/exporters/coverChooser';
import { WikiLinkExporter } from '../components/exporters/wikiLinkExporter';
import { HugoBlowfishExporterSettingTab } from '../utils/settingsTab';
import { Exporter } from './exporter';
import { Translator } from './translator';
import { GitHandler } from './git-handler';

export default class HugoBlowfishExporter {
    settings: HugoBlowfishExporterSettings;
    mathExporter: MathExporter;
    mermaidExporter: MermaidExporter;
    calloutExporter: CalloutExporter;
    imageExporter: ImageExporter;
    coverChooser: CoverChooser;
    wikiLinkExporter: WikiLinkExporter;
    client: OpenAI;
    exporter: Exporter;
    translator: Translator;
    gitHandler: GitHandler;
    app: App;
    plugin: any;

    constructor(
        app: App,
        plugin: any
    ) {
        this.app = app;
        this.plugin = plugin;
    }

    async initialize() {
        await this.loadSettings();
        
        // 初始化各种导出器
        this.mathExporter = new MathExporter();
        this.mermaidExporter = new MermaidExporter();
        this.calloutExporter = new CalloutExporter();
        this.imageExporter = new ImageExporter(this.app);
        this.coverChooser = new CoverChooser();
        this.wikiLinkExporter = new WikiLinkExporter(this.app);
        
        // 初始化OpenAI客户端
        this.client = new OpenAI({
            baseURL: this.settings.BaseURL,
            apiKey: process.env.API_KEY || '',
            dangerouslyAllowBrowser: true
        });

        // 初始化导出器、翻译器和Git处理器
        this.exporter = new Exporter(this.app, this);
        this.translator = new Translator(this.app, this);
        this.gitHandler = new GitHandler(this.app, this);

        // 添加导出按钮到ribbon
        const ribbonIconEl = this.plugin.addRibbonIcon('arrow-right-from-line', 'Export all the file in vault', (evt: MouseEvent) => {
            this.exporter.exportToHugo();
        });
        ribbonIconEl.addClass('hugo-blowfish-exporter-ribbon-class');

        // 添加导出命令
        this.plugin.addCommand({
            id: 'export-to-hugo-blowfish',
            name: 'Export current note to Hugo Blowfish',
            editorCallback: this.exporter.exportCurrentNote.bind(this.exporter)
        });

        // 添加翻译命令
        this.plugin.addCommand({
            id: 'translate-to-the-other-language',
            name: 'Translate current note to the other language',
            editorCallback: this.translator.translateCurrentNote.bind(this.translator)
        });

        // 添加更改查看命令，类似于git diff
        this.plugin.addCommand({
            id: 'show-diff',
            name: 'Show the diff of export result',
            callback: this.gitHandler.showAllDiff.bind(this.gitHandler)
        });

        // 添加直接推送命令，类似于git push，并且需要用户输入comment
        this.plugin.addCommand({
            id: 'commit-and-push',
            name: 'Commit and push to the remote repository',
            callback: this.gitHandler.commitAndPush.bind(this.gitHandler)
        });

        // 添加设置选项卡
        this.plugin.addSettingTab(new HugoBlowfishExporterSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.plugin.loadData());
    }

    async saveSettings() {
        await this.plugin.saveData(this.settings);
    }
}