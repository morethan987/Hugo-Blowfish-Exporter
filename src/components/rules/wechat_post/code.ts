import { RuleBuilder } from "src/components/ast/rule";
import { NodeType } from "src/components/ast/node"; // 需要引入 NodeType
import { getCodeBlock } from "src/components/rules/utils";


// 导出所有code相关规则
export const codeRuleWechat = [
    new RuleBuilder('code块转换为HTML')
        .describe('将块级代码（CodeBlock）转换为 Wechat HTML 格式')
        .matchType(NodeType.CodeBlock)
        .transform(async (node, context) => {
            // 处理块级代码，生成HTML
            return {
                type: NodeType.HtmlBlock,
                value: await getCodeBlock(context.data.app, node.value as string, node.lang as string)
            };
        })
        .build(),
    new RuleBuilder('code行内转换为HTML')
        .describe('将行内代码（InlineCode）转换为 Wechat HTML 格式')
        .matchType(NodeType.InlineCode)
        .transform(async (node) => {
            // 处理行内代码，生成HTML
            const code = (node.value || '').trim();
            return {
                type: NodeType.HtmlInline,
                value: `<span class="inline-code">${code}</span>`
            };
        })
        .build()
];

