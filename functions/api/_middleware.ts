import type { Env } from "../_shared";

const NO_INDEX_ROBOTS = "noindex, nofollow, noarchive";

/**
 * API responses are implementation details for the application and should
 * never be indexed as public documents. Keeping this policy at the API
 * directory boundary covers every current and future endpoint consistently.
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", NO_INDEX_ROBOTS);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText
  });
};
