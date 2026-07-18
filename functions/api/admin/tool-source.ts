import {
  getDatabase,
  json,
  jsonError,
  requireAdmin,
  toolSourceFromRow,
  type Env,
  type ToolRow
} from "../../_shared";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const db = await getDatabase(env);
    const result = await db.prepare(
      "SELECT * FROM tools ORDER BY updated_at DESC, created_at DESC"
    ).all<ToolRow>();

    return json(result.results.map(toolSourceFromRow), {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to export tool source.";
    return jsonError(message, "SERVER_ERROR", { status: 500 });
  }
};
