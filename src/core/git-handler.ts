import { App, Notice } from 'obsidian';
import * as path from 'path';
import * as fs from 'fs';
import HugoBlowfishExporter from './plugin';
import { GitDiffModal } from '../utils/gitDiffModal';
import { GitCommitModal } from '../utils/gitCommitModal';

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
    
        new Notice('正在获取文件差异...');
        
        // 异步执行获取差异
        setTimeout(async () => {
            try {
                const { exec } = require('child_process');
                const util = require('util');
                const execPromise = util.promisify(exec);
                const fsPromises = fs.promises;
                
                let diffContent = '';
    
                // 获取已跟踪的 .md 文件的差异
                try {
                    const { stdout: trackedDiff } = await execPromise('git diff -- "*.md"', { cwd: repoPath });
                    if (trackedDiff) {
                        diffContent += trackedDiff;
                    }
                } catch (err) {
                    console.error('获取已跟踪文件差异失败:', err);
                }
    
                // 获取未跟踪的 .md 文件
                try {
                    const { stdout: untrackedFilesOutput } = await execPromise(
                        'git ls-files --others --exclude-standard', 
                        { cwd: repoPath }
                    );
                    
                    const untrackedFilesList = untrackedFilesOutput
                        .split('\n')
                        .filter((file: string) => file.trim() && file.endsWith('.md'));
                    
                    // 并行处理未跟踪文件
                    const untrackedDiffs = await Promise.all(
                        untrackedFilesList.map(async (file: string) => {
                            try {
                                // 异步读取新文件的内容
                                const content = await fsPromises.readFile(path.join(repoPath, file), 'utf-8');
                                const lines = content.split('\n');
                                return `\ndiff --git a/${file} b/${file}\n` +
                                       `new file mode 100644\n` +
                                       `--- /dev/null\n` +
                                       `+++ b/${file}\n` +
                                       `@@ -0,0 +1,${lines.length} @@\n` +
                                       lines.map(line => `+${line}`).join('\n');
                            } catch (err) {
                                console.error(`读取文件 ${file} 失败:`, err);
                                return '';
                            }
                        })
                    );
    
                    const untrackedFilesContent = untrackedDiffs.filter(diff => diff).join('\n');
                    if (untrackedFilesContent) {
                        if (diffContent) {
                            diffContent += '\n';
                        }
                        diffContent += untrackedFilesContent;
                    }
                } catch (err) {
                    console.error('获取未跟踪文件失败:', err);
                }
    
                // 使用独立的模态框组件显示差异
                new GitDiffModal(this.app, diffContent).open();
            } catch (error) {
                new Notice('执行 git 命令时发生错误：' + error);
            }
        }, 50);
    }
    
    async commitAndPush() {
        // 获取目标仓库的父级目录路径
        const repoPath = path.dirname(path.resolve(this.plugin.settings.exportPath));

        // 检查目录是否存在
        if (!fs.existsSync(repoPath)) {
            new Notice('仓库目录不存在！');
            return;
        }

        // filepath: [git-handler.ts](http://_vscodecontentref_/1)
        return new Promise((resolve, reject) => {
            new GitCommitModal(this.app, (commitMessage) => {
                // 先关闭模态框
                // 然后异步执行Git操作
                setTimeout(async () => {
                    const { exec } = require('child_process');
                    const util = require('util');
                    const execPromise = util.promisify(exec);
                    
                    try {
                        new Notice('正在执行Git操作...');
                        await execPromise('git add .', { cwd: repoPath });
                        await execPromise(`git commit -m "${commitMessage}"`, { cwd: repoPath });
                        await execPromise('git push', { cwd: repoPath });
                        new Notice('Git操作完成');
                        resolve(true);
                    } catch (error) {
                        new Notice('Git操作失败: ' + error);
                        reject(error);
                    }
                }, 10); // 减少延迟，避免与编辑器状态冲突
            }).open();
        });
    }
}