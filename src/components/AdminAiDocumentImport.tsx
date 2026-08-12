import { FileUp } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ADMIN_AI_DOCUMENT_EXTENSIONS,
  ADMIN_AI_DOCUMENT_MAX_BYTES,
  type AdminAiDocumentResult
} from "../types";
import { convertAdminAiDocument } from "../admin-api";
import AdminFieldAssistButton from "./AdminFieldAssistButton";

function clientError(message: string, code: string) {
  return Object.assign(new Error(message), { code });
}

export default function AdminAiDocumentImport({
  available,
  disabled = false,
  disabledTitle,
  enabled,
  label,
  loadingLabel,
  mobileLabel,
  onError,
  onResult,
  token
}: {
  available: boolean;
  disabled?: boolean;
  disabledTitle?: string;
  enabled: boolean;
  label: string;
  loadingLabel: string;
  mobileLabel: string;
  onError: (error: unknown) => void;
  onResult: (result: AdminAiDocumentResult) => void;
  token: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const unavailable = !available || !enabled;
  const isDisabled = disabled || loading;
  const title = !enabled && disabledTitle ? disabledTitle : label;

  useEffect(() => () => {
    const request = requestRef.current;
    requestRef.current = null;
    request?.abort();
  }, []);

  if (!available) return null;

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isDisabled || unavailable) return;

    const extension = file.name.toLowerCase().split(".").pop() ?? "";
    if (!ADMIN_AI_DOCUMENT_EXTENSIONS.includes(extension as (typeof ADMIN_AI_DOCUMENT_EXTENSIONS)[number])) {
      onError(clientError("This document format is not supported.", "AI_DOCUMENT_UNSUPPORTED"));
      return;
    }
    if (file.size <= 0 || file.size > ADMIN_AI_DOCUMENT_MAX_BYTES) {
      onError(clientError("The document is larger than the 10 MB limit or empty.", "AI_DOCUMENT_TOO_LARGE"));
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const result = await convertAdminAiDocument(file, token, {
        signal: controller.signal
      });
      if (!controller.signal.aborted) onResult(result);
    } catch (error) {
      if (!controller.signal.aborted) onError(error);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <>
      <input
        accept={ADMIN_AI_DOCUMENT_EXTENSIONS.map((extension) => `.${extension}`).join(",")}
        className="sr-only"
        disabled={isDisabled || unavailable}
        ref={inputRef}
        type="file"
        onChange={(event) => void handleChange(event)}
      />
      <AdminFieldAssistButton
        busy={loading}
        className="admin-ai-action-button"
        disabled={isDisabled}
        icon={<FileUp size={16} />}
        label={loading ? loadingLabel : label}
        mobileLabel={mobileLabel}
        onClick={() => inputRef.current?.click()}
        onUnavailable={() => onError(clientError(
          "Workers AI is disabled.",
          "AI_DISABLED"
        ))}
        unavailable={unavailable}
        unavailableTitle={title}
      />
    </>
  );
}
