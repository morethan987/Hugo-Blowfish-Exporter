import { execSync } from "child_process";
import HugoBlowfishExporter from "core/plugin";

/**
 * 文件差异检测器
 */
export class DiffDetector {
	constructor(private plugin: HugoBlowfishExporter) {}

	/**
	 * 检测文件的git差异
	 * @param filePath 文件路径
	 * @returns 差异信息
	 */
	async detectGitDiff(filePath: string): Promise<GitDiffResult> {
		console.debug("🔍 [DiffDetector] 开始检测文件差异:", filePath);

		try {
			// 获取文件的git状态
			const gitStatus = execSync(`git status --porcelain "${filePath}"`, {
				encoding: "utf8",
				cwd:
					(this.plugin.app.vault.adapter as any).basePath ||
					process.cwd(),
			}).trim();

			console.debug("📊 [DiffDetector] Git状态:", gitStatus || "无变化");

			if (!gitStatus) {
				console.debug("❌ [DiffDetector] 没有检测到文件变化");
				return { hasChanges: false, changes: [] };
			}

			// 获取详细的差异信息
			// 使用 -U0 参数，只显示修改的行，不显示上下文
			const diffOutput = execSync(`git diff -U0 HEAD "${filePath}"`, {
				encoding: "utf8",
				cwd:
					(this.plugin.app.vault.adapter as any).basePath ||
					process.cwd(),
			});

			console.debug("📝 [DiffDetector] Git diff 原始输出:");
			console.debug("--- DIFF START ---");
			console.debug(diffOutput);
			console.debug("--- DIFF END ---");

			const result = this.parseDiffOutput(diffOutput);
			console.debug(
				"✅ [DiffDetector] 解析结果:",
				JSON.stringify(result, null, 2),
			);

			return result;
		} catch (error) {
			console.error("❌ [DiffDetector] Git命令执行失败:", error.message);
			const fallbackResult = this.detectByTimestamp(filePath);
			console.debug(
				"🔄 [DiffDetector] 使用fallback方法，结果:",
				fallbackResult,
			);
			return fallbackResult;
		}
	}

	/**
	 * 通过时间戳检测变化（fallback方法）
	 * @param filePath 文件路径
	 * @returns 差异信息
	 */
	private async detectByTimestamp(filePath: string): Promise<GitDiffResult> {
		// 这里可以实现基于时间戳的简单检测逻辑
		// 作为git diff的fallback
		return { hasChanges: true, changes: [] };
	}

	/**
	 * 解析git diff输出为结构化的差异信息
	 * @param diffOutput git diff命令的输出
	 * @returns 解析后的差异信息
	 *
	 * Git diff输出格式说明：
	 * - 每个文件差异块以 @@ 开头的行标记
	 * - @@ -oldStart,oldCount +newStart,newCount @@ 表示行号范围
	 * - 以 - 开头的行表示删除的内容（除了 --- 文件头）
	 * - 以 + 开头的行表示新增的内容（除了 +++ 文件头）
	 * - 不带前缀的行表示未修改的上下文行
	 *
	 * @param diffOutput git diff命令的原始输出文本
	 * @returns 解析后的结构化差异信息
	 */
	private parseDiffOutput(diffOutput: string): GitDiffResult {
		console.debug("🔧 [DiffDetector] 开始解析diff输出");

		// 将diff输出按行分割，便于逐行解析
		const lines = diffOutput.split("\n");
		console.debug("📄 [DiffDetector] 总行数:", lines.length);

		// 存储所有解析出的差异块
		const changes: DiffChange[] = [];

		// 当前正在处理的差异块，null表示还未开始处理任何块
		let currentChange: DiffChange | null = null;

		// 逐行解析diff输出
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// 检测差异块头部标记：@@ -oldStart,oldCount +newStart,newCount @@
			if (line.startsWith("@@")) {
				console.debug(
					`🎯 [DiffDetector] 第${i + 1}行发现差异块头部:`,
					line,
				);

				// 使用正则表达式解析行号信息
				// 匹配模式：@@ -数字,数字 +数字,数字 @@ 可选的上下文信息
				// 其中数字后的逗号和第二个数字是可选的（当只有一行时会省略）
				const match = line.match(
					/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@.*$/,
				);

				if (match) {
					console.debug("✨ [DiffDetector] 解析匹配结果:", match);

					// 如果之前有未完成的差异块，先将其保存
					if (currentChange) {
						console.debug(
							"💾 [DiffDetector] 保存前一个差异块:",
							JSON.stringify(currentChange, null, 2),
						);
						changes.push(currentChange);
					}

					// 创建新的差异块对象
					currentChange = {
						// 原文件的起始行号（从1开始计数）
						oldStart: parseInt(match[1]),
						// 原文件的行数，如果没有指定则默认为1
						oldCount: match[2] === "" ? 1 : parseInt(match[2]), // 修复：空字符串表示1行
						// 新文件的起始行号（从1开始计数）
						newStart: parseInt(match[3]),
						// 新文件的行数，如果没有指定则默认为1
						newCount: match[4] === "" ? 1 : parseInt(match[4]), // 修复：空字符串表示1行
						// 存储被删除的行内容
						removedLines: [],
						// 存储新增的行内容
						addedLines: [],
					};

					console.debug(
						"🆕 [DiffDetector] 创建新差异块:",
						JSON.stringify(currentChange, null, 2),
					);
				} else {
					console.warn(
						"⚠️  [DiffDetector] 无法解析差异块头部:",
						line,
					);
				}
			}
			// 处理删除的行：以 - 开头但不是文件头标记 ---
			else if (
				currentChange &&
				line.startsWith("-") &&
				!line.startsWith("---")
			) {
				// 去掉行首的 - 符号，保存实际的行内容
				const content = line.substring(1);
				currentChange.removedLines.push(content);
				console.debug(
					`➖ [DiffDetector] 第${i + 1}行删除内容:`,
					JSON.stringify(content),
				);
			}
			// 处理新增的行：以 + 开头但不是文件头标记 +++
			else if (
				currentChange &&
				line.startsWith("+") &&
				!line.startsWith("+++")
			) {
				// 去掉行首的 + 符号，保存实际的行内容
				const content = line.substring(1);
				currentChange.addedLines.push(content);
				console.debug(
					`➕ [DiffDetector] 第${i + 1}行新增内容:`,
					JSON.stringify(content),
				);
			}
			// 注意：不带前缀的行（上下文行）在这里被忽略，因为我们只关心实际的变更
		}

		// 处理最后一个差异块（如果存在）
		if (currentChange) {
			console.debug(
				"💾 [DiffDetector] 保存最后一个差异块:",
				JSON.stringify(currentChange, null, 2),
			);
			changes.push(currentChange);
		}

		// 返回结构化的差异结果
		const result = {
			hasChanges: changes.length > 0,
			changes,
		};

		console.debug(
			"🎉 [DiffDetector] 解析完成，总变更块数:",
			changes.length,
		);
		console.debug(
			"📋 [DiffDetector] 最终结果:",
			JSON.stringify(result, null, 2),
		);

		return result;
	}
}

/**
 * Git差异结果
 */
export interface GitDiffResult {
	hasChanges: boolean;
	changes: DiffChange[];
}

/**
 * 单个差异变化
 */
export interface DiffChange {
	oldStart: number;
	oldCount: number;
	newStart: number;
	newCount: number;
	removedLines: string[];
	addedLines: string[];
}
