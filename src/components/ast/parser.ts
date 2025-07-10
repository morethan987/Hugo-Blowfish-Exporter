/**
 * -------------------------------------------------------------------------
 * 解析顺序严格遵循「Obsidian‑Flavoured Markdown」优先级表：
 *   1. 块级规则 blockRules
 *   2. 行内规则 inlineRules
 * -------------------------------------------------------------------------
 */

/* ────────────────────────────────────────────────────────────────────────────
 * AST 类型定义
 * ────────────────────────────────────────────────────────────────────────── */

export enum NodeType {
  // 文档根
  Document = 'Document',
  // Front‑matter / 注释
  FrontMatter = 'FrontMatter',
  HtmlComment = 'HtmlComment',

  // 区块级元素
  CodeBlock = 'CodeBlock',
  MathBlock = 'MathBlock',
  Callout = 'Callout',
  BlockQuote = 'BlockQuote',
  List = 'List',
  ListItem = 'ListItem',
  HorizontalRule = 'HorizontalRule',
  Heading = 'Heading',
  Table = 'Table',
  FootnoteDef = 'FootnoteDef',
  HtmlBlock = 'HtmlBlock',
  Paragraph = 'Paragraph',

  // 行内元素
  Text = 'Text',
  InlineCode = 'InlineCode',
  MathSpan = 'MathSpan',
  WikiLink = 'WikiLink',
  Embed = 'Embed',
  FootnoteRef = 'FootnoteRef',
  Image = 'Image',
  Link = 'Link',
  Highlight = 'Highlight',
  Strike = 'Strike',
  StrongEmphasis = 'StrongEmphasis',
  Strong = 'Strong',
  Emphasis = 'Emphasis',
  HtmlInline = 'HtmlInline',
  AutoLink = 'AutoLink',
  EscapedChar = 'EscapedChar',
}

export interface MarkdownNode {
  type: NodeType;
  children?: MarkdownNode[];
  value?: string;
  // 额外属性（例如 heading level / list ordered 等）
  [key: string]: unknown;
}



/* ────────────────────────────────────────────────────────────────────────────
 * 对外主函数
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * 将 Markdown 文本解析为 AST。
 */
export function parseMarkdown(src: string): MarkdownNode {
  // 统一换行符，再拆分为行数组
  const lines = src.replace(/\r\n?/g, '\n').split('\n');

  // 根节点
  const root: MarkdownNode = { type: NodeType.Document, children: [] };
  let i = 0;

  // YAML Front‑matter 仅允许出现在文件开头
  if (lines[i] === '---') {
    const fmLines: string[] = [];
    i++; // 跳过起始 '---'
    while (i < lines.length && lines[i] !== '---') {
      fmLines.push(lines[i]);
      i++;
    }
    if (i < lines.length && lines[i] === '---') i++; // 跳过结束 '---'
    root.children!.push({ type: NodeType.FrontMatter, value: fmLines.join('\n') });
  }

  // 主循环：逐行消费
  while (i < lines.length) {
    const line = lines[i];

    // 空行直接跳过，但需要在段落内做处理，这里只做光标推进
    if (line.trim() === '') { i++; continue; }

    /* ---------- HTML 或 Obsidian 注释 ----------------------------------- */
    if (/^<!--/.test(line)) {
      const commentLines: string[] = [];
      while (i < lines.length) {
        commentLines.push(lines[i]);
        // 精确匹配注释结束标记 -->
        if (/-->\s*$/.test(lines[i])) {
          i++;         // 跳过这一行
          break;      // 退出循环
        }
        i++;
      }
      root.children!.push({ type: NodeType.HtmlComment, value: commentLines.join('\n') });
      continue;
    }
    if (/^%%/.test(line)) {
      const commentLines: string[] = [];
      while (i < lines.length) {
        commentLines.push(lines[i]);
        // 只要行尾是 %% 就结束，不再限制长度
        if (/%%\s*$/.test(lines[i])) {
          i++;    // 跳过结束标记所在行
          break;
        }
        i++;
      }
      root.children!.push({ type: NodeType.HtmlComment, value: commentLines.join('\n') });
      continue;
    }

    /* ---------- 围栏代码块 ``` 或 ~~~ ---------------------------------- */
    const fenceMatch = /^(```|~~~)/.exec(line);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const info = line.slice(fence.length).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence)) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // 越过结束围栏
      root.children!.push({ type: NodeType.CodeBlock, lang: info || undefined, value: codeLines.join('\n') });
      continue;
    }

    /* ---------- 数学块 $$ ---------------------------------------------- */
    if (/^\$\$/.test(line)) {
      const mathLines: string[] = [];
      i++;
      while (i < lines.length && !/^\$\$/.test(lines[i])) {
        mathLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // 跳过结束 $$
      root.children!.push({ type: NodeType.MathBlock, value: mathLines.join('\n') });
      continue;
    }

    /* ---------- Callout (> [!note] ...) --------------------------------- */
    if (/^>\s*\[![^\]]+\]/.test(line)) {
      const calloutLines: string[] = [];
      
      // 收集当前 callout 的所有行
      while (i < lines.length) {
        const currentLine = lines[i];
        
        // 如果是空行，结束当前 callout
        if (currentLine.trim() === '') {
          i++;
          break;
        }
        
        // 如果不是引用行，结束当前 callout
        if (!/^>\s*/.test(currentLine)) {
          break;
        }
        
        calloutLines.push(currentLine);
        i++;
      }
      
      // 提取 callout 类型和内容
      const firstLine = calloutLines[0].replace(/^>\s*/, '');
      const typeMatch = /^\[!([^\]]+)\](.*)$/.exec(firstLine);
      const calloutType = typeMatch ? typeMatch[1] : 'note';
      const calloutTitle = typeMatch ? typeMatch[2].trim() : '';
      
      // 去掉第一行，并对剩余每一行去掉一层 > 引用标记
      const inner = calloutLines
        .slice(1)
        .map(l => l.replace(/^>\s?/, ''))
        .join('\n');
      
      // 解析内部内容
      const innerAst = parseMarkdown(inner);
      
      // 提取 callout 内容文本
      const calloutContent = innerAst.children?.map(child => {
        if (child.type === NodeType.Text) {
          return child.value || '';
        } else if (child.type === NodeType.Paragraph) {
          return child.children?.map(grandChild => 
            grandChild.type === NodeType.Text ? grandChild.value || '' : ''
          ).join('') || '';
        }
        return '';
      }).filter(line => line.length > 0).join('\n') || '';
      
      root.children!.push({
        type: NodeType.Callout,
        calloutType,
        calloutTitle,
        calloutContent,
        children: innerAst.children,
      });
      continue;
    }

    /* ---------- BlockQuote --------------------------------------------- */
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      root.children!.push({ type: NodeType.BlockQuote, children: parseMarkdown(quoteLines.join('\n')).children });
      continue;
    }

    /* ---------- 列表 (任务/无序/有序) ---------------------------------- */
    const listMatch = /^([ \t]*)([-+*]|\d+\.)\s+(.*)$/.exec(line);
    if (listMatch) {
      const indentBase = listMatch[1].length;
      const ordered = /\d+\./.test(listMatch[2]);
      const items: MarkdownNode[] = [];
      
      while (i < lines.length) {
        const currentLine = lines[i];
        // 修复：如果是空行，跳过
        if (currentLine.trim() === '') {
          i++;
          break;
        }
        
        // 修复：使用更精确的正则匹配
        const li = /^([ \t]*)([-+*]|\d+\.)\s+(.*)$/.exec(currentLine);
        if (!li) break;
        
        const currentIndent = li[1].length;
        // 修复：检查缩进层级，如果不匹配则停止
        if (currentIndent !== indentBase) break;
        
        const taskMatch = /^\[( |x)\]\s+/.exec(li[3]);
        const content = taskMatch ? li[3].slice(taskMatch[0].length) : li[3];
        items.push({
          type: NodeType.ListItem,
          task: taskMatch ? (taskMatch[1] === 'x') : undefined,
          children: parseInline(content),
        });
        i++;
      }
      root.children!.push({ type: NodeType.List, ordered, children: items });
      continue;
    }

    /* ---------- 水平线 -------------------------------------------------- */
    if (/^(\*\s*){3,}$/.test(line) || /^(\-\s*){3,}$/.test(line) || /^(\_\s*){3,}$/.test(line)) {
      root.children!.push({ type: NodeType.HorizontalRule });
      i++; continue;
    }

    /* ---------- ATX Heading (#) ---------------------------------------- */
    const atx = /^(#{1,6})\s+(.*)$/.exec(line);
    if (atx) {
      root.children!.push({ type: NodeType.Heading, level: atx[1].length, children: parseInline(atx[2]) });
      i++; continue;
    }

    /* ---------- Setext Heading (下划线) -------------------------------- */
    if (i + 1 < lines.length && /^(=+|-+)\s*$/.test(lines[i + 1])) {
      const level = /^=+/.test(lines[i + 1]) ? 1 : 2;
      root.children!.push({ type: NodeType.Heading, level, children: parseInline(line.trim()) });
      i += 2; continue;
    }

    /* ---------- 表格 ---------------------------------------------------- */
    if (line.includes('|') && i + 1 < lines.length && /\|\s*:?-+:?\s*\|/.test(lines[i + 1])) {
      const header = line.trim();
      const align = lines[i + 1].trim();
      const rows: string[] = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].trim());
        i++;
      }
      root.children!.push({ type: NodeType.Table, header, align, rows });
      continue;
    }

    /* ---------- 脚注定义 ------------------------------------------------ */
    const footDef = /^\[\^([^\]]+)\]:\s+(.*)$/.exec(line);
    if (footDef) {
      root.children!.push({ type: NodeType.FootnoteDef, id: footDef[1], children: parseInline(footDef[2]) });
      i++; continue;
    }

    /* ---------- HTML Block (简化) -------------------------------------- */
    if (/^<[a-zA-Z]/.test(line)) {
      const htmlLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        htmlLines.push(lines[i]);
        i++;
      }
      root.children!.push({ type: NodeType.HtmlBlock, value: htmlLines.join('\n') });
      continue;
    }

    /* ---------- 段落 ---------------------------------------------------- */
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') {
      paraLines.push(lines[i]);
      i++;
    }
    root.children!.push({ type: NodeType.Paragraph, children: parseInline(paraLines.join(' ')) });
  }

  return root;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 行内解析器：按优先级依次匹配
 * ------------------------------------------------------------------------- */
function parseInline(text: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  let i = 0;
  let buffer = '';
  const flush = () => { if (buffer) { nodes.push({ type: NodeType.Text, value: buffer }); buffer = ''; } };

  while (i < text.length) {
    /** 0. 反斜杠转义 */
    if (text[i] === '\\' && i + 1 < text.length) {
      flush();
      nodes.push({ type: NodeType.EscapedChar, value: text[i + 1] });
      i += 2; continue;
    }

    /** 1. 行内代码 */
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        flush();
        nodes.push({ type: NodeType.InlineCode, value: text.slice(i + 1, end) });
        i = end + 1; continue;
      }
    }

    /** 2. 行内数学 */
    if (text[i] === '$' && i + 1 < text.length && text[i + 1] !== '$') {
      const end = text.indexOf('$', i + 1);
      if (end !== -1) {
        flush();
        nodes.push({ type: NodeType.MathSpan, value: text.slice(i + 1, end) });
        i = end + 1; continue;
      }
    }

    /** 3. Wikilink & 4. Embed */
    if (text.startsWith('![[', i) || text.startsWith('[[', i)) {
      const embed = text.startsWith('![[', i);
      const start = i + (embed ? 3 : 2);
      const end = text.indexOf(']]', start);
      if (end !== -1) {
        const content = text.slice(start, end);
        flush();
        nodes.push({ type: embed ? NodeType.Embed : NodeType.WikiLink, value: content.trim() });
        i = end + 2; continue;
      }
    }

    /** 5. 脚注引用 */
    if (text.startsWith('[^', i)) {
      const end = text.indexOf(']', i + 2);
      if (end !== -1) {
        flush();
        const id = text.slice(i + 2, end);
        nodes.push({ type: NodeType.FootnoteRef, id });
        i = end + 1; continue;
      }
    }

    /** 6. 图片 */
    if (text.startsWith('![', i)) {
      const altEnd = text.indexOf(']', i + 2);
      const parenStart = altEnd !== -1 ? text.indexOf('(', altEnd) : -1;
      const parenEnd = parenStart !== -1 ? text.indexOf(')', parenStart) : -1;
      if (altEnd !== -1 && parenStart !== -1 && parenEnd !== -1) {
        flush();
        const alt = text.slice(i + 2, altEnd);
        const url = text.slice(parenStart + 1, parenEnd);
        nodes.push({ type: NodeType.Image, alt, url });
        i = parenEnd + 1; continue;
      }
    }

    /** 7. 链接 */
    if (text[i] === '[') {
      const altEnd = text.indexOf(']', i + 1);
      const parenStart = altEnd !== -1 ? text.indexOf('(', altEnd) : -1;
      const parenEnd = parenStart !== -1 ? text.indexOf(')', parenStart) : -1;
      if (altEnd !== -1 && parenStart !== -1 && parenEnd !== -1) {
        flush();
        const label = text.slice(i + 1, altEnd);
        const url = text.slice(parenStart + 1, parenEnd);
        nodes.push({ type: NodeType.Link, label, url });
        i = parenEnd + 1; continue;
      }
    }

    /** 8. 高亮 ==text== */
    if (text.startsWith('==', i)) {
      const end = text.indexOf('==', i + 2);
      if (end !== -1) {
        flush();
        nodes.push({ type: NodeType.Highlight, children: parseInline(text.slice(i + 2, end)) });
        i = end + 2; continue;
      }
    }

    /** 9. 删除线 ~~ */
    if (text.startsWith('~~', i)) {
      const end = text.indexOf('~~', i + 2);
      if (end !== -1) {
        flush();
        nodes.push({ type: NodeType.Strike, children: parseInline(text.slice(i + 2, end)) });
        i = end + 2; continue;
      }
    }

    /** 10/11/12. 强调组合 *** / ** / *  */
    // ***
    if (text.startsWith('***', i)) {
      const end = text.indexOf('***', i + 3);
      if (end !== -1) {
        flush();
        nodes.push({ type: NodeType.StrongEmphasis, children: parseInline(text.slice(i + 3, end)) });
        i = end + 3; continue;
      }
    }
    // **
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        flush();
        nodes.push({ type: NodeType.Strong, children: parseInline(text.slice(i + 2, end)) });
        i = end + 2; continue;
      }
    }
    // *italic*
    if (text[i] === '*' && i + 1 < text.length && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1) {
        flush();
        nodes.push({ type: NodeType.Emphasis, children: parseInline(text.slice(i + 1, end)) });
        i = end + 1; continue;
      }
    }

    /** 13. HTML inline <sub> */
    if (text[i] === '<') {
      const end = text.indexOf('>', i + 1);
      if (end !== -1) {
        flush();
        nodes.push({ type: NodeType.HtmlInline, value: text.slice(i, end + 1) });
        i = end + 1; continue;
      }
    }

    /** 14. 自动链接 */
    const auto = /^(https?:\/\/[^\s]+)/.exec(text.slice(i));
    if (auto) {
      flush();
      nodes.push({ type: NodeType.AutoLink, url: auto[1] });
      i += auto[1].length; continue;
    }

    /** 15. 默认文本 */
    buffer += text[i];
    i++;
  }
  flush();
  return nodes;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 测试用例
 * ------------------------------------------------------------------------- */

// console.log('测试 1: 解析 Front-matter');
// const md1 = `---
// title: 测试文档
// ---

// # 标题

// 这是一个测试文档。

// <!-- 这是一个注释 -->

// %% 这是另一个注释 %%

// 这是一个 [[WikiLink]] 和一个 ![[图片.png]] 嵌入。

// 这是 ==高亮== 和 ~~删除线~~ 文本。

// > [!note] 注意
// > 这是一个 callout

// > [!warning] 警告
// > 这是一个警告 callout
// `;
// console.dir(parseMarkdown(md1), {depth: null});

// console.log('测试 2: 解析 Callout 多级嵌套');
// const md2 = `
// 下面是一个嵌套的 callout

// > [!note] 注意
// > > [!todo] 可以。
// > > > [!example]  你甚至可以使用多层嵌套。
// `;
// console.dir(parseMarkdown(md2), {depth: null});