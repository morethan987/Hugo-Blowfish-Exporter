import { NodeType } from "src/components/ast/node";
import { RuleBuilder } from "src/components/ast/rule";
import { getCodeBlock } from "src/components/rules/utils";


export const mermaidRuleWechat = new RuleBuilder('代码块转换')
    .describe('将代码块转换为HTML格式')
    .matchType(NodeType.CodeBlock)
    .transform(async (node, context) => {
      const language = (node.lang as string) || '';
      const content = (node.value as string) || '';
      
      if (language === 'mermaid') {
        // 对于mermaid，暂时显示为代码块，后续可以考虑渲染为图片
        return {
            type: NodeType.HtmlBlock,
            value: `<div class="mermaid-placeholder"><pre><code class="language-mermaid">${content}</code></pre></div>`
          };
      }

      // 其他代码块使用工具函数生成HTML
      const codeBlockHtml = await getCodeBlock(context.data.app, content, language);
      return {
        type: NodeType.HtmlBlock,
        value: codeBlockHtml
      };
    })
    .build();