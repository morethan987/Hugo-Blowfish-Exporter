---
title: 基本测试
weight: -1
draft: true
description: 中文版基本功能说明和测试文档
tags: 
  - test
series: test
series_order: 1
date: 2025-01-05
authors:
  - Morethan
---
## 标注转化测试
### 默认模式

转化前源代码：

```md
> [!NOTE] Title
> Contents
```

转化前OB中的效果：

> [!NOTE] Title
> Contents

### 不同类型

`note` 类型的标注：

> [!note] Title
> 这是一个 `note` 类型

`warning` 类型的标注：

> [!warning] Title
> 这是一个 `warning` 类型；别名：`attention` `caution`

`danger` 类型的标注：

> [!danger] Title
> 这是一个 `danger` 类型；别名：`error`

`tip` 类型的标注：

> [!tip] Title
> 这是一个 `tip` 类型；别名：`hint` `important`

`todo` 类型的标注：

> [!todo] Title
> 这是一个 `todo` 类型；别名：`todo`

`check` 类型的标注：

> [!check] Title
> 这是一个 `check` 类型；别名：`success` `done`

`question` 类型的标注：

> [!question] Title
> 这是一个 `question` 类型；别名：`help` `fqa`

`example` 类型的标注：

> [!example] Title
> 这是一个 `example` 类型

## 数学公式转换测试

这是一个内联公式：$E=mc^2$

下面是一个块级公式：
$$
E=mc^2
$$

## Mermaid转化测试

下面是一个Mermaid代码块：
```mermaid
graph LR;
A --> B;
B --> C
```

## 图片插入测试

英文路径测试：

![[GRU.png]]

中文路径测试：

![[全局工作理论.png]]

