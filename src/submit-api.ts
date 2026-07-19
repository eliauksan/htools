import type { SubmissionInput } from "./types";
import { requestJsonWithTimeout } from "./api-client";

export type SubmissionSettings = {
  enabled: boolean;
  labels: string[];
  owner: string;
  repo: string;
};

type SubmissionCheckResponse = {
  exists: boolean;
};

export async function loadSubmissionSettings(): Promise<SubmissionSettings> {
  return requestJsonWithTimeout<SubmissionSettings>("/api/submission-settings", {
    cache: "no-store",
    headers: { Accept: "application/json" }
  });
}

export async function checkSubmissionUrl(url: string): Promise<boolean> {
  const result = await requestJsonWithTimeout<SubmissionCheckResponse>(
    "/api/submission-check",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    }
  );
  return result.exists;
}

export function buildGitHubIssueUrl(
  settings: SubmissionSettings,
  input: SubmissionInput
) {
  const owner = settings.owner.trim();
  const repo = settings.repo.trim();
  if (!settings.enabled || !owner || !repo) return "";

  const locale = input.locale === "en" ? "en" : "zh";
  const issueUrl = new URL(
    `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/new`
  );
  issueUrl.searchParams.set("template", "tool-submission.md");
  const title = locale === "en"
    ? `[Tool Submission] ${input.name.trim()}`
    : `[工具提交] ${input.name.trim()}`;
  issueUrl.searchParams.set("title", title);
  issueUrl.searchParams.set("body", buildIssueBody(input, locale));
  if (settings.labels.length) {
    issueUrl.searchParams.set("labels", settings.labels.join(","));
  }
  return issueUrl.toString();
}

function buildIssueBody(input: SubmissionInput, locale: "zh" | "en") {
  const tags = input.tags.length
    ? input.tags.join(", ")
    : locale === "en"
      ? "None"
      : "无";

  if (locale === "en") {
    return [
      "## Tool information",
      "",
      `- Tool name: ${input.name.trim()}`,
      `- Project URL: ${input.url.trim()}`,
      `- Category: ${input.category.trim()}`,
      `- Tags: ${tags}`,
      "",
      "## Description",
      "",
      input.description.trim(),
      "",
      "## Submission confirmation",
      "",
      "- [ ] The project URL is publicly reachable",
      "- [ ] The project information is accurate",
      "- [ ] The submission contains no account credentials, secrets, or private information"
    ].join("\n");
  }

  return [
    "## 工具信息",
    "",
    `- 工具名称：${input.name.trim()}`,
    `- 项目地址：${input.url.trim()}`,
    `- 工具分类：${zhCategoryLabels[input.category.trim()] ?? input.category.trim()}`,
    `- 工具标签：${tags}`,
    "",
    "## 工具简介",
    "",
    input.description.trim(),
    "",
    "## 提交确认",
    "",
    "- [ ] 项目地址可以正常访问",
    "- [ ] 项目信息真实、准确",
    "- [ ] 提交内容不包含账号、密钥或私人信息"
  ].join("\n");
}

const zhCategoryLabels: Record<string, string> = {
  "Web Framework": "Web 框架",
  "Browser Extension": "浏览器插件",
  Database: "数据库",
  "UI Framework": "UI 框架",
  Prototype: "原型设计",
  Authentication: "身份认证",
  Payment: "支付服务",
  "Ideas Creativity": "创意灵感",
  "SEO Opt": "SEO 优化",
  Ads: "广告联盟",
  I18N: "国际化",
  "AI Tools": "AI 工具",
  "Image Hosting": "图床",
  Email: "邮箱",
  Analytics: "网站分析",
  Tunnel: "隧道",
  Acceleration: "加速",
  "Speed Test": "测速",
  Monitoring: "监控",
  "Developer Tools": "开发者工具",
  "Customer Support": "客户服务",
  "Docs Tools": "文档工具",
  "Deploy Service": "部署服务",
  "Domain Service": "域名服务",
  "Project Management": "项目管理",
  "Product Launch": "产品发布",
  "Other Tools": "其他工具"
};
