import { RuleBuilder } from "../ast/rule";
import { NodeType } from "../ast/parser"; // 需要引入 NodeType
import type { MarkdownNode } from "../ast/parser";


function hasMathNode(node: MarkdownNode): boolean {
  if (!node) return false;
  if (node.type === NodeType.MathBlock || node.type === NodeType.MathSpan) return true;
  if (Array.isArray(node.children)) {
    return node.children.some(hasMathNode);
  }
  return false;
}

export const insertKatexRule = new RuleBuilder('插入katex标签')
  .describe('如果AST中存在数学公式，则在FrontMatter后插入{{< katex >}}标签')
  .matchType(NodeType.FrontMatter)
  .transform((node, context) => {
    if (hasMathNode(context.root)) {
      // 返回一个特殊标记节点，后续处理时插入 katex 标签
      return {
        type: NodeType.Text,
        value: '---\n' + (node.value || '') + '\n---\n{{< katex >}}\n'
      };
    }
    return node;
  })
  .build();

// 导出所有math相关规则
export const mathRule = [
    // 先去插入katex标签，否则转换后就没有MathSpan和MathBlock了
    insertKatexRule,
    new RuleBuilder('math块转换')
        .describe('将块级数学公式（MathBlock）转换为 hugo 支持的格式')
        .matchType(NodeType.MathBlock)
        .transform((node) => {
        // 处理块级公式，去除多余空格，包裹 $$，并加上 {{< katex >}}
        const formula = (node.value || '').trim().replace(/\s+/g, ' ');
        return {
            type: NodeType.Text,
            value: `\n$$\n${formula}\n$$\n`
        };
        })
        .build(),
    new RuleBuilder('math行内转换')
        .describe('将行内数学公式（MathSpan）转换为 hugo 支持的格式')
        .matchType(NodeType.MathSpan)
        .transform((node) => {
        // 处理行内公式，去除多余空格，包裹 \( ... \)
        const formula = (node.value || '').trim().replace(/\s+/g, ' ');
        return {
            type: NodeType.Text,
            value: `\\(${formula}\\)`
        };
        })
        .build()
];