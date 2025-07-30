import { calloutRule } from '../rules/callout';
import { parseMarkdown, nodeToString, ASTProcessor } from './main';
import { wikiLinkRule } from 'src/components/rules/wikiLink';
import { mathRule } from 'src/components/rules/math';

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

> [!warning] 警告
> 这是一个警告 callout并且嵌入了$ls -a$内联公式块

| 符号             | 含义                  |
| -------------- | ------------------- |
| $x$            | 目标问题                |
| $M$            | 目标小模型               |
| $T$            | 小模型使用 MCTS 生成的搜索树   |
| $s$            | 推理中间步               |
| $t$            | 候选路径，$T$ 中的一条完整推理路径 |
| $ans$          | $M$ 解决 $x$ 的最终推理路径  |
| $Score$        | 推理路径评价函数            |
| $a$            | 从动作空间中采样得到的一个动作     |
| $s_{d}$        | 终止推理步，包含问题的答案       |
| $\hat{M}$      | "同伴"小模型             |
| $T_{validate}$ | 经过路径评估函数剪枝后的 $T$    |
| $Estimate$     | 路径评估函数              |

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

1. 生成验证文件 \`id_rsa.pub\`

2. 本地创建 \`authorized_keys\` 文件，并将 \`id_rsa.pub\` 中的内容写入这个文件

3. 在服务器中默认目录下创建 \`.ssh\` 文件夹，然后将 \`authorized_keys\` 文件从本地拷贝进去即可


- 我：建模 + 代码 + 部分论文撰写
- CL：建模 + 论文撰写 + 部分代码
- HWJ：论文美化

### 工作流程

整个 A 题的代码部分大致可以分为两个系统：
- 计算系统：
	- 功能：接受输入数据与参数，返回需要的结果
	- 性质：直接由题目决定，不同题目有不同的计算系统，需要临时构建
- 优化系统：
	- 功能： 接受计算系统并将其作为可优化的目标函数，执行自身的优化逻辑，最后返回计算结果
	- 性质：方法体系较为成熟，可以在**比赛前**就进行多种优化系统的准备

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

function testWikiLink() {
  console.log('=== wikiLink功能测试 ===');
  // processor.addRules(wikiLinkRule);
  const context: any = {};
  const processor = new ASTProcessor(context);
  context.processor = processor;
  processor.addRules([
    ...mathRule,
    calloutRule
  ]);
  const result = processor.processToString(testMarkdown);
  console.log('\n处理后的文档:');

  console.log(result);
}
function testStringify() {
  console.log("=== stringify 功能测试 ===");
  const ast = parseMarkdown("# Hello");
  const result = nodeToString(ast);
  console.log("stringify result:", result.trim());
}


/**
 * 运行所有测试
 */
function runTests() {
  // testBasicFunctionality();
  // testRuleSystem();
  testStringify();
  testWikiLink();
  console.log('\n=== 测试完成 ===');
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runTests();
}

export { runTests };
