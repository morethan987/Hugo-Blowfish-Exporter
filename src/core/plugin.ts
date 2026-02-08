import { App, Plugin, Platform } from "obsidian";
import OpenAI from "openai";
import { HugoBlowfishExporterSettings } from "types/settings";
import { DEFAULT_SETTINGS } from "config/default-settings";
import { CoverChooser } from "components/rules/hugo_blowfish/coverChooser";
import { HugoBlowfishExporterSettingTab } from "modals/settingsTab";
import { Exporter } from "./exporter";
import { Translator } from "./translator";
import { GitHandler } from "./git-handler";

export default class HugoBlowfishExporter {
	currentOS: string;
	settings: HugoBlowfishExporterSettings;
	coverChooser: CoverChooser;
	client: OpenAI;
	exporter: Exporter;
	translator: Translator;
	gitHandler: GitHandler;
	app: App;
	plugin: Plugin;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
	}

	async initialize() {
		await this.loadSettings();

		// 检测操作系统变化
		if (Platform.isWin) {
			this.settings.translatedExportPath =
				this.settings.translatedExportPathWindows;
			this.settings.exportPath = this.settings.exportPathWindows;
			this.currentOS = "Windows";
		} else {
			this.settings.translatedExportPath =
				this.settings.translatedExportPathLinux;
			this.settings.exportPath = this.settings.exportPathLinux;
			this.currentOS = "Linux";
		}

		// 这里可以安全地使用 await
		await this.saveSettings();

		// 初始化封面导出器
		this.coverChooser = new CoverChooser();

		// 初始化OpenAI客户端
		this.client = new OpenAI({
			baseURL: this.settings.BaseURL,
			apiKey: this.settings.ApiKey || "",
			dangerouslyAllowBrowser: true,
		});

		// 初始化导出器、翻译器和Git处理器
		this.exporter = new Exporter(this.app, this);
		this.translator = new Translator(this.app, this);
		this.gitHandler = new GitHandler(this.app, this);

		// 添加导出按钮到ribbon
		const ribbonIconEl = this.plugin.addRibbonIcon(
			"arrow-right-from-line",
			"Export all the file in vault",
			async (evt: MouseEvent) => {
				await this.exporter.exportAllNotesToHugo();
			},
		);
		ribbonIconEl.addClass("hugo-blowfish-exporter-ribbon-class");

		// 添加导出命令
		this.plugin.addCommand({
			id: "export-to-hugo-blowfish",
			name: "Export to hugo blowfish",
			editorCallback: this.exporter.exportCurrentNote2Hugo.bind(
				this.exporter,
			),
		});
		this.plugin.addCommand({
			id: "export-to-wechat-post",
			name: "Export to wechat post",
			editorCallback: this.exporter.exportCurrentNote2Wechat.bind(
				this.exporter,
			),
		});

		// 添加全文翻译命令
		this.plugin.addCommand({
			id: "translate-to-the-other-language",
			name: "Translate whole note",
			editorCallback: this.translator.translateCurrentNote.bind(
				this.translator,
			),
		});

		// 添加差异翻译命令
		this.plugin.addCommand({
			id: "translate-diff-to-the-other-language",
			name: "Translate diff",
			editorCallback: this.translator.translateDifference.bind(
				this.translator,
			),
		});

		// 添加行对齐命令
		this.plugin.addCommand({
			id: "align-lines",
			name: "Line alignment",
			editorCallback: this.translator.alignCurrentNote.bind(
				this.translator,
			),
		});

		// 添加更改查看命令，类似于git diff
		this.plugin.addCommand({
			id: "show-diff",
			name: "Show diff",
			callback: this.gitHandler.showAllDiff.bind(this.gitHandler),
		});

		// 添加直接推送命令，类似于git push，并且需要用户输入comment
		this.plugin.addCommand({
			id: "commit-and-push",
			name: "Commit and push",
			callback: this.gitHandler.commitAndPush.bind(this.gitHandler),
		});

		// 添加设置选项卡
		this.plugin.addSettingTab(
			new HugoBlowfishExporterSettingTab(this.app, this),
		);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.plugin.loadData()) ?? {},
		) as HugoBlowfishExporterSettings;
	}

	async saveSettings() {
		await this.plugin.saveData(this.settings);
	}
}
