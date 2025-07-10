import { NodeType, MarkdownNode } from './parser';

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
  transform?: (node: MarkdownNode, context: RuleContext) => MarkdownNode;
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
  transform(transform: (node: MarkdownNode, context: RuleContext) => MarkdownNode): RuleBuilder {
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

/* ────────────────────────────────────────────────────────────────────────────
 * 规则工厂 - 提供常用规则的快捷方法
 * ────────────────────────────────────────────────────────────────────────── */

export class RuleFactory {
  /**
   * 创建规则构建器
   */
  static create(name: string): RuleBuilder {
    return new RuleBuilder(name);
  }

  /**
   * 删除特定类型的节点
   */
  static removeNode(name: string, type: NodeType): Rule {
    return RuleFactory.create(name)
      .matchType(type)
      .transform(() => ({ type: NodeType.Text, value: '' }))
      .build();
  }

  /**
   * 重命名节点类型
   */
  static renameNode(name: string, fromType: NodeType, toType: NodeType): Rule {
    return RuleFactory.create(name)
      .matchType(fromType)
      .transformType(toType)
      .build();
  }

  /**
   * 添加属性
   */
  static addProperty(name: string, type: NodeType, key: string, value: any): Rule {
    return RuleFactory.create(name)
      .matchType(type)
      .setProperty(key, value)
      .build();
  }

  /**
   * 删除属性
   */
  static removeProperty(name: string, type: NodeType, key: string): Rule {
    return RuleFactory.create(name)
      .matchType(type)
      .removeProperty(key)
      .build();
  }

  /**
   * 条件转换
   */
  static conditionalTransform(
    name: string,
    condition: (node: MarkdownNode, context: RuleContext) => boolean,
    transform: (node: MarkdownNode, context: RuleContext) => MarkdownNode
  ): Rule {
    return RuleFactory.create(name)
      .match(condition)
      .transform(transform)
      .build();
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 预定义规则集合
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * 常用规则集合
 */
export const CommonRules = {
  /**
   * 删除所有注释节点
   */
  removeComments: RuleFactory.create('删除注释')
    .describe('删除所有HTML和Obsidian注释')
    .matchType([NodeType.HtmlComment])
    .transform(() => ({ type: NodeType.Text, value: '' }))
    .build(),

  /**
   * 删除Front-matter
   */
  removeFrontMatter: RuleFactory.create('删除Front-matter')
    .describe('删除YAML Front-matter')
    .matchType(NodeType.FrontMatter)
    .transform(() => ({ type: NodeType.Text, value: '' }))
    .build(),

  /**
   * 将WikiLink转换为普通链接
   */
  convertWikiLinks: RuleFactory.create('转换WikiLink')
    .describe('将WikiLink转换为标准Markdown链接')
    .matchType(NodeType.WikiLink)
    .transform((node) => ({
      type: NodeType.Link,
      label: node.value,
      url: node.value
    }))
    .build(),

  /**
   * 将Embed转换为图片
   */
  convertEmbeds: RuleFactory.create('转换Embed')
    .describe('将Embed转换为图片')
    .matchType(NodeType.Embed)
    .transform((node) => ({
      type: NodeType.Image,
      alt: node.value,
      url: node.value
    }))
    .build(),

  /**
   * 删除高亮标记
   */
  removeHighlights: RuleFactory.create('删除高亮')
    .describe('删除==高亮==标记，保留内容')
    .matchType(NodeType.Highlight)
    .transform((node) => node.children ? node.children[0] : { type: NodeType.Text, value: '' })
    .build(),

  /**
   * 删除删除线
   */
  removeStrikes: RuleFactory.create('删除删除线')
    .describe('删除~~删除线~~标记，保留内容')
    .matchType(NodeType.Strike)
    .transform((node) => node.children ? node.children[0] : { type: NodeType.Text, value: '' })
    .build(),
};

// 规则构建器已在类定义时导出
