import { RuleBuilder } from 'src/components/ast/rule';
import { NodeType } from 'src/components/ast/node';


export const wikiLinkRuleWechat = [
    new RuleBuilder('wiki链接转换为HTML')
        .describe('将wiki链接转换为HTML链接')
        .matchType(NodeType.WikiLink)
        .transform((node, context) => {
            const heading = (node.heading as string) || '';
            const alias = (node.alias as string) || '';
            const linkType = node.linkType as string;
            const file_name = node.file as string || '';
            
            // 对于微信公众号，wiki链接转换为简单的文本链接样式
            const linkText = alias || heading || file_name;
            
            return {
                type: NodeType.HtmlInline,
                value: `<a class="wikilink" data-target="${file_name}">${linkText}</a>`
            };
        })
        .build(),
    new RuleBuilder('嵌入内容转换为HTML')
        .describe('将嵌入内容转换为HTML占位符')
        .matchType(NodeType.Embed)
        .transform((node, context) => {
            const embedValue = node.value as string || '';
            
            return {
                type: NodeType.HtmlBlock,
                value: `<figure class="embed" data-src="${embedValue}"><figcaption>内嵌资源占位（${embedValue}）</figcaption></figure>`
            };
        })
        .build(),
]