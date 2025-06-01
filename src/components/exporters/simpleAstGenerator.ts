/*
 * 简化版抽象语法树生成器
 * 专注于解析特定的Markdown元素：
 * 1. Callout代码块（admonition）
 * 2. Wiki链接（识别图片文件）
 * 3. 行内数学公式
 * 4. 代码块
 */

//////////////////////
// 简化AST节点类型  //
//////////////////////

interface SimpleASTNode {
  type: string;
  children?: SimpleASTNode[];
  value?: string;
  level?: number;
  language?: string;
  target?: string;
  label?: string;
  admonitionType?: string;
  collapsible?: boolean;
  isImage?: boolean;
}

// 具体节点类型
type SimpleDocumentNode = { type: "Document"; children: SimpleASTNode[] };
type SimpleParagraphNode = { type: "Paragraph"; children: SimpleASTNode[] };
type SimpleTextNode = { type: "Text"; value: string };
type SimpleCodeBlockNode = { type: "CodeBlock"; language?: string; value: string };
type SimpleInlineCodeNode = { type: "InlineCode"; value: string };
type SimpleMathInlineNode = { type: "MathInline"; value: string };
type SimpleObsidianLinkNode = { type: "ObsidianLink"; target: string; label: string; isImage?: boolean };
type SimpleAdmonitionNode = { type: "Admonition"; admonitionType: string; collapsible: boolean; children: SimpleASTNode[] };

////////////////////////
// 简化解析器定义    //
////////////////////////

class SimpleParser {
  private lines: string[];
  private index: number;
  private ast: SimpleDocumentNode;

  constructor(private input: string) {
    this.lines = input.replace(/\r\n/g, "\n").split("\n");
    this.index = 0;
    this.ast = { type: "Document", children: [] };
  }

  /**
   * 解析整个文档并返回AST
   */
  public parse(): SimpleDocumentNode {
    while (this.index < this.lines.length) {
      if (this.isBlankLine()) {
        this.index++;
        continue;
      }

      if (this.tryParseCodeBlock()) continue;
      if (this.tryParseAdmonition()) continue;
      // 回退：解析段落
      this.parseParagraph();
    }

    return this.ast;
  }

  /**
   * 检查当前行是否为空行
   */
  private isBlankLine(): boolean {
    return this.lines[this.index].trim() === "";
  }

  /**
   * 标准化admonition类型，处理别名
   */
  private normalizeAdmonitionType(type: string): string {
    const aliases: Record<string, string> = {
      hint: 'tip',
      important: 'tip',
      check: 'success',
      done: 'success',
      help: 'question',
      faq: 'question',
      caution: 'warning',
      attention: 'warning',
      fail: 'failure',
      missing: 'failure',
      error: 'danger',
      cite: 'quote'
    };
    const normalized = type.toLowerCase();
    return aliases[normalized] || normalized;
  }

  /**
   * 检查文件是否为图片
   */
  private isImageFile(filename: string): boolean {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.ico'];
    const lowerFilename = filename.toLowerCase();
    return imageExtensions.some(ext => lowerFilename.endsWith(ext));
  }

  /**
   * 解析代码块：```...```
   */
  private tryParseCodeBlock(): boolean {
    const line = this.lines[this.index];
    const codeFenceMatch = line.match(/^```(\w+)?\s*$/);
    if (!codeFenceMatch) return false;

    const language = codeFenceMatch[1] || "";
    this.index++;
    const contentLines: string[] = [];
    while (this.index < this.lines.length && !this.lines[this.index].startsWith("```")) {
      contentLines.push(this.lines[this.index]);
      this.index++;
    }
    // 跳过结束的```
    if (this.index < this.lines.length) this.index++;

    const codeValue = contentLines.join("\n");
    const node: SimpleCodeBlockNode = {
      type: "CodeBlock",
      language: language || undefined,
      value: codeValue,
    };
    this.ast.children.push(node);
    return true;
  }

  /**
   * 解析Obsidian风格的admonition：以> [!type][+/-]?开始的块引用
   */
  private tryParseAdmonition(): boolean {
    const line = this.lines[this.index];
    const admonMatch = line.match(/^>\s*\[!([^\]\+\-]+)([\+\-])?\]\s*(.*)$/);
    if (!admonMatch) return false;

    const typeRaw = admonMatch[1].toLowerCase();
    const symbol = admonMatch[2] || "";
    const firstLine = admonMatch[3] || "";

    const collapsible = symbol === "+" ? true : symbol === "-" ? false : false;
    const admonitionType = this.normalizeAdmonitionType(typeRaw);

    // 收集属于这个admonition块的所有行
    const contentLines: string[] = [firstLine];
    this.index++;

    while (this.index < this.lines.length && this.lines[this.index].trim().startsWith(">")) {
      // 移除开头的'>'和可选的空格
      contentLines.push(this.lines[this.index].replace(/^>\s?/, ""));
      this.index++;
    }
    
    const paragraphText = contentLines.join("\n");
    // 递归解析admonition的内容
    const innerParser = new SimpleParser(paragraphText);
    const innerDoc = innerParser.parse();

    const node: SimpleAdmonitionNode = {
      type: "Admonition",
      admonitionType,
      collapsible,
      children: innerDoc.children,
    };
    this.ast.children.push(node);
    return true;
  }

  /**
   * 解析段落：收集连续的非空行，然后进行内联解析
   */
  private parseParagraph(): void {
    const linesBuffer: string[] = [];
    while (this.index < this.lines.length && !this.isBlankLine()) {
      // 如果下一行是其他块类型，停止收集
      const peek = this.lines[this.index];
      if (
        /^```/.test(peek) ||
        /^\s*>\s*\[!/.test(peek) ||
        /^\s*$/.test(peek)
      ) {
        break;
      }
      linesBuffer.push(this.lines[this.index]);
      this.index++;
    }
    
    const paragraphText = linesBuffer.join(" ");
    const inlineNodes = this.parseInline(paragraphText);
    const node: SimpleParagraphNode = { type: "Paragraph", children: inlineNodes };
    this.ast.children.push(node);
  }

  /**
   * 解析内联元素：
   * - 内联代码 `...`
   * - 内联数学公式 $...$
   * - Obsidian链接 [[target|label]]
   * - 纯文本
   */
  private parseInline(text: string): SimpleASTNode[] {
    const nodes: SimpleASTNode[] = [];
    let remaining = text;

    // 内联元素的匹配模式
    const patterns = [
      { type: "InlineCode", regex: /`([^`]+)`/ },
      { type: "MathInline", regex: /\$([^\$]+)\$/ },
      { type: "ObsidianLink", regex: /\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/ },
    ];

    while (remaining.length > 0) {
      let earliestIndex = remaining.length;
      let matchedType: string | null = null;
      let matchResult: RegExpMatchArray | null = null;

      // 找到最早的匹配
      for (const patt of patterns) {
        const m = patt.regex.exec(remaining);
        if (m && m.index < earliestIndex) {
          earliestIndex = m.index;
          matchedType = patt.type;
          matchResult = m;
        }
      }

      if (!matchedType || !matchResult) {
        // 没有更多匹配：剩下的都是纯文本
        nodes.push({ type: "Text", value: remaining });
        break;
      }

      // 如果匹配前有文本，添加为文本节点
      if (matchResult.index !== undefined && matchResult.index > 0) {
        const prefix = remaining.slice(0, matchResult.index);
        nodes.push({ type: "Text", value: prefix });
      }

      // 处理匹配的内联元素
      switch (matchedType) {
        case "InlineCode": {
          const codeContent = matchResult[1];
          nodes.push({ type: "InlineCode", value: codeContent });
          break;
        }
        case "MathInline": {
          const mathContent = matchResult[1];
          nodes.push({ type: "MathInline", value: mathContent });
          break;
        }
        case "ObsidianLink": {
          const fullTarget = matchResult[1];
          const label = matchResult[2] || fullTarget;
          
          // 解析可能包含#的目标（用于标题）
          const parts = fullTarget.split('#');
          const fileTarget = parts[0];
          const headerTarget = parts.slice(1).join('#');
          const target = headerTarget ? `${fileTarget}#${headerTarget}` : fileTarget;
          
          // 检查是否为图片文件
          const isImage = this.isImageFile(fileTarget);
          
          const obsLink: SimpleObsidianLinkNode = { 
            type: "ObsidianLink", 
            target, 
            label,
            isImage
          };
          nodes.push(obsLink);
          break;
        }
        default:
          // 回退到纯文本
          nodes.push({ type: "Text", value: matchResult[0] });
      }

      // 推进剩余文本
      const matchEnd = (matchResult.index ?? 0) + matchResult[0].length;
      remaining = remaining.slice(matchEnd);
    }

    return nodes;
  }
}

//////////////////////
// 导出的解析器     //
//////////////////////

/**
 * 解析Obsidian风格的Markdown为简化的AST
 * 专注于：callout、wiki链接、行内数学公式、代码块
 * @param markdownText - 原始Markdown字符串
 * @returns 表示AST根节点的SimpleDocumentNode
 */
export function parseSimpleMarkdown(markdownText: string): SimpleDocumentNode {
  const parser = new SimpleParser(markdownText);
  return parser.parse();
}

/**
 * 工具函数：判断ObsidianLink节点是否指向图片文件
 * @param node - ObsidianLink节点
 * @returns 是否为图片链接
 */
export function isImageLink(node: SimpleObsidianLinkNode): boolean {
  return node.isImage === true;
}