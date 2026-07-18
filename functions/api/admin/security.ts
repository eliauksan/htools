import {
  getAdminSecuritySettings,
  InvalidRequestError,
  json,
  jsonError,
  requireAdmin,
  saveAdminPassword,
  verifyPassword,
  writeErrorResponse,
  type Env
} from "../../_shared";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) {
    return unauthorized;
  }

  return json({
    settings: await getAdminSecuritySettings(env)
  });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const unauthorized = await requireAdmin(request, env);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = (await request.json()) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };
    const currentPassword = readPassword(payload.currentPassword, "currentPassword");
    const newPassword = readPassword(payload.newPassword, "newPassword");

    if (!(await verifyPassword(currentPassword, env))) {
      return jsonError(
        "Current password is incorrect.",
        "INVALID_PASSWORD",
        { status: 401 }
      );
    }

    await saveAdminPassword(env, newPassword);

    return json({
      settings: await getAdminSecuritySettings(env)
    });
  } catch (error) {
    return writeErrorResponse(error, "Unable to update admin password.");
  }
};

function readPassword(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new InvalidRequestError(`${field} is required.`);
  }

  return value.trim();
}
