import { NodeType, MarkdownNode } from './node';

/* ────────────────────────────────────────────────────────────────────────────
 * 规则系统核心类型定义
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * 规则匹配条件
 */
export interface RuleCondition {
  // 节点类型匹配
  type?: NodeType | NodeType[];
  // 属性匹配（支持嵌套属性）
  properties?: Record<string, any>;
  // 自定义匹配函数
  test?: (node: MarkdownNode, context: RuleContext) => boolean;
  // 子节点匹配
  children?: RuleCondition;
  // 父节点匹配
  parent?: RuleCondition;
}

/**
 * 规则转换操作
 */
export interface RuleTransform {
  // 节点类型转换
  type?: NodeType;
  // 属性设置
  set?: Record<string, any>;
  // 属性删除
  remove?: string[];
  // 自定义转换函数
  transform?: (node: MarkdownNode, context: RuleContext) => Promise<MarkdownNode>;
  // 子节点处理
  children?: RuleTransform;
  // 是否递归处理子节点
  recursive?: boolean;
}

/**
 * 规则上下文
 */
export interface RuleContext {
  // 当前节点在树中的路径
  path: number[];
  // 父节点
  parent?: MarkdownNode;
  // 根节点
  root: MarkdownNode;
  // 全局数据
  data: Record<string, any>;
}

/**
 * 单个规则定义
 */
export interface Rule {
  // 规则名称（用于调试）
  name: string;
  // 规则描述
  description?: string;
  // 匹配条件
  condition: RuleCondition;
  // 转换操作
  transform: RuleTransform;
  // 规则优先级（数字越小优先级越高）
  priority?: number;
  // 是否启用
  enabled?: boolean;
}

/**
 * 规则组
 */
export interface RuleGroup {
  name: string;
  description?: string;
  rules: Rule[];
  enabled?: boolean;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 规则构建器 - 提供流畅的API
 * ────────────────────────────────────────────────────────────────────────── */

export class RuleBuilder {
  private rule: Partial<Rule> = {};

  constructor(name: string) {
    this.rule.name = name;
  }

  /**
   * 设置规则描述
   */
  describe(description: string): RuleBuilder {
    this.rule.description = description;
    return this;
  }

  /**
   * 设置优先级
   */
  priority(priority: number): RuleBuilder {
    this.rule.priority = priority;
    return this;
  }

  /**
   * 匹配特定类型的节点
   */
  matchType(type: NodeType | NodeType[]): RuleBuilder {
    this.rule.condition = { ...this.rule.condition, type };
    return this;
  }

  /**
   * 匹配具有特定属性的节点
   */
  matchProperty(key: string, value: any): RuleBuilder {
    this.rule.condition = {
      ...this.rule.condition,
      properties: { ...this.rule.condition?.properties, [key]: value }
    };
    return this;
  }

  /**
   * 自定义匹配条件
   */
  match(test: (node: MarkdownNode, context: RuleContext) => boolean): RuleBuilder {
    this.rule.condition = { ...this.rule.condition, test };
    return this;
  }

  /**
   * 转换节点类型
   */
  transformType(type: NodeType): RuleBuilder {
    this.rule.transform = { ...this.rule.transform, type };
    return this;
  }

  /**
   * 设置节点属性
   */
  setProperty(key: string, value: any): RuleBuilder {
    this.rule.transform = {
      ...this.rule.transform,
      set: { ...this.rule.transform?.set, [key]: value }
    };
    return this;
  }

  /**
   * 删除节点属性
   */
  removeProperty(key: string): RuleBuilder {
    this.rule.transform = {
      ...this.rule.transform,
      remove: [...(this.rule.transform?.remove || []), key]
    };
    return this;
  }

  /**
   * 自定义转换函数
   */
  transform(transform: (node: MarkdownNode, context: RuleContext) => Promise<MarkdownNode>): RuleBuilder {
    this.rule.transform = { ...this.rule.transform, transform };
    return this;
  }

  /**
   * 设置递归处理
   */
  recursive(recursive: boolean = true): RuleBuilder {
    this.rule.transform = { ...this.rule.transform, recursive };
    return this;
  }

  /**
   * 构建规则
   */
  build(): Rule {
    if (!this.rule.condition || !this.rule.transform) {
      throw new Error(`规则 "${this.rule.name}" 缺少必要的条件或转换定义`);
    }
    return this.rule as Rule;
  }
}
