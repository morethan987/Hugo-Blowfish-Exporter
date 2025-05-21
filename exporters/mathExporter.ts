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
