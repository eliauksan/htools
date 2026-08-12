import { useId, type ClipboardEvent, type ReactNode } from "react";
import { normalizeHttpUrlInput, normalizeTagInputText } from "../tool-helpers";

export function AdminUrlField({
  children,
  className = "",
  disabled = false,
  help,
  id,
  inputAside,
  label,
  maxLength,
  onBlurValue,
  onChange,
  placeholder,
  required = false,
  titleAside,
  value
}: {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  help?: ReactNode;
  id?: string;
  inputAside?: ReactNode;
  label: string;
  maxLength?: number;
  onBlurValue?: (value: string) => void;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  titleAside?: ReactNode;
  value: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const fieldClassName = `tool-form-field admin-resource-url-field ${className}`.trim();

  return (
    <div className={fieldClassName}>
      <div className={`tool-form-field-head ${help && titleAside ? "has-help-aside" : ""}`.trim()}>
        <span className="tool-form-field-title">
          <label htmlFor={inputId}>{label}</label>
          {help && titleAside ? <small className="form-field-help">{help}</small> : null}
        </span>
        {titleAside}
      </div>
      {help && !titleAside ? <small className="form-field-help">{help}</small> : null}
      <div className={`admin-resource-input-row ${inputAside ? "has-input-aside" : ""}`.trim()}>
        <input
          disabled={disabled}
          id={inputId}
          inputMode="url"
          maxLength={maxLength}
          onBlur={(event) => {
            const normalized = normalizeHttpUrlInput(event.currentTarget.value);
            onBlurValue?.(normalized);
            if (normalized !== value) onChange(normalized);
          }}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          value={value}
        />
        {inputAside}
      </div>
      {children}
    </div>
  );
}

export function AdminTextField({
  className = "",
  disabled = false,
  help,
  id,
  inputAside,
  label,
  maxLength,
  onBlurValue,
  onChange,
  onPaste,
  placeholder,
  required = false,
  value
}: {
  className?: string;
  disabled?: boolean;
  help?: ReactNode;
  id?: string;
  inputAside?: ReactNode;
  label: string;
  maxLength?: number;
  onBlurValue?: (value: string) => void;
  onChange: (value: string) => void;
  onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  value: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={`tool-form-field admin-resource-text-field ${className}`.trim()}>
      <div className="tool-form-field-head">
        <label htmlFor={inputId}>{label}</label>
      </div>
      {help ? <small className="form-field-help">{help}</small> : null}
      <div className={`admin-resource-input-row ${inputAside ? "has-input-aside" : ""}`.trim()}>
        <input
          disabled={disabled}
          id={inputId}
          maxLength={maxLength}
          onBlur={(event) => onBlurValue?.(event.currentTarget.value)}
          onChange={(event) => onChange(event.target.value)}
          onPaste={onPaste}
          placeholder={placeholder}
          required={required}
          value={value}
        />
        {inputAside}
      </div>
    </div>
  );
}

export function AdminTextareaField({
  className = "",
  disabled = false,
  id,
  inputAside,
  label,
  onChange,
  placeholder,
  required = false,
  rows,
  value
}: {
  className?: string;
  disabled?: boolean;
  id?: string;
  inputAside?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  rows: number;
  value: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={`tool-form-field admin-resource-textarea-field ${className}`.trim()}>
      <div className="tool-form-field-head">
        <label htmlFor={inputId}>{label}</label>
      </div>
      <div className={`admin-resource-input-row admin-resource-textarea-row ${inputAside ? "has-input-aside" : ""}`.trim()}>
        <textarea
          disabled={disabled}
          id={inputId}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          value={value}
        />
        {inputAside}
      </div>
    </div>
  );
}

export function AdminTagsField({
  disabled = false,
  inputAside,
  label,
  onChange,
  placeholder,
  value
}: {
  disabled?: boolean;
  inputAside?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const inputId = useId();

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (
      text.includes("\n") ||
      /^\s*tags\s*:/i.test(text) ||
      /#[^\s#]+/.test(text)
    ) {
      event.preventDefault();
      onChange(normalizeTagInputText(text));
    }
  }

  return (
    <div className="tool-form-field admin-resource-tags-field">
      <div className="tool-form-field-head">
        <label htmlFor={inputId}>{label}</label>
      </div>
      <div className={`admin-resource-input-row ${inputAside ? "has-input-aside" : ""}`.trim()}>
        <input
          disabled={disabled}
          id={inputId}
          onBlur={(event) => onChange(normalizeTagInputText(event.currentTarget.value))}
          onChange={(event) => onChange(event.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          value={value}
        />
        {inputAside}
      </div>
    </div>
  );
}
