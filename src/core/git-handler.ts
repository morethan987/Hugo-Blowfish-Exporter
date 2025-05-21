import { App, Notice } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import HugoBlowfishExporter from './plugin';
import { GitDiffModal } from '../../utils/gitDiffModal';
import { GitCommitModal } from '../../utils/gitCommitModal';

export class GitHandler {
    constructor(
        private app: App,
        private plugin: HugoBlowfishExporter
    ) { }
    
    async showAllDiff() {
        // 获取目标仓库的父级目录路径
        const repoPath = path.dirname(path.resolve(this.plugin.settings.exportPath));

        // 检查目录是否存在
        if (!fs.existsSync(repoPath)) {
            new Notice('仓库目录不存在！');
            return;
        }

        // 执行 git diff 命令
        const { execSync } = require('child_process');
        try {
            let diffContent = '';

            // 获取已跟踪的 .md 文件的差异
            try {
                const trackedDiff = execSync('git diff -- "*.md"', { cwd: repoPath }).toString();
                if (trackedDiff) {
                    diffContent += trackedDiff;
                }
            } catch (err) {
                console.error('获取已跟踪文件差异失败:', err);
            }

            // 获取未跟踪的 .md 文件
            try {
                const untrackedFiles = execSync('git ls-files --others --exclude-standard', { cwd: repoPath })
                    .toString()
                    .split('\n')
                    .filter((file: string) => file.endsWith('.md'))
                    .map((file: string) => {
                        try {
                            // 读取新文件的内容
                            const content = fs.readFileSync(path.join(repoPath, file), 'utf-8');
                            return `\ndiff --git a/${file} b/${file}\n` +
                                   `new file mode 100644\n` +
                                   `--- /dev/null\n` +
                                   `+++ b/${file}\n` +
                                   `@@ -0,0 +1,${content.split('\n').length} @@\n` +
                                   content.split('\n').map(line => `+${line}`).join('\n');
                        } catch (err) {
                            console.error(`读取文件 ${file} 失败:`, err);
                            return '';
                        }
                    })
                    .filter((diff: string) => diff)  // 移除空字符串
                    .join('\n');

                if (untrackedFiles) {
                    if (diffContent) {
                        diffContent += '\n';
                    }
                    diffContent += untrackedFiles;
                }
            } catch (err) {
                console.error('获取未跟踪文件失败:', err);
            }

            // 使用独立的模态框组件显示差异
            new GitDiffModal(this.app, diffContent).open();
        } catch (error) {
            new Notice('执行 git 命令时发生错误：' + error);
        }
    }
    
    async commitAndPush() {
        // 获取目标仓库的父级目录路径
        const repoPath = path.dirname(path.resolve(this.plugin.settings.exportPath));

        // 检查目录是否存在
        if (!fs.existsSync(repoPath)) {
            new Notice('仓库目录不存在！');
            return;
        }

        return new Promise((resolve, reject) => {
            new GitCommitModal(this.app, async (commitMessage) => {
                try {
                    const { execSync } = require('child_process');
                    new Notice('正在执行Git操作...', 0);
                    execSync('git add .', { cwd: repoPath });
                    execSync(`git commit -m "${commitMessage}"`, { cwd: repoPath });
                    execSync('git push', { cwd: repoPath });
                    new Notice('Git操作完成');
                    resolve(true);
                } catch (error) {
                    new Notice('Git操作失败: ' + error);
                    reject(error);
                }
            }).open();
        });
    }
}