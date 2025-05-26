import { TranslationApiClient } from './api-client';
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
        const updates: ParagraphUpdate[] = [];
        
        for (const change of changes) {
            const { oldStart, oldCount, newStart, newCount, addedLines, removedLines } = change;
            
            // 处理内容翻译
            const translatedLines = await this.processContentTranslation(addedLines);
            
            if (oldCount === 0 && newCount > 0) {
                // 处理纯新增情况
                updates.push(this.handleNewContent(newStart, addedLines, translatedLines));
            } else if (oldCount > 0 && newCount === 0) {
                // 处理纯删除情况
                updates.push(this.handleDeletedContent(newStart, oldStart, oldCount, removedLines));
            } else {
                // 处理修改情况
                updates.push(this.handleModifiedContent(newStart, oldCount, newCount, removedLines, translatedLines));
            }
        }
        
        return updates;
    }

    /**
     * 处理内容翻译
     * @param lines 需要翻译的行
     * @returns 翻译后的行
     */
    private async processContentTranslation(lines: string[]): Promise<string[]> {
        const toTranslate: string[] = [];
        const skipLines: boolean[] = [];
        const translatedLines: string[] = new Array(lines.length);
        
        // 确定哪些行需要翻译
        for (const line of lines) {
            const needTranslate = line && line.trim() && !this.shouldSkipTranslation(line);
            skipLines.push(!needTranslate);
            if (needTranslate) {
                toTranslate.push(line);
            }
        }
        
        if (toTranslate.length > 0) {
            try {
                // 将多行内容合并翻译
                const translated = await this.apiClient.translateContent(
                    toTranslate.join('\n'),
                    toTranslate.length > 1  // 多行时使用完整文档模式
                );
                
                // 分割翻译结果
                const translatedParts = translated.split('\n');
                
                // 将翻译结果放回对应位置
                let translatedIndex = 0;
                for (let i = 0; i < lines.length; i++) {
                    if (skipLines[i]) {
                        // 对于不需要翻译的行，保持原样
                        translatedLines[i] = lines[i];
                    } else {
                        // 对于需要翻译的行，使用翻译结果
                        translatedLines[i] = translatedParts[translatedIndex++] || lines[i];
                    }
                }
            } catch (error) {
                // 翻译失败时保持原内容
                lines.forEach((line, i) => {
                    translatedLines[i] = line;
                });
            }
        } else {
            // 没有需要翻译的内容，全部保持原样
            lines.forEach((line, i) => {
                translatedLines[i] = line;
            });
        }
        
        return translatedLines;
    }

    /**
     * 处理纯新增内容
     */
    private handleNewContent(
        newStart: number,
        addedLines: string[],
        translatedLines: string[]
    ): ParagraphUpdate {
        const targetParagraph: Paragraph = {
            startLine: newStart + addedLines.length - 1,
            endLine: newStart - 1,  // 新增操作，endLine < startLine
            content: '',
            type: 'text'
        };
        
        const translatedParagraph: TranslatedParagraph = {
            ...targetParagraph,
            endLine: newStart + translatedLines.length - 1,
            translatedContent: translatedLines.join('\n')
        };
        
        return { targetParagraph, translatedParagraph };
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
        const targetParagraph: Paragraph = {
            startLine: newStart,
            endLine: newStart + removedLines.length - 1,
            content: removedLines.join('\n'),
            type: 'text'
        };
        
        const translatedParagraph: TranslatedParagraph = {
            ...targetParagraph,
            endLine: oldStart - 1,  // 删除操作，endLine < startLine
            translatedContent: ''
        };
        
        return { targetParagraph, translatedParagraph };
    }

    /**
     * 处理修改的内容
     */
    private handleModifiedContent(
        newStart: number,
        oldCount: number,
        newCount: number,
        removedLines: string[],
        translatedLines: string[]
    ): ParagraphUpdate {
        const targetParagraph: Paragraph = {
            startLine: newStart,
            endLine: newStart + oldCount - 1,
            content: removedLines.join('\n'),
            type: 'text'
        };
        
        const translatedParagraph: TranslatedParagraph = {
            startLine: newStart,
            endLine: newStart + newCount - 1,
            content: targetParagraph.content,
            translatedContent: translatedLines.join('\n'),
            type: 'text'
        };
        
        return { targetParagraph, translatedParagraph };
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