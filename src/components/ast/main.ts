import { parseMarkdown, MarkdownNode } from './parser';
import { Rule, RuleBuilder, RuleFactory, CommonRules } from './rule';
import { RuleExecutor, createExecutor, transformAST, ChainExecutor } from './executor';

/* ────────────────────────────────────────────────────────────────────────────
 * AST 处理主控制器
 * ────────────────────────────────────────────────────────────────────────── */

export class ASTProcessor {
  private executor: RuleExecutor;
  private customRules: Rule[] = [];
  private context?: any;

  constructor(context?: any) {
    this.context = context;
    this.executor = context ? new RuleExecutor(context) : createExecutor();
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: Rule): ASTProcessor {
    this.customRules.push(rule);
    this.executor.addRule(rule);
    return this;
  }

  /**
   * 添加多个规则
   */
  addRules(rules: Rule[]): ASTProcessor {
    this.customRules.push(...rules);
    this.executor.addRules(rules);
    return this;
  }

  /**
   * 使用预定义规则
   */
  useCommonRule(ruleName: keyof typeof CommonRules): ASTProcessor {
    const rule = CommonRules[ruleName];
    if (rule) {
      this.addRule(rule);
    }
    return this;
  }

  /**
   * 使用多个预定义规则
   */
  useCommonRules(ruleNames: (keyof typeof CommonRules)[]): ASTProcessor {
    for (const name of ruleNames) {
      this.useCommonRule(name);
    }
    return this;
  }

  /**
   * 清空所有规则
   */
  clearRules(): ASTProcessor {
    this.customRules = [];
    this.executor.clearRules();
    return this;
  }

  /**
   * 处理 Markdown 文本
   */
  process(markdown: string, context?: any): MarkdownNode {
    // 1. 解析为 AST
    const ast = parseMarkdown(markdown);
    
    // 2. 应用规则转换
    return this.executor.execute(ast, context || this.context);
  }

  /**
   * 获取处理后的 Markdown 文本
   */
  processToString(markdown: string, context?: any): string {
    const ast = this.process(markdown, context);
    return this.astToString(ast);
  }

  /**
   * 将 AST 转换回 Markdown 文本
   */
  astToString(ast: MarkdownNode): string {
    return this.nodeToString(ast);
  }

  /**
   * 递归转换节点为字符串
   */
  private nodeToString(node: MarkdownNode): string {
    switch (node.type) {
      case 'Document':
        return node.children?.map(child => this.nodeToString(child)).join('\n') || '';
      
      case 'Paragraph':
        const content = node.children?.map(child => this.nodeToString(child)).join('') || '';
        return content + '\n';
      
      case 'Heading':
        const level = (node.level as number) || 1;
        const headingContent = node.children?.map(child => this.nodeToString(child)).join('') || '';
        return '#'.repeat(level) + ' ' + headingContent + '\n';
      
      case 'Text':
        return node.value || '';
      
      case 'Strong':
        const strongContent = node.children?.map(child => this.nodeToString(child)).join('') || '';
        return `**${strongContent}**`;
      
      case 'Emphasis':
        const emphasisContent = node.children?.map(child => this.nodeToString(child)).join('') || '';
        return `*${emphasisContent}*`;
      
      case 'InlineCode':
        return `\`${node.value || ''}\``;
      
      case 'CodeBlock':
        const lang = node.lang ? `\`\`\`${node.lang}\n` : '```\n';
        return lang + (node.value || '') + '\n```\n';
      
      case 'Link':
        return `[${node.label || ''}](${node.url || ''})`;
      
      case 'Image':
        if (node.title) {
          return node.embed ? `![${node.alt || ''}](${node.url || ''} "${node.title || ''}" )` : `[${node.alt || ''}](${node.url || ''} "${node.title || ''}")`;
        } else {
          return node.embed ? `![${node.alt || ''}](${node.url || ''})` : `[${node.alt || ''}](${node.url || ''})`;
        }
      
      case 'List':
        const listItems = (node.children as MarkdownNode[])?.map(child => this.nodeToString(child)).join('') || '';
        return listItems;
      
      case 'ListItem':
        const itemContent = node.children?.map(child => this.nodeToString(child)).join('') || '';
        const prefix = node.task !== undefined ? 
          (node.task ? '- [x] ' : '- [ ] ') : 
          '- ';
        return prefix + itemContent + '\n';
      
      case 'BlockQuote':
        const quoteContent = node.children?.map(child => this.nodeToString(child)).join('') || '';
        return quoteContent.split('\n').map(line => line ? `> ${line}` : '').join('\n') + '\n';
      
      case 'Callout':
        const calloutType = node.calloutType || 'note';
        const calloutTitle = node.calloutTitle || '';
        const calloutContent = node.children?.map(child => this.nodeToString(child)).join('') || '';
        return `> [!${calloutType}] ${calloutTitle}\n> ${calloutContent}\n`;
      
      case 'MathBlock':
        return `$$\n${node.value || ''}\n$$\n`;
      
      case 'MathSpan':
        return `$${node.value || ''}$`;
      
      case 'HorizontalRule':
        return '---\n';
      
      case 'Table':
        // 简化表格输出
        return `${node.header || ''}\n${node.align || ''}\n${((node.rows as string[]) || []).join('\n')}\n`;
      
      case 'WikiLink':
        return `[[${node.value || ''}]]`;
      
      case 'Embed':
        return `![[${node.value || ''}]]`;
      
      case 'Highlight':
        const highlightContent = node.children?.map(child => this.nodeToString(child)).join('') || '';
        return `==${highlightContent}==`;
      
      case 'Strike':
        const strikeContent = node.children?.map(child => this.nodeToString(child)).join('') || '';
        return `~~${strikeContent}~~`;
      
      case 'StrongEmphasis':
        const strongEmphasisContent = node.children?.map(child => this.nodeToString(child)).join('') || '';
        return `***${strongEmphasisContent}***`;
      
      case 'AutoLink':
        return (node.url as string) || '';
      
      case 'EscapedChar':
        return `\\${node.value || ''}`;
      
      case 'FootnoteRef':
        return `[^${node.id || ''}]`;
      
      case 'FootnoteDef':
        const footnoteContent = node.children?.map(child => this.nodeToString(child)).join('') || '';
        return `[^${node.id || ''}]: ${footnoteContent}\n`;
      
      case 'HtmlComment':
      case 'FrontMatter':
        return `---\n${node.value || ''}\n---\n`;
      case 'HtmlBlock':
      case 'HtmlInline':
        return node.value || '';
      
      default:
        return node.children?.map(child => this.nodeToString(child)).join('') || '';
    }
  }

  /**
   * 获取规则统计信息
   */
  getStats() {
    return this.executor.getStats();
  }

  /**
   * 启用/禁用规则
   */
  setRuleEnabled(ruleName: string, enabled: boolean): boolean {
    return this.executor.setRuleEnabled(ruleName, enabled);
  }

  /**
   * 获取所有规则
   */
  getRules(): Rule[] {
    return this.executor.getRules();
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 便捷函数
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * 快速处理 Markdown
 */
export function processMarkdown(markdown: string, rules: Rule[] = []): MarkdownNode {
  const processor = new ASTProcessor();
  if (rules.length > 0) {
    processor.addRules(rules);
  }
  return processor.process(markdown);
}

/**
 * 快速处理 Markdown 并返回字符串
 */
export function processMarkdownToString(markdown: string, rules: Rule[] = []): string {
  const processor = new ASTProcessor();
  if (rules.length > 0) {
    processor.addRules(rules);
  }
  return processor.processToString(markdown);
}

/**
 * 创建链式处理器
 */
export function createProcessor(): ASTProcessor {
  return new ASTProcessor();
}

/**
 * 导出所有相关类型和函数
 */
export { 
  parseMarkdown
} from './parser';

export type { 
  MarkdownNode, 
  NodeType
} from './parser';

export { 
  RuleBuilder, 
  RuleFactory, 
  CommonRules
} from './rule';

export type { 
  Rule
} from './rule';

export {
  RuleExecutor,
  createExecutor,
  transformAST,
  ChainExecutor
} from './executor';
