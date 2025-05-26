import * as fs from 'fs';
import * as path from 'path';
import { App } from 'obsidian';
import HugoBlowfishExporter from '../../core/plugin';

/**
 * 文件更新器
 */
export class FileUpdater {
    constructor(
        private plugin: HugoBlowfishExporter,
        private app: App
    ) {}

    /**
     * 更新目标文件中的段落
     * @param targetFilePath 目标文件路径
     * @param updates 要更新的段落信息
     * @returns 更新后的文件内容
     */    async updateTargetFile(
        targetFilePath: string, 
        updates: ParagraphUpdate[]
    ): Promise<string> {
        // 读取目标文件内容
        const targetContent = await this.readFile(targetFilePath);
        
        // 正确处理空文件的情况
        let lines: string[];
        if (targetContent === '') {
            lines = [];
        } else {
            lines = targetContent.split(/\r?\n/);
        }
        
        // 按照行号倒序排序，从后往前更新，避免行号偏移问题
        const sortedUpdates = updates.sort((a, b) => b.targetParagraph.startLine - a.targetParagraph.startLine);
        
        for (const update of sortedUpdates) {
            this.applyUpdate(lines, update);
        }
        
        const updatedContent = lines.join('\n');  // 统一使用 \n 作为换行符
        
        // 保存更新后的文件
        await this.writeFile(targetFilePath, updatedContent);
        
        return updatedContent;
    }

    /**
     * 在目标文件中插入新段落
     * @param targetFilePath 目标文件路径
     * @param insertions 要插入的段落信息
     * @returns 更新后的文件内容
     */
    async insertNewParagraphs(
        targetFilePath: string,
        insertions: ParagraphInsertion[]
    ): Promise<string> {
        const targetContent = await this.readFile(targetFilePath);
        
        // 正确处理空文件的情况，与updateTargetFile保持一致
        let lines: string[];
        if (targetContent === '') {
            lines = [];
        } else {
            lines = targetContent.split(/\r?\n/);
        }
        
        // 按照插入位置倒序排序
        const sortedInsertions = insertions.sort((a, b) => b.insertAfterLine - a.insertAfterLine);
        
        for (const insertion of sortedInsertions) {
            this.applyInsertion(lines, insertion);
        }
        
        const updatedContent = lines.join('\n');
        
        // 保存更新后的文件
        await this.writeFile(targetFilePath, updatedContent);
        
        return updatedContent;
    }    /**
     * 应用单个段落更新
     * @param lines 文件行数组
     * @param update 更新信息
     */    private applyUpdate(lines: string[], update: ParagraphUpdate): void {
        const { targetParagraph, translatedParagraph } = update;
        
        console.debug('🔧 [FileUpdater.applyUpdate] 开始应用更新:', {
            targetParagraph,
            translatedParagraph,
            currentLinesLength: lines.length
        });
        
        // 验证行号的合理性
        if (targetParagraph.startLine < 1) {
            console.error('❌ [FileUpdater.applyUpdate] Invalid startLine (should be >= 1):', targetParagraph);
            return;
        }
        
        // 检查是否是特殊的新增操作（endLine < startLine）
        if (targetParagraph.endLine < targetParagraph.startLine) {
            console.debug('➕ [FileUpdater.applyUpdate] 检测到新增操作 (endLine < startLine)');
            this.applyInsertOperation(lines, update);
            return;
        }
        
        // 注意：所有行号都是基于新文件状态的1-based索引
        const startIndex = targetParagraph.startLine - 1;  // 转换为0-based
        const endIndex = targetParagraph.endLine - 1;      // 转换为0-based
        
        console.debug('📍 [FileUpdater.applyUpdate] 索引转换:', {
            startLine: targetParagraph.startLine,
            endLine: targetParagraph.endLine,
            startIndex,
            endIndex
        });
        
        // 获取译文内容
        let translatedLines = translatedParagraph.translatedContent
            ? translatedParagraph.translatedContent.split(/\r?\n/)
            : [];
            
        console.debug('📝 [FileUpdater.applyUpdate] 翻译内容:', {
            original: translatedParagraph.translatedContent,
            split: translatedLines
        });
        
        // 检查索引范围是否有效
        if (startIndex < 0 || startIndex >= lines.length) {
            console.error('❌ [FileUpdater.applyUpdate] Start index out of range:', {
                startIndex,
                linesLength: lines.length
            });
            return;
        }
        
        // 计算要替换的行数
        const targetLineCount = targetParagraph.endLine - targetParagraph.startLine + 1;
        
        console.debug('🔢 [FileUpdater.applyUpdate] 替换计算:', {
            targetLineCount,
            startIndex,
            endIndex: startIndex + targetLineCount - 1
        });
        
        // 检查替换范围是否合理
        if (startIndex + targetLineCount > lines.length) {
            console.error('❌ [FileUpdater.applyUpdate] Replace range exceeds file length:', {
                startIndex,
                targetLineCount,
                linesLength: lines.length
            });
            return;
        }
        
        console.debug('🔄 [FileUpdater.applyUpdate] 执行替换操作:', {
            method: 'splice',
            startIndex,
            deleteCount: targetLineCount,
            insertItems: translatedLines
        });
        
        // 执行替换操作
        lines.splice(startIndex, targetLineCount, ...translatedLines);
        
        console.debug('✅ [FileUpdater.applyUpdate] 替换完成，新文件行数:', lines.length);
    }

    /**
     * 应用插入操作（用于处理新增内容）
     */
    private applyInsertOperation(lines: string[], update: ParagraphUpdate): void {
        const { targetParagraph, translatedParagraph } = update;
        
        console.debug('➕ [FileUpdater.applyInsertOperation] 处理插入操作:', {
            targetParagraph,
            translatedParagraph
        });
        
        // 对于新增操作，startLine是插入位置
        const insertIndex = targetParagraph.startLine - 1;  // 转换为0-based
        
        // 获取译文内容
        let translatedLines = translatedParagraph.translatedContent
            ? translatedParagraph.translatedContent.split(/\r?\n/)
            : [];
            
        console.debug('📝 [FileUpdater.applyInsertOperation] 插入内容:', {
            insertIndex,
            translatedLines,
            currentLinesLength: lines.length
        });
        
        // 检查插入位置是否有效
        if (insertIndex < 0 || insertIndex > lines.length) {
            console.error('❌ [FileUpdater.applyInsertOperation] Insert index out of range:', {
                insertIndex,
                linesLength: lines.length
            });
            return;
        }
        
        console.debug('🔄 [FileUpdater.applyInsertOperation] 执行插入操作');
        
        // 在指定位置插入新内容
        lines.splice(insertIndex, 0, ...translatedLines);
        
        console.debug('✅ [FileUpdater.applyInsertOperation] 插入完成，新文件行数:', lines.length);
    }

    /**
     * 应用段落插入
     * @param lines 文件行数组
     * @param insertion 插入信息
     */
    private applyInsertion(lines: string[], insertion: ParagraphInsertion): void {
        const { insertAfterLine, translatedParagraph } = insertion;
        
        // insertAfterLine 是1-based，表示在第N行后插入
        // 要在第N行后插入，数组索引应该是N（因为splice在该位置前插入）
        const insertIndex = insertAfterLine;
        
        // 确保索引有效（可以在文件末尾插入）
        if (insertIndex < 0 || insertIndex > lines.length) {
            console.error('Insert index out of range:', {
                insertIndex,
                insertAfterLine,
                linesLength: lines.length
            });
            return;
        }
        
        // 将翻译后的内容分割为行，使用统一的换行符处理
        const translatedLines = translatedParagraph.translatedContent.split(/\r?\n/);
        
        // 在指定位置后插入新行
        lines.splice(insertIndex, 0, '', ...translatedLines, '');
    }

    /**
     * 读取文件内容
     * @param filePath 文件路径
     * @returns 文件内容
     */
    private async readFile(filePath: string): Promise<string> {
        try {
            // 如果是vault内的文件，使用Obsidian API
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (file && 'path' in file) {
                // 更可靠的类型检查：检查是否具有文件的基本属性
                return await this.app.vault.read(file as any);
            }
            
            // 否则使用Node.js fs
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error.message}`);
        }
    }

    /**
     * 写入文件内容
     * @param filePath 文件路径
     * @param content 文件内容
     */
    private async writeFile(filePath: string, content: string): Promise<void> {
        try {
            // 如果是vault内的文件，使用Obsidian API
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (file && 'path' in file) {
                // 更可靠的类型检查：检查是否具有文件的基本属性
                await this.app.vault.modify(file as any, content);
                return;
            }
            
            // 否则使用Node.js fs
            // 确保目录存在
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(filePath, content, 'utf8');
        } catch (error) {
            throw new Error(`Failed to write file ${filePath}: ${error.message}`);
        }
    }

    /**
     * 创建备份文件
     * @param filePath 原文件路径
     * @returns 备份文件路径
     */
    async createBackup(filePath: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${filePath}.backup.${timestamp}`;
        
        const content = await this.readFile(filePath);
        await this.writeFile(backupPath, content);
        
        return backupPath;
    }

    /**
     * 验证文件是否可以安全更新
     * @param filePath 文件路径
     * @returns 是否可以更新
     */
    async canSafelyUpdate(filePath: string): Promise<boolean> {
        try {
            // 检查文件是否存在
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (file) {
                return true;
            }
            
            // 检查是否是外部文件
            return fs.existsSync(filePath);
        } catch (error) {
            return false;
        }
    }
}

/**
 * 段落信息
 */
export interface Paragraph {
    content: string;
    startLine: number;
    endLine: number;
    type: 'text' | 'heading' | 'code' | 'math' | 'list';
}

/**
 * 翻译后的段落信息
 */
export interface TranslatedParagraph extends Paragraph {
    translatedContent: string;
}

/**
 * 段落更新信息
 */
export interface ParagraphUpdate {
    targetParagraph: Paragraph;
    translatedParagraph: TranslatedParagraph;
}

/**
 * 段落插入信息
 */
export interface ParagraphInsertion {
    insertAfterLine: number;
    translatedParagraph: TranslatedParagraph;
}