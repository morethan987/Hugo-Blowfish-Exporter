import HugoBlowfishExporter from '../../core/plugin';

/**
 * 段落匹配器
 */
export class ParagraphMatcher {
    constructor(private plugin: HugoBlowfishExporter) {}

    /**
     * 将内容分割为段落
     * @param content 文件内容
     * @returns 段落数组
     */
    splitIntoParagraphs(content: string): Paragraph[] {
        const lines = content.split('\n');
        const paragraphs: Paragraph[] = [];
        let currentParagraph: string[] = [];
        let startLine = 0;
        let currentLine = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 检查是否是段落分隔符（空行或特殊标记）
            if (this.isParagraphSeparator(line, lines, i)) {
                if (currentParagraph.length > 0) {
                    paragraphs.push({
                        content: currentParagraph.join('\n'),
                        startLine: startLine + 1, // 1-based line numbers
                        endLine: currentLine,
                        type: this.detectParagraphType(currentParagraph.join('\n'))
                    });
                    currentParagraph = [];
                }
                startLine = i + 1;
                currentLine = i + 1;
            } else {
                currentParagraph.push(line);
                currentLine = i + 1;
            }
        }

        // 处理最后一个段落
        if (currentParagraph.length > 0) {
            paragraphs.push({
                content: currentParagraph.join('\n'),
                startLine: startLine + 1,
                endLine: currentLine,
                type: this.detectParagraphType(currentParagraph.join('\n'))
            });
        }

        return paragraphs;
    }

    /**
     * 在目标文件中找到对应的段落
     * @param sourceParagraph 源段落
     * @param targetParagraphs 目标段落数组
     * @returns 匹配的段落索引，如果未找到返回-1
     */
    findMatchingParagraph(sourceParagraph: Paragraph, targetParagraphs: Paragraph[]): number {
        // 首先尝试精确匹配段落类型和部分内容
        for (let i = 0; i < targetParagraphs.length; i++) {
            const targetParagraph = targetParagraphs[i];
            
            if (this.paragraphsMatch(sourceParagraph, targetParagraph)) {
                return i;
            }
        }

        return -1;
    }

    /**
     * 检查两个段落是否匹配
     * @param source 源段落
     * @param target 目标段落
     * @returns 是否匹配
     */
    private paragraphsMatch(source: Paragraph, target: Paragraph): boolean {
        // 类型必须相同
        if (source.type !== target.type) {
            return false;
        }

        // 根据段落类型使用不同的匹配策略
        switch (source.type) {
            case 'heading':
                return this.matchHeadings(source.content, target.content);
            case 'code':
                return this.matchCodeBlocks(source.content, target.content);
            case 'math':
                return this.matchMathBlocks(source.content, target.content);
            case 'list':
                return this.matchLists(source.content, target.content);
            case 'text':
            default:
                return this.matchTextParagraphs(source.content, target.content);
        }
    }

    /**
     * 检查是否是段落分隔符
     * @param line 当前行
     * @param lines 所有行
     * @param index 当前行索引
     * @returns 是否是分隔符
     */
    private isParagraphSeparator(line: string, lines: string[], index: number): boolean {
        // 空行
        if (line.trim() === '') {
            return true;
        }

        // 检查是否是代码块或数学公式的边界
        if (line.trim() === '```' || line.trim() === '$$') {
            return true;
        }

        // 检查标题
        if (line.match(/^#{1,6}\s+/)) {
            return true;
        }

        return false;
    }

    /**
     * 检测段落类型
     * @param content 段落内容
     * @returns 段落类型
     */
    private detectParagraphType(content: string): ParagraphType {
        const trimmed = content.trim();
        
        if (trimmed.match(/^#{1,6}\s+/)) {
            return 'heading';
        }
        
        if (trimmed.startsWith('```') || trimmed.endsWith('```')) {
            return 'code';
        }
        
        if (trimmed.startsWith('$$') || trimmed.endsWith('$$')) {
            return 'math';
        }
        
        if (trimmed.match(/^[-*+]\s+/) || trimmed.match(/^\d+\.\s+/)) {
            return 'list';
        }
        
        return 'text';
    }

    /**
     * 匹配标题段落
     */
    private matchHeadings(source: string, target: string): boolean {
        const sourceLevel = source.match(/^(#{1,6})/)?.[1].length || 0;
        const targetLevel = target.match(/^(#{1,6})/)?.[1].length || 0;
        return sourceLevel === targetLevel;
    }

    /**
     * 匹配代码块
     */
    private matchCodeBlocks(source: string, target: string): boolean {
        const sourceLanguage = source.match(/^```(\w+)/)?.[1] || '';
        const targetLanguage = target.match(/^```(\w+)/)?.[1] || '';
        return sourceLanguage === targetLanguage;
    }

    /**
     * 匹配数学公式块
     */
    private matchMathBlocks(source: string, target: string): boolean {
        // 数学公式应该保持一致
        return source.replace(/\s+/g, ' ') === target.replace(/\s+/g, ' ');
    }

    /**
     * 匹配列表
     */
    private matchLists(source: string, target: string): boolean {
        const sourceItems = source.split('\n').filter(line => line.trim()).length;
        const targetItems = target.split('\n').filter(line => line.trim()).length;
        return Math.abs(sourceItems - targetItems) <= 1; // 允许一些差异
    }

    /**
     * 匹配文本段落
     */
    private matchTextParagraphs(source: string, target: string): boolean {
        // 对于普通文本，使用相似度匹配
        const sourceSentences = source.split(/[.!?。！？]/).filter(s => s.trim());
        const targetSentences = target.split(/[.!?。！？]/).filter(s => s.trim());
        
        // 如果句子数量相差太大，可能不是同一段落
        if (Math.abs(sourceSentences.length - targetSentences.length) > 2) {
            return false;
        }
        
        return true;
    }
}

/**
 * 段落信息
 */
export interface Paragraph {
    content: string;
    startLine: number;
    endLine: number;
    type: ParagraphType;
}

/**
 * 段落类型
 */
export type ParagraphType = 'text' | 'heading' | 'code' | 'math' | 'list';