import { NodeType } from "../ast/parser";
import { RuleBuilder } from "../ast/rule";

export class MermaidExporter {
    transformMermaid(content: string): string {
        const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
        
        return content.replace(mermaidRegex, (match, mermaidContent) => {
            const cleanMermaidContent = this.cleanMermaidContent(mermaidContent);
            return this.generateMermaidHtml(cleanMermaidContent);
        });
    }

    transformMermaid_AST(content: string): string {
        const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
        
        return content.replace(mermaidRegex, (match, mermaidContent) => {
            const cleanMermaidContent = this.cleanMermaidContent(mermaidContent);
            return this.generateMermaidHtml(cleanMermaidContent);
        });
    }

    private cleanMermaidContent(mermaidContent: string): string {
        return mermaidContent
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0)
            .join('\n');
    }

    private generateMermaidHtml(content: string): string {
        return `{{< mermaid >}}
${content}
{{< /mermaid >}}`;
    }
}

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