import { RuleBuilder } from "src/components/ast/rule";
import { NodeType } from "src/components/ast/node"; // 需要引入 NodeType
import { texToSvg } from "src/components/rules/utils";


// 导出所有math相关规则
export const mathRuleWechat = [
    new RuleBuilder('math块转换为HTML')
        .describe('将块级数学公式（MathBlock）转换为 Wechat HTML 格式')
        .matchType(NodeType.MathBlock)
        .transform((node) => {
            // 处理块级公式，生成SVG
            const formula = (node.value || '').trim();
            const svgContent = texToSvg(formula, true); // 块级公式
            return {
                type: NodeType.HtmlBlock,
                value: `<section class="math-block">${svgContent}</section>`
            };
        })
        .build(),
    new RuleBuilder('math行内转换为HTML')
        .describe('将行内数学公式（MathSpan）转换为 Wechat HTML 格式')
        .matchType(NodeType.MathSpan)
        .transform((node) => {
            // 处理行内公式，生成SVG
            const formula = (node.value || '').trim();
            const svgContent = texToSvg(formula, false); // 行内公式
            return {
                type: NodeType.HtmlInline,
                value: `<span class="math-inline">${svgContent}</span>`
            };
        })
        .build()
];