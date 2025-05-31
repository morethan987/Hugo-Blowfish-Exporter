# Obsidian风格的markdown文件示例

## 内部链接

- Wiki 式链接：[[运动三定律]]
- Markdown 式链接：[运动三定律](运动三定律.md)
- 附件链接：[[图1.png]]
- 链接到小标题：[[运动三定律#第二定律]]
- 逐级链接小标题：[[我的笔记#一级小标题#一级小标题下的二级小标题]]
- 更改链接的锚文本：[[内部链接|自定义锚文本]] 或 [自定义锚文本](内部链接.md)

## 插入文件

在上文内部链接前插入一个感叹号即可

例如：![[需要插入的笔记标题]]

图片文件可以控制大小：

- 说明详细的宽高：![[Engelbart.jpg|100x245]]
- 只说明宽度将会按原始比例缩放：![[Engelbart.jpg|100]]

## 标注

简单的标注的例子：

> [!info]
> 这是一个标注块。
> 它支持 **Markdown**、[[Internal links|内部链接]] 和 [[Embed files|嵌入]]！
> ![[Engelbart.jpg]]

可以省略内容，创建仅带标题的标注：

> [!tip] 仅标题的标注

你可以通过在类型标识符后添加加号（+）或减号（-）来使标注可折叠。加号表示标注默认展开，减号表示标注收起。

> [!faq]- 标注可以折叠吗？
> 可以！在可折叠标注中，当标注收起时，内容会被隐藏。

可以嵌套多层标注：

> [!question] 标注可以嵌套吗？
> > [!todo] 可以。
> > > [!example]  你甚至可以使用多层嵌套。

支持的标注类型：

> [!note]
> Lorem ipsum dolor sit amet

> [!abstract]
> Lorem ipsum dolor sit amet

> [!info]
> Lorem ipsum dolor sit amet

> [!todo]
> Lorem ipsum dolor sit amet

> [!tip]
> Lorem ipsum dolor sit amet
tip别名为：hint，important

> [!success]
> Lorem ipsum dolor sit amet
别名：check，done

> [!question]
> Lorem ipsum dolor sit amet
别名：help，faq

> [!warning]
> Lorem ipsum dolor sit amet
别名：caution，attention

> [!failure]
> Lorem ipsum dolor sit amet
别名：fail，missing

> [!danger]
> Lorem ipsum dolor sit amet
别名：error

> [!bug]
> Lorem ipsum dolor sit amet

> [!example]
> Lorem ipsum dolor sit amet

> [!quote]
> Lorem ipsum dolor sit amet
别名：cite

## 基础语法

### 注释

单行和多行注释都可以：

This is an %%inline%% comment.

%%
This is a block comment.

Block comments can span multiple lines.
%%

### 代码块

行内代码：`反引号`中的文本将被格式化为代码。

代码块：

```
cd ~/Desktop
```

代码块支持指定语言：

```js
function fancyAlert(arg) {
  if(arg) {
    $.facebox({div:'#foo'})
  }
}
```

### 脚注

这是一个简单的脚注[^1]。

[^1]: 这是脚注的内容文本。
[^2]: 在每一行的开头添加2个空格，
  可以编写跨越多行的脚注。
[^注释]: 可以使用非数字来命名脚注。但渲染时，脚注仍然会显示为数字。这样可以更容易地识别脚注内容。

支持内联脚注：

你也可以使用内联脚注。^[这是一个内联脚注。]

### 任务列表

- [x] 这是已完成的任务。
- [ ] 这是未完成的任务。

### 嵌套列表

1. 第一条
   1. 有序嵌套列表项
2. 第二条
   - 无序嵌套列表项

### 水平分割线

你可以在单独的一行上使用三个或更多星号 ***、短横线 --- 或下划线 ___ 来添加水平线。这些分隔符号里允许有空格。

例如：

***
****
* * *
---
----
- - -
___
____
_ _ _

### 数学公式

行内公式：$E=mc^2$

公式块：

$$
E=mc^2
$$

## 元数据块

放在文件开头，用三横线包裹，如下所示：

---
title: Notes on the Foundation of Large Models
weight: -110
draft: true
description: Notes written after reading the textbook "Foundation of Large Models" from Zhejiang University
slug: llm-foundation-notes
tags:
  - LLM
  - EngineeringPractice
  - Notes
series:
  - AI Engineering
series_order: 2
date: 2025-05-28
lastmod: 2025-05-28
authors:
  - Morethan
---

