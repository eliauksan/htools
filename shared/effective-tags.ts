const RESERVED_CATEGORY_VALUES = new Set([
  "all",
  "featured",
  "\u5168\u90e8",
  "\u7cbe\u9009",
  "__telegram_tool__",
  "__telegram_article__",
  "__telegram_content__"
]);

export function getEffectiveTags(
  tags: readonly string[],
  category = ""
) {
  const normalizedTags = Array.from(
    new Set(tags.map((tag) => tag.trim()).filter(Boolean))
  );

  if (normalizedTags.length) return normalizedTags;

  const fallback = category.trim();
  return fallback && !RESERVED_CATEGORY_VALUES.has(fallback.toLowerCase())
    ? [fallback]
    : [];
}
