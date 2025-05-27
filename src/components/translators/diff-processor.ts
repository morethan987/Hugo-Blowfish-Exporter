import { TranslationApiClient } from './api-client';
import { OperationType } from './file-updater';
import type { Paragraph, TranslatedParagraph, ParagraphUpdate } from './file-updater';
import type { DiffChange } from './diff-detector';

/**
 * 差异内容处理器
 */
export class DiffProcessor {
    constructor(private apiClient: TranslationApiClient) {}

    /**
     * 处理差异内容
     * @param changes 变更列表
     * @returns 更新信息列表
     */
    async processDiffChanges(changes: DiffChange[]): Promise<ParagraphUpdate[]> {
        console.debug('🚀 [DiffProcessor] 开始处理差异变更，总数:', changes.length);
        console.debug('📊 [DiffProcessor] 输入变更详情:', JSON.stringify(changes, null, 2));
        
        const updates: ParagraphUpdate[] = [];
        
        for (let i = 0; i < changes.length; i++) {
            const change = changes[i];
            const { oldStart, oldCount, newStart, newCount, addedLines, removedLines } = change;
            
            console.debug(`🔄 [DiffProcessor] 处理第${i+1}个变更:`, {
                oldStart, oldCount, newStart, newCount,
                addedLinesCount: addedLines.length,
                removedLinesCount: removedLines.length,
                addedLines: addedLines,
                removedLines: removedLines
            });
            
            // 处理内容翻译
            console.debug('🌐 [DiffProcessor] 开始翻译内容...');
            const translatedLines = await this.processContentTranslation(addedLines);
            console.debug('✅ [DiffProcessor] 翻译完成，结果:', translatedLines);
            
            let update: ParagraphUpdate;
            
            if (oldCount === 0 && newCount > 0) {
                // 处理纯新增情况
                console.debug('➕ [DiffProcessor] 识别为纯新增操作');
                // 关键修复：对于新增操作，需要传递正确的参数
                update = this.handleNewContent(oldStart, newStart, addedLines, translatedLines);
            } else if (oldCount > 0 && newCount === 0) {
                // 处理纯删除情况
                console.debug('➖ [DiffProcessor] 识别为纯删除操作');
                update = this.handleDeletedContent(newStart, oldStart, oldCount, removedLines);
            } else {
                // 处理修改情况
                console.debug('✏️  [DiffProcessor] 识别为修改操作');
                update = this.handleModifiedContent(oldStart, oldCount, newCount, removedLines, translatedLines);
            }
            
            console.debug(`💾 [DiffProcessor] 第${i+1}个变更处理结果:`, JSON.stringify(update, null, 2));
            updates.push(update);
        }
        
        console.debug('🎉 [DiffProcessor] 处理完成，总更新数:', updates.length);
        console.debug('📋 [DiffProcessor] 最终更新列表:', JSON.stringify(updates, null, 2));
        
        return updates;
    }

    /**
     * 处理内容翻译
     * @param lines 需要翻译的行
     * @returns 翻译后的行
     */
    private async processContentTranslation(lines: string[]): Promise<string[]> {
        console.debug('🔤 [DiffProcessor] 开始处理内容翻译，行数:', lines.length);
        console.debug('📝 [DiffProcessor] 原始行内容:', lines);
        
        const toTranslate: string[] = [];
        const skipLines: boolean[] = [];
        const translatedLines: string[] = new Array(lines.length);
        
        // 确定哪些行需要翻译
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const needTranslate = line && line.trim() && !this.shouldSkipTranslation(line);
            skipLines.push(!needTranslate);
            
            console.debug(`🔍 [DiffProcessor] 第${i+1}行分析:`, {
                content: JSON.stringify(line),
                needTranslate: needTranslate,
                reason: needTranslate ? '需要翻译' : (!line ? '空行' : !line.trim() ? '空白行' : '跳过翻译')
            });
            
            if (needTranslate) {
                toTranslate.push(line);
            }
        }
        
        console.debug('📊 [DiffProcessor] 翻译分析结果:', {
            totalLines: lines.length,
            toTranslateCount: toTranslate.length,
            toTranslate: toTranslate,
            skipPattern: skipLines
        });
        
        if (toTranslate.length > 0) {
            try {
                console.debug('🌐 [DiffProcessor] 调用API翻译...');
                // 将多行内容合并翻译
                const translated = await this.apiClient.translateContent(
                    toTranslate.join('\n'),
                    toTranslate.length > 1  // 多行时使用完整文档模式
                );
                
                console.debug('✅ [DiffProcessor] API翻译结果:', JSON.stringify(translated));
                
                // 分割翻译结果
                const translatedParts = translated.split('\n').filter(part => part !== '');
                console.debug('🔀 [DiffProcessor] 分割后的翻译部分:', translatedParts);
                
                // 将翻译结果放回对应位置
                let translatedIndex = 0;
                for (let i = 0; i < lines.length; i++) {
                    if (skipLines[i]) {
                        // 对于不需要翻译的行，保持原样
                        translatedLines[i] = lines[i];
                        console.debug(`⏭️  [DiffProcessor] 第${i+1}行跳过翻译:`, JSON.stringify(lines[i]));
                    } else {
                        // 对于需要翻译的行，使用翻译结果
                        translatedLines[i] = translatedParts[translatedIndex++] || lines[i];
                        console.debug(`🔄 [DiffProcessor] 第${i+1}行翻译:`, {
                            original: JSON.stringify(lines[i]),
                            translated: JSON.stringify(translatedLines[i])
                        });
                    }
                }
            } catch (error) {
                console.error('❌ [DiffProcessor] 翻译失败:', error.message);
                // 翻译失败时保持原内容
                lines.forEach((line, i) => {
                    translatedLines[i] = line;
                });
            }
        } else {
            console.debug('⏭️  [DiffProcessor] 没有需要翻译的内容，全部保持原样');
            // 没有需要翻译的内容，全部保持原样
            lines.forEach((line, i) => {
                translatedLines[i] = line;
            });
        }
        
        console.debug('🎯 [DiffProcessor] 翻译处理完成，最终结果:', translatedLines);
        return translatedLines;
    }

    /**
     * 处理纯新增内容
     */
    private handleNewContent(
        oldStart: number,
        newStart: number,
        addedLines: string[],
        translatedLines: string[]
    ): ParagraphUpdate {
        console.debug('➕ [DiffProcessor] 处理新增内容:', {
            oldStart,
            newStart,
            addedLinesCount: addedLines.length,
            translatedLinesCount: translatedLines.length,
            addedLines,
            translatedLines
        });
        
        // 新增操作：在指定位置插入新内容
        // 对于 @@ -40,0 +41,2 @@ 这样的diff，应该在第40行后插入内容
        const targetParagraph: Paragraph = {
            startLine: oldStart + 1,  // 插入位置：在oldStart行后插入
            endLine: oldStart,        // 对于插入操作，endLine < startLine 用于标识
            content: addedLines.join('\n'),
            type: 'text'
        };
        
        const translatedParagraph: TranslatedParagraph = {
            startLine: oldStart + 1,
            endLine: oldStart,
            content: addedLines.join('\n'),
            type: 'text',
            translatedContent: translatedLines.join('\n')
        };
        
        console.debug('✅ [DiffProcessor] 新增内容处理结果:', {
            targetParagraph,
            translatedParagraph
        });
        
        return { targetParagraph, translatedParagraph, operationType: OperationType.INSERT };
    }

    /**
     * 处理纯删除内容
     */
    private handleDeletedContent(
        newStart: number,
        oldStart: number,
        oldCount: number,
        removedLines: string[]
    ): ParagraphUpdate {
        console.debug('➖ [DiffProcessor] 处理删除内容:', {
            newStart,
            oldStart,
            oldCount,
            removedLinesCount: removedLines.length,
            removedLines
        });
        
        // 删除操作：需要从目标文件中删除指定范围的行
        // 目标段落应该基于旧文件中被删除的位置
        const targetParagraph: Paragraph = {
            startLine: oldStart,
            endLine: oldStart + oldCount - 1,
            content: removedLines.join('\n'),
            type: 'text'
        };
        
        // 对于删除操作，翻译内容为空
        const translatedParagraph: TranslatedParagraph = {
            ...targetParagraph,
            translatedContent: ''
        };
        
        console.debug('✅ [DiffProcessor] 删除内容处理结果:', {
            targetParagraph,
            translatedParagraph
        });
        
        return { targetParagraph, translatedParagraph, operationType: OperationType.DELETE };
    }

    /**
     * 处理修改的内容
     */
    private handleModifiedContent(
        oldStart: number,
        oldCount: number,
        newCount: number,
        removedLines: string[],
        translatedLines: string[]
    ): ParagraphUpdate {
        // 修正：目标段落应该基于旧文件的位置
        const targetParagraph: Paragraph = {
            startLine: oldStart,
            endLine: oldStart + oldCount - 1,
            content: removedLines.join('\n'),
            type: 'text'
        };
        
        const translatedParagraph: TranslatedParagraph = {
            startLine: oldStart,
            endLine: oldStart + newCount - 1,
            content: targetParagraph.content,
            translatedContent: translatedLines.join('\n'),
            type: 'text'
        };
        
        return { targetParagraph, translatedParagraph, operationType: OperationType.REPLACE };
    }

    /**
     * 检查是否应该跳过翻译
     */
    private shouldSkipTranslation(line: string): boolean {
        // 跳过frontmatter
        if (line.trim() === '---') return true;
        
        // 跳过代码块标记
        if (line.startsWith('```')) return true;
        
        // 跳过HTML注释
        if (line.trim().startsWith('<!--') || line.trim().endsWith('-->')) return true;
        
        // 跳过纯链接、图片等Markdown语法
        if (/^(!?\[.*?\]\(.*?\))$/.test(line.trim())) return true;
        
        return false;
    }
}