import { RuleBuilder } from 'src/components/ast/main';
import { NodeType } from 'src/components/ast/node';
import { getSlugByName } from 'src/components/rules/utils';


export const wikiLinkRuleHugo = [
    new RuleBuilder('非展示型wiki链接转换')
        .describe('将非展示型wiki链接转换为对应的hugo简码')
        .matchType(NodeType.WikiLink)
        .transform((node, context) => {
            const heading = (node.heading as string) || '';
            const formated_heading = heading.replace(/[A-Z]/g, (char) => char.toLowerCase()).replace(/\s+/g, "-").replace(/[^\w\-\u4e00-\u9fa5]/g, ""); // 保留中文汉字，但移除特殊标点符号
            const alias = (node.alias as string) || '';
            const linkType = node.linkType as string;
            const file_name = node.file as string || '';

            let hugoLink = ''
            if(linkType === 'external-heading' || linkType === 'article'){
                hugoLink = `[${alias || heading}]({{< ref "/${context.data.settings.blogPath}/${getSlugByName(context.data.app, file_name)}/${formated_heading ? '#' + formated_heading : ''}" >}})`;
            } else if(linkType === 'internal-heading'){
                hugoLink = `[${alias || heading}]({{< relref "#${formated_heading}" >}})`;
            }

            return {
                type: NodeType.Text,
                value: hugoLink
            };
        })
        .build(),
    new RuleBuilder('展示型wiki链接转换')
        .describe('将展示型wiki链接转换为对应的hugo简码')
        .matchType(NodeType.Embed)
        .transform((node, context) => {
            let fileName = context.data.settings.defaultDispName_zh_cn;
            if (context.data.lang === 'en') {
                fileName = context.data.settings.defaultDispName_en;
            }
            const hugoLink = `{{< mdimporter url="content/${context.data.settings.blogPath}/${context.data.slug}/${fileName}" >}}`;

            return {
                type: NodeType.Text,
                value: hugoLink
            };
        })
        .build(),
]