import HugoBlowfishExporter from 'src/core/plugin';

/**
 * 翻译API客户端助手
 */
export class TranslationApiClient {
    constructor(private plugin: HugoBlowfishExporter) {}

    /**
     * 翻译标题
     * @param title 原始标题
     * @returns 翻译后的标题
     */
    async translateTitle(title: string): Promise<string> {
        const targetLanguage = this.plugin.settings.targetLanguage==='en' ? '英文' : '中文';
        const completion = await this.plugin.client.chat.completions.create({
            model: this.plugin.settings.ModelName,
            messages: [
                {
                    role: "system",
                    content: `你是一个精准的标题翻译专家。请将以下标题翻译成简洁凝练的${targetLanguage}。`
                },
                {
                    role: "user",
                    content: title
                }
            ],
            temperature: 0.3
        });
        
        return completion.choices[0].message.content || 'Default Title';
    }

    /**
     * 翻译内容
     * @param content 原始内容
     * @returns 翻译后的内容
     */
    async translateContent(content: string, isFullDocument: boolean = true): Promise<string> {
        const targetLanguage = this.plugin.settings.targetLanguage==='en' ? '英文' : '中文';
        const completion = await this.plugin.client.chat.completions.create({
            model: this.plugin.settings.ModelName,
            messages: [
                {
                    role: "system",
                    content: isFullDocument
                        ? `你是一个专业的文档翻译助手。请将以下Markdown内容翻译成表达地道、语义流畅流畅的${targetLanguage}，同时严格遵循以下要求：\n1. 保持所有的Markdown格式、链接和图片引用不变；frontmatter部分需要保持格式不变。\n2. 代码块中的注释需要翻译。\n3. 只翻译内容，不要添加任何额外的解释或注释。\n4. 忠于原文结构和格式，保持严格的行数一致，严禁随意添加或减少行，也不要把分好理解为换行。\n5. 保持原文的语气和风格，确保翻译后的内容自然流畅。`
                        : `你是一个精确的翻译助手。请将以下文本翻译成${targetLanguage}。只需要翻译这一行内容，保持格式，不要添加任何其他内容。`
                },
                {
                    role: "user",
                    content: content
                }
            ],
            temperature: 0.3,
            max_tokens: 8000
        });
        
        return completion.choices[0].message.content || '';
    }
}