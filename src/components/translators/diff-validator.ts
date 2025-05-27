import { App, MarkdownView, Notice } from 'obsidian';
import HugoBlowfishExporter from '../../core/plugin';
import { DiffDetector } from './diff-detector';
import { FileUpdater } from './file-updater';
import { LineAlignment } from './line-alignment';
import { determineTargetFilePath } from './determine-target-file';

/**
 * 差异翻译验证器
 */
export class DiffValidator {
    private diffDetector: DiffDetector;
    private fileUpdater: FileUpdater;
    private lineAlignment: LineAlignment;

    constructor(
        private app: App,
        private plugin: HugoBlowfishExporter
    ) {
        this.diffDetector = new DiffDetector(plugin);
        this.fileUpdater = new FileUpdater(plugin, app);
        this.lineAlignment = new LineAlignment(app, plugin);
    }

    /**
     * 验证差异翻译的前置条件
     * @returns 验证结果，包含差异信息和文件路径
     */
    async validateDiffTranslation(): Promise<DiffValidationResult | null> {
        console.debug('🔍 [DiffValidator] 开始验证差异翻译前置条件');
        
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            console.debug('❌ [DiffValidator] 没有打开的文件');
            new Notice('没有打开的文件');
            return null;
        }

        const currentFile = activeView.file;
        if (!currentFile) {
            console.debug('❌ [DiffValidator] 无法获取当前文件');
            new Notice('无法获取当前文件');
            return null;
        }

        console.debug('📄 [DiffValidator] 当前文件:', currentFile.path);

        // 检测文件变化
        console.debug('🔍 [DiffValidator] 检测文件变化...');
        const diffResult = await this.diffDetector.detectGitDiff(currentFile.path);
        console.debug('📊 [DiffValidator] 差异检测结果:', {
            hasChanges: diffResult.hasChanges,
            changesCount: diffResult.changes.length
        });
        
        if (!diffResult.hasChanges) {
            console.debug('❌ [DiffValidator] 当前文件没有检测到变化');
            new Notice('当前文件没有检测到变化');
            return null;
        }

        // 确定英文翻译文件路径
        console.debug('🎯 [DiffValidator] 确定英文翻译文件路径...');
        const englishFilePath = await determineTargetFilePath(currentFile.path, this.plugin);
        console.debug('📂 [DiffValidator] 英文文件路径:', englishFilePath);
        
        if (!englishFilePath) {
            console.debug('❌ [DiffValidator] 无法确定对应的英文翻译文件路径');
            new Notice('无法确定对应的英文翻译文件路径');
            return null;
        }

        // 检查英文文件是否存在
        console.debug('✅ [DiffValidator] 检查英文文件是否可以安全更新...');
        const canUpdate = await this.fileUpdater.canSafelyUpdate(englishFilePath);
        console.debug('🔒 [DiffValidator] 文件安全检查结果:', canUpdate);
        
        if (!canUpdate) {
            console.debug('❌ [DiffValidator] 英文翻译文件不存在或无法更新:', englishFilePath);
            new Notice(`英文翻译文件不存在: ${englishFilePath}`);
            return null;
        }

        // 检测是否需要行对齐
        console.debug('🔍 [DiffValidator] 检测是否需要行对齐...');
        const needsLineAlignment = await this.checkLineAlignment(currentFile, englishFilePath);
        console.debug('📊 [DiffValidator] 行对齐检测结果:', needsLineAlignment);

        const result = {
            diffResult,
            englishFilePath,
            needsLineAlignment
        };
        
        console.debug('✅ [DiffValidator] 验证成功，返回结果:', result);
        return result;
    }

    /**
     * 检测是否需要行对齐
     * @param currentFile 当前文件
     * @param englishFilePath 英文文件路径
     * @returns 是否需要行对齐
     */
    private async checkLineAlignment(currentFile: any, englishFilePath: string): Promise<boolean> {
        try {
            // 读取当前文件内容
            const currentContent = await this.app.vault.read(currentFile);
            
            // 读取英文文件内容
            const fs = require('fs');
            const englishContent = await fs.promises.readFile(englishFilePath, 'utf8');

            // 分割成行
            const currentLines = currentContent.split('\n');
            const englishLines = englishContent.split('\n');

            // 检查行数是否一致
            if (currentLines.length !== englishLines.length) {
                console.debug('📏 [DiffValidator] 行数不一致，需要对齐:', {
                    currentLines: currentLines.length,
                    englishLines: englishLines.length
                });
                return true;
            }

            // 检查空行和非空行是否严格对应
            for (let i = 0; i < currentLines.length; i++) {
                const currentIsEmpty = currentLines[i].trim() === '';
                const englishIsEmpty = englishLines[i].trim() === '';
                
                if (currentIsEmpty !== englishIsEmpty) {
                    console.debug('📏 [DiffValidator] 空行结构不匹配，需要对齐:', {
                        line: i + 1,
                        currentEmpty: currentIsEmpty,
                        englishEmpty: englishIsEmpty
                    });
                    return true;
                }
            }

            console.debug('✅ [DiffValidator] 行结构已对齐，无需处理');
            return false;
        } catch (error) {
            console.warn('⚠️ [DiffValidator] 行对齐检测失败，默认需要对齐:', error.message);
            return true; // 检测失败时默认需要对齐
        }
    }
}

export interface DiffValidationResult {
    diffResult: {
        hasChanges: boolean;
        changes: any[];
    };
    englishFilePath: string;
    needsLineAlignment: boolean;
}