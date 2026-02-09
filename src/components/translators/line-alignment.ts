import { App } from "obsidian";
import * as fs from "fs";
import { get_error_message } from "utils";
import HugoBlowfishExporter from "core/plugin";

/**
 * 行对齐处理器
 * 用于确保翻译文件与源文件的行结构一致
 */
export class LineAlignment {
	constructor(
		private app: App,
		private plugin: HugoBlowfishExporter,
	) {}

	/**
	 * 对齐两个文件的行结构
	 * @param sourceContent 源文件内容（当前打开的文件内容）
	 * @param targetPath 目标文件路径（翻译后的文件）
	 */
	async alignFiles(sourceContent: string, targetPath: string): Promise<void> {
		try {
			console.debug("🔧 [LineAlignment] 开始行对齐处理");
			console.debug("📄 [LineAlignment] 目标文件:", targetPath);

			if (!targetPath) {
				console.error("❌ [LineAlignment] 目标文件路径不能为空");
				return;
			}

			// 读取目标文件的内容
			const targetContent = await this.readFileContent(targetPath);

			console.debug("📊 [LineAlignment] 文件内容读取完成");

			// 分割成行
			const sourceLines = sourceContent.split("\n");
			const targetLines = targetContent.split("\n");

			console.debug("📈 [LineAlignment] 行数统计:", {
				sourceLines: sourceLines.length,
				targetLines: targetLines.length,
			});

			// 检查是否需要对齐
			if (this.isAligned(sourceLines, targetLines)) {
				console.debug("✅ [LineAlignment] 文件已对齐，无需处理");
				return;
			}

			console.debug("🔄 [LineAlignment] 文件需要对齐，开始处理...");

			// 执行对齐
			const alignedLines = this.performAlignment(
				sourceLines,
				targetLines,
			);

			// 保存对齐后的内容
			const alignedContent = alignedLines.join("\n");
			await this.writeFileContent(targetPath, alignedContent);

			console.debug("✅ [LineAlignment] 行对齐处理完成");
		} catch (error) {
			console.error("❌ [LineAlignment] 行对齐处理失败:", error);
			throw new Error(`行对齐处理失败: ${get_error_message(error)}`);
		}
	}

	/**
	 * 检查两个文件是否已经对齐
	 * @param sourceLines 源文件行数组
	 * @param targetLines 目标文件行数组
	 * @returns 是否已对齐
	 */
	private isAligned(sourceLines: string[], targetLines: string[]): boolean {
		// 行数必须一致
		if (sourceLines.length !== targetLines.length) {
			return false;
		}

		// 检查空行和非空行是否严格对应
		for (let i = 0; i < sourceLines.length; i++) {
			const sourceLine = sourceLines[i];
			const targetLine = targetLines[i];

			// 如果任一行未定义，继续检查下一行
			if (sourceLine === undefined || targetLine === undefined) {
				continue;
			}

			const sourceIsEmpty = this.isEmptyLine(sourceLine);
			const targetIsEmpty = this.isEmptyLine(targetLine);

			if (sourceIsEmpty !== targetIsEmpty) {
				return false;
			}
		}

		return true;
	}

	/**
	 * 执行行对齐
	 * @param sourceLines 源文件行数组
	 * @param targetLines 目标文件行数组
	 * @returns 对齐后的目标文件行数组
	 */
	private performAlignment(
		sourceLines: string[],
		targetLines: string[],
	): string[] {
		const alignedLines: string[] = [];

		// 过滤出目标文件中的非空行
		const targetNonEmptyLines = targetLines.filter(
			(line) => !this.isEmptyLine(line),
		);
		let targetIndex = 0;

		console.debug("📝 [LineAlignment] 非空行统计:", {
			sourceTotal: sourceLines.length,
			targetNonEmpty: targetNonEmptyLines.length,
		});

		// 根据源文件的结构重新组织目标文件
		for (let i = 0; i < sourceLines.length; i++) {
			const sourceLine = sourceLines[i];
			if (sourceLine === undefined) {
				continue;
			}

			if (this.isEmptyLine(sourceLine)) {
				// 源文件是空行，目标文件也插入空行
				alignedLines.push("");
			} else {
				// 源文件是非空行，从目标文件的非空行中取下一行
				if (targetIndex < targetNonEmptyLines.length) {
					alignedLines.push(targetNonEmptyLines[targetIndex]!);
					targetIndex++;
				} else {
					// 如果目标文件的非空行用完了，保持原始源文件行
					alignedLines.push(sourceLine);
					console.warn(
						"⚠️ [LineAlignment] 目标文件非空行不足，使用源文件行:",
						sourceLine,
					);
				}
			}
		}

		// 如果目标文件还有剩余的非空行，追加到末尾
		while (targetIndex < targetNonEmptyLines.length) {
			alignedLines.push(targetNonEmptyLines[targetIndex]!);
			targetIndex++;
			console.warn(
				"⚠️ [LineAlignment] 追加剩余目标行:",
				targetNonEmptyLines[targetIndex - 1]!,
			);
		}

		console.debug(
			"✅ [LineAlignment] 对齐完成，最终行数:",
			alignedLines.length,
		);
		return alignedLines;
	}

	/**
	 * 判断是否为空行
	 * @param line 行内容
	 * @returns 是否为空行
	 */
	private isEmptyLine(line: string): boolean {
		return line.trim() === "";
	}

	/**
	 * 读取文件内容
	 * @param filePath 文件路径
	 * @returns 文件内容
	 */
	private async readFileContent(filePath: string): Promise<string> {
		try {
			return await fs.promises.readFile(filePath, "utf8");
		} catch (error) {
			throw new Error(
				`无法读取文件 ${filePath}: ${get_error_message(error)}`,
			);
		}
	}

	/**
	 * 写入文件内容
	 * @param filePath 文件路径
	 * @param content 文件内容
	 */
	private async writeFileContent(
		filePath: string,
		content: string,
	): Promise<void> {
		try {
			await fs.promises.writeFile(filePath, content, "utf8");
		} catch (error) {
			throw new Error(
				`无法写入文件 ${filePath}: ${get_error_message(error)}`,
			);
		}
	}
}
