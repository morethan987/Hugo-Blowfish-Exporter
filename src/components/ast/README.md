# AST 规则系统

这是一个用于处理 Markdown AST 的灵活规则系统，支持定义和应用各种转换规则。

## 系统架构

```
parser.ts    - Markdown 解析器，将文本解析为 AST
rule.ts      - 规则定义系统，提供流畅的 API 来定义转换规则
executor.ts  - 规则执行器，遍历 AST 并应用规则
main.ts      - 主控制器，整合解析、规则定义和执行流程
```

## 核心概念

### 1. 规则定义 (Rule)

规则由两个部分组成：
- **匹配条件** (Condition): 定义哪些节点需要被转换
- **转换操作** (Transform): 定义如何转换匹配的节点

### 2. 规则构建器 (RuleBuilder)

提供流畅的 API 来定义规则：

```typescript
import { RuleBuilder, NodeType } from './main';

const rule = new RuleBuilder('规则名称')
  .describe('规则描述')
  .matchType(NodeType.Heading)           // 匹配标题节点
  .matchProperty('level', 2)             // 匹配二级标题
  .setProperty('level', 1)               // 转换为一级标题
  .build();
```

### 3. 规则执行器 (RuleExecutor)

负责遍历 AST 并应用规则：

```typescript
import { createExecutor } from './main';

const executor = createExecutor();
executor.addRule(rule);
const transformedAST = executor.execute(originalAST);
```

### 4. AST 处理器 (ASTProcessor)

整合整个处理流程：

```typescript
import { ASTProcessor } from './main';

const processor = new ASTProcessor();
processor.addRule(rule);
const result = processor.processToString(markdownText);
```

## 使用示例

### 基本使用

```typescript
import { ASTProcessor, CommonRules } from './main';

// 创建处理器
const processor = new ASTProcessor();

// 使用预定义规则
processor
  .useCommonRule('removeComments')      // 删除注释
  .useCommonRule('removeFrontMatter')   // 删除 Front-matter
  .useCommonRule('convertWikiLinks');   // 转换 WikiLink

// 处理 Markdown
const result = processor.processToString(markdownText);
```

### 自定义规则

```typescript
import { RuleBuilder, NodeType } from './main';

// 删除所有高亮标记
const removeHighlightRule = new RuleBuilder('删除高亮')
  .describe('删除==高亮==标记，保留内容')
  .matchType(NodeType.Highlight)
  .transform((node) => 
    node.children ? node.children[0] : { type: NodeType.Text, value: '' }
  )
  .build();

// 将 WikiLink 转换为普通链接
const wikiLinkRule = new RuleBuilder('转换WikiLink')
  .describe('将WikiLink转换为标准Markdown链接')
  .matchType(NodeType.WikiLink)
  .transform((node) => ({
    type: NodeType.Link,
    label: node.value,
    url: node.value
  }))
  .build();
```

### 条件规则

```typescript
// 只转换特定类型的 callout
const calloutRule = new RuleBuilder('转换特定Callout')
  .describe('将warning callout转换为普通引用')
  .matchType(NodeType.Callout)
  .match((node) => node.calloutType === 'warning')
  .transform((node) => ({
    type: NodeType.BlockQuote,
    children: node.children
  }))
  .build();
```

### 链式操作

```typescript
const processor = new ASTProcessor()
  .useCommonRule('removeComments')
  .useCommonRule('removeFrontMatter')
  .addRule(removeHighlightRule)
  .addRule(wikiLinkRule)
  .addRule(calloutRule);
```

## 预定义规则

系统提供了一些常用的预定义规则：

- `removeComments`: 删除所有 HTML 和 Obsidian 注释
- `removeFrontMatter`: 删除 YAML Front-matter
- `convertWikiLinks`: 将 WikiLink 转换为标准 Markdown 链接
- `convertEmbeds`: 将 Embed 转换为图片
- `removeHighlights`: 删除高亮标记，保留内容
- `removeStrikes`: 删除删除线标记，保留内容

## 规则优先级

规则按优先级排序执行，数字越小优先级越高：

```typescript
const highPriorityRule = new RuleBuilder('高优先级规则')
  .priority(10)  // 高优先级
  .matchType(NodeType.Heading)
  .transform(/* ... */)
  .build();

const lowPriorityRule = new RuleBuilder('低优先级规则')
  .priority(100) // 低优先级
  .matchType(NodeType.Heading)
  .transform(/* ... */)
  .build();
```

## 规则上下文

每个规则都可以访问执行上下文：

```typescript
const contextAwareRule = new RuleBuilder('上下文感知规则')
  .matchType(NodeType.Paragraph)
  .transform((node, context) => {
    // context.path: 节点在树中的路径
    // context.parent: 父节点
    // context.root: 根节点
    // context.data: 全局数据
    return transformedNode;
  })
  .build();
```

## 支持的节点类型

系统支持所有 Markdown 元素：

- **块级元素**: Document, Heading, Paragraph, CodeBlock, MathBlock, Callout, BlockQuote, List, ListItem, Table, HorizontalRule, HtmlBlock, FrontMatter, HtmlComment, FootnoteDef
- **行内元素**: Text, InlineCode, MathSpan, WikiLink, Embed, Image, Link, Strong, Emphasis, StrongEmphasis, Highlight, Strike, AutoLink, EscapedChar, FootnoteRef, HtmlInline

## 最佳实践

1. **规则命名**: 使用描述性的名称，便于调试和维护
2. **规则描述**: 为每个规则添加描述，说明其用途
3. **优先级设置**: 合理设置规则优先级，避免冲突
4. **测试规则**: 在应用到生产环境前充分测试规则
5. **规则组合**: 将相关规则组合使用，提高可维护性

## 扩展性

系统设计为高度可扩展的：

- 可以轻松添加新的节点类型
- 可以定义复杂的匹配条件
- 可以创建自定义转换函数
- 可以组合多个规则实现复杂转换 