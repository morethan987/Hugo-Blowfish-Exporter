import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import HugoBlowfishExporter from '../../core/plugin';

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
        try {
            // 获取文件的git状态
            const gitStatus = execSync(`git status --porcelain "${filePath}"`, {
                encoding: 'utf8',
                cwd: (this.plugin.app.vault.adapter as any).basePath || process.cwd()
            }).trim();

            if (!gitStatus) {
                return { hasChanges: false, changes: [] };
            }

            // 获取详细的差异信息
            // 使用 -U0 参数，只显示修改的行，不显示上下文
            const diffOutput = execSync(`git diff -U0 HEAD "${filePath}"`, {
                encoding: 'utf8',
                cwd: (this.plugin.app.vault.adapter as any).basePath || process.cwd()
            });

            return this.parseDiffOutput(diffOutput);
        } catch (error) {
            
            return this.detectByTimestamp(filePath);
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
     * 解析git diff输出
     * @param diffOutput git diff命令的输出
     * @returns 解析后的差异信息
     */
    private parseDiffOutput(diffOutput: string): GitDiffResult {

        const lines = diffOutput.split('\n');
        const changes: DiffChange[] = [];
        let currentChange: DiffChange | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('@@')) {
                // 解析行号信息，忽略@@ ... @@ 后面的上下文信息
                const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@.*$/);
                if (match) {
                    if (currentChange) {
                        changes.push(currentChange);
                    }
                    currentChange = {
                        oldStart: parseInt(match[1]),
                        oldCount: parseInt(match[2]) || 1,
                        newStart: parseInt(match[3]),
                        newCount: parseInt(match[4]) || 1,
                        removedLines: [],
                        addedLines: []
                    };
                }
            } else if (currentChange && line.startsWith('-') && !line.startsWith('---')) {
                currentChange.removedLines.push(line.substring(1));
            } else if (currentChange && line.startsWith('+') && !line.startsWith('+++')) {
                currentChange.addedLines.push(line.substring(1));
            }
        }

        if (currentChange) {
            changes.push(currentChange);
        }

        // 保留日志但移除排序，因为排序会在translator.ts中进行


        return {
            hasChanges: changes.length > 0,
            changes
        };
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