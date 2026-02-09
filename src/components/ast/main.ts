import { MarkdownNode,  } from './node';
import { parseMarkdown } from './parser';
import { Rule } from './rule';
import { RuleExecutor, createExecutor } from './executor';
import { RuleContext } from './rule';
import { astToString, astToHtml } from './stringifier';
import type { App } from 'obsidian';

/* ────────────────────────────────────────────────────────────────────────────
 * 类型定义
 * ────────────────────────────────────────────────────────────────────────── */

export interface ProcessorContext {
  processor?: ASTProcessor;
  app?: App;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}

function isRuleContext(context: unknown): context is RuleContext {
  if (typeof context !== 'object' || context === null) return false;
  const ctx = context as Record<string, unknown>;
  return 'path' in ctx && 'root' in ctx && 'data' in ctx;
}

/* ────────────────────────────────────────────────────────────────────────────
 * AST 处理主控制器
 * ────────────────────────────────────────────────────────────────────────── */

export class ASTProcessor {
  private executor: RuleExecutor;
  private customRules: Rule[] = [];
  private context?: ProcessorContext;

  constructor(context?: ProcessorContext) {
    this.context = context;
    if (context && isRuleContext(context)) {
      this.executor = new RuleExecutor(context);
    } else {
      this.executor = createExecutor();
    }
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
   async process(markdown: string, context?: ProcessorContext): Promise<MarkdownNode> {
     const ast = parseMarkdown(markdown);
     
     if (context && isRuleContext(context)) {
       return this.executor.execute(ast, context);
     } else if (this.context && isRuleContext(this.context)) {
       return this.executor.execute(ast, this.context);
     } else {
       return this.executor.execute(ast);
     }
   }

   /**
    * 获取处理后的 Markdown 文本
    */
   async processToString(markdown: string, context?: ProcessorContext): Promise<string> {
     const ast = await this.process(markdown, context);
     return this.astToString(ast);
   }

   /**
    * 获取处理后的 Html 文本
    */
   async processToHtml(markdown: string, context?: ProcessorContext): Promise<string> {
     const ast = await this.process(markdown, context);
     return this.astToHtml(ast);
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
