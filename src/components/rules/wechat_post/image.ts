import { RuleBuilder } from 'src/components/ast/rule';
import { NodeType } from 'src/components/ast/node';

export const imageRuleWechat = new RuleBuilder('图片转换为HTML')
    .describe('将图片转换为HTML格式')
    .matchType(NodeType.Image)
    .transform(async (node, context) => {
        // 记录图片文件，稍后在exporter中处理base64转换
        if (!context.data.imageFiles) context.data.imageFiles = [];
        context.data.imageFiles.push(node.url);
        
        const imageFile = node.url as string;
        const alt = node.alt as string || '';
        
        // 如果有标题，包装在figure中
        if (node.title) {
            return {
                type: NodeType.HtmlBlock,
                value: `<figure><img src="{{IMAGE:${imageFile}}}" alt="${alt}"><figcaption>${node.title}</figcaption></figure>`
            };
        }
        
        return {
            type: NodeType.HtmlInline,
            value: `<img src="{{IMAGE:${imageFile}}}" alt="${alt}">`
        };
    })
    .build();
