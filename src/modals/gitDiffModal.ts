import { App, Modal } from "obsidian";

// 定义文件结构接口，方便类型推断
interface DiffFile {
	fileName: string;
	content: string[];
	isNew: boolean;
}

export class GitDiffModal extends Modal {
	constructor(
		app: App,
		private diffContent: string,
	) {
		super(app);
		// 使用宽模态框样式
		this.modalEl.addClass("hbe-modal-xl");
	}

	private getChangeStats(content: string): { modified: number; new: number } {
		const lines = content.split("\n");
		let modified = 0;
		let newFiles = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!line) continue;

			if (line.startsWith("diff --git")) {
				const nextLine = lines[i + 1];
				if (nextLine?.includes("new file")) {
					newFiles++;
				} else {
					modified++;
				}
			}
		}
		return { modified, new: newFiles };
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// 容器样式
		contentEl.addClass(
			"hbe-block",
			"hbe-full-width",
			"hbe-full-height",
			"hbe-p-lg",
			"hbe-overflow-auto",
		);

		// 标题区
		const headerDiv = contentEl.createDiv();
		headerDiv.addClass("hbe-mb-lg");
		headerDiv
			.createEl("h2", { text: "文件变更" })
			.addClass("hbe-text-normal", "hbe-border-bottom", "hbe-pb-sm");

		if (!this.diffContent || this.diffContent.trim() === "") {
			contentEl.createDiv({
				cls: "hbe-diff-empty",
				text: "没有发现任何 Markdown 文件的更改",
			});
			return;
		}

		// 统计信息
		const stats = this.getChangeStats(this.diffContent);
		const statsDiv = contentEl.createDiv({ cls: "hbe-diff-stats" });

		if (stats.modified > 0)
			statsDiv.createEl("div", {
				text: `已修改: ${stats.modified} 个文件`,
			});
		if (stats.new > 0)
			statsDiv
				.createEl("div", { text: `新增: ${stats.new} 个文件` })
				.addClass("hbe-text-accent");

		// 解析 diff 内容
		const files: DiffFile[] = [];
		const lines = this.diffContent.split("\n");

		let currentFile: DiffFile | null = null;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line === undefined) continue;

			if (line.startsWith("diff --git")) {
				if (currentFile) {
					files.push(currentFile);
				}

				const match = line.match(/b\/(.*)$/);
				const rawFileName =
					match?.[1] ?? line.replace("diff --git ", "");

				const nextLine = lines[i + 1];
				const isNew = nextLine?.includes("new file mode") ?? false;

				currentFile = {
					fileName: rawFileName.trim(),
					content: [],
					isNew: isNew,
				};
			} else if (currentFile) {
				currentFile.content.push(line);
			}
		}
		if (currentFile) {
			files.push(currentFile);
		}

		// 渲染逻辑
		for (const file of files) {
			const fileContainer = contentEl.createDiv({ cls: "hbe-diff-file" });

			// 1. 文件头
			const titleContainer = fileContainer.createDiv({
				cls: "hbe-diff-file-header",
			});
			const leftTitle = titleContainer.createDiv({
				cls: "hbe-flex-row hbe-items-center hbe-gap-sm",
			});
			leftTitle.createEl("span", { text: file.fileName });

			if (file.isNew) {
				leftTitle.createEl("span", {
					text: "(新文件)",
					cls: "hbe-text-accent hbe-text-sm",
				});
			}

			// 2. 内容区
			const contentWrapper = fileContainer.createDiv({
				cls: "hbe-diff-content-wrapper",
			});

			for (const line of file.content) {
				// 过滤元数据
				if (
					line.startsWith("index ") ||
					line.startsWith("new file mode") ||
					line.startsWith("deleted file mode") ||
					line.startsWith("---") ||
					line.startsWith("+++")
				) {
					continue;
				}

				const lineDiv = contentWrapper.createDiv({
					cls: "hbe-diff-line",
				});

				// === 核心修改区 ===
				if (line.startsWith("@@")) {
					// 块信息保留原样
					lineDiv.addClass("hbe-diff-chunk");
					lineDiv.setText(line);
				} else if (line.startsWith("+")) {
					// 新增行：去除开头的 '+'
					lineDiv.addClass("hbe-diff-added");
					lineDiv.setText(line.substring(1));
				} else if (line.startsWith("-")) {
					// 删除行：去除开头的 '-'
					lineDiv.addClass("hbe-diff-removed");
					lineDiv.setText(line.substring(1));
				} else {
					// 普通行：Git Diff 中普通行通常以空格开头
					// 为了和去除符号后的新增/删除行对齐，我们也把这个开头的空格去掉
					lineDiv.addClass("hbe-text-muted");
					lineDiv.setText(
						line.startsWith(" ") ? line.substring(1) : line,
					);
				}
			}
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}
