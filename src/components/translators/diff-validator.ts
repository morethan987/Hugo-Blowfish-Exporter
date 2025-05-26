import { App, MarkdownView, Notice } from 'obsidian';
import HugoBlowfishExporter from '../../core/plugin';
import { DiffDetector } from './diff-detector';
import { FileUpdater } from './file-updater';

/**
 * 差异翻译验证器
 */
export class DiffValidator {
    private diffDetector: DiffDetector;
    private fileUpdater: FileUpdater;

    constructor(
        private app: App,
        private plugin: HugoBlowfishExporter
    ) {
        this.diffDetector = new DiffDetector(plugin);
        this.fileUpdater = new FileUpdater(plugin, app);
    }

    /**
     * 验证差异翻译的前置条件
     * @returns 验证结果，包含差异信息和文件路径
     */
    async validateDiffTranslation(): Promise<DiffValidationResult | null> {
        console.log('🔍 [DiffValidator] 开始验证差异翻译前置条件');
        
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            console.log('❌ [DiffValidator] 没有打开的文件');
            new Notice('没有打开的文件');
            return null;
        }

        const currentFile = activeView.file;
        if (!currentFile) {
            console.log('❌ [DiffValidator] 无法获取当前文件');
            new Notice('无法获取当前文件');
            return null;
        }

        console.log('📄 [DiffValidator] 当前文件:', currentFile.path);

        // 检测文件变化
        console.log('🔍 [DiffValidator] 检测文件变化...');
        const diffResult = await this.diffDetector.detectGitDiff(currentFile.path);
        console.log('📊 [DiffValidator] 差异检测结果:', {
            hasChanges: diffResult.hasChanges,
            changesCount: diffResult.changes.length
        });
        
        if (!diffResult.hasChanges) {
            console.log('❌ [DiffValidator] 当前文件没有检测到变化');
            new Notice('当前文件没有检测到变化');
            return null;
        }

        // 确定英文翻译文件路径
        console.log('🎯 [DiffValidator] 确定英文翻译文件路径...');
        const englishFilePath = await this.determineEnglishFilePath(currentFile.path);
        console.log('📂 [DiffValidator] 英文文件路径:', englishFilePath);
        
        if (!englishFilePath) {
            console.log('❌ [DiffValidator] 无法确定对应的英文翻译文件路径');
            new Notice('无法确定对应的英文翻译文件路径');
            return null;
        }

        // 检查英文文件是否存在
        console.log('✅ [DiffValidator] 检查英文文件是否可以安全更新...');
        const canUpdate = await this.fileUpdater.canSafelyUpdate(englishFilePath);
        console.log('🔒 [DiffValidator] 文件安全检查结果:', canUpdate);
        
        if (!canUpdate) {
            console.log('❌ [DiffValidator] 英文翻译文件不存在或无法更新:', englishFilePath);
            new Notice(`英文翻译文件不存在: ${englishFilePath}`);
            return null;
        }

        const result = {
            diffResult,
            englishFilePath
        };
        
        console.log('✅ [DiffValidator] 验证成功，返回结果:', result);
        return result;
    }

    /**
     * 确定英文翻译文件路径
     * @param chineseFilePath 中文文件路径
     * @returns 英文文件路径
     */
    private async determineEnglishFilePath(chineseFilePath: string): Promise<string | null> {
        const path = require('path');
        const fs = require('fs');
        
        // 获取中文文件的文件名（不包含路径）
        const chineseFileName = path.basename(chineseFilePath);
        
        // 提取文件名开头的数字
        const numberMatch = chineseFileName.match(/^(\d+)\./);
        if (!numberMatch) {
            return null;
        }
        
        const fileNumber = numberMatch[1];
        const translatedExportPath = this.plugin.settings.translatedExportPath;
        
        if (!translatedExportPath) {
            return null;
        }
        
        try {
            // 读取翻译文件目录下的所有文件
            const files = fs.readdirSync(translatedExportPath);
            
            // 寻找以相同数字开头的英文文件
            const englishFile = files.find((file: string) => {
                return file.startsWith(`${fileNumber}.`) && file.endsWith('.md');
            });
            
            if (englishFile) {
                return path.join(translatedExportPath, englishFile);
            }
        } catch (error) {
            return null;
        }
        
        return null;
    }
}

export interface DiffValidationResult {
    diffResult: {
        hasChanges: boolean;
        changes: any[];
    };
    englishFilePath: string;
}