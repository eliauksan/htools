import { getGitHubSettings, json, jsonError, type Env } from "../_shared";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const settings = await getGitHubSettings(env);
    return json(
      {
        enabled: Boolean(settings.enabled && settings.owner.trim() && settings.repo.trim()),
        labels: settings.labels,
        owner: settings.owner.trim(),
        repo: settings.repo.trim()
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return jsonError("Unable to load submission settings.", "SERVER_ERROR", {
      status: 500,
      headers: { "Cache-Control": "no-store" }
    });
  }
};
