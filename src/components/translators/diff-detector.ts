import { execSync } from "child_process";
import { FileSystemAdapter } from "obsidian";
import HugoBlowfishExporter from "core/plugin";
import { get_error_message } from "utils";

export class DiffDetector {
	constructor(private plugin: HugoBlowfishExporter) {}

	async detectGitDiff(filePath: string): Promise<GitDiffResult> {
		const adapter = this.plugin.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) {
			return { hasChanges: false, changes: [] };
		}
		const basePath = adapter.getBasePath();
		if (!basePath) {
			return { hasChanges: false, changes: [] };
		}

		try {
			const gitStatus = execSync(`git status --porcelain "${filePath}"`, {
				encoding: "utf8",
				cwd: basePath,
			}).trim();

			if (!gitStatus) {
				return { hasChanges: false, changes: [] };
			}

			const diffOutput = execSync(`git diff -U0 HEAD "${filePath}"`, {
				encoding: "utf8",
				cwd: basePath,
			});

			return parseDiffOutput(diffOutput);
		} catch (error) {
			console.error(
				"❌ [DiffDetector] Git命令执行失败:",
				get_error_message(error),
			);
			return this.detectByTimestamp();
		}
	}

	private detectByTimestamp(): GitDiffResult {
		return { hasChanges: true, changes: [] };
	}
}

export function parseDiffOutput(diffOutput: string): GitDiffResult {
	const lines = diffOutput.split("\n");
	const changes: DiffChange[] = [];
	let currentChange: DiffChange | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) {
			continue;
		}

		if (line.startsWith("@@")) {
			const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@.*$/);

			if (match && match[1] && match[3]) {
				if (currentChange) {
					changes.push(currentChange);
				}

				currentChange = {
					oldStart: parseInt(match[1]),
					oldCount: !match[2] ? 1 : parseInt(match[2]),
					newStart: parseInt(match[3]),
					newCount: !match[4] ? 1 : parseInt(match[4]),
					removedLines: [],
					addedLines: [],
				};
			}
		} else if (
			currentChange &&
			line.startsWith("-") &&
			!line.startsWith("---")
		) {
			const content = line.substring(1);
			currentChange.removedLines.push(content);
		} else if (
			currentChange &&
			line.startsWith("+") &&
			!line.startsWith("+++")
		) {
			const content = line.substring(1);
			currentChange.addedLines.push(content);
		}
	}

	if (currentChange) {
		changes.push(currentChange);
	}

	return {
		hasChanges: changes.length > 0,
		changes,
	};
}

export interface GitDiffResult {
	hasChanges: boolean;
	changes: DiffChange[];
}

export interface DiffChange {
	oldStart: number;
	oldCount: number;
	newStart: number;
	newCount: number;
	removedLines: string[];
	addedLines: string[];
}
