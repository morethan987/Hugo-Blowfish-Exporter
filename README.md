# Hugo-blowfish-exporter

## 概述
这是一个简单的插件，用于将标准的 Obsidian markdown 文件转换为适用于 Hugo 格式，特别是 [Blowfish](https://blowfish.page/) 主题。

## 主要功能

目前该插件只支持 Obsidian 的一小部分功能，因为它已经覆盖了我自己的使用需求：
  - **callout**（支持所有官方的 callout 名称）
  - **内联数学公式**（Blowfish 支持代码块）
  - **mermaid**（支持 mermaid 图表）
  - **图片插入**（自动导出图片）
  - **不显示的 Wiki 链接导出**。仅支持 `[[PythonTips|PythonTips]]`，不支持 `![[PythonTips|PythonTips]]`

## 使用方法

### 设置说明

1. 在 Obsidian 设置中设置输出文件路径，该路径为导出文件保存的位置。
  
2. 设置图片导出路径，包含图片链接的 Obsidian 文件将使用此设置。

3. 设置网站的博客路径，即 Hugo 项目 `content` 文件夹下的相对路径。
   - 例如，我将设置为 `blog`，这意味着所有博客文件将存储在 `content/blog` 文件夹中。

### 导出当前文件
1. 打开命令面板，输入 `hugo`，即可看到相关命令。

### 导出所有已打开的 Vault 中的 md 文件
1. 点击页面上的一个按钮（如果没有禁用的话）。

## 注意事项

- Wiki 链接导出依赖于元数据 `slug`，即指向包含引用文件的文件夹名称。例如，如果我将文件的 `slug` 设置为 `pytips`，则表示在网站的根目录下，`content` 文件夹中应该有一个名为 `pytips` 的文件夹。

- Wiki 链接导出只支持 `[[PythonTips|PythonTips]]`，不支持 `![[PythonTips|PythonTips]]`。

## 进一步开发

> 你可能会觉得：这个插件的功能有点简单！

**是的，我也这么认为！**

如果你愿意添加更多功能，欢迎克隆该仓库并进行修改！  
主文件 `main.ts` 中有详细的说明。

> 如果你能将修改后的代码上传给我，我将非常感激。🫡

---

# Hugo-blowfish-exporter

## Summary
This is a simple plugin to convert your standard Obisidian md file to a Hugo-friendly format, especially the [Blowfish](https://blowfish.page/) theme.

## Main Function

Now the plugin only support a little function of Obisidian since it already cover my own usage.
  - callout(support all the offical callout name)
  - inline math formular(blowfish supports the code block)
  - mermaid
  - image insert(auto export the images)
  - None display Wiki Link export. Only the `[[PythonTips|PythonTips]]`, no support for `![[PythonTips|PythonTips]]`

## How to use

### Settings explaination

1. set the output file path in the settings of Obisidian, this is the path that the output files are put.

2. set the image export path, the Obsidian files that contain image links will use this setting.

3. set the blog path of your website, the reletive path to the `content` folder.(There should be a `content` folder in your Hugo project)
  - For example, I set the settings to the `blog` ,which means all the blogs are stored in the folder `content/blog`.


### Export the opened file
1. call the command palette and type `hugo`, then you can see the relevant command.

### Export all the md files in the opend vault
1. There is a ribbon button you can click.(If you didn't ban that)

## Attention

- Wiki Link exportion relies on the meta data `slug` , which stands for the folder's name that contains the cited file. For example, now I set a file's `slug` as `pytips`, that means in your website root there should be a real folder named `pytips` in the `content` folder.

- Wiki Link exportion only support `[[PythonTips|PythonTips]]`, not `![[PythonTips|PythonTips]]`.

## Further develop

> You may think: How shallow the plugin is!

**Yes! I think so!**

If you are willing to add more function, feel free to clone the repository and modify it!
There are detailed explaination through the main file `main.ts`

> It's nice for you to upload your own modified code to me. My sincerely gratitude for that. 🫡
