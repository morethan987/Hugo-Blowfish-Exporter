import { RuleBuilder } from "components/ast/main";
import { NodeType, MarkdownNode, WikiLinkNode } from "components/ast/node";
import { RuleContext } from "components/ast/rule";
import { HugoBlowfishExporterSettings } from "types/settings";
import { App } from "obsidian";
import { getSlugByName } from "components/rules/utils";

export const wikiLinkRuleHugo = [
	new RuleBuilder("非展示型wiki链接转换")
		.describe("将非展示型wiki链接转换为对应的hugo简码")
		.matchType(NodeType.WikiLink)
		.transform(async (node: MarkdownNode, context?: RuleContext) => {
			const wikiLink = node as WikiLinkNode;
			const heading = (wikiLink.heading as string) || "";
			const formated_heading = heading
				.replace(/[A-Z]/g, (char: string) => char.toLowerCase())
				.replace(/\s+/g, "-")
				.replace(/[^\w\-\u4e00-\u9fa5]/g, ""); // 保留中文汉字，但移除特殊标点符号
			const alias = (wikiLink.alias as string) || "";
			const linkType = wikiLink.linkType as string;
			const file_name = (wikiLink.file as string) || "";
			const settings = context?.data?.settings as HugoBlowfishExporterSettings | undefined;
			const app = context?.data?.app as App | undefined;

			let hugoLink = "";
			if (settings && app && file_name) {
				if (linkType === "external-heading" || linkType === "article") {
					hugoLink = `[${alias || heading}]({{< ref "/${settings.blogPath}/${getSlugByName(app, file_name)}/${formated_heading ? "#" + formated_heading : ""}" >}})`;
				} else if (linkType === "internal-heading") {
					hugoLink = `[${alias || heading}]({{< relref "#${formated_heading}" >}})`;
				}
			}

			return {
				type: NodeType.Text,
				value: hugoLink,
			} as MarkdownNode;
		})
		.build(),
	new RuleBuilder("展示型wiki链接转换")
		.describe("将展示型wiki链接转换为对应的hugo简码")
		.matchType(NodeType.Embed)
		.transform(async (_node: MarkdownNode, context?: RuleContext) => {
			const settings = context?.data?.settings as HugoBlowfishExporterSettings | undefined;
			const lang = context?.data?.lang as string | undefined;
			const slug = context?.data?.slug as string | undefined;

			let fileName = settings?.defaultDispName_zh_cn || "";
			if (lang === "en" && settings) {
				fileName = settings.defaultDispName_en;
			}
			const hugoLink = settings && slug ? `{{< mdimporter url="content/${settings.blogPath}/${slug}/${fileName}" >}}` : "";

			return {
				type: NodeType.Text,
				value: hugoLink,
			} as MarkdownNode;
		})
		.build(),
];
