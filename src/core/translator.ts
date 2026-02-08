import { App, MarkdownView, Notice } from "obsidian";
import HugoBlowfishExporter from "./plugin";
import { get_error_message, get_error_stack } from "utils";
import {
	TranslationValidator,
	TranslationApiClient,
	TranslationFileOperations,
	DirectExportHelper,
	FileUpdater,
	LineAlignment,
	DiffValidator,
	DiffProcessor,
	determineTargetFilePath,
} from "../components/translators";
import { existsSync } from "fs";
import { readFile } from "fs/promises";

export class Translator {
	private validator: TranslationValidator;
	private apiClient: TranslationApiClient;
	private fileOps: TranslationFileOperations;
	private directExport: DirectExportHelper;
	private fileUpdater: FileUpdater;
	private diffValidator: DiffValidator;
	private diffProcessor: DiffProcessor;
	private lineAlignment: LineAlignment;

	constructor(
		private app: App,
		private plugin: HugoBlowfishExporter,
	) {
		this.validator = new TranslationValidator(plugin);
		this.apiClient = new TranslationApiClient(plugin);
		this.fileOps = new TranslationFileOperations(plugin);
		this.directExport = new DirectExportHelper(plugin, app);
		this.fileUpdater = new FileUpdater(plugin, app);
		this.diffValidator = new DiffValidator(app, plugin);
		this.diffProcessor = new DiffProcessor(this.apiClient);
		this.lineAlignment = new LineAlignment(app, plugin);
	}

	async translateCurrentNote() {
		let notice: Notice | null = null;

		try {
			// 验证配置
			if (!this.validator.validateConfiguration()) {
				return;
			}

			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView) {
				new Notice("没有打开的文件");
				return;
			}

			const currentFile = activeView.file;
			if (!currentFile) {
				new Notice("无法获取当前文件");
				return;
			}

			// 获取文件的元数据和内容
			const metadata = this.app.metadataCache.getFileCache(currentFile);
			// 更新targetLanguage设置
			if (metadata && metadata.frontmatter) {
				if (metadata.frontmatter.language) {
					this.plugin.settings.targetLanguage =
						metadata.frontmatter.language === "zh-cn"
							? "en"
							: "zh-cn";
					await this.plugin.saveSettings();
				}
			}
			const content = await this.app.vault.read(currentFile);
			console.debug("📄 [Translator.whole_note] 当前文件内容:", content);

			notice = new Notice("开始翻译...", 0);

			// 翻译标题
			notice.setMessage("正在翻译标题...");
			const translatedTitle = await this.apiClient.translateTitle(
				currentFile.basename,
			);

			// 翻译内容
			notice.setMessage("正在翻译内容...");
			const translatedContent = await this.apiClient.translateContent(
				content,
				true,
			);
			console.debug(
				"✅ [Translator.whole_note] 翻译完成:",
				translatedContent,
			);

			// 修正元数据中的language标签
			let correctedContent = translatedContent;
			const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
			const frontmatterMatch = translatedContent.match(frontmatterRegex);

			if (frontmatterMatch) {
				const frontmatter = frontmatterMatch[1];
				// 匹配language字段并替换其值
				const languageRegex =
					/^(\s*language\s*:\s*)(['"]?)([^'"\n]+)\2(\s*)$/m;
				const languageMatch = frontmatter?.match(languageRegex);

				if (languageMatch && frontmatter) {
					const newFrontmatter = frontmatter.replace(
						languageRegex,
						`$1$2${this.plugin.settings.targetLanguage}$2$4`,
					);
					correctedContent = translatedContent.replace(
						frontmatterMatch[0],
						`---\n${newFrontmatter}\n---`,
					);
					console.debug(
						"✅ [Translator.whole_note] 已修正language标签:",
						this.plugin.settings.targetLanguage,
					);
				} else {
					console.debug(
						"⚠️ [Translator.whole_note] 未找到language标签，跳过修正",
					);
				}
			} else {
				console.debug(
					"⚠️ [Translator.whole_note] 未找到frontmatter，跳过language标签修正",
				);
			}

			// 保存翻译文件
			notice.setMessage("正在保存翻译结果...");
			const translatedFilePath = this.fileOps.saveTranslatedFile(
				translatedTitle,
				correctedContent,
			);

			// 行对齐处理
			notice.setMessage("正在执行行对齐...");
			try {
				// 使用当前文件内容进行行对齐
				await this.lineAlignment.alignFiles(
					content,
					translatedFilePath,
				);
			} catch (alignError) {
				new Notice("❌行对齐处理失败，请手动调整", 5000);
				console.error(
					"⚠️ [Translator] 行对齐处理失败，继续执行:",
					get_error_message(alignError),
				);
				return;
			}

			notice.hide();
			new Notice(
				`✅ 翻译完成！\n文件已保存至:\n${translatedFilePath}`,
				5000,
			);

			// 检查是否需要直接导出
			if (this.plugin.settings.directExportAfterTranslation) {
				await this.directExport.executeDirectExport(
					correctedContent,
					metadata,
					translatedTitle,
				);
			}
		} catch (error) {
			if (notice) {
				notice.hide();
			}
			new Notice(`❌ 翻译失败: ${get_error_message(error)}`, 5000);
		}
	}

	async translateDifference() {
		let notice: Notice | null = null;

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice("没有打开的文件");
			return;
		}

		const currentFile = activeView.file;
		if (!currentFile) {
			new Notice("无法获取当前文件");
			return;
		}

		// 获取文件的元数据和内容
		const metadata = this.app.metadataCache.getFileCache(currentFile);
		// 更新targetLanguage设置
		if (metadata && metadata.frontmatter) {
			if (metadata.frontmatter.language) {
				this.plugin.settings.targetLanguage =
					metadata.frontmatter.language === "zh-cn" ? "en" : "zh-cn";
				await this.plugin.saveSettings();
			}
		}

		try {
			console.debug("🚀 [Translator] 开始差异翻译流程");

			// 验证配置
			if (!this.validator.validateConfiguration()) {
				console.debug("❌ [Translator] 配置验证失败");
				return;
			}

			notice = new Notice("开始差异翻译...", 0);

			// 验证差异翻译的前置条件
			console.debug("🔍 [Translator] 验证差异翻译前置条件...");
			const validationResult =
				await this.diffValidator.validateDiffTranslation();
			if (!validationResult) {
				console.debug("❌ [Translator] 差异翻译前置条件验证失败");
				notice.hide();
				return;
			}

			const { diffResult, targetFilePath } = validationResult;
			console.debug("✅ [Translator] 验证成功:", {
				hasChanges: diffResult.hasChanges,
				changesCount: diffResult.changes.length,
				targetFilePath: targetFilePath,
			});

			// 读取文件内容
			notice.setMessage("正在读取文件内容...");
			console.debug("📖 [Translator] 读取英文文件内容:", targetFilePath);
			const englishContent = await this.readFileContent(targetFilePath);
			console.debug(
				"📄 [Translator] 文件内容长度:",
				englishContent.length,
			);

			// 处理差异内容
			notice.setMessage("正在处理差异内容...");
			console.debug("🔄 [Translator] 开始处理差异内容...");
			const updates = await this.diffProcessor.processDiffChanges(
				diffResult.changes,
			);
			console.debug(
				"✅ [Translator] 差异处理完成，更新数量:",
				updates.length,
			);

			// 应用更新
			notice.setMessage("正在保存更新...");
			console.debug("💾 [Translator] 开始应用更新到目标文件...");
			await this.fileUpdater.updateTargetFile(targetFilePath, updates);
			console.debug("✅ [Translator] 文件更新完成");

			// 检查是否需要行对齐
			const needsLineAlignment =
				await this.diffValidator.checkLineAlignment(targetFilePath);
			console.debug(
				"🔍 [Translator] 检查是否需要行对齐:",
				needsLineAlignment,
			);

			if (needsLineAlignment === null) {
				console.debug("❌ [Translator] 行对齐检查失败");
				notice.hide();
				new Notice("行对齐检查失败，请手动检查文件", 5000);
				return;
			}

			// 如果需要行对齐，先执行行对齐
			if (needsLineAlignment === true) {
				notice.setMessage("正在执行行对齐...");
				console.debug("🔄 [Translator] 开始执行行对齐...");
				try {
					const activeView =
						this.app.workspace.getActiveViewOfType(MarkdownView);
					if (activeView && activeView.file) {
						const currentContent = await this.app.vault.read(
							activeView.file,
						);
						await this.lineAlignment.alignFiles(
							currentContent,
							targetFilePath,
						);
						console.debug("✅ [Translator] 行对齐完成");
					}
				} catch (alignError) {
					console.error(
						"❌ [Translator] 行对齐失败:",
						get_error_message(alignError),
					);
					new Notice(
						`❌ 行对齐失败: ${get_error_message(alignError)}}\n请手动进行对齐操作`,
						5000,
					);
					return;
				}
			}

			// 检查是否需要直接导出
			if (this.plugin.settings.directExportAfterTranslation) {
				notice.setMessage("正在执行直接导出...");
				console.debug("📤 [Translator] 开始执行直接导出...");
				try {
					await this.directExport.executeDirectExportFromFile(
						targetFilePath,
					);
					console.debug("✅ [Translator] 直接导出完成");
				} catch (exportError) {
					console.warn(
						"⚠️ [Translator] 直接导出失败:",
						get_error_message(exportError),
					);
					// 直接导出失败不影响主流程
				}
			}

			notice.hide();
			console.debug("🎉 [Translator] 差异翻译流程完成");
			new Notice(
				`✅ 差异翻译完成！\n已更新文件: ${targetFilePath}`,
				8000,
			);
		} catch (error) {
			console.error("❌ [Translator] 差异翻译流程失败:", error);
			console.error("📊 [Translator] 错误堆栈:", get_error_stack(error));

			if (notice) {
				notice.hide();
			}
			new Notice(`❌ 差异翻译失败: ${get_error_message(error)}`, 5000);
		}
	}

	/**
	 * 执行行对齐操作
	 */
	async alignCurrentNote() {
		let notice: Notice | null = null;

		try {
			// 验证配置
			if (!this.validator.validateConfiguration()) {
				return;
			}

			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView) {
				new Notice("没有打开的文件");
				return;
			}

			const currentFile = activeView.file;
			if (!currentFile) {
				new Notice("无法获取当前文件");
				return;
			}

			// 获取当前文件内容
			const content = await this.app.vault.read(currentFile);

			notice = new Notice("开始行对齐...", 0);

			// 根据当前文件确定翻译文件路径
			const translatedFilePath = await determineTargetFilePath(
				currentFile.path,
				this.plugin,
			);

			// 检查翻译文件是否存在
			if (!translatedFilePath || !existsSync(translatedFilePath)) {
				notice.hide();
				new Notice(`❌ 翻译文件不存在: ${translatedFilePath}`, 5000);
				return;
			}

			// 执行行对齐
			notice.setMessage("正在执行行对齐...");
			await this.lineAlignment.alignFiles(content, translatedFilePath);

			notice.hide();
			new Notice(`✅ 行对齐完成！\n文件: ${translatedFilePath}`, 5000);
		} catch (error) {
			if (notice) {
				notice.hide();
			}
			new Notice(`❌ 行对齐失败: ${get_error_message(error)}`, 5000);
		}
	}

	/**
	 * 读取文件内容
	 * @param filePath 文件路径
	 * @returns 文件内容
	 */
	private async readFileContent(filePath: string): Promise<string> {
		try {
			return await readFile(filePath, "utf8");
		} catch (error) {
			throw new Error(
				`无法读取文件: ${filePath} - ${get_error_message(error)}`,
			);
		}
	}
}
