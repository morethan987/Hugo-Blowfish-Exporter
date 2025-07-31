# AST解析系统

这是一个纯手工构建的针对markdown文件的AST解析系统，没有任何外部依赖，代码全部可控

## 文件说明

1. `node.ts`是结点定义
2. `parser.ts`是解析器，能够从文本中构建AST
3. `rule.ts`是规则类（定义规则的抽象行为但不明确具体的规则）
4. `executor.ts` 是执行器，能够依据规则执行转换操作
5. `stringifier.ts`将AST扁平化为字符串
6. `main.ts`是 ASTProcessor 类的定义函数也是AST解析系统对外的接口
7. `src/components/rules` 文件夹中定义了能够处理各种类型的结点的转换规则
8. `src/core/exporter.ts:103-133`中是插件主体调用 ASTProcessor 的地方

```ts
    async modifyContent(content: string, frontmatter: Record<string, any>): Promise<string> {
        try {
            // 构造 context
            const slug = frontmatter.slug as string;
            const lang = frontmatter.language as string;
            // 1. 先创建 context（不带 processor）
            const context: any = {
                data: { app: this.app, settings: this.plugin.settings, slug, lang, imageFiles: [] }
            };
            // 2. 创建 processor 实例
            const processor = new ASTProcessor(context);
            // 3. 将 processor 挂载到 context.processor
            context.processor = processor;
            processor.addRules([
                calloutRule,
                ...mathRule,
                imageRule,
                ...wikiLinkRule,
                mermaidRule,
            ]);
            // 4. 处理 AST，传递 context
            const ast = processor.process(content, context);
            // AST处理后统一复制图片
            const { copyImagesAfterAst } = await import('src/components/rules/image');
            await copyImagesAfterAst(this.app, context.data.imageFiles, this.plugin.settings, slug);
            return processor.astToString(ast);
        } catch (error) {
            console.error('Error modifying content:', error);
            return content;
        }
    }
```

9. `test.ts`是测试文件

## 开发说明

1. `parser.ts`中最后被注释掉的部分是测试，能够直接显示AST的解析结果。使用`pnpm test_parser`命令能够直接运行这个文件并在终端输出结果
2. `test.ts`是测试文件，在其中定义好需要进行的测试项目，然后就使用`pnpm test`命令能够直接运行这个文件并在终端输出结果
3. `main.ts`, `executor.ts`, `rule.ts` 一般都是不用进行改动的，这些文件都是抽象方法的封装，具体的执行逻辑需要到`node.ts`, `parser.ts`, `stringifier.ts`, `src/components/rules`中去修改

