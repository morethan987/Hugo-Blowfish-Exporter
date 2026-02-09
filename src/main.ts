import { Plugin } from "obsidian";
import HugoBlowfishExporter from "core/plugin";

export default class MainPlugin extends Plugin {
	private exporter: HugoBlowfishExporter;

	async onload() {
		this.exporter = new HugoBlowfishExporter(this.app, this);
		await this.exporter.initialize();
	}

	onunload() {}
}
