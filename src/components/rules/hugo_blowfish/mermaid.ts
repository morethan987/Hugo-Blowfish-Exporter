import { NodeType } from "src/components/ast/node";
import { RuleBuilder } from "src/components/ast/rule";


export const mermaidRuleHugo = new RuleBuilder('mermaid转换')
    .describe('将mermaid块转换为对应的hugo简码')
    .matchType(NodeType.CodeBlock)
    .transform(async (node, context) => {
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