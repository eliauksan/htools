import {
  buildClearGitHubSessionCookie,
  getDatabase,
  getGitHubSession,
  jsonActionSuccess,
  type Env
} from "../../_shared";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const session = await getGitHubSession(request, env);

  if (session) {
    const db = await getDatabase(env);
    await db.prepare("DELETE FROM github_sessions WHERE token = ?")
      .bind(session.token)
      .run();
  }

  const response = jsonActionSuccess();
  response.headers.append("Set-Cookie", buildClearGitHubSessionCookie(request));
  return response;
};
