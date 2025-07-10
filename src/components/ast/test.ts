import { ASTProcessor, CommonRules, RuleBuilder } from './main';
import { NodeType } from './parser';

// 测试用的 Markdown 文本
const testMarkdown = `---
title: 测试文档
---

# 标题

这是一个测试文档。

<!-- 这是一个注释 -->

%% 这是另一个注释 %%

这是一个 [[WikiLink]] 和一个 ![[图片.png]] 嵌入。

这是 ==高亮== 和 ~~删除线~~ 文本。

> [!note] 注意
> 这是一个 callout

> [!warning] 警告
> 这是一个警告 callout

\`\`\`javascript
// 代码块中的 callout 不应该被转换
> [!info] 代码块中的 callout
> 这个应该保持原样
\`\`\`

> [!tip] 提示
> 这是一个提示 callout
> 可以有多行内容

> [!danger] 危险
> 这是一个危险 callout
`;

/**
 * 测试基本功能
 */
function testBasicFunctionality() {
  console.log('=== 测试基本功能 ===');
  
  const processor = new ASTProcessor();
  
  // 使用预定义规则
  processor
    .useCommonRule('removeComments')
    .useCommonRule('removeFrontMatter')
    .useCommonRule('convertWikiLinks')
    .useCommonRule('convertEmbeds');
  
  const result = processor.processToString(testMarkdown);
  
  console.log('原始文档:');
  console.log(testMarkdown);
  console.log('\n处理后的文档:');
  console.log(result);
  console.log('\n规则统计:', processor.getStats());
}

/**
 * 测试规则系统
 */
function testRuleSystem() {
  console.log('\n=== 测试规则系统 ===');
  
  const processor = new ASTProcessor();
  
  // 测试规则统计
  console.log('初始规则数量:', processor.getStats());
  
  // 添加规则
  processor.useCommonRule('removeComments');
  console.log('添加规则后:', processor.getStats());
  
  // 禁用规则
  processor.setRuleEnabled('删除注释', false);
  console.log('禁用规则后:', processor.getStats());
  
  // 重新启用规则
  processor.setRuleEnabled('删除注释', true);
  console.log('重新启用规则后:', processor.getStats());
}

/**
 * callout块转换测试 - 仿照 calloutExporter.ts 的逻辑
 */
function testCalloutBlockConversion() {
  console.log('=== 测试 callout 块转换 ===');
  
  const processor = new ASTProcessor();
  
  // 创建 callout 转换规则，仿照 calloutExporter.ts 的逻辑
  const calloutRule = new RuleBuilder('callout转换')
    .describe('将callout块转换为对应的hugo简码')
    .matchType(NodeType.Callout)
    .transform((node, context) => {
      // 获取 callout 类型和标题
      const type = (node.calloutType as string) || 'note';
      const title = (node.calloutTitle as string) || '';
      
      // 直接使用节点中的 calloutContent 字段
      const calloutContent = (node.calloutContent as string) || '';
      
      // 生成 Hugo 简码格式
      const attributes = getCalloutAttributes(type);
      const hugoShortcode = `\n{{< alert ${attributes} >}}\n${calloutContent}\n{{< /alert >}}\n`;
      
      // 创建新的文本节点
      return {
        type: NodeType.Text,
        value: hugoShortcode
      };
    })
    .build();
  
  // 添加 callout 转换规则
  processor.addRule(calloutRule);
  
  const result = processor.processToString(testMarkdown);
  
  console.log('原始文档:');
  console.log(testMarkdown);
  console.log('\n处理后的文档:');
  console.log(result);
  console.log('\n规则统计:', processor.getStats());
}

/**
 * 获取 callout 属性 - 仿照 calloutExporter.ts 的逻辑
 */
function getCalloutAttributes(type: string): string {
  switch (type.toLowerCase()) {
    case 'note':
      return 'icon="pencil" cardColor="#1E3A8A" textColor="#E0E7FF"';
    case 'info':
      return 'icon="circle-info" cardColor="#b0c4de" textColor="#333333"';
    case 'todo':
      return 'icon="square-check" iconColor="#4682B4" cardColor="#e0ffff" textColor="#333333"';
    case 'tip':
    case 'hint':
    case 'important':
      return 'icon="lightbulb" cardColor="#fff5b7" textColor="#333333"';
    case 'success':
    case 'check':
    case 'done':
      return 'icon="check" cardColor="#32CD32" textColor="#fff" iconColor="#ffffff"';
    case 'warning':
    case 'caution':
    case 'attention':
      return 'icon="triangle-exclamation" cardColor="#ffcc00" textColor="#333333" iconColor="#8B6914"';
    case 'question':
    case 'help':
    case 'faq':
      return 'icon="circle-question" cardColor="#ffeb3b" textColor="#333333" iconColor="#3b3b3b"';
    case 'danger':
    case 'error':
      return 'icon="fire" cardColor="#e63946" iconColor="#ffffff" textColor="#ffffff"';
    case 'example':
      return 'icon="list" cardColor="#d8bfd8" iconColor="#8B008B" textColor="#333333"';
    default:
      return '';
  }
}

/**
 * 运行所有测试
 */
function runTests() {
  // testBasicFunctionality();
  // testRuleSystem();
  testCalloutBlockConversion();
  console.log('\n=== 测试完成 ===');
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runTests();
}

export { runTests }; 