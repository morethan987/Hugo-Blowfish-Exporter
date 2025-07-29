import { NodeType } from "../ast/parser";
import { RuleBuilder } from "../ast/rule";


export const mermaidRule = new RuleBuilder('mermaid转换')
    .describe('将mermaid块转换为对应的hugo简码')
    .matchType(NodeType.CodeBlock)
    .transform((node, context) => {
      // 获取 callout 类型和标题
      const language = (node.lang as string) || '';
      const content = (node.value as string) || '';
      
      if (language === 'mermaid') {
        return {
            type: NodeType.Text,
            value: `{{< mermaid >}}\n${content}\n{{< /mermaid >}}\n`
          };
      }

      return node;
    })
    .build();