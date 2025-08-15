import { MarkdownNode,  } from './node';
import { parseMarkdown } from './parser';
import { Rule } from './rule';
import { RuleExecutor, createExecutor } from './executor';
import { astToString, astToHtml } from './stringifier';

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
  async process(markdown: string, context?: any): Promise<MarkdownNode> {
    // 1. 解析为 AST
    const ast = parseMarkdown(markdown);
    // console.dir(ast, {depth: null});
    
    // 2. 应用规则转换
    return this.executor.execute(ast, context || this.context);
  }

  /**
   * 获取处理后的 Markdown 文本
   */
  async processToString(markdown: string, context?: any): Promise<string> {
    const ast = await this.process(markdown, context);
    return this.astToString(ast);
  }

  /**
   * 将 AST 转换回 Markdown 文本
   */
  astToString(ast: MarkdownNode): string {
    return astToString(ast);
  }

  /**
   * 将 AST 转换回 Html 文本
   */
  astToHtml(ast: MarkdownNode): string {
    return astToHtml(ast);
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
export async function processMarkdown(markdown: string, rules: Rule[] = []): Promise<MarkdownNode> {
  const processor = new ASTProcessor();
  if (rules.length > 0) {
    processor.addRules(rules);
  }
  return processor.process(markdown);
}

/**
 * 快速处理 Markdown 并返回字符串
 */
export async function processMarkdownToString(markdown: string, rules: Rule[] = []): Promise<string> {
  const processor = new ASTProcessor();
  if (rules.length > 0) {
    processor.addRules(rules);
  }
  return processor.processToString(markdown);
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
} from './node';

export { 
  RuleBuilder
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
