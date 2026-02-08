import { App, Notice, FileSystemAdapter } from "obsidian";
import * as path from "path";
import * as fs from "fs";
import HugoBlowfishExporter from "./plugin";
import { GitDiffModal } from "modals/gitDiffModal";
import { GitCommitModal } from "modals/gitCommitModal";
import { exec } from "child_process";
import { promisify } from "util";

// 将 exec 包装为 Promise 版本
const execAsync = promisify(exec);

export class GitHandler {
	constructor(
		private app: App,
		private plugin: HugoBlowfishExporter,
	) {}

	/**
	 * 获取路径信息（严格类型检查，不使用 any）
	 */
	private getPaths(): { repoPath: string; vaultPath: string | null } {
		const repoPath = path.dirname(
			path.resolve(this.plugin.settings.exportPath),
		);

		let vaultPath: string | null = null;
		// 只有当 adapter 是 FileSystemAdapter 时才获取路径
		if (this.app.vault.adapter instanceof FileSystemAdapter) {
			vaultPath = this.app.vault.adapter.getBasePath();
		}

		return { repoPath, vaultPath };
	}

	/**
	 * 统一处理错误消息转换
	 */
	private formatError(error: unknown): string {
		if (error instanceof Error) return error.message;
		return String(error);
	}

	/**
	 * 显示文件差异
	 */
	async showAllDiff(): Promise<void> {
		const { repoPath } = this.getPaths();

		if (!fs.existsSync(repoPath)) {
			new Notice("仓库目录不存在！");
			return;
		}

		new Notice("正在获取文件差异...");

		try {
			let diffContent = "";

			// 1. 获取已跟踪的 .md 文件差异
			try {
				const { stdout: trackedDiff } = await execAsync(
					'git diff -- "*.md"',
					{
						cwd: repoPath,
					},
				);
				if (trackedDiff) diffContent += trackedDiff;
			} catch (err) {
				console.error("获取已跟踪文件差异失败:", err);
			}

			// 2. 获取未跟踪的 .md 文件并生成 diff 格式
			try {
				const { stdout: untrackedFilesOutput } = await execAsync(
					"git ls-files --others --exclude-standard -- *.md",
					{ cwd: repoPath },
				);

				const files = untrackedFilesOutput
					.split("\n")
					.filter((f) => f.trim());

				for (const file of files) {
					const fullPath = path.join(repoPath, file);
					const content = await fs.promises.readFile(
						fullPath,
						"utf-8",
					);
					const lines = content.split("\n");

					diffContent += `\ndiff --git a/${file} b/${file}\n`;
					diffContent += `new file mode 100644\n--- /dev/null\n+++ b/${file}\n`;
					diffContent += `@@ -0,0 +1,${lines.length} @@\n`;
					diffContent +=
						lines.map((line) => `+${line}`).join("\n") + "\n";
				}
			} catch (err) {
				console.error("获取未跟踪文件失败:", err);
			}

			if (!diffContent.trim()) {
				new Notice("暂无文件差异");
				return;
			}

			new GitDiffModal(this.app, diffContent).open();
		} catch (error: unknown) {
			new Notice(`❌ 获取差异失败: ${this.formatError(error)}`);
		}
	}

	/**
	 * 提交并推送逻辑
	 */
	async commitAndPush(): Promise<boolean> {
		const { repoPath, vaultPath } = this.getPaths();

		if (!fs.existsSync(repoPath)) {
			new Notice("仓库目录不存在！");
			return false;
		}

		// 返回一个 Promise，直到整个流程（弹窗+执行）结束
		return new Promise<boolean>((resolve) => {
			const modal = new GitCommitModal(
				this.app,
				async (commitMessage) => {
					// 因为 GitCommitModal 现在支持异步回调，这里可以直接使用 async
					const success = await this.performGitOperations(
						commitMessage,
						repoPath,
						vaultPath,
					);
					resolve(success);
				},
			);
			modal.open();
		});
	}

	/**
	 * 执行具体的 Git 命令逻辑
	 */
	private async performGitOperations(
		message: string,
		repoPath: string,
		vaultPath: string | null,
	): Promise<boolean> {
		try {
			new Notice("正在执行 Git 操作...");

			// 1. 目标仓库操作
			await execAsync("git add .", { cwd: repoPath });
			await execAsync(`git commit -m "${message}"`, { cwd: repoPath });
			await execAsync("git push", { cwd: repoPath });

			// 2. Obsidian 本地库同步操作
			if (vaultPath && fs.existsSync(vaultPath)) {
				try {
					await execAsync("git add .", { cwd: vaultPath });
					await execAsync(`git commit -m "${message}"`, {
						cwd: vaultPath,
					});
				} catch (vaultError) {
					console.warn("Obsidian 库提交失败 (跳过):", vaultError);
					new Notice("提示：本地库 Git 提交失败（但不影响导出）");
				}
			}

			new Notice("✅ Git 操作完成");
			return true;
		} catch (error: unknown) {
			const msg = this.formatError(error);
			new Notice(`❌ Git 操作失败: ${msg}`);
			return false;
		}
	}
}
