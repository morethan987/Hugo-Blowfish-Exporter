/**
 * -------------------------------------------------------------------------
 * 解析顺序严格遵循「Obsidian‑Flavoured Markdown」优先级表：
 *   1. 块级规则 blockRules
 *   2. 行内规则 inlineRules
 * -------------------------------------------------------------------------
 */

/* ────────────────────────────────────────────────────────────────────────────
 * 导入 AST 结点类型定义
 * ────────────────────────────────────────────────────────────────────────── */

import { NodeType, MarkdownNode, TableNode, TableHeaderNode, TableRowNode } from "./node";


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
      // 收集callout行（保持现有逻辑）
      while (i < lines.length) {
        const currentLine = lines[i];
        if (currentLine.trim() === '') { i++; break; }
        if (!/^>\s*/.test(currentLine)) break;
        calloutLines.push(currentLine);
        i++;
      }
      
      // 提取类型和标题
      const firstLine = calloutLines[0].replace(/^>\s*/, '');
      const typeMatch = /^\[!([^\]]+)\](.*)$/.exec(firstLine);
      const calloutType = typeMatch ? typeMatch[1] : 'note';
      const titleText = typeMatch ? typeMatch[2].trim() : '';
      
      // 处理内容
      const contentLines = calloutLines
        .slice(1)
        .map(l => l.replace(/^>\s?/, ''))
        .join('\n');
      
      // 构建统一的children结构
      const children: MarkdownNode[] = [];
      
      // 如果有标题，添加标题节点
      if (titleText) {
        children.push({
          type: NodeType.Paragraph,
          role: 'title', // 标记为标题
          children: parseInline(titleText)
        });
      }
      
      // 添加内容节点
      if (contentLines.trim()) {
        const contentAst = parseMarkdown(contentLines);
        children.push(...(contentAst.children || []));
      }
      
      root.children!.push({
        type: NodeType.Callout,
        calloutType,
        children
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
      // 嵌套列表递归解析函数
      function parseList(startIdx: number, baseIndent: number, level: number): { node: MarkdownNode, nextIdx: number } {
        const ordered = /\d+\./.test(lines[startIdx].replace(/^([ \t]*)([-+*]|\d+\.)\s+.*/, '$2'));
        const items: MarkdownNode[] = [];
        let i = startIdx;
        while (i < lines.length) {
          const currentLine = lines[i];
          if (currentLine.trim() === '') { i++; break; }
          const li = /^([ \t]*)([-+*]|\d+\.)\s+(.*)$/.exec(currentLine);
          if (!li) break;
          const currentIndent = li[1].length;
          if (currentIndent < baseIndent) break;
          if (currentIndent > baseIndent) {
            // 嵌套子列表
            const { node: subList, nextIdx } = parseList(i, currentIndent, level + 1);
            if (items.length > 0) {
              // 挂到上一个 ListItem 的 children
              const lastItem = items[items.length - 1];
              if (!lastItem.children) lastItem.children = [];
              lastItem.children.push(subList);
            }
            i = nextIdx;
            continue;
          }
          const taskMatch = /^\[( |x)\]\s+/.exec(li[3]);
          const content = taskMatch ? li[3].slice(taskMatch[0].length) : li[3];
          // 提取有序列表编号
          let number: number | undefined = undefined;
          if (ordered) {
            const numMatch = li[2].match(/^(\d+)\./);
            if (numMatch) number = parseInt(numMatch[1], 10);
          }
          items.push({
            type: NodeType.ListItem,
            task: taskMatch ? (taskMatch[1] === 'x') : undefined,
            level,
            number,
            children: parseInline(content),
          });
          i++;
        }
        return {
          node: { type: NodeType.List, ordered, level, children: items },
          nextIdx: i
        };
      }
      const baseIndent = listMatch[1].length;
      const { node: listNode, nextIdx } = parseList(i, baseIndent, 0);
      root.children!.push(listNode);
      i = nextIdx;
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
      // 拆分表头和对齐行
      const splitRow = (row: string) => {
        // 去除首尾 |，再按 | 分割
        return row.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
      };
      const headerCells = splitRow(line.trim());
      const alignCells = splitRow(lines[i + 1].trim());
      // 解析对齐方式
      const align: string[] = alignCells.map(cell => {
        if (/^:?-+:?$/.test(cell)) {
          if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
          if (cell.startsWith(':')) return 'left';
          if (cell.endsWith(':')) return 'right';
        }
        return 'none';
      });
      // 解析表头单元格内容
      const header: TableHeaderNode = { type: NodeType.TableHeader, children: headerCells.map(cell => ({ type: NodeType.TableCell, children: parseInline(cell) })) };
      // 解析数据行
      const rows: TableRowNode[] = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|')) {
        const rowCells = splitRow(lines[i].trim());
        rows.push({ type: NodeType.TableRow, children: rowCells.map(cell => ({ type: NodeType.TableCell, children: parseInline(cell) })) });
        i++;
      }
      const tableNode: TableNode = { type: NodeType.Table, align, children: [header, ...rows] };
      root.children!.push(tableNode);
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

    /** 3. Wikilink & 4. Embed（增强结构化） */
    if (text.startsWith('![[', i) || text.startsWith('[[', i)) {
      const embed = text.startsWith('![[', i);
      const start = i + (embed ? 3 : 2);
      const end = text.indexOf(']]', start);
      if (end !== -1) {
        const content = text.slice(start, end).trim();
        flush();
        // 结构化解析
        // 1. 先分离 alias
        let main = content;
        let alias: string | undefined = undefined;
        const pipeIdx = content.indexOf('|');
        if (pipeIdx !== -1) {
          main = content.slice(0, pipeIdx).trim();
          alias = content.slice(pipeIdx + 1).trim();
        }
        // 2. 判断是否有段落引用（#）
        let file: string | undefined = undefined;
        let heading: string | undefined = undefined;
        if (main.startsWith('#')) {
          // 内部段落引用
          heading = main.slice(1);
        } else {
          const hashIdx = main.indexOf('#');
          if (hashIdx !== -1) {
            file = main.slice(0, hashIdx).trim();
            heading = main.slice(hashIdx + 1).trim();
          } else {
            file = main;
          }
        }
        // 3. 判断是否为图片
        if (file && /\.(png|jpg|jpeg|gif|svg|bmp|webp)$/i.test(file)) {
          // 解析为标准Image结点
          nodes.push({
            type: NodeType.Image,
            alt: alias || '',
            url: file,
            title: '',
            wiki: true, // 标记来自wiki
            embed: embed,
          });
        } else {
          // 其他wiki链接保持结构化
          let linkType: string = 'article';
          if (embed) {
            linkType = 'embed';
          } else if (heading && file) {
            linkType = 'external-heading';
          } else if (heading && !file) {
            linkType = 'internal-heading';
          }
          nodes.push({
            type: embed ? NodeType.Embed : NodeType.WikiLink,
            value: content,
            file: file,
            heading: heading,
            alias: alias,
            linkType: linkType,
          });
        }
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
        const raw = text.slice(parenStart + 1, parenEnd).trim();
        let url = raw;
        let title = '';
        const match = raw.match(/^([^\s]+)\s+(?:"([^"]*)"|'([^']*)')$/);
        if (match) {
          url = match[1];
          title = match[2] || match[3] || '';
        }
        nodes.push({ type: NodeType.Image, alt, url, title, wiki: false, embed: true });
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
        if (/\.(png|jpg|jpeg|gif|svg|bmp|webp)$/i.test(url)) {
          nodes.push({ type: NodeType.Image, alt: label, url, wiki: false, embed: false });
        } else {
          nodes.push({ type: NodeType.Link, label, url });
        }
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

console.log('测试 1: 解析 Front-matter');
const md1 = `---
title: 测试文档
---

# 标题

这是一个测试文档。

<!-- 这是一个注释 -->

%% 这是另一个注释 %%

这是一个 [[WikiLink]] 和一个 ![[图片.png]] 嵌入。

这是 ==高亮== 和 ~~删除线~~ 文本。

> [!note] 注意
> 这是一个 callout

> [!warning] 警告
> 这是一个警告 callout

\`\`\`python
print("Hello, World!")
\`\`\`
`;
console.dir(parseMarkdown(md1), {depth: null});



// console.log('测试 2: 解析 Callout 嵌套');
// const md2 = `
// 下面是一个嵌套的 callout

// > [!note] 注意
// > > [!todo] 可以。
// > > > [!example]  你甚至可以使用多层嵌套。

// > [!warning] 警告
// > 这是一个警告 callout并且嵌入了\`ls -a\`内联代码块

// > [!warning] 警告
// > 这是一个警告 callout并且嵌入了$ls -a$内联公式块
// `;
// console.dir(parseMarkdown(md2), {depth: null});



// console.log('测试 3: 解析各种链接');
// const md3 = `
// ![[图片.png]]

// [[非展示图片.png|非展示图片]]

// [[10.代码协同方案]]

// [[10.代码协同方案|文章引用]]

// ![[10.代码协同方案|文章引用]]

// [[#MATLAB用法]]

// [[#MATLAB用法|内部段落引用]]

// [[10.代码协同方案#MATLAB用法|外部段落引用]]

// [标准markdown链接](https://www.baidu.com)

// [标准图片链接](图片.png)

// ![展示型标准图片链接](图片.png)

// ![带有描述的图片链接](Transformer.png "引用自第 16 页")

// `;
// console.dir(parseMarkdown(md3), {depth: null});



// console.log('测试 4: 解析列表');
// const md4_1 = `
// - 我：建模 + 代码 + 部分论文撰写
// - CL：建模 + 论文撰写 + 部分代码
// - HWJ：论文美化

// ### 工作流程

// 整个 A 题的代码部分大致可以分为两个系统：
// - 计算系统：
// 	- 功能：接受输入数据与参数，返回需要的结果
// 	- 性质：直接由题目决定，不同题目有不同的计算系统，需要临时构建
// - 优化系统：
// 	- 功能： 接受计算系统并将其作为可优化的目标函数，执行自身的优化逻辑，最后返回计算结果
// 	- 性质：方法体系较为成熟，可以在**比赛前**就进行多种优化系统的准备
// `;
// console.dir(parseMarkdown(md4_1), {depth: null});

// console.log('测试 5: 解析表格');
// const md4_1 = `
// | 符号             | 含义                  |
// | -------------- | ------------------- |
// | $x$            | 目标问题                |
// | $M$            | 目标小模型               |
// `;
// console.dir(parseMarkdown(md4_1), {depth: null});



