import type { Messages } from "./i18n";
import type { Tool } from "./types";
import { ADMIN_FEATURED_CATEGORY } from "./admin-helpers";

function cleanArticleTag(value: string) {
  return value
    .trim()
    .replace(/^[-*]\s*/, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}
function splitArticleTagSegment(value: string) {
  const trimmed = value
    .trim()
    .replace(/^tags\s*:\s*/i, "")
    .replace(/^\[(.*)\]$/, "$1");

  return trimmed
    .split(/[\r\n,，、。;；|｜/／\\]+/)
    .map(cleanArticleTag)
    .filter(Boolean);
}

export function parseArticleTagsInput(value: string) {
  const normalized = value.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const tagKeyIndex = lines.findIndex((line) => /^\s*tags\s*:/i.test(line));
  const tags: string[] = [];

  if (tagKeyIndex >= 0) {
    const firstLineValue = lines[tagKeyIndex].replace(/^\s*tags\s*:\s*/i, "");

    if (firstLineValue.trim()) {
      tags.push(...splitArticleTagSegment(firstLineValue));
    }

    for (let index = tagKeyIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      if (/^\s*[A-Za-z0-9_-]+\s*:/.test(line) && !trimmed.startsWith("-")) {
        break;
      }

      if (trimmed.startsWith("-")) {
        tags.push(cleanArticleTag(trimmed));
      }
    }
  } else {
    for (const line of lines) {
      tags.push(...splitArticleTagSegment(line));
    }
  }

  return Array.from(new Set(tags.map(cleanArticleTag).filter(Boolean))).slice(0, 24);
}

export function formatTagInputText(tags: string[]) {
  return tags.join(", ");
}

export function createImageFromUrl(url: string) {
  if (!url.trim()) {
    return "";
  }

  const githubPreview = createGitHubOpenGraphImageUrl(url);

  if (githubPreview) {
    return githubPreview;
  }

  return `https://image.thum.io/get/width/1200/crop/720/${url.trim()}`;
}

function createGitHubOpenGraphImageUrl(url: string) {
  const repoPath = getGitHubRepoPath(url);

  return repoPath ? `https://opengraph.githubassets.com/htools/${repoPath}` : "";
}

export function getGitHubRepoPath(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host !== "github.com" && host !== "www.github.com") {
      return "";
    }

    const [owner, repo] = parsed.pathname
      .split("/")
      .filter(Boolean)
      .slice(0, 2);

    if (!owner || !repo) {
      return "";
    }

    return `${owner}/${repo.replace(/\.git$/i, "")}`;
  } catch {
    return "";
  }
}

export function isGitHubRepoUrl(value: string) {
  return Boolean(getGitHubRepoPath(normalizeHttpUrlInput(value)));
}


function isGeneratedScreenshotUrl(url: string) {
  try {
    return new URL(url).hostname.toLowerCase() === "image.thum.io";
  } catch {
    return false;
  }
}

function isGitHubOpenGraphImageUrl(url: string) {
  try {
    return new URL(url).hostname.toLowerCase() === "opengraph.githubassets.com";
  } catch {
    return false;
  }
}

export function createToolPreviewSource(tool: Tool) {
  if (usesGitHubOpenGraphPreview(tool)) {
    return createGitHubOpenGraphImageUrl(tool.url);
  }

  return tool.image || createImageFromUrl(tool.url);
}

export function usesGitHubOpenGraphPreview(tool: Tool) {
  return Boolean(
    createGitHubOpenGraphImageUrl(tool.url) &&
      (!tool.image ||
        isGeneratedScreenshotUrl(tool.image) ||
        isGitHubOpenGraphImageUrl(tool.image))
  );
}

export function normalizeHttpUrlInput(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getToolInitials(name: string) {
  const words = name
    .replace(/[^a-z0-9\s-]/gi, " ")
    .split(/[\s-]+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return (words[0] ?? name).slice(0, 2).toUpperCase();
}

export function getCategoryLabel(category: string, t: Messages) {
  if (category === ADMIN_FEATURED_CATEGORY) {
    return t.tool.featured;
  }

  return t.categories[category] ?? category;
}
