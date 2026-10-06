"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Circle,
  CloudUpload,
  FileImage,
  FileText,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";

type UploadStatus = "idle" | "uploading" | "reading" | "extracting" | "mapping" | "done" | "error";

type FileUploadProps = {
  onExtract: (file: File) => void;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  status: UploadStatus;
  errorMessage?: string;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
const steps = [
  "Document uploaded",
  "Reading document...",
  "Extracting information with AI...",
  "Filling form fields...",
  "Almost done...",
];

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function isSupportedFile(file: File) {
  const extension = file.name.toLowerCase().split(".").pop();
  const supportedExtension = ["pdf", "jpg", "jpeg", "png"].includes(extension ?? "");
  return supportedExtension && (!file.type || allowedMimeTypes.includes(file.type));
}

export default function FileUpload({
  onExtract,
  selectedFile,
  onFileChange,
  status,
  errorMessage,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isBusy = ["uploading", "reading", "extracting", "mapping"].includes(status);
  const failureMessage = errorMessage || localError || (status === "error" ? "Document extraction failed. Please try again." : "");
  const activeIndex: Partial<Record<UploadStatus, number>> = {
    uploading: 0,
    reading: 1,
    extracting: 2,
    mapping: 3,
    done: 5,
  };
  const activeStep = activeIndex[status] ?? -1;

  function acceptFile(candidate?: File) {
    if (!candidate) return;

    if (!isSupportedFile(candidate)) {
      setLocalError("Choose a PDF, JPG, or PNG document to continue.");
      return;
    }

    if (candidate.size > MAX_FILE_SIZE) {
      setLocalError("The document must be 25 MB or smaller.");
      return;
    }

    onFileChange(candidate);
    setLocalError(null);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    acceptFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function removeFile() {
    onFileChange(null);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  }

  function handleDropzoneKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  const isPdf = selectedFile?.type === "application/pdf" || selectedFile?.name.toLowerCase().endsWith(".pdf");

  return (
    <section className="overflow-hidden rounded-xl border border-[#dbe3ef] bg-white shadow-[0_8px_28px_rgba(27,53,91,0.07)]">
      <div className="border-b border-[#e7edf5] px-5 py-5 sm:px-7">
        <h2 className="text-lg font-semibold text-[#1e3150]">Upload Property Document</h2>
        <p className="mt-1 text-sm text-[#6c7b91]">Upload PDF (or images) and let AI extract the data</p>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
        <div
          role="button"
          tabIndex={0}
          aria-label="Choose a PDF, JPG, or PNG property document"
          onClick={() => inputRef.current?.click()}
          onKeyDown={handleDropzoneKeyDown}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-7 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#2168d5] focus-visible:ring-offset-2 ${
            isDragging ? "border-[#2168d5] bg-[#eef5ff]" : "border-[#cdd8e7] bg-[#fafcff] hover:border-[#7798c2] hover:bg-[#f5f9ff]"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
            onChange={handleInputChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#eaf2ff] text-[#2168d5]">
            <CloudUpload aria-hidden="true" className="size-6" />
          </span>
          <span className="text-sm font-semibold text-[#263b59]">Drop your document here</span>
          <span className="mt-1 text-sm text-[#2168d5]">or click to browse</span>
          <span className="mt-2 text-xs text-[#7b899d]">Supports PDF, JPG, PNG (Scanned documents)</span>
          <span className="mt-1 text-xs text-[#98a4b5]">Maximum size 25 MB</span>
        </div>

        {failureMessage && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{failureMessage}</span>
          </div>
        )}

        {selectedFile && (
          <div className="flex min-w-0 items-center gap-3 rounded-md border border-[#e0e6ef] bg-white px-3 py-3">
            {isPdf ? (
              <FileText aria-hidden="true" className="size-5 shrink-0 text-red-600" />
            ) : (
              <FileImage aria-hidden="true" className="size-5 shrink-0 text-[#2168d5]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#263b59]">{selectedFile.name}</p>
              <p className="text-xs text-[#7b899d]">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={removeFile}
              disabled={isBusy}
              aria-label="Remove selected document"
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-[#718097] hover:bg-[#f1f4f8] hover:text-[#263b59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2168d5] disabled:opacity-50"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => selectedFile && onExtract(selectedFile)}
          disabled={!selectedFile || isBusy}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2168d5] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1757bb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2168d5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isBusy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Sparkles aria-hidden="true" className="size-4" />}
          {isBusy ? "Extracting..." : "Extract Data with AI"}
        </button>

        <ol aria-label="Document extraction progress" className="space-y-3 border-t border-[#e8edf4] pt-5">
          {steps.map((label, index) => {
            const complete = index < activeStep || status === "done" || (index === 0 && Boolean(selectedFile) && status === "idle");
            const active = index === activeStep && isBusy;
            return (
              <li key={label} className="flex items-center gap-3 text-sm">
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${complete ? "bg-[#e7f5ed] text-[#25834e]" : active ? "bg-[#eaf2ff] text-[#2168d5]" : "bg-[#f0f2f5] text-[#a3adba]"}`}>
                  {complete ? <Check aria-hidden="true" className="size-4" /> : active ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Circle aria-hidden="true" className="size-2 fill-current" />}
                </span>
                <span className={complete ? "font-medium text-[#315943]" : active ? "font-medium text-[#285da8]" : "text-[#8290a3]"}>{label}</span>
              </li>
            );
          })}
        </ol>

        <div className="rounded-md border border-[#cfe0fb] bg-[#eef5ff] px-4 py-3 text-sm leading-6 text-[#365b8a]">
          AI is analyzing the document and filling all relevant fields. You can review and edit the information after completion.
        </div>
      </div>
    </section>
  );
}
