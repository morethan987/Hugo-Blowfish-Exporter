import { App, Editor, MarkdownView, Notice } from "obsidian";
import * as path from "path";
import * as fs from "fs";
import juice from "juice";
import { get_error_message, get_error_stack } from "utils";
import HugoBlowfishExporter from "./plugin";
import {
	ConfirmationModal,
	BatchExportModal,
	ExportNameModal,
	WechatStyleModal,
} from "modals";
import { ASTProcessor, UserContext } from "components/ast/main";
import {
	imageRuleHugo,
	mathRuleHugo,
	wikiLinkRuleHugo,
	mermaidRuleHugo,
} from "components/rules/hugo_blowfish";
import {
	calloutRuleWechat,
	imageRuleWechat,
	mathRuleWechat,
	wikiLinkRuleWechat,
	codeRuleWechat,
} from "components/rules/wechat_post";

export class Exporter {
	constructor(
		private app: App,
		private plugin: HugoBlowfishExporter,
	) {}

	/////////////////// Hugo Start ///////////////////
	async exportCurrentNote2Hugo(editor: Editor, view: MarkdownView) {
		try {
			const currentFile = view.file;
			if (!currentFile) {
				new Notice("没有打开的文件");
				return;
			}

			// 获取文件的元数据并检测必要字段
			const metadata = this.app.metadataCache.getFileCache(currentFile);
			if (!metadata?.frontmatter?.slug) {
				new Notice(
					"⚠️ 当前文件缺少 slug 属性，请在 frontmatter 中添加 slug 字段",
				);
				return;
			}
			const slug = metadata.frontmatter.slug as string;
			if (!metadata?.frontmatter?.language) {
				new Notice(
					"⚠️ 当前文件缺少 language 属性，请在 frontmatter 中添加 language 字段",
				);
				return;
			}

			// 读取文件内容并修改
			const content = await this.app.vault.read(currentFile);
			const modifiedContent = await this.convertToHugoMd(
				content,
				metadata.frontmatter,
			);

			// 根据slug创建目标目录
			let exportDir = path.resolve(this.plugin.settings.exportPath);
			exportDir = path.join(exportDir, this.plugin.settings.blogPath);
			const slugDir = path.join(exportDir, slug);
			if (!fs.existsSync(slugDir)) {
				fs.mkdirSync(slugDir, { recursive: true });
			}

			let fileName: string;
			if (this.plugin.settings.useDefaultExportName) {
				// 替换文件名中的占位符
				fileName = this.plugin.settings.defaultExportName_zh_cn; // 默认中文名
				if (metadata.frontmatter.language === "en") {
					fileName = this.plugin.settings.defaultExportName_en;
				}
				fileName = fileName.replace("{{title}}", currentFile.basename);
			} else {
				// 使用对话框获取文件名
				fileName = await new Promise((resolve) => {
					new ExportNameModal(
						this.app,
						currentFile.basename,
						(name) => {
							resolve(name);
						},
					).open();
				});
			}

			// 构建完整的输出路径
			const outputPath = path.join(slugDir, `${fileName}.md`);

			// 写入文件
			fs.writeFileSync(outputPath, modifiedContent, "utf8");

			// 自动选择博客封面
			await this.plugin.coverChooser.chooseCover(
				this.plugin.settings,
				slugDir,
			);

			// 显示成功提示
			new Notice(`✅ 导出成功!\n文件已保存至:\n${outputPath}`, 5000);
		} catch (error) {
			new Notice(`❌ 导出失败: ${get_error_message(error)}`, 5000);
			console.error("Export error:", error);
		}
	}

	async exportAllNotesToHugo() {
		new ConfirmationModal(this.app, () => {
			void this.handleBatchExport();
		}).open();
	}

	private async handleBatchExport(): Promise<void> {
		try {
			const batchExporter = new BatchExportModal(
				this.app,
				this.plugin.settings,
				this.convertToHugoMd.bind(this),
			);
			await batchExporter.export();
		} catch (error) {
			new Notice(`导出失败: ${get_error_message(error)}`);
			console.error("Export error:", error);
		}
	}

	async convertToHugoMd(
		content: string,
		frontmatter: Record<string, unknown>,
	): Promise<string> {
		try {
			const slug = frontmatter.slug as string;
			const lang = frontmatter.language as string;
			
			const context: UserContext = {
				data: {
					app: this.app,
					settings: this.plugin.settings,
					slug,
					lang,
				},
			};
			
			const processor = new ASTProcessor(context);
			// 将 processor 挂载到 data 中供规则使用
			context.data.processor = processor;
			
			processor.addRules([
				...mathRuleHugo,
				imageRuleHugo,
				...wikiLinkRuleHugo,
				mermaidRuleHugo,
			]);
			
			return processor.processToString(content, context);
		} catch (error) {
			console.error("Error modifying content:", error);
			return content;
		}
	}
	/////////////////// Hugo End ///////////////////

	/////////////////// Wechat Start ///////////////////
	async exportCurrentNote2Wechat(editor: Editor, view: MarkdownView) {
		try {
			const currentFile = view.file;
			if (!currentFile) {
				new Notice("没有打开的文件");
				return;
			}

			// 获取文件的元数据并检测必要字段
			const metadata = this.app.metadataCache.getFileCache(currentFile);
			if (!metadata?.frontmatter?.slug) {
				new Notice(
					"⚠️ 当前文件缺少 slug 属性，请在 frontmatter 中添加 slug 字段",
				);
				return;
			}
			if (!metadata?.frontmatter?.language) {
				new Notice(
					"⚠️ 当前文件缺少 language 属性，请在 frontmatter 中添加 language 字段",
				);
				return;
			}

			// 读取文件内容并转换为HTML
			const content = await this.app.vault.read(currentFile);
			let htmlContent = await this.convertToWechatHtml(
				content,
				metadata.frontmatter,
			);
			// console.log("htmlContent:\n", htmlContent);

			// 打开样式选择模态框
			const styleModal = new WechatStyleModal(
				this.app,
				this.plugin.plugin, // 传递插件实例
				htmlContent,
				(selectedCss: string) => {
					void this.handleWechatExport(htmlContent, selectedCss);
				},
			);

			styleModal.open();
		} catch (error) {
			new Notice(`❌ 导出失败: ${get_error_message(error)}`, 5000);
			console.error("Export error:", error);
		}
	}

	private async handleWechatExport(
		htmlContent: string,
		selectedCss: string,
	): Promise<void> {
		try {
			// 使用juice处理HTML和CSS
			const result = juice.inlineContent(htmlContent, selectedCss);

			// 复制到剪贴板
			const clipData = new ClipboardItem({
				"text/html": new Blob([result], {
					type: "text/html",
				}),
			});

			await navigator.clipboard.write([clipData]);
			new Notice(`✅ 导出成功！已复制到剪贴板`, 5000);
		} catch (clipboardError) {
			console.error("Clipboard error:", get_error_stack(clipboardError));
			new Notice(
				`❌ 复制到剪贴板失败: ${get_error_message(clipboardError)}`,
				5000,
			);
		}
	}

	async convertToWechatHtml(
		content: string,
		frontmatter: Record<string, unknown>,
	): Promise<string> {
		try {
			const slug = frontmatter.slug as string;
			const lang = frontmatter.language as string;
			
			const context: UserContext = {
				data: {
					app: this.app,
					settings: this.plugin.settings,
					slug,
					lang,
					imageFiles: [],
				},
			};
			
			const processor = new ASTProcessor(context);
			// 将 processor 挂载到 data 中供规则使用
			context.data.processor = processor;
			
			processor.addRules([
				calloutRuleWechat,
				...mathRuleWechat,
				imageRuleWechat,
				...wikiLinkRuleWechat,
				...codeRuleWechat,
			]);
			
			return processor.processToHtml(content, context);
		} catch (error) {
			console.error("Error converting to HTML:", error);
			return `<p>转换错误: ${get_error_message(error)}</p>`;
		}
	}
	/////////////////// Wechat End ///////////////////
}
