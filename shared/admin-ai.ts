export const ADMIN_AI_MODELS = [
  "@cf/qwen/qwen3-30b-a3b-fp8",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
] as const;

export const DEFAULT_ADMIN_AI_MODEL = ADMIN_AI_MODELS[0];

export const ADMIN_AI_DOCUMENT_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "html",
  "htm",
  "xml",
  "docx",
  "xls",
  "xlsx",
  "odt",
  "ods",
  "csv",
  "numbers"
] as const;

export const ADMIN_AI_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export type AdminAiModel = (typeof ADMIN_AI_MODELS)[number];

export type AdminAiTask =
  | "tool_name"
  | "article_title"
  | "telegram_title"
  | "tool_description"
  | "tool_tags"
  | "article_summary"
  | "article_tags"
  | "content_summary"
  | "content_tags"
  | "telegram_description"
  | "telegram_tags";
