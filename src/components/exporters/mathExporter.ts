import { RuleBuilder } from "../ast/rule";
import { NodeType } from "../ast/parser"; // 需要引入 NodeType
import type { MarkdownNode } from "../ast/parser";

export class MathExporter {
    transformMath(content: string): string {
        // console.log('开始处理数学公式');
        
        // 首先找出所有代码块的位置
        const codeBlocks: { start: number; end: number }[] = [];
        let codeMatch;
        const codeBlockRegex = /```[\s\S]*?```/g;
        
        while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
            codeBlocks.push({
                start: codeMatch.index,
                end: codeMatch.index + codeMatch[0].length
            });
        }
        
        // console.log('找到的代码块:', codeBlocks);
        
        // 判断一个位置是否在代码块中
        const isInCodeBlock = (position: number, length: number): boolean => {
            const result = codeBlocks.some(block => 
                (position >= block.start && position < block.end) || 
                (position + length > block.start && position + length <= block.end)
            );
            // console.log(`检查位置 ${position} 是否在代码块中:`, result);
            return result;
        };

        // 存储处理后的片段
        const segments: string[] = [];
        let lastIndex = 0;
        let hasMath = false;

        // 首先处理块级公式
        const blockMathRegex = /\$\$\s*\n([^$]+?)\n\s*\$\$/g;
        content = content.replace(blockMathRegex, (match, formula, offset) => {
            if (isInCodeBlock(offset, match.length)) {
                // console.log('块级公式在代码块中，保持原样:', match);
                return match;
            }
            // console.log('处理块级公式:', {
            //     原始内容: match,
            //     提取内容: formula,
            //     清理后: this.cleanMathContent(formula)
            // });
            hasMath = true;
            return `$$\n${this.cleanMathContent(formula)}\n$$`;
        });

        // 然后处理内联公式
        const inlineMathRegex = /\$([^\$\n]+?)\$/g;
        content = content.replace(inlineMathRegex, (match, formula, offset) => {
            if (isInCodeBlock(offset, match.length)) {
                // console.log('内联公式在代码块中，保持原样:', match);
                return match;
            }
            // console.log('处理内联公式:', {
            //     原始内容: match,
            //     提取内容: formula,
            //     清理后: this.cleanMathContent(formula)
            // });
            hasMath = true;
            return `\\(${this.cleanMathContent(formula)}\\)`;
        });

        // console.log('处理完成的内容:', content);

        // 如果没有数学公式，直接返回处理后的内容
        if (!hasMath) {
            return content;
        }

        // 如果有数学公式，检查元数据块并添加 katex 标记
        const frontmatterRegex = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;
        const frontmatterMatch = content.match(frontmatterRegex);

        if (frontmatterMatch) {
            // 如果有元数据块，在元数据块之后插入 {{< katex >}} 标记
            const frontmatterEndIndex = frontmatterMatch[0].length;
            return content.substring(0, frontmatterEndIndex) +
                   '{{< katex >}}\n' +
                   content.substring(frontmatterEndIndex);
        } else {
            // 如果没有元数据块，在内容开头插入 {{< katex >}} 标记
            return '{{< katex >}}\n' + content;
        }
    }

    private cleanMathContent(mathContent: string): string {
        const result = mathContent
            .trim()
            .replace(/\s+/g, ' ')  // 将多个空格替换为单个空格
        // console.log('清理数学内容:', {
        //     输入: mathContent,
        //     输出: result
        // });
        return result;
    }
}

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