export const ADMIN_IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const ADMIN_IMAGE_UPLOAD_MIME_TYPES = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

export type AdminImageUploadValidationCode =
  | "IMAGE_FILE_INVALID"
  | "IMAGE_FILE_TOO_LARGE";

export function getAdminImageUploadValidationCode(file: {
  size: number;
  type: string;
}): AdminImageUploadValidationCode | "" {
  if (
    file.size <= 0 ||
    !ADMIN_IMAGE_UPLOAD_MIME_TYPES.includes(
      file.type as (typeof ADMIN_IMAGE_UPLOAD_MIME_TYPES)[number]
    )
  ) {
    return "IMAGE_FILE_INVALID";
  }
  return file.size > ADMIN_IMAGE_UPLOAD_MAX_BYTES
    ? "IMAGE_FILE_TOO_LARGE"
    : "";
}
