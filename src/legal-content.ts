import type { Locale } from "./i18n";

export type LegalPageKind = "privacy" | "terms";

export function getLegalPageContent(kind: LegalPageKind, locale: Locale, siteName: string) {
  const isZh = locale === "zh";

  if (kind === "privacy") {
    return isZh
      ? {
          title: "隐私政策",
          intro: `${siteName} 只在提供、保护和改进站点功能所需的范围内处理信息，不出售用户数据，也不将访问数据用于广告画像。`,
          updatedAt: "最后更新：2026-07-16",
          sections: [
            {
              title: "我们会处理哪些信息",
              paragraphs: [
                "你无需注册账号即可浏览公开内容。访问站点时，托管与安全基础设施可能处理 IP 地址、请求时间、访问页面、浏览器或设备信息，以及必要的安全和性能日志。",
                "当你使用 GitHub 登录并提交工具时，站点会处理 GitHub 返回的基础公开资料、登录会话以及你主动填写的提交内容。"
              ],
              items: [
                "GitHub 用户 ID、用户名、头像、主页地址等公开资料。",
                "工具名称、项目与演示地址、描述、分类、标签等你主动提交的信息。",
                "登录 Cookie、会话令牌、Cloudflare Turnstile 验证令牌与防滥用所需的安全信号。",
                "保存在当前浏览器中的语言、主题、站点设置缓存和未提交的工具草稿。"
              ]
            },
            {
              title: "信息如何使用",
              paragraphs: [
                "我们使用这些信息提供页面和搜索结果、保存你的本地偏好、完成 GitHub 登录与工具提交、验证请求、阻止滥用、排查故障，并了解站点整体使用情况。",
                "我们不会出售这些信息，也不会将其用于跨站广告追踪或自动化用户画像。"
              ]
            },
            {
              title: "Umami 访问统计",
              paragraphs: [
                "仅当站点管理员完成配置并在后台启用后，页面才会加载 Umami 统计。未启用时，本站不会向 Umami 发送访问数据。",
                "启用后，Umami 可能处理访问页面、来源页面、浏览器、操作系统、设备类型、国家或地区等用于汇总统计的技术信息，以及站点配置的匿名访问事件。本站使用这些数据分析访问趋势和改进内容，不用于广告追踪。Umami 的实际处理与保留方式取决于管理员所连接的自托管或第三方 Umami 服务。"
              ]
            },
            {
              title: "Cookie 与本地存储",
              paragraphs: [
                "GitHub 登录使用必要的 Cookie 或会话令牌维持登录状态；Cloudflare Turnstile 在启用时可能使用其完成安全验证所需的技术。语言、主题、站点设置缓存和提交草稿保存在你的浏览器中，你可以通过浏览器设置清除。",
                "本站不会仅因普通浏览而要求你创建站内用户账号。"
              ]
            },
            {
              title: "公开提交与内容来源",
              paragraphs: [
                "通过 GitHub 提交的工具信息会被发送到站点配置的 GitHub 仓库，并可能作为公开 Issue 展示。请勿提交密钥、账号、私人联系方式或其他不希望公开的信息。",
                "站内部分文章可能由管理员从 RSS 源同步并整理。原始来源可能包含作者名称、文章链接、发布时间和摘要等公开信息，站点会在适用位置保留来源信息。"
              ]
            },
            {
              title: "第三方服务与外部资源",
              paragraphs: [
                "站点可能使用 Cloudflare 提供托管、数据库、安全验证与网络服务，使用 GitHub 完成登录和 Issue 提交，并在启用后使用 Umami 进行访问统计。相关数据也会受到各服务提供方自身条款与隐私政策的约束。",
                "工具、文章、内容流中的外部链接和图片可能由第三方网站直接提供，或按管理员配置通过代理服务加载。访问这些资源时，相应网站或代理服务可能收到必要的网络请求信息。"
              ]
            },
            {
              title: "保存、安全与你的选择",
              paragraphs: [
                "我们仅在实现相应功能、维护安全或满足合理管理需要的期限内保留信息，并采取与站点规模相适应的措施保护数据；但任何网络传输或存储方式都无法保证绝对安全。",
                "你可以不使用 GitHub 登录与工具提交、在浏览器中清除本站 Cookie 和本地数据，或停止访问本站。若希望更正或删除由你提交且由本站控制的内容，可以联系维护者。"
              ]
            },
            {
              title: "政策更新与联系我们",
              paragraphs: [
                "站点功能或数据处理方式发生变化时，本政策可能随之更新，并在本页标注最新日期。如对隐私处理有疑问，可以通过项目 GitHub 仓库联系维护者。"
              ]
            }
          ]
        }
      : {
          title: "Privacy Policy",
          intro: `${siteName} processes information only as needed to provide, protect, and improve the site. We do not sell user data or use visit data for advertising profiles.`,
          updatedAt: "Last updated: July 16, 2026",
          sections: [
            {
              title: "Information We Process",
              paragraphs: [
                "You can browse public content without creating an account. When you visit, hosting and security infrastructure may process your IP address, request time, pages visited, browser or device information, and necessary security and performance logs.",
                "When you sign in with GitHub and submit a tool, the site processes basic public profile data returned by GitHub, your login session, and the submission details you provide."
              ],
              items: [
                "GitHub user ID, username, avatar, profile URL, and other public profile data.",
                "Tool name, project and demo URLs, description, category, tags, and other details you submit.",
                "Login cookies, session tokens, Cloudflare Turnstile tokens, and security signals needed to prevent abuse.",
                "Language, theme, cached site settings, and unsubmitted tool drafts stored in your current browser."
              ]
            },
            {
              title: "How We Use Information",
              paragraphs: [
                "We use this information to deliver pages and search results, remember local preferences, complete GitHub login and tool submissions, validate requests, prevent abuse, troubleshoot problems, and understand overall site usage.",
                "We do not sell this information or use it for cross-site advertising tracking or automated user profiling."
              ]
            },
            {
              title: "Umami Analytics",
              paragraphs: [
                "The site loads Umami analytics only after an administrator has configured and enabled it. When it is disabled, this site sends no visit data to Umami.",
                "When enabled, Umami may process technical information used for aggregate statistics, such as the page visited, referrer, browser, operating system, device type, country or region, and anonymous events configured for the site. We use these statistics to understand traffic trends and improve content, not for advertising tracking. Actual processing and retention depend on the self-hosted or third-party Umami service connected by the administrator."
              ]
            },
            {
              title: "Cookies and Local Storage",
              paragraphs: [
                "GitHub login uses necessary cookies or session tokens to maintain your session. When enabled, Cloudflare Turnstile may use technologies required to complete security checks. Language, theme, cached site settings, and submission drafts are stored in your browser and can be cleared through browser settings.",
                "The site does not require you to create a site account merely to browse public content."
              ]
            },
            {
              title: "Public Submissions and Content Sources",
              paragraphs: [
                "Tool information submitted through GitHub is sent to the repository configured for the site and may be displayed as a public issue. Do not submit secrets, account data, private contact details, or anything you do not want to make public.",
                "Some articles may be synchronized and curated by administrators from RSS feeds. The original source may include public information such as the author name, article URL, publication time, and summary, and source information is retained where appropriate."
              ]
            },
            {
              title: "Third-Party Services and External Resources",
              paragraphs: [
                "The site may use Cloudflare for hosting, databases, security verification, and network services; GitHub for login and issue submission; and Umami for analytics when enabled. Data handled by these providers is also subject to their own terms and privacy policies.",
                "External links and images in tools, articles, and content feeds may load directly from third-party sites or through a proxy configured by the administrator. The relevant site or proxy may receive network request information needed to serve the resource."
              ]
            },
            {
              title: "Retention, Security, and Your Choices",
              paragraphs: [
                "We retain information only as long as reasonably needed to provide the relevant feature, maintain security, or meet legitimate administrative needs, and use safeguards appropriate to the scale of the site. No method of online transmission or storage is completely secure.",
                "You may choose not to use GitHub login or tool submission, clear site cookies and local data in your browser, or stop using the site. To correct or remove content you submitted and that the site controls, contact the maintainer."
              ]
            },
            {
              title: "Policy Changes and Contact",
              paragraphs: [
                "We may update this policy as site features or data practices change and will show the latest date on this page. For privacy questions, contact the maintainer through the project GitHub repository."
              ]
            }
          ]
        };
  }

  return isZh
    ? {
        title: "服务条款",
        intro: `访问或使用 ${siteName} 即表示你同意合理、合法地使用本站，并尊重内容作者、项目维护者和其他用户的权利。`,
        updatedAt: "最后更新：2026-07-16",
        sections: [
          {
            title: "服务范围与条款接受",
            paragraphs: [
              "本站用于整理和展示工具、项目、文章及由 RSS 源同步的内容，并提供搜索、分类浏览和工具提交等功能。部分功能可能由站点管理员按实际部署配置开启或关闭。",
              "如果你不同意本条款或隐私政策，请停止访问或使用相关功能。"
            ]
          },
          {
            title: "站点内容与外部服务",
            paragraphs: [
              "站点内容主要用于信息整理与参考，不代表本站对相关工具、项目、文章或观点的认可、担保或推荐。外部项目可能随时变更、停止服务或采用不同的使用条款。",
              "工具链接、演示站点、文章来源、外部图片和代理服务由相应第三方负责。离开本站后，你应自行阅读并遵守第三方的条款与隐私政策。"
            ]
          },
          {
            title: "工具提交与公开信息",
            paragraphs: [
              "你可以通过 GitHub 登录提交工具建议。提交内容会被发送到站点配置的 GitHub 仓库，可能形成公开 Issue，并由维护者决定是否收录、编辑、标注、拒绝或关闭。",
              "提交即表示你确认有权提供相关信息，并允许本站在审核、整理和展示工具目录所需范围内复制、编辑和公开这些内容；原项目及其内容的权利仍归相应权利人所有。"
            ],
            items: [
              "请不要提交违法、侵权、恶意、欺诈或明显无关的内容。",
              "请不要提交密钥、账号、私人联系方式等敏感信息。",
              "提交内容应尽量真实、清晰，并指向可访问的项目页面。"
            ]
          },
          {
            title: "文章、RSS 内容与知识产权",
            paragraphs: [
              "部分文章可能由管理员从 RSS 源同步后筛选、整理或转换。原文、商标、项目名称、图片及其他受保护内容的权利归各自权利人所有，本站会在适用位置保留来源或原文链接。",
              "如果你认为本站内容侵犯了你的合法权利，请通过项目 GitHub 仓库提供具体页面和权利说明；维护者核实后可更正、补充来源或移除相关内容。"
            ]
          },
          {
            title: "禁止行为",
            paragraphs: [
              "你不得利用本站实施违法活动、攻击或干扰服务、绕过安全验证、批量滥用接口、冒充他人、抓取非公开数据，或传播恶意代码和侵权内容。维护者可以限制或停止明显影响站点安全与正常运行的访问。"
            ]
          },
          {
            title: "统计、安全与隐私",
            paragraphs: [
              "本站可能使用 Cloudflare 提供托管、安全验证和网络服务，并在管理员启用后使用 Umami 进行汇总访问统计。GitHub 登录、公开提交、Cookie、本地存储和其他信息处理方式以隐私政策为准。"
            ]
          },
          {
            title: "服务可用性与免责声明",
            paragraphs: [
              "本站按现状和可用状态提供，不保证内容始终准确、完整、及时、可访问，也不保证任何工具或文章适合你的特定用途。你应在访问、下载或使用第三方项目之前自行评估其安全性、许可和风险。",
              "在适用法律允许的范围内，因依赖站点信息、访问外部链接、使用第三方工具或服务中断产生的损失，由你自行承担相应风险。"
            ]
          },
          {
            title: "服务与条款变更",
            paragraphs: [
              "维护者可以根据运营、安全或功能需要调整、暂停或终止部分服务，并随站点变化更新本条款。更新内容会在本页公布并标注日期；更新后继续使用本站，即表示你接受修订后的条款。"
            ]
          },
          {
            title: "联系我们",
            paragraphs: [
              "如需反馈内容、权利或条款问题，可以通过项目 GitHub 仓库联系维护者。"
            ]
          }
        ]
      }
    : {
        title: "Terms of Service",
        intro: `By accessing or using ${siteName}, you agree to use the site reasonably and lawfully and to respect the rights of authors, project maintainers, and other users.`,
        updatedAt: "Last updated: July 16, 2026",
        sections: [
          {
            title: "Service Scope and Acceptance",
            paragraphs: [
              "The site organizes and displays tools, projects, articles, and content synchronized from RSS feeds, and provides features such as search, category browsing, and tool submission. Some features may be enabled or disabled by the administrator for a particular deployment.",
              "If you do not agree to these terms or the Privacy Policy, stop accessing the site or using the relevant features."
            ]
          },
          {
            title: "Site Content and External Services",
            paragraphs: [
              "Site content is organized primarily for information and reference. It does not constitute an endorsement, warranty, or recommendation of any tool, project, article, or opinion. External projects may change, stop operating, or apply different terms at any time.",
              "Tool links, demo sites, article sources, external images, and proxy services are operated by their respective third parties. After leaving this site, you are responsible for reviewing and following their terms and privacy policies."
            ]
          },
          {
            title: "Tool Submissions and Public Information",
            paragraphs: [
              "You may sign in with GitHub to submit tool suggestions. A submission is sent to the repository configured for the site, may become a public issue, and may be listed, edited, labeled, rejected, or closed by the maintainer.",
              "By submitting, you confirm that you may provide the information and permit the site to copy, edit, and publish it as needed to review, organize, and display the tool directory. Rights in the original project and its content remain with their respective owners."
            ],
            items: [
              "Do not submit illegal, infringing, malicious, deceptive, or clearly irrelevant content.",
              "Do not submit secrets, account data, private contact details, or sensitive information.",
              "Submissions should be accurate, clear, and point to accessible project pages."
            ]
          },
          {
            title: "Articles, RSS Content, and Intellectual Property",
            paragraphs: [
              "Some articles may be selected, curated, or converted by administrators after synchronization from RSS feeds. Rights in original articles, trademarks, project names, images, and other protected material remain with their respective owners, and source or original links are retained where appropriate.",
              "If you believe content on the site infringes your rights, contact the maintainer through the project GitHub repository with the specific page and an explanation of your rights. After review, the maintainer may correct, attribute, or remove the content."
            ]
          },
          {
            title: "Prohibited Conduct",
            paragraphs: [
              "You must not use the site for unlawful activity, attack or disrupt the service, bypass security checks, abuse APIs at scale, impersonate others, collect non-public data, or distribute malware or infringing content. The maintainer may restrict access that clearly threatens site security or normal operation."
            ]
          },
          {
            title: "Analytics, Security, and Privacy",
            paragraphs: [
              "The site may use Cloudflare for hosting, security verification, and network services, and may use Umami for aggregate traffic analytics after an administrator enables it. GitHub login, public submissions, cookies, local storage, and other data practices are described in the Privacy Policy."
            ]
          },
          {
            title: "Availability and Disclaimer",
            paragraphs: [
              "The site is provided as is and as available. We do not guarantee that content is always accurate, complete, current, or accessible, or that any tool or article is suitable for your particular purpose. You are responsible for evaluating security, licensing, and risk before accessing, downloading, or using third-party projects.",
              "To the extent permitted by applicable law, you assume the risks of relying on site information, following external links, using third-party tools, or experiencing service interruptions."
            ]
          },
          {
            title: "Service and Term Changes",
            paragraphs: [
              "The maintainer may change, suspend, or discontinue parts of the service for operational, security, or feature-related reasons and may update these terms as the site changes. Updates will be posted here with a revised date. Continued use after an update means you accept the revised terms."
            ]
          },
          {
            title: "Contact",
            paragraphs: [
              "For content, rights, or terms-related questions, contact the maintainer through the project GitHub repository."
            ]
          }
        ]
      };
}
export function getDefaultLegalMarkdown(
  kind: LegalPageKind,
  locale: Locale,
  siteName: string
) {
  const content = getLegalPageContent(kind, locale, siteName);
  const sections = content.sections as Array<{
    title: string;
    paragraphs: string[];
    items?: string[];
  }>;

  return [
    `# ${content.title}`,
    content.intro,
    ...sections.flatMap((section) => [
      `## ${section.title}`,
      ...section.paragraphs,
      ...(section.items?.length
        ? [section.items.map((item) => `- ${item}`).join("\n")]
        : [])
    ]),
    content.updatedAt
  ].join("\n\n");
}
