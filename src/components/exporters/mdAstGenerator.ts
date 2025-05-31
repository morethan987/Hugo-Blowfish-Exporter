/*
 * 抽象语法树生成器
 * 该文件用于生成Markdown的抽象语法树（AST）
 * 适配Obsidian风格的Markdown格式
 * 避免使用第三方库
 */


//////////////////////
// AST Node Types  //
//////////////////////

// Base interface for all AST nodes
interface ASTNode {
  type: string;
  children?: ASTNode[];
  // Additional properties for specific node types:
  value?: string;                // For text, code, math, comments, etc.
  level?: number;                // For headings (1-6)
  ordered?: boolean;             // For lists
  start?: number;                // For ordered lists: starting index
  checked?: boolean;             // For task list items
  identifier?: string;           // For footnote definitions or references
  language?: string;             // For code blocks
  url?: string;                  // For links
  title?: string;                // For links (anchor text)
  label?: string;                // For Obsidian links: display text
  target?: string;               // For Obsidian links or embeds: target file or header
  admonitionType?: string;       // For admonitions (info, tip, etc.)
  collapsible?: boolean;         // For admonitions
  isBlockComment?: boolean;      // For comments
  isMathBlock?: boolean;         // For math blocks
  data?: Record<string, any>;    // For YAML metadata
}

// Specific node type aliases for convenience
type DocumentNode = { type: "Document"; children: ASTNode[] };
type YAMLMetadataNode = { type: "YAMLMetadata"; data: Record<string, any> };
type HeadingNode = { type: "Heading"; level: number; children: ASTNode[] };
type ParagraphNode = { type: "Paragraph"; children: ASTNode[] };
type TextNode = { type: "Text"; value: string };
type LinkNode = { type: "Link"; url: string; title: string; children: ASTNode[] };
type ObsidianLinkNode = { type: "ObsidianLink"; target: string; label: string };
type EmbedNode = { type: "Embed"; target: string; width?: number; height?: number };
type BlockquoteNode = { type: "Blockquote"; children: ASTNode[] };
type AdmonitionNode = { type: "Admonition"; admonitionType: string; collapsible: boolean; children: ASTNode[] };
type ListNode = { type: "List"; ordered: boolean; start?: number; children: ASTNode[] };
type ListItemNode = { type: "ListItem"; children: ASTNode[]; checked?: boolean };
type CodeBlockNode = { type: "CodeBlock"; language?: string; value: string };
type InlineCodeNode = { type: "InlineCode"; value: string };
type CommentNode = { type: "Comment"; value: string; isBlockComment: boolean };
type FootnoteDefinitionNode = { type: "FootnoteDefinition"; identifier: string; children: ASTNode[] };
type FootnoteReferenceNode = { type: "FootnoteReference"; identifier: string };
type TaskListItemNode = { type: "TaskListItem"; checked: boolean; children: ASTNode[] };
type HorizontalRuleNode = { type: "HorizontalRule" };
type MathInlineNode = { type: "MathInline"; value: string };
type MathBlockNode = { type: "MathBlock"; value: string };

////////////////////////
// Parser Definition //
////////////////////////

/**
 * The main Parser class. It processes the input markdown text line by line,
 * identifies block-level constructs (including YAML frontmatter), then applies
 * inline parsing to text nodes.
 */
class Parser {
  private lines: string[];
  private index: number;
  private ast: DocumentNode;

  constructor(private input: string) {
    // Normalize line endings and split into lines
    this.lines = input.replace(/\r\n/g, "\n").split("\n");
    this.index = 0;
    this.ast = { type: "Document", children: [] };
  }

  /**
   * Entry point: parse the entire document and return the AST.
   */
  public parse(): DocumentNode {
    // First, attempt to parse YAML frontmatter metadata if present at the very beginning
    this.tryParseYAMLMetadata();

    // Continue parsing remaining blocks
    while (this.index < this.lines.length) {
      if (this.isBlankLine()) {
        this.index++;
        continue;
      }

      if (this.tryParseCodeBlock()) continue;
      if (this.tryParseMathBlock()) continue;
      if (this.tryParseBlockComment()) continue;
      if (this.tryParseHeading()) continue;
      if (this.tryParseHorizontalRule()) continue;
      if (this.tryParseFootnoteDefinition()) continue;
      if (this.tryParseAdmonition()) continue;
      if (this.tryParseBlockquote()) continue;
      if (this.tryParseList()) continue;
      // Fallback: paragraph
      this.parseParagraph();
    }

    return this.ast;
  }

  /**
   * Parse a YAML value, handling booleans, numbers, and strings
   */
  private parseYAMLValue(value: string): any {
    const trimmed = value.trim();
    if (/^(true|false)$/i.test(trimmed)) {
      return trimmed.toLowerCase() === "true";
    } else if (!isNaN(Number(trimmed)) && trimmed !== "") {
      return Number(trimmed);
    }
    return trimmed;
  }

  /**
   * Normalize admonition type, handling aliases
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

  /** Helper: check if current line is blank or whitespace */
  private isBlankLine(): boolean {
    return this.lines[this.index].trim() === "";
  }

  //////////////////////////
  // YAML Frontmatter    //
  //////////////////////////

  /**
   * Parse a YAML frontmatter block if it exists at the top (delimited by ---).
   * This should only run when index === 0, so that only the first block is considered metadata.
   */
  private tryParseYAMLMetadata(): boolean {
    if (this.index !== 0) return false;
    const line = this.lines[this.index];
    if (!/^---\s*$/.test(line)) return false;

    // Collect lines until the closing '---'
    this.index++;
    const yamlLines: string[] = [];
    while (this.index < this.lines.length && !/^---\s*$/.test(this.lines[this.index])) {
      yamlLines.push(this.lines[this.index]);
      this.index++;
    }

    // Skip the closing '---' (if present)
    if (this.index < this.lines.length && /^---\s*$/.test(this.lines[this.index])) {
      this.index++;
    }

    // Parse YAML key-value pairs with basic array support
    const data: Record<string, any> = {};
    let currentKey: string | null = null;
    
    for (const raw of yamlLines) {
      const trimmed = raw.trim();
      if (trimmed === "" || trimmed.startsWith("#")) {
        // Ignore blank lines or YAML comments
        continue;
      }
      
      // Check for array items (lines starting with -)
      if (trimmed.startsWith("- ") && currentKey) {
        const arrayValue = trimmed.substring(2).trim();
        if (!Array.isArray(data[currentKey])) {
          data[currentKey] = [];
        }
        data[currentKey].push(this.parseYAMLValue(arrayValue));
        continue;
      }
      
      // Regular key-value pairs
      const kvMatch = trimmed.match(/^([^:]+):\s*(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim();
        currentKey = key;
        
        if (value === "") {
          // Key with no value, might be followed by array items
          data[key] = [];
        } else {
          data[key] = this.parseYAMLValue(value);
        }
      }
    }

    const yamlNode: YAMLMetadataNode = {
      type: "YAMLMetadata",
      data,
    };
    this.ast.children.push(yamlNode);
    return true;
  }

  /////////////////////////
  // Block-Level Parsers //
  /////////////////////////

  /**
   * Parse a code block delimited by triple backticks ``` ... ```
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
    // Skip the closing ```
    if (this.index < this.lines.length) this.index++;

    const codeValue = contentLines.join("\n");
    const node: CodeBlockNode = {
      type: "CodeBlock",
      language: language || undefined,
      value: codeValue,
    };
    this.ast.children.push(node);
    return true;
  }

  /**
   * Parse a math block delimited by $$ ... $$
   */
  private tryParseMathBlock(): boolean {
    const line = this.lines[this.index];
    if (!line.trim().startsWith("$$")) return false;

    // If it's a one-line $$...$$
    if (line.trim().endsWith("$$") && line.trim().length > 2) {
      const content = line.trim().slice(2, -2).trim();
      this.index++;
      const node: MathBlockNode = { type: "MathBlock", value: content };
      this.ast.children.push(node);
      return true;
    }

    // Otherwise, read until closing $$
    this.index++;
    const contentLines: string[] = [];
    while (this.index < this.lines.length && !this.lines[this.index].trim().endsWith("$$")) {
      contentLines.push(this.lines[this.index]);
      this.index++;
    }
    // Capture last line before $$
    if (this.index < this.lines.length) {
      const lastLine = this.lines[this.index].trim();
      contentLines.push(lastLine.slice(0, lastLine.length - 2));
      this.index++;
    }
    const mathValue = contentLines.join("\n");
    const node: MathBlockNode = { type: "MathBlock", value: mathValue };
    this.ast.children.push(node);
    return true;
  }

  /**
   * Parse a block comment delimited by %% ... %%
   */
  private tryParseBlockComment(): boolean {
    const line = this.lines[this.index].trim();
    if (line !== "%%") return false;

    this.index++;
    const contentLines: string[] = [];
    while (this.index < this.lines.length && this.lines[this.index].trim() !== "%%") {
      contentLines.push(this.lines[this.index]);
      this.index++;
    }
    // Skip closing %%
    if (this.index < this.lines.length) this.index++;

    const commentValue = contentLines.join("\n");
    const node: CommentNode = { type: "Comment", value: commentValue, isBlockComment: true };
    this.ast.children.push(node);
    return true;
  }

  /**
   * Parse an ATX-style heading: lines starting with 1-6 hashes #
   */
  private tryParseHeading(): boolean {
    const line = this.lines[this.index];
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (!headingMatch) return false;

    const level = headingMatch[1].length;
    const content = headingMatch[2].trim();
    const inlineNodes = this.parseInline(content);

    const node: HeadingNode = {
      type: "Heading",
      level,
      children: inlineNodes,
    };
    this.ast.children.push(node);
    this.index++;
    return true;
  }

  /**
   * Parse a horizontal rule: line with at least 3 *, -, or _ (possibly spaced)
   */
  private tryParseHorizontalRule(): boolean {
    const line = this.lines[this.index];
    if (/^\s*((\*\s*\*\s*\*+)|(-\s*-\s*-+)|(_\s*_\s*_+))\s*$/.test(line)) {
      const node: HorizontalRuleNode = { type: "HorizontalRule" };
      this.ast.children.push(node);
      this.index++;
      return true;
    }
    return false;
  }

  /**
   * Parse a footnote definition: lines like [^id]: text
   */
  private tryParseFootnoteDefinition(): boolean {
    const line = this.lines[this.index];
    const fnMatch = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
    if (!fnMatch) return false;

    const identifier = fnMatch[1];
    const rest = fnMatch[2];
    const contentLines: string[] = [rest];

    // Capture indented continuation lines
    this.index++;
    while (this.index < this.lines.length && /^\s{2,}(.*)$/.test(this.lines[this.index])) {
      const contMatch = this.lines[this.index].match(/^\s{2,}(.*)$/);
      if (contMatch) contentLines.push(contMatch[1]);
      this.index++;
    }
    const paragraphText = contentLines.join(" ");
    const inlineNodes = this.parseInline(paragraphText);

    const node: FootnoteDefinitionNode = {
      type: "FootnoteDefinition",
      identifier,
      children: inlineNodes,
    };
    this.ast.children.push(node);
    return true;
  }

  /**
   * Parse an Obsidian-style admonition: blockquotes starting with > [!type][+/-]?
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

    // Collect all lines belonging to this admonition block (nested blockquotes)
    const contentLines: string[] = [firstLine];
    this.index++;

    while (this.index < this.lines.length && this.lines[this.index].trim().startsWith(">")) {
      // Remove leading '>' and optional space
      contentLines.push(this.lines[this.index].replace(/^>\s?/, ""));
      this.index++;
    }
    const paragraphText = contentLines.join("\n");
    // Recursively parse the content of the admonition as if it's its own little document
    const innerParser = new Parser(paragraphText);
    const innerDoc = innerParser.parse();

    const node: AdmonitionNode = {
      type: "Admonition",
      admonitionType,
      collapsible,
      children: innerDoc.children,
    };
    this.ast.children.push(node);
    return true;
  }

  /**
   * Parse a blockquote (excluding admonitions): lines starting with >
   */
  private tryParseBlockquote(): boolean {
    const line = this.lines[this.index];
    if (!line.trim().startsWith(">")) return false;

    const contentLines: string[] = [];
    while (this.index < this.lines.length && this.lines[this.index].trim().startsWith(">")) {
      // Strip only one leading '>' and optional space
      contentLines.push(this.lines[this.index].replace(/^>\s?/, ""));
      this.index++;
    }
    const paragraphText = contentLines.join("\n");
    // Recursively parse inner content
    const innerParser = new Parser(paragraphText);
    const innerDoc = innerParser.parse();

    const node: BlockquoteNode = { type: "Blockquote", children: innerDoc.children };
    this.ast.children.push(node);
    return true;
  }

  /**
   * Parse an (un)ordered list (including task list items). Handles nesting by indent.
   */
  private tryParseList(): boolean {
    const line = this.lines[this.index];
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (!listMatch) return false;

    const baseIndent = listMatch[1].length;
    const isOrdered = /^\d+\.$/.test(listMatch[2]);
    const startNumber = isOrdered ? parseInt(listMatch[2].slice(0, -1), 10) : undefined;

    const items: ListItemNode[] = [];

    while (this.index < this.lines.length) {
      const current = this.lines[this.index];
      const currentMatch = current.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
      if (!currentMatch) break;
      const indent = currentMatch[1].length;
      if (indent !== baseIndent) break;

      const marker = currentMatch[2];
      const content = currentMatch[3];

      // Check for task list item syntax [ ] or [x]
      let checked: boolean | undefined;
      let actualContent = content;
      const taskMatch = content.match(/^\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        checked = taskMatch[1].toLowerCase() === "x";
        actualContent = taskMatch[2];
      }

      // Parse the item's content as inline text (could contain further nested blocks but ignoring deeper nesting for brevity)
      const inlineNodes = this.parseInline(actualContent);

      const itemNode: ListItemNode = {
        type: "ListItem",
        children: inlineNodes,
        ...(checked !== undefined ? { checked } : {}),
      };
      items.push(itemNode);
      this.index++;
    }

    const node: ListNode = {
      type: "List",
      ordered: isOrdered,
      ...(startNumber !== undefined ? { start: startNumber } : {}),
      children: items,
    };
    this.ast.children.push(node);
    return true;
  }

  /**
   * Parse a paragraph: consecutive non-blank lines until a blank or other block starts.
   * After collecting lines, join them with spaces and run inline parsing.
   */
  private parseParagraph(): void {
    const linesBuffer: string[] = [];
    while (this.index < this.lines.length && !this.isBlankLine()) {
      // Stop if next line would be recognized as another block type
      const peek = this.lines[this.index];
      if (
        /^```/.test(peek) ||
        /^\$\$/.test(peek) ||
        /^\[\^/.test(peek) ||
        /^#{1,6}\s+/.test(peek) ||
        /^\s*((\*\s*\*\s*\*+)|(-\s*-\s*-+)|(_\s*_\s*_+))\s*$/.test(peek) ||
        /^\s*(?:[-*+]|\d+\.)\s+/.test(peek) ||
        /^\s*>/.test(peek) ||
        /^\s*%%/.test(peek) ||
        /^\s*$/.test(peek)
      ) {
        break;
      }
      linesBuffer.push(this.lines[this.index]);
      this.index++;
    }
    const paragraphText = linesBuffer.join(" ");
    const inlineNodes = this.parseInline(paragraphText);
    const node: ParagraphNode = { type: "Paragraph", children: inlineNodes };
    this.ast.children.push(node);
  }

  ///////////////////////
  // Inline Parsing   //
  ///////////////////////

  /**
   * Parse inline syntaxes within a single line of text:
   * - Inline code `...`
   * - Inline math $...$
   * - Obsidian embeds ![[file|widthxheight]]
   * - Obsidian links [[target|label]]
   * - Standard markdown links [text](url)
   * - Inline comments %%...%%
   * - Footnote references ^[...]
   * - Plain text
   */
  private parseInline(text: string): ASTNode[] {
    const nodes: ASTNode[] = [];
    let remaining = text;

    // Patterns for various inline constructs
    const patterns = [
      { type: "InlineCode", regex: /`([^`]+)`/ },
      { type: "MathInline", regex: /\$([^\$]+)\$/ },
      { type: "Embed", regex: /!\[\[([^\]\|]+)(?:\|(\d+)(?:x(\d+))?)?\]\]/ },
      { type: "ObsidianLink", regex: /\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/ },
      { type: "Link", regex: /\[([^\]]+)\]\(([^)]+)\)/ },
      { type: "Comment", regex: /%%([^%]+)%%/ },
      { type: "FootnoteReference", regex: /\[\^([^\]]+)\]/ },
      { type: "InlineFootnoteRef", regex: /\^\[([^\]]+)\]/ },
    ];

    while (remaining.length > 0) {
      let earliestIndex = remaining.length;
      let matchedType: string | null = null;
      let matchResult: RegExpMatchArray | null = null;
      let matchedPattern: { type: string; regex: RegExp } | null = null;

      // Find the earliest match among all patterns
      for (const patt of patterns) {
        const m = patt.regex.exec(remaining);
        if (m && m.index < earliestIndex) {
          earliestIndex = m.index;
          matchedType = patt.type;
          matchResult = m;
          matchedPattern = patt;
        }
      }

      if (!matchedType || !matchResult || !matchedPattern) {
        // No more matches: the rest is plain text
        nodes.push({ type: "Text", value: remaining });
        break;
      }

      // If there's text before the match, add it as a Text node
      if (matchResult.index !== undefined && matchResult.index > 0) {
        const prefix = remaining.slice(0, matchResult.index);
        nodes.push({ type: "Text", value: prefix });
      }

      // Handle the matched inline construct
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
        case "Embed": {
          const fullTarget = matchResult[1];
          const widthStr = matchResult[2];
          const heightStr = matchResult[3];
          const width = widthStr ? parseInt(widthStr, 10) : undefined;
          const height = heightStr ? parseInt(heightStr, 10) : undefined;
          
          // Parse target which may contain # for headers
          const parts = fullTarget.split('#');
          const fileTarget = parts[0];
          const headerTarget = parts.slice(1).join('#');
          const target = headerTarget ? `${fileTarget}#${headerTarget}` : fileTarget;
          
          const node: EmbedNode = {
            type: "Embed",
            target,
            ...(width ? { width } : {}),
            ...(height ? { height } : {})
          };
          nodes.push(node);
          break;
        }
        case "ObsidianLink": {
          const fullTarget = matchResult[1];
          const label = matchResult[2] || fullTarget;
          
          // Parse target which may contain # for headers
          const parts = fullTarget.split('#');
          const fileTarget = parts[0];
          const headerTarget = parts.slice(1).join('#');
          const target = headerTarget ? `${fileTarget}#${headerTarget}` : fileTarget;
          
          const obsLink: ObsidianLinkNode = { type: "ObsidianLink", target, label };
          nodes.push(obsLink);
          break;
        }
        case "Link": {
          const linkText = matchResult[1];
          const url = matchResult[2];
          // Recursively parse inline content of linkText
          const inner = this.parseInline(linkText);
          const linkNode: LinkNode = { type: "Link", url, title: linkText, children: inner };
          nodes.push(linkNode);
          break;
        }
        case "Comment": {
          const commentText = matchResult[1];
          const commentNode: CommentNode = { type: "Comment", value: commentText, isBlockComment: false };
          nodes.push(commentNode);
          break;
        }
        case "FootnoteReference": {
          const refId = matchResult[1];
          const footRefNode: FootnoteReferenceNode = { type: "FootnoteReference", identifier: refId };
          nodes.push(footRefNode);
          break;
        }
        case "InlineFootnoteRef": {
          const refId = matchResult[1];
          const footRefNode: FootnoteReferenceNode = { type: "FootnoteReference", identifier: refId };
          nodes.push(footRefNode);
          break;
        }
        default:
          // Fallback to plain text if unknown
          nodes.push({ type: "Text", value: matchResult[0] });
      }

      // Advance the remaining text
      const matchEnd = (matchResult.index ?? 0) + matchResult[0].length;
      remaining = remaining.slice(matchEnd);
    }

    return nodes;
  }
}

//////////////////////
// Exported Parser //
//////////////////////

/**
 * Public function to parse Obsidian-flavored Markdown (with YAML frontmatter)
 * into an AST.
 * @param markdownText - The raw Markdown string.
 * @returns A DocumentNode representing the root of the AST.
 */
export function parseMarkdown(markdownText: string): DocumentNode {
  const parser = new Parser(markdownText);
  return parser.parse();
}
