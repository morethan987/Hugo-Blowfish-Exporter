import { calloutRule } from '../exporters/calloutExporter';
import { ASTProcessor } from './main';
import { NodeType } from './parser';
import { mathRule } from 'src/components/exporters/mathExporter';

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

> [!warning] 警告
> 这是一个警告 callout并且嵌入了\`ls -a\`内联代码块

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

$$
x = y + z
$$

$x = y + z$

![[图片.png]]

[[非展示图片.png|非展示图片]]

[[10.代码协同方案|文章引用]]

[[#MATLAB用法|内部段落引用]]

[[10.代码协同方案#MATLAB用法|外部段落引用]]

[标准markdown链接](https://www.baidu.com)

[标准图片链接](图片.png)

![展示型标准图片链接](图片.png)

![带有描述的图片链接](Transformer.png "引用自第 16 页")

这里有一个内联代码块\`ls -a\`这里有一个内联代码块

1. xxx
2. xxxxxxx

- 666
- 6666666

- [x] 这是已完成的任务。
- [ ] 这是未完成的任务。

1. xxx
    - 555
    - 666
2. yyy
    - 111
    - 222
    - 333
3. rrr
    - [ ] xxxxxxx
    - [x] kkkkkkk
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

function testCallout() {
  console.log('=== callout功能测试 ===');
  const processor = new ASTProcessor();
  const result = processor.processToString(testMarkdown);
  console.log('\n处理后的文档:');
  console.log(result);
}

/**
 * 运行所有测试
 */
function runTests() {
  // testBasicFunctionality();
  // testRuleSystem();
  testCallout();
  console.log('\n=== 测试完成 ===');
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runTests();
}

export { runTests };