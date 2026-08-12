import {
  generateAdminAi,
  writeAdminAiErrorResponse
} from "../../../_ai";
import { json, requireAdmin, type Env } from "../../../_shared";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) return unauthorized;

  try {
    const payload = (await request.json()) as {
      task?: unknown;
      locale?: unknown;
      input?: unknown;
    };
    const result = await generateAdminAi(
      env,
      payload.task,
      payload.locale,
      payload.input,
      request.url
    );
    return json({ result });
  } catch (error) {
    return writeAdminAiErrorResponse(error);
  }
};
