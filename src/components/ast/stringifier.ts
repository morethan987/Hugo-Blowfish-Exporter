import { NodeType, MarkdownNode, TableNode, TableHeaderNode, TableRowNode, TableCellNode } from './node';

/**
 * 将 AST 转换回 Markdown 文本
 * @param ast 抽象语法树
 * @returns Markdown 字符串
 */
export function astToString(ast: MarkdownNode): string {
  return nodeToString(ast);
}

/**
 * 将 AST 转换为 HTML 字符串
 * @param ast 抽象语法树
 * @returns HTML 字符串
 */
export function astToHtml(ast: MarkdownNode): string {
  return nodeToHtml(ast);
}

/**
 * 递归转换节点为字符串
 */
function nodeToString(node: MarkdownNode, options?: { ordered?: boolean, index?: number }): string {
  switch (node.type) {
    case NodeType.Document:
      return node.children?.map(child => nodeToString(child)).join('\n') || '';

    case NodeType.Nop:
      return node.children?.map(child => nodeToString(child)).join('') || '';

    case NodeType.Paragraph:
      const content = node.children?.map(child => nodeToString(child)).join('') || '';
      return content + '\n';

    case NodeType.Heading:
      const level = (node.level as number) || 1;
      const headingContent = node.children?.map(child => nodeToString(child)).join('') || '';
      return '#'.repeat(level) + ' ' + headingContent + '\n';

    case NodeType.Text:
      return node.value || '';

    case NodeType.Strong:
      const strongContent = node.children?.map(child => nodeToString(child)).join('') || '';
      return `**${strongContent}**`;

    case NodeType.Emphasis:
      const emphasisContent = node.children?.map(child => nodeToString(child)).join('') || '';
      return `*${emphasisContent}*`;

    case NodeType.InlineCode:
      return `\`${node.value || ''}\``;

    case NodeType.CodeBlock:
      const lang = node.lang ? `\`\`\`${node.lang}\n` : '```\n';
      return lang + (node.value || '') + '\n```\n';

    case NodeType.Link:
      return `[${node.label || ''}](${node.url || ''})`;

    case NodeType.Image:
      if (node.title) {
        return node.embed ? `![${node.alt || node.url}](${node.url || ''} "${node.title || ''}" )` : `[${node.alt || ''}](${node.url || ''} "${node.title || ''}")`;
      } else {
        return node.embed ? `![${node.alt || node.url}](${node.url || ''})` : `[${node.alt || ''}](${node.url || ''})`;
      }

    case NodeType.List: {
      const ordered = !!node.ordered;
      const children = node.children as MarkdownNode[];
      return children?.map((child, idx) => nodeToString(child, { ordered, index: idx + 1 })).join('') || '';
    }
    case NodeType.ListItem: {
      const level = typeof node.level === 'number' ? node.level : 0;
      const indent = ' '.repeat(level * 4);
      let prefix = '- ';
      if (node.task !== undefined) {
        prefix = node.task ? '- [x] ' : '- [ ] ';
      } else if (options?.ordered) {
        // 优先使用用户编号
        if (typeof node.number === 'number') {
          prefix = `${node.number}. `;
        } else {
          prefix = `${options.index || 1}. `;
        }
      }
      // 区分行内内容和嵌套列表
      let inlineContent = '';
      let nestedListContent = '';
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          if (child.type === 'List') {
            nestedListContent += nodeToString(child);
          } else {
            inlineContent += nodeToString(child);
          }
        }
      }
      let result = indent + prefix + inlineContent + '\n';
      if (nestedListContent) {
        result += nestedListContent;
      }
      return result;
    }
    case NodeType.BlockQuote:
      const quoteContent = node.children?.map(child => nodeToString(child)).join('') || '';
      return quoteContent.split('\n').map(line => line ? `> ${line}` : '').join('\n') + '\n';

    case NodeType.Callout: {
      const calloutType = node.calloutType || 'note';
      let title = '';
      let content = '';
      
      if (node.children && node.children.length > 0) {
        // 查找标题节点（role为title的段落）
        const titleNode = node.children.find((child: any) => child.role === 'title');
        if (titleNode && titleNode.children) {
          title = titleNode.children.map((n: any) => nodeToString(n)).join('');
        }
        
        // 处理其他内容节点
        const contentNodes = node.children.filter((child: any) => child.role !== 'title');
        if (contentNodes.length > 0) {
          content = contentNodes.map(child => nodeToString(child)).join('').replace(/\n$/, '');
        }
      }
      const lines = content.split('\n').filter(line => line.trim());
      const quotedContent = lines.map(line => `> ${line}`).join('\n');
      
      return `> [!${calloutType}] ${title}\n${quotedContent}\n`;
    }

    case NodeType.MathBlock:
      return `$$\n${node.value || ''}\n$$\n`;

    case NodeType.MathSpan:
      return `$${node.value || ''}$`;

    case NodeType.HorizontalRule:
      return '---\n';

    case NodeType.Table: {
      const alignRow = (node.align as string[]).map(a => {
        if (a === 'left') return ':-----';
        if (a === 'center') return ':-----:';
        if (a === 'right') return '-----:';
        return '-----';
      }).join(' | ');
      const headerRow = node.children![0]!.children!.map((table_cell: TableCellNode) => table_cell.children.map((n: MarkdownNode) => nodeToString(n)).join('') || '').join(' | ') || '';
      const bodyRows = node.children!.slice(1).map((row: TableRowNode) =>row.children.map((cell: TableCellNode) =>cell.children.map((n: MarkdownNode) => nodeToString(n)).join('')).join(' | ')).join('\n');
      return `${headerRow}\n${alignRow}\n${bodyRows}\n`;
    }

    case NodeType.WikiLink:
      return `[[${node.value || ''}]]`;

    case NodeType.Embed:
      return `![[${node.value || ''}]]`;

    case NodeType.Highlight:
      const highlightContent = node.children?.map(child => nodeToString(child)).join('') || '';
      return `==${highlightContent}==`;

    case NodeType.Strike:
      const strikeContent = node.children?.map(child => nodeToString(child)).join('') || '';
      return `~~${strikeContent}~~`;

    case NodeType.StrongEmphasis:
      const strongEmphasisContent = node.children?.map(child => nodeToString(child)).join('') || '';
      return `***${strongEmphasisContent}***`;

    case NodeType.AutoLink:
      return (node.url as string) || '';

    case NodeType.EscapedChar:
      return `\\${node.value || ''}`;

    case NodeType.FootnoteRef:
      return `[^${node.id || ''}]`;

    case NodeType.FootnoteDef:
      const footnoteContent = node.children?.map(child => nodeToString(child)).join('') || '';
      return `[^${node.id || ''}]: ${footnoteContent}\n`;

    case NodeType.HtmlComment:
    case NodeType.FrontMatter:
      return `---\n${node.value || ''}\n---\n`;
    case NodeType.HtmlBlock:
    case NodeType.HtmlInline:
      return node.value || '';
    
    default:
      return node.children?.map(child => nodeToString(child)).join('') || '';
  }
}

/**
 * 转义HTML特殊字符
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 递归转换节点为HTML字符串
 */
function nodeToHtml(node: MarkdownNode, options?: { ordered?: boolean, index?: number }): string {
  switch (node.type) {
    case NodeType.Document:
      return '<article class="md-doc">\n' + node.children?.map(child => nodeToHtml(child)).join('') || '' + '\n</article>';

    case NodeType.Nop:
      return node.children?.map(child => nodeToHtml(child)).join('') || '';

    case NodeType.Paragraph:
      const content = node.children?.map(child => nodeToHtml(child)).join('') || '';
      return `<p>${content}</p>`;

    case NodeType.Heading:
      const level = Math.min(Math.max((node.level as number) || 1, 1), 6);
      const headingContent = node.children?.map(child => nodeToHtml(child)).join('') || '';
      return `<h${level}>${headingContent}</h${level}>`;

    case NodeType.Text:
      return escapeHtml(node.value || '');

    case NodeType.HtmlBlock:
    case NodeType.HtmlInline:
      return node.value || '';

    case NodeType.Strong:
      const strongContent = node.children?.map(child => nodeToHtml(child)).join('') || '';
      return `<strong>${strongContent}</strong>`;

    case NodeType.Emphasis:
      const emphasisContent = node.children?.map(child => nodeToHtml(child)).join('') || '';
      return `<em>${emphasisContent}</em>`;

    case NodeType.InlineCode:
      return `<code>${escapeHtml(node.value || '')}</code>`;

    case NodeType.CodeBlock:
      const lang = node.lang ? ` class="language-${escapeHtml(String(node.lang))}"` : '';
      return `<pre><code${lang}>${escapeHtml(node.value || '')}</code></pre>`;

    case NodeType.Link:
      const url = escapeHtml(String(node.url || ''));
      const label = node.label || '';
      return `<a href="${url}">${label}</a>`;

    case NodeType.Image:
      const imgUrl = escapeHtml(String(node.url || ''));
      const alt = escapeHtml(String(node.alt || ''));
      const title = node.title ? ` title="${escapeHtml(String(node.title))}"` : '';
      return `<img src="${imgUrl}" alt="${alt}"${title}>`;

    case NodeType.List: {
      const ordered = !!node.ordered;
      const tag = ordered ? 'ol' : 'ul';
      const children = node.children as MarkdownNode[];
      const listItems = children?.map((child, idx) => nodeToHtml(child, { ordered, index: idx + 1 })).join('') || '';
      return `<${tag}>${listItems}</${tag}>`;
    }

    case NodeType.ListItem: {
      let inlineContent = '';
      let nestedListContent = '';
      
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          if (child.type === 'List') {
            nestedListContent += nodeToHtml(child);
          } else {
            inlineContent += nodeToHtml(child);
          }
        }
      }
      
      // 处理任务列表
      if (node.task !== undefined) {
        const checked = node.task ? ' checked' : '';
        inlineContent = `<input type="checkbox"${checked} disabled> ${inlineContent}`;
      }
      
      return `<li>${inlineContent}${nestedListContent}</li>`;
    }

    case NodeType.BlockQuote:
      const quoteContent = node.children?.map(child => nodeToHtml(child)).join('') || '';
      return `<blockquote>${quoteContent}</blockquote>`;

    case NodeType.Callout: {
      const calloutType = escapeHtml(String(node.calloutType || 'note'));
      let title = '';
      let content = '';
      
      if (node.children && node.children.length > 0) {
        // 查找标题节点
        const titleNode = node.children.find((child: any) => child.role === 'title');
        if (titleNode && titleNode.children) {
          title = titleNode.children.map((n: any) => nodeToHtml(n)).join('');
        }
        
        // 处理其他内容节点
        const contentNodes = node.children.filter((child: any) => child.role !== 'title');
        if (contentNodes.length > 0) {
          content = contentNodes.map(child => nodeToHtml(child)).join('');
        }
      }
      
      return `<div class="callout callout-${calloutType}"><div class="callout-title">${title}</div><div class="callout-content">${content}</div></div>`;
    }

    case NodeType.MathBlock:
      return `<div class="math-block">${escapeHtml(node.value || '')}</div>`;

    case NodeType.MathSpan:
      return `<span class="math-inline">${escapeHtml(node.value || '')}</span>`;

    case NodeType.HorizontalRule:
      return '<hr>';

    case NodeType.Table: {
      const children = node.children as TableRowNode[];
      if (!children || children.length === 0) return '';
      
      // 表头
      const headerRow = children[0];
      const headerCells = headerRow.children.map((cell: TableCellNode) =>
        `<th>${cell.children.map((n: MarkdownNode) => nodeToHtml(n)).join('')}</th>`
      ).join('');
      
      // 表体
      const bodyRows = children.slice(1).map((row: TableRowNode) => {
        const rowCells = row.children.map((cell: TableCellNode) =>
          `<td>${cell.children.map((n: MarkdownNode) => nodeToHtml(n)).join('')}</td>`
        ).join('');
        return `<tr>${rowCells}</tr>`;
      }).join('');
      
      return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    }

    case NodeType.WikiLink:
      return `<span class="wiki-link">${escapeHtml(node.value || '')}</span>`;

    case NodeType.Embed:
      return `<span class="embed">${escapeHtml(node.value || '')}</span>`;

    case NodeType.Highlight:
      const highlightContent = node.children?.map(child => nodeToHtml(child)).join('') || '';
      return `<mark>${highlightContent}</mark>`;

    case NodeType.Strike:
      const strikeContent = node.children?.map(child => nodeToHtml(child)).join('') || '';
      return `<del>${strikeContent}</del>`;

    case NodeType.StrongEmphasis:
      const strongEmphasisContent = node.children?.map(child => nodeToHtml(child)).join('') || '';
      return `<strong><em>${strongEmphasisContent}</em></strong>`;

    case NodeType.AutoLink:
      const autoUrl = escapeHtml((node.url as string) || '');
      return `<a href="${autoUrl}">${autoUrl}</a>`;

    case NodeType.EscapedChar:
      return escapeHtml(node.value || '');

    case NodeType.FootnoteRef:
      const refId = escapeHtml(String(node.id || ''));
      return `<sup><a href="#fn-${refId}" id="fnref-${refId}">${refId}</a></sup>`;

    case NodeType.FootnoteDef:
      const defId = escapeHtml(String(node.id || ''));
      const footnoteContent = node.children?.map(child => nodeToHtml(child)).join('') || '';
      return `<div id="fn-${defId}" class="footnote"><a href="#fnref-${defId}">${defId}</a>: ${footnoteContent}</div>`;
      
    case NodeType.FrontMatter:
      return `<pre class="frontmatter">${escapeHtml(node.value || '')}</pre>`;
    
    default:
      return node.children?.map(child => nodeToHtml(child)).join('') || '';
  }
}