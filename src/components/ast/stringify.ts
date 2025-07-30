// Utility to convert AST nodes to Markdown strings
import { MarkdownNode } from './parser';

export interface NodeStringifyOptions {
  ordered?: boolean;
  index?: number;
}

/**
 * Recursively convert a Markdown AST node back to string.
 */
export function nodeToString(node: MarkdownNode, options: NodeStringifyOptions = {}): string {
  switch (node.type) {
    case 'Document':
      return node.children?.map(child => nodeToString(child)).join('\n') || '';

    case 'Paragraph':
      return (node.children?.map(child => nodeToString(child)).join('') || '') + '\n';

    case 'Heading': {
      const level = (node.level as number) || 1;
      const content = node.children?.map(child => nodeToString(child)).join('') || '';
      return '#'.repeat(level) + ' ' + content + '\n';
    }

    case 'Text':
      return node.value || '';

    case 'Strong':
      return `**${node.children?.map(child => nodeToString(child)).join('') || ''}**`;

    case 'Emphasis':
      return `*${node.children?.map(child => nodeToString(child)).join('') || ''}*`;

    case 'InlineCode':
      return `\`${node.value || ''}\``;

    case 'CodeBlock':
      return (node.lang ? `\`\`\`${node.lang}\n` : '```\n') + (node.value || '') + '\n```\n';

    case 'Link':
      return `[${node.label || ''}](${node.url || ''})`;

    case 'Image':
      if (node.title) {
        return node.embed
          ? `![${node.alt || node.url}](${node.url || ''} "${node.title || ''}" )`
          : `[${node.alt || ''}](${node.url || ''} "${node.title || ''}")`;
      }
      return node.embed ? `![${node.alt || node.url}](${node.url || ''})` : `[${node.alt || ''}](${node.url || ''})`;

    case 'List': {
      const ordered = !!node.ordered;
      const children = node.children as MarkdownNode[];
      return children?.map((child, idx) => nodeToString(child, { ordered, index: idx + 1 })).join('') || '';
    }

    case 'ListItem': {
      const level = typeof node.level === 'number' ? node.level : 0;
      const indent = ' '.repeat(level * 4);
      let prefix = '- ';
      if (node.task !== undefined) {
        prefix = node.task ? '- [x] ' : '- [ ] ';
      } else if (options.ordered) {
        prefix = typeof node.number === 'number' ? `${node.number}. ` : `${options.index || 1}. `;
      }
      let inlineContent = '';
      let nested = '';
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          if (child.type === 'List') {
            nested += nodeToString(child);
          } else {
            inlineContent += nodeToString(child);
          }
        }
      }
      let result = indent + prefix + inlineContent + '\n';
      if (nested) result += nested;
      return result;
    }

    case 'BlockQuote': {
      const content = node.children?.map(child => nodeToString(child)).join('') || '';
      return content.split('\n').map(line => (line ? `> ${line}` : '')).join('\n') + '\n';
    }

    case 'Callout': {
      const type = node.calloutType || 'note';
      const title = Array.isArray(node.calloutTitle)
        ? node.calloutTitle.map((n: any) => nodeToString(n)).join('')
        : (node.calloutTitle || '');
      const content = Array.isArray(node.calloutContent)
        ? node.calloutContent.map((n: any) => nodeToString(n)).join('')
        : (node.calloutContent || '');
      return `> [!${type}] ${title}\n> ${content}\n`;
    }

    case 'MathBlock':
      return `$$\n${node.value || ''}\n$$\n`;

    case 'MathSpan':
      return `$${node.value || ''}$`;

    case 'HorizontalRule':
      return '---\n';

    case 'Table': {
      const headerRow = (node.header as any[])
        .map((cell: any) => cell.content.map((n: any) => nodeToString(n)).join(''))
        .join(' | ');
      const alignRow = (node.align as string[])
        .map(a => (a === 'left' ? ':-----' : a === 'center' ? ':-----:' : a === 'right' ? '-----:' : '-----'))
        .join(' | ');
      const bodyRows = (node.rows as any[])
        .map((row: any) => row.cells.map((cell: any) => cell.content.map((n: any) => nodeToString(n)).join('')).join(' | '))
        .join('\n');
      return `${headerRow}\n${alignRow}\n${bodyRows}\n`;
    }

    case 'WikiLink':
      return `[[${node.value || ''}]]`;

    case 'Embed':
      return `![[${node.value || ''}]]`;

    case 'Highlight':
      return `==${node.children?.map(child => nodeToString(child)).join('') || ''}==`;

    case 'Strike':
      return `~~${node.children?.map(child => nodeToString(child)).join('') || ''}~~`;

    case 'StrongEmphasis':
      return `***${node.children?.map(child => nodeToString(child)).join('') || ''}***`;

    case 'AutoLink':
      return (node.url as string) || '';

    case 'EscapedChar':
      return `\\${node.value || ''}`;

    case 'FootnoteRef':
      return `[^${node.id || ''}]`;

    case 'FootnoteDef': {
      const content = node.children?.map(child => nodeToString(child)).join('') || '';
      return `[^${node.id || ''}]: ${content}\n`;
    }

    case 'HtmlComment':
    case 'FrontMatter':
      return `---\n${node.value || ''}\n---\n`;
    case 'HtmlBlock':
    case 'HtmlInline':
      return node.value || '';

    default:
      return node.children?.map(child => nodeToString(child)).join('') || '';
  }
}

