import HugoBlowfishExporter from '../../core/plugin';
import { TranslationApiClient } from './api-client';
import { Paragraph } from './paragraph-matcher';
import { DiffChange } from './diff-detector';

/**
 * 差异翻译器
 */
export class DiffTranslator {
    private apiClient: TranslationApiClient;

    constructor(private plugin: HugoBlowfishExporter) {
        this.apiClient = new TranslationApiClient(plugin);
    }

    /**
     * 翻译修改的段落
     * @param modifiedParagraphs 修改的段落列表
     * @returns 翻译后的段落列表
     */
    async translateModifiedParagraphs(modifiedParagraphs: Paragraph[]): Promise<TranslatedParagraph[]> {
        const translatedParagraphs: TranslatedParagraph[] = [];

        for (const paragraph of modifiedParagraphs) {
            const translatedContent = await this.translateParagraph(paragraph);
            translatedParagraphs.push({
                ...paragraph,
                translatedContent
            });
        }

        return translatedParagraphs;
    }

    /**
     * 翻译单个段落
     * @param paragraph 段落信息
     * @returns 翻译后的内容
     */
    private async translateParagraph(paragraph: Paragraph): Promise<string> {
        // 根据段落类型选择不同的翻译策略
        switch (paragraph.type) {
            case 'heading':
                return this.translateHeading(paragraph.content);
            case 'code':
                return this.translateCodeBlock(paragraph.content);
            case 'math':
                return this.translateMathBlock(paragraph.content);
            case 'list':
                return this.translateList(paragraph.content);
            case 'text':
            default:
                return this.translateTextParagraph(paragraph.content);
        }
    }

    /**
     * 翻译标题
     * @param content 标题内容
     * @returns 翻译后的标题
     */
    private async translateHeading(content: string): Promise<string> {
        const match = content.match(/^(#{1,6})\s+(.+)$/);
        if (!match) {
            return content;
        }

        const level = match[1];
        const titleText = match[2];

        const completion = await this.plugin.client.chat.completions.create({
            model: this.plugin.settings.ModelName,
            messages: [
                {
                    role: "system",
                    content: `你是一个专业的标题翻译助手。请将以下标题翻译成简洁准确的${this.plugin.settings.targetLanguage}。保持原有的语气和含义。`
                },
                {
                    role: "user",
                    content: titleText
                }
            ],
            temperature: 0.3
        });

        const translatedTitle = completion.choices[0].message.content || titleText;
        return `${level} ${translatedTitle}`;
    }

    /**
     * 翻译代码块
     * @param content 代码块内容
     * @returns 翻译后的代码块
     */
    private async translateCodeBlock(content: string): Promise<string> {
        const lines = content.split('\n');
        const translatedLines: string[] = [];

        for (const line of lines) {
            if (line.trim().startsWith('```') || line.trim() === '') {
                // 保持代码块标记和空行不变
                translatedLines.push(line);
            } else if (this.isCommentLine(line)) {
                // 翻译注释行
                const translatedComment = await this.translateComment(line);
                translatedLines.push(translatedComment);
            } else {
                // 保持代码行不变
                translatedLines.push(line);
            }
        }

        return translatedLines.join('\n');
    }

    /**
     * 翻译数学公式块
     * @param content 数学公式内容
     * @returns 原样返回（数学公式不需要翻译）
     */
    private async translateMathBlock(content: string): Promise<string> {
        // 数学公式保持不变
        return content;
    }

    /**
     * 翻译列表
     * @param content 列表内容
     * @returns 翻译后的列表
     */
    private async translateList(content: string): Promise<string> {
        const completion = await this.plugin.client.chat.completions.create({
            model: this.plugin.settings.ModelName,
            messages: [
                {
                    role: "system",
                    content: `你是一个专业的文档翻译助手。请将以下列表内容翻译成${this.plugin.settings.targetLanguage}，保持原有的Markdown列表格式不变。`
                },
                {
                    role: "user",
                    content: content
                }
            ],
            temperature: 0.3
        });

        return completion.choices[0].message.content || content;
    }

    /**
     * 翻译文本段落
     * @param content 文本内容
     * @returns 翻译后的文本
     */
    private async translateTextParagraph(content: string): Promise<string> {
        const completion = await this.plugin.client.chat.completions.create({
            model: this.plugin.settings.ModelName,
            messages: [
                {
                    role: "system",
                    content: `你是一个专业的文档翻译助手。请将以下段落翻译成表达地道、语义流畅的${this.plugin.settings.targetLanguage}。保持原有的Markdown格式、链接和图片引用不变。`
                },
                {
                    role: "user",
                    content: content
                }
            ],
            temperature: 0.3
        });

        return completion.choices[0].message.content || content;
    }

    /**
     * 检查是否是注释行
     * @param line 代码行
     * @returns 是否是注释
     */
    private isCommentLine(line: string): boolean {
        const trimmed = line.trim();
        
        // 常见的注释模式
        const commentPatterns = [
            /^\/\//, // JavaScript, TypeScript, C++
            /^#/, // Python, Shell
            /^\/\*/, // C-style comments start
            /^\*/, // C-style comments continuation
            /^<!--/, // HTML comments
            /^%/, // LaTeX comments
            /^;/, // Lisp, Assembly
        ];

        return commentPatterns.some(pattern => pattern.test(trimmed));
    }

    /**
     * 翻译注释行
     * @param line 注释行
     * @returns 翻译后的注释行
     */
    private async translateComment(line: string): Promise<string> {
        // 提取注释符号和内容
        const match = line.match(/^(\s*)(\/\/|#|\/\*|\*|<!--|%|;)\s*(.*)$/);
        if (!match) {
            return line;
        }

        const indent = match[1];
        const commentSymbol = match[2];
        const commentText = match[3];

        if (!commentText.trim()) {
            return line;
        }

        const completion = await this.plugin.client.chat.completions.create({
            model: this.plugin.settings.ModelName,
            messages: [
                {
                    role: "system",
                    content: `你是一个专业的代码注释翻译助手。请将以下代码注释翻译成简洁准确的${this.plugin.settings.targetLanguage}。`
                },
                {
                    role: "user",
                    content: commentText
                }
            ],
            temperature: 0.3
        });

        const translatedComment = completion.choices[0].message.content || commentText;
        return `${indent}${commentSymbol} ${translatedComment}`;
    }
}

/**
 * 翻译后的段落
 */
export interface TranslatedParagraph extends Paragraph {
    translatedContent: string;
}