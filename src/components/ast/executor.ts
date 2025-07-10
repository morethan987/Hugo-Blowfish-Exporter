import { MarkdownNode, NodeType } from './parser';
import { Rule, RuleContext, RuleCondition, RuleTransform } from './rule';

/* ────────────────────────────────────────────────────────────────────────────
 * 规则执行器
 * ────────────────────────────────────────────────────────────────────────── */

export class RuleExecutor {
  private rules: Rule[] = [];
  private context: RuleContext;

  constructor(context?: RuleContext) {
    if (context) {
      this.context = context;
    } else {
      this.context = {
        path: [],
        data: {},
        root: { type: NodeType.Document, children: [] }
      };
    }
  }

  /**
   * 添加规则
   */
  addRule(rule: Rule): RuleExecutor {
    this.rules.push(rule);
    return this;
  }

  /**
   * 添加多个规则
   */
  addRules(rules: Rule[]): RuleExecutor {
    this.rules.push(...rules);
    return this;
  }

  /**
   * 清空所有规则
   */
  clearRules(): RuleExecutor {
    this.rules = [];
    return this;
  }

  /**
   * 执行规则转换
   */
  execute(ast: MarkdownNode, context?: RuleContext): MarkdownNode {
    // 按优先级排序规则
    const sortedRules = [...this.rules].sort((a, b) => {
      const priorityA = a.priority ?? 100;
      const priorityB = b.priority ?? 100;
      return priorityA - priorityB;
    });

    // 如果传入外部context，则引用之
    if (context) {
      this.context = context;
    }
    this.context.root = ast;
    // 不重置data，保持外部传入的data引用

    // 执行规则
    return this.applyRules(ast, sortedRules, []);
  }

  /**
   * 递归应用规则
   */
  private applyRules(
    node: MarkdownNode,
    rules: Rule[],
    path: number[]
  ): MarkdownNode {
    // 更新上下文
    this.context.path = path;

    // 应用所有匹配的规则
    let transformedNode = { ...node };
    
    for (const rule of rules) {
      if (!rule.enabled && rule.enabled !== undefined) continue;
      
      if (this.matchesRule(transformedNode, rule.condition)) {
        transformedNode = this.applyTransform(transformedNode, rule.transform);
      }
    }

    // 递归处理子节点
    if (transformedNode.children) {
      transformedNode.children = transformedNode.children.map((child, index) => {
        const childPath = [...path, index];
        return this.applyRules(child, rules, childPath);
      });
    }

    return transformedNode;
  }

  /**
   * 检查节点是否匹配规则条件
   */
  private matchesRule(node: MarkdownNode, condition: RuleCondition): boolean {
    // 类型匹配
    if (condition.type) {
      if (Array.isArray(condition.type)) {
        if (!condition.type.includes(node.type)) return false;
      } else {
        if (node.type !== condition.type) return false;
      }
    }

    // 属性匹配
    if (condition.properties) {
      for (const [key, value] of Object.entries(condition.properties)) {
        if (node[key] !== value) return false;
      }
    }

    // 自定义测试函数
    if (condition.test) {
      if (!condition.test(node, this.context)) return false;
    }

    // 父节点匹配
    if (condition.parent) {
      const parent = this.getNodeByPath(this.context.path.slice(0, -1));
      if (!parent || !this.matchesRule(parent, condition.parent)) return false;
    }

    // 子节点匹配
    if (condition.children) {
      if (!node.children || !node.children.some(child => this.matchesRule(child, condition.children!))) {
        return false;
      }
    }

    return true;
  }

  /**
   * 应用转换操作
   */
  private applyTransform(node: MarkdownNode, transform: RuleTransform): MarkdownNode {
    let result = { ...node };

    // 类型转换
    if (transform.type) {
      result.type = transform.type;
    }

    // 设置属性
    if (transform.set) {
      for (const [key, value] of Object.entries(transform.set)) {
        result[key] = value;
      }
    }

    // 删除属性
    if (transform.remove) {
      for (const key of transform.remove) {
        delete result[key];
      }
    }

    // 自定义转换函数
    if (transform.transform) {
      result = transform.transform(result, this.context);
    }

    // 递归处理子节点
    if (transform.recursive && result.children) {
      result.children = result.children.map(child => this.applyTransform(child, transform));
    }

    // 子节点转换
    if (transform.children && result.children) {
      result.children = result.children.map(child => this.applyTransform(child, transform.children!));
    }

    return result;
  }

  /**
   * 根据路径获取节点
   */
  private getNodeByPath(path: number[]): MarkdownNode | null {
    let current = this.context.root;
    
    for (const index of path) {
      if (!current.children || !current.children[index]) {
        return null;
      }
      current = current.children[index];
    }
    
    return current;
  }

  /**
   * 获取规则统计信息
   */
  getStats(): { totalRules: number; enabledRules: number; disabledRules: number } {
    const total = this.rules.length;
    const enabled = this.rules.filter(r => r.enabled !== false).length;
    const disabled = total - enabled;
    
    return { totalRules: total, enabledRules: enabled, disabledRules: disabled };
  }

  /**
   * 启用/禁用规则
   */
  setRuleEnabled(ruleName: string, enabled: boolean): boolean {
    const rule = this.rules.find(r => r.name === ruleName);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * 获取所有规则
   */
  getRules(): Rule[] {
    return [...this.rules];
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 便捷函数
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * 创建规则执行器
 */
export function createExecutor(): RuleExecutor {
  return new RuleExecutor();
}

/**
 * 快速执行规则转换
 */
export function transformAST(ast: MarkdownNode, rules: Rule[]): MarkdownNode {
  const executor = createExecutor();
  executor.addRules(rules);
  return executor.execute(ast);
}

/**
 * 链式规则执行器
 */
export class ChainExecutor {
  private executor: RuleExecutor;

  constructor() {
    this.executor = createExecutor();
  }

  /**
   * 添加规则
   */
  add(rule: Rule): ChainExecutor {
    this.executor.addRule(rule);
    return this;
  }

  /**
   * 执行转换
   */
  execute(ast: MarkdownNode): MarkdownNode {
    return this.executor.execute(ast);
  }

  /**
   * 获取执行器
   */
  getExecutor(): RuleExecutor {
    return this.executor;
  }
}
