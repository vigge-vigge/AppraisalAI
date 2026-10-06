"use client";

import { useId } from "react";
import { Sparkles } from "lucide-react";
import type { FieldMeta } from "@/types/appraisal";

type FormFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  type: "text" | "number" | "date" | "textarea" | "select";
  options?: ReadonlyArray<{ label: string; value: string }>;
  placeholder?: string;
  prefix?: string;
  meta?: FieldMeta;
  error?: string;
};

export default function FormField({
  label,
  name,
  value,
  onChange,
  type,
  options,
  placeholder,
  prefix,
  meta,
  error,
}: FormFieldProps) {
  const fieldId = useId();
  const isAiFilled = Boolean(meta?.aiFilled && !meta.edited);
  const showNotFound = value === "" && meta?.aiFilled === false;
  const confidencePercent = meta
    ? Math.round(meta.confidence <= 1 ? meta.confidence * 100 : meta.confidence)
    : 0;
  const aiTooltip = `Confidence: ${confidencePercent}%; Source: ${meta?.source ?? ""}`;
  const describedBy = [
    error ? `${fieldId}-error` : undefined,
    showNotFound ? `${fieldId}-hint` : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const controlClassName = [
    "w-full rounded-md border bg-white py-2 text-sm text-zinc-900 shadow-sm outline-none transition-colors",
    prefix ? "pl-7 pr-3" : "px-3",
    "border-zinc-300 placeholder:text-zinc-400 focus-visible:border-sky-600 focus-visible:ring-2 focus-visible:ring-sky-200",
    isAiFilled ? "border-green-300 ring-2 ring-green-400" : "",
    error ? "border-red-500" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const controlProps = {
    id: fieldId,
    name,
    value,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy || undefined,
    placeholder,
    className: controlClassName,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(name, event.currentTarget.value),
  };
  const control =
    type === "textarea" ? (
      <textarea {...controlProps} rows={4} />
    ) : type === "select" ? (
      <select {...controlProps}>
        <option value="">Select...</option>
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ) : (
      <input {...controlProps} type={type} />
    );

  return (
    <div className="space-y-1.5">
      <div className="flex min-h-5 items-center justify-between gap-3">
        <label htmlFor={fieldId} className="text-sm font-medium text-zinc-800">
          {label}
        </label>
        {isAiFilled && (
          <span
            className="inline-flex items-center gap-1 rounded-sm bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-800"
            title={aiTooltip}
          >
            <Sparkles aria-hidden="true" className="size-3.5" />
            AI Auto-Filled
          </span>
        )}
      </div>

      {prefix ? (
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
            {prefix}
          </span>
          {control}
        </div>
      ) : (
        control
      )}

      {showNotFound && (
        <p id={`${fieldId}-hint`} className="text-xs text-amber-700">
          Not found in document
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
