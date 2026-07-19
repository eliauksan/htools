# HTools

HTools is an open-source tool directory built on Cloudflare Pages Functions and D1, with a public tool library, articles, and an RSS content dashboard.

<p align="center">
  <a href="https://pages.cloudflare.com/"><img src="https://img.shields.io/badge/Powered%20by-Cloudflare-F38020?logo=cloudflare&amp;logoColor=white" alt="Powered by Cloudflare" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-2ea44f" alt="License: MIT" /></a>
  <a href="https://github.com/shaoyouvip/htools/releases/latest"><img src="https://img.shields.io/github/v/release/shaoyouvip/htools?display_name=tag" alt="Latest Release" /></a>
</p>

<p align="center">
  <a href="https://t.me/lsmkc">Telegram Channel</a> |
  <a href="https://t.me/lsmoo">Telegram Group</a>
</p>

<p align="center">
  English | <a href="README.md">简体中文</a> |
  <a href="https://blog.zrf.me/p/HTools/">Illustrated Deployment Guide</a>
</p>

## Screenshots

![HTools public tool library](public/demo/frontend-tools.png)

![HTools admin tool library](public/demo/admin-tools.png)

## Features

- The public site includes tool categories, articles, tool submission, and an about page.
- The dashboard manages tools, articles, RSS sources, categories, and system settings.
- RSS items can be previewed or converted into site articles; articles and the about page support Markdown.
- Users can fetch GitHub repository metadata and continue to GitHub to create a public issue; admins can also auto-fill repository details.
- Full backup and restore, a public tool feed, and Simplified Chinese / English interfaces are included.

## Deployment

1. Fork or import this repository into your GitHub account.
2. Create a Cloudflare Pages project and connect it to your repository.
3. Use these Pages build settings:

```txt
Build command: npm run build
Build output directory: dist
```

4. Create a Cloudflare D1 database, for example `htools`.
5. Go back to the Pages project settings and add a D1 binding for Functions:

```txt
Variable name: DB
D1 database: select the database you just created
```

6. Add the required variables to the Pages deployment environment using the environment-variable table below, and store every value marked as Secret as an encrypted variable.

7. Redeploy the Pages project.
8. Open `/admin` and sign in.

The D1 schema is initialized or upgraded automatically on first API access; no manual migration command is required. The database starts empty, so import the default source from the dashboard or add tools manually.

## Environment Variables

The application reads the following environment variables:

| Variable | Required | Recommended type | Purpose |
| --- | --- | --- | --- |
| `ADMIN_PASSWORD` | Yes | Secret | Admin password and session-signing secret; use a unique password of at least 12 characters. |
| `GITHUB_TOKEN` | No | Secret | Reads public GitHub repository metadata while adding or editing tools and raises the GitHub API request limit. |
| `TURNSTILE_SITE_KEY` | No; configure together with the secret key | Plain variable | Cloudflare Turnstile Site Key used to load the widget on the administrator login page. |
| `TURNSTILE_SECRET_KEY` | No; configure together with the site key | Secret | Cloudflare Turnstile Secret Key used by the server to verify challenge results. |

Use a read-only `GITHUB_TOKEN` without repository write, delete, or administration permissions. Without it, the admin browser requests GitHub's public API directly. The public submission page always uses the visitor's browser and never uses the site token.

To use Turnstile, add the deployed domain in Cloudflare, configure both keys, redeploy, and enable it under Admin → Service Settings.

## Local Development

```bash
npm install
npm run dev
```

For manual D1 initialization or troubleshooting:

```bash
npm run db:init:local
npm run db:init:remote
```

## Data Sources

- Default source file: [public/htools.json](public/htools.json)
- Default source URL: [https://raw.githubusercontent.com/shaoyouvip/htools/refs/heads/main/public/htools.json](https://raw.githubusercontent.com/shaoyouvip/htools/refs/heads/main/public/htools.json)
- Current site public source: `/api/htools.json`

The default source is not written to D1 automatically. Import it from the dashboard, or import another site's public `/api/htools.json`.

## SEO And Feeds

- `/sitemap.xml`: sitemap for public pages and published articles.
- `/rss.xml`: RSS feed for published articles.
- `/rss.json`: JSON Feed for published articles.
