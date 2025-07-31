import { MarkdownNode, NodeType } from './parser';

/**
 * 将 AST 转换回 Markdown 文本
 * @param ast 抽象语法树
 * @returns Markdown 字符串
 */
export function astToString(ast: MarkdownNode): string {
  return nodeToString(ast);
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
      const headerRow = (node.header as any[]).map((cell: any) => cell.content.map((n: any) => nodeToString(n)).join('')).join(' | ');
      const alignRow = (node.align as string[]).map(a => {
        if (a === 'left') return ':-----';
        if (a === 'center') return ':-----:';
        if (a === 'right') return '-----:';
        return '-----';
      }).join(' | ');
      const bodyRows = (node.rows as any[]).map((row: any) => row.cells.map((cell: any) => cell.content.map((n: any) => nodeToString(n)).join('')).join(' | ')).join('\n');
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