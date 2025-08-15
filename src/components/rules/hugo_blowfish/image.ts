import { RuleBuilder } from 'src/components/ast/rule';
import { NodeType } from 'src/components/ast/node';
import { copyImageFile } from 'src/components/rules/utils';


export const imageRuleHugo = new RuleBuilder('图片链接转换')
    .describe('将图片链接转换为对应的hugo简码')
    .matchType(NodeType.Image)
    .transform(async (node, context) => {
        copyImageFile(context.data.app, node.url as string, context.data.settings, context.data.slug);
        node.url = context.data.settings.imageExportPath + '/' + node.url
        return node;
    })
    .build();
