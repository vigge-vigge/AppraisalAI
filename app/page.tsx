"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  House,
  Save,
  X,
} from "lucide-react";
import AppraisalForm from "@/components/AppraisalForm";
import FileUpload from "@/components/FileUpload";
import {
  appraisalSchema,
  FIELD_KEYS,
  type AppraisalFormData,
  type ExtractionResult,
  type FieldMetaMap,
} from "@/types/appraisal";

type UploadStatus = "idle" | "uploading" | "reading" | "extracting" | "mapping" | "done" | "error";
type ToastMessage = { kind: "success" | "error"; message: string };

const emptyFormData = (): AppraisalFormData =>
  Object.fromEntries(FIELD_KEYS.map((key) => [key, ""])) as AppraisalFormData;

const steps = [
  { title: "Form 1", description: "Editable – Page 1", tone: "blue" },
  { title: "Form 2", description: "Editable – Page 2", tone: "blue" },
  { title: "Upload Document", description: "AI extracts & fills the form", tone: "blue" },
  { title: "Auto-Filled Form", description: "Review & Edit", tone: "green" },
] as const;

async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }
}

async function readExtractionStream(
  response: Response,
  onStatus: (status: UploadStatus) => void,
): Promise<ExtractionResult> {
  if (!response.body) throw new Error("The extraction service returned an empty response.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ExtractionResult | null = null;

  function consumeLine(line: string) {
    if (!line.trim()) return;
    const event: unknown = JSON.parse(line);
    if (typeof event !== "object" || event === null || !("type" in event)) {
      throw new Error("The extraction service returned an invalid progress event.");
    }

    if (event.type === "status" && "status" in event) {
      const nextStatus = event.status;
      if (["reading", "extracting", "mapping", "done"].includes(String(nextStatus))) {
        onStatus(nextStatus as UploadStatus);
      }
    } else if (event.type === "error") {
      throw new Error(getErrorMessage(event, "Unable to extract data from this document."));
    } else if (event.type === "result" && "result" in event) {
      const extraction = event.result;
      if (
        typeof extraction !== "object" ||
        extraction === null ||
        !("data" in extraction) ||
        !("meta" in extraction)
      ) {
        throw new Error("The extraction service returned an invalid result.");
      }
      result = extraction as ExtractionResult;
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      lines.forEach(consumeLine);
      if (done) break;
    }
    consumeLine(buffer);
  } catch (error) {
    await reader.cancel();
    throw error;
  }

  if (!result) throw new Error("The extraction service did not return appraisal data.");
  return result;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const { error } = payload;
    if (typeof error === "string") return error;
  }
  return fallback;
}

export default function Home() {
  const [data, setData] = useState<AppraisalFormData>(emptyFormData);
  const [meta, setMeta] = useState<FieldMetaMap>({});
  const dataRef = useRef(data);
  const metaRef = useRef(meta);
  const [activeStep, setActiveStep] = useState(1);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [appraisalId, setAppraisalId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [extractionSummary, setExtractionSummary] = useState<{ filled: number; missing: number } | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    let active = true;
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return () => { active = false; };

    async function loadAppraisal() {
      try {
        const response = await fetch(`/api/appraisals/${encodeURIComponent(id!)}`);
        const payload = await readJsonResponse(response);
        if (!response.ok) throw new Error(getErrorMessage(payload, "Unable to load this appraisal."));
        if (typeof payload !== "object" || payload === null || !("data" in payload)) {
          throw new Error("The saved appraisal has an invalid format.");
        }

        const parsedData = appraisalSchema.safeParse({
          ...emptyFormData(),
          ...(payload.data as Partial<AppraisalFormData>),
        });
        if (!parsedData.success) throw new Error("The saved appraisal data is invalid.");
        if (!active) return;

        dataRef.current = parsedData.data;
        setData(parsedData.data);
        setAppraisalId(id!);
        if ("meta" in payload && typeof payload.meta === "object" && payload.meta !== null) {
          const loadedMeta = payload.meta as FieldMetaMap;
          metaRef.current = loadedMeta;
          setMeta(loadedMeta);
        }
      } catch (error) {
        if (active) {
          setToast({ kind: "error", message: error instanceof Error ? error.message : "Unable to load this appraisal." });
        }
      }
    }

    void loadAppraisal();
    return () => {
      active = false;
    };
  }, []);

  const handleChange = useCallback((name: keyof AppraisalFormData, value: string) => {
    const nextData = { ...dataRef.current, [name]: value };
    const nextMeta = {
      ...metaRef.current,
      [name]: {
        confidence: metaRef.current[name]?.confidence ?? 1,
        source: metaRef.current[name]?.source ?? "User entered",
        aiFilled: metaRef.current[name]?.aiFilled ?? false,
        edited: true,
      },
    };
    dataRef.current = nextData;
    metaRef.current = nextMeta;
    setData(nextData);
    setMeta(nextMeta);
    setToast(null);
  }, []);

  const clearForm = useCallback(() => {
    const clearedData = emptyFormData();
    dataRef.current = clearedData;
    metaRef.current = {};
    setData(clearedData);
    setMeta({});
    setExtractionSummary(null);
    setToast(null);
  }, []);

  const applyExtraction = useCallback((result: ExtractionResult, overwrite: boolean) => {
    let filled = 0;
    let missing = 0;
    const nextData = { ...dataRef.current };
    const nextMeta = { ...metaRef.current };

    for (const key of FIELD_KEYS) {
      const userHasValue = dataRef.current[key] !== "" && !metaRef.current[key]?.aiFilled;
      if (!overwrite && (metaRef.current[key]?.edited || userHasValue)) continue;

      const value = result.data[key] ?? "";
      nextData[key] = value;
      nextMeta[key] = {
        confidence: result.meta[key]?.confidence ?? 0,
        source: result.meta[key]?.source ?? "",
        aiFilled: Boolean(value),
        edited: false,
      };
      if (value) filled += 1;
      else missing += 1;
    }

    dataRef.current = nextData;
    metaRef.current = nextMeta;
    setData(nextData);
    setMeta(nextMeta);
    setExtractionSummary({ filled, missing });
  }, []);

  const performExtraction = useCallback(async (file: File, overwrite: boolean) => {
    setStatus("uploading");
    setUploadError(undefined);
    setExtractionSummary(null);
    setToast(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/extract", { method: "POST", body: formData });
      if (!response.ok) {
        const payload = await readJsonResponse(response);
        throw new Error(getErrorMessage(payload, "Unable to extract data from this document."));
      }

      const result = await readExtractionStream(response, setStatus);
      applyExtraction(result, overwrite);
      setStatus("done");
      setActiveStep(4);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to extract data from this document.";
      setUploadError(message);
      setStatus("error");
    }
  }, [applyExtraction]);

  function handleExtract(file: File) {
    const hasUserEdits = FIELD_KEYS.some((key) => {
      const userHasValue = dataRef.current[key] !== "" && !metaRef.current[key]?.aiFilled;
      return metaRef.current[key]?.edited || userHasValue;
    });

    if (hasUserEdits) {
      setPendingFile(file);
      setShowOverwriteDialog(true);
      return;
    }
    void performExtraction(file, false);
  }

  async function handleSave(): Promise<boolean> {
    setSaving(true);
    setToast(null);

    try {
      const response = await fetch(
        appraisalId ? `/api/appraisals/${encodeURIComponent(appraisalId)}` : "/api/appraisals",
        {
          method: appraisalId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: dataRef.current, meta: metaRef.current }),
        },
      );
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(getErrorMessage(payload, "Unable to save appraisal."));

      if (!appraisalId && typeof payload === "object" && payload !== null && "id" in payload && typeof payload.id === "string") {
        setAppraisalId(payload.id);
        window.history.replaceState(null, "", `?id=${encodeURIComponent(payload.id)}`);
      }
      setToast({ kind: "success", message: "Appraisal saved successfully." });
      return true;
    } catch (error) {
      setToast({ kind: "error", message: error instanceof Error ? error.message : "Unable to save appraisal." });
      return false;
    } finally {
      setSaving(false);
    }
  }

  function confirmOverwrite() {
    if (pendingFile) void performExtraction(pendingFile, true);
    setPendingFile(null);
    setShowOverwriteDialog(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f6fb] text-[#21334e]">
      <header className="print:hidden bg-[#1e3a6e] text-white shadow-md">
        <div className="mx-auto flex min-h-20.5 max-w-360 flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-white/10 text-white">
              <House aria-hidden="true" className="size-6" />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Appraisal Form AI</h1>
              <p className="mt-1 text-xs text-blue-100 sm:text-sm">Upload a property document and let AI fill the form for you</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => void handleSave()} disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60">
              <Save aria-hidden="true" className="size-4" />
              Save
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <Download aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button type="button" onClick={() => setShowHelp(true)} className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <CircleHelp aria-hidden="true" className="size-4" />
              Help
            </button>
            <div className="relative ml-1">
              <button
                type="button"
                aria-expanded={showProfileMenu}
                aria-label="Open account menu"
                onClick={() => setShowProfileMenu((open) => !open)}
                className="inline-flex h-10 items-center gap-2 rounded-full pl-1 pr-2 text-sm hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-[#397ee7] text-xs font-bold text-white">JD</span>
                <ChevronDown aria-hidden="true" className="size-4" />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 top-12 z-30 w-48 rounded-md border border-[#dce4ef] bg-white p-3 text-sm text-[#253a58] shadow-lg">
                  <p className="font-semibold">Jordan Davis</p>
                  <p className="mt-0.5 text-xs text-[#718097]">Appraiser</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav aria-label="Appraisal workflow" className="print:hidden border-b border-[#dfe6f0] bg-white">
        <ol className="mx-auto grid max-w-280 grid-cols-2 gap-2 px-4 py-4 sm:grid-cols-4 sm:gap-0 sm:px-6 lg:px-8">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = activeStep === stepNumber;
            const isComplete = activeStep > stepNumber || (stepNumber === 4 && status === "done");
            const toneColor = step.tone === "green" ? "#27834f" : "#276bd1";
            return (
              <li key={step.title} className="relative">
                <button
                  type="button"
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => {
                    setActiveStep(stepNumber);
                    setShowProfileMenu(false);
                  }}
                  className={`relative z-10 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors sm:justify-center sm:px-3 ${isActive ? "bg-[#f0f5fd]" : "hover:bg-[#f7f9fc]"}`}
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${isActive || isComplete ? "text-white" : "bg-white"}`} style={{ borderColor: toneColor, backgroundColor: isActive || isComplete ? toneColor : "white", color: isActive || isComplete ? "white" : toneColor }}>
                    {isComplete ? <Check aria-hidden="true" className="size-4" /> : stepNumber}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-xs font-semibold sm:text-sm ${isActive ? "text-[#1d3b6b]" : "text-[#344965]"}`}>{step.title}</span>
                    <span className="block truncate text-[10px] text-[#7b899c] sm:text-[11px]">{step.description}</span>
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <ChevronRight aria-hidden="true" className="absolute -right-2 top-1/2 z-20 hidden size-4 -translate-y-1/2 text-[#93a2b6] sm:block" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <main className="flex-1 px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {extractionSummary && (
            <div role="status" className="mb-5 flex items-start gap-2 rounded-md border border-[#cfe0fb] bg-[#eef5ff] px-4 py-3 text-sm text-[#365b8a]">
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>{extractionSummary.filled} fields auto-filled, {extractionSummary.missing} not found. Please review before saving.</p>
            </div>
          )}

          {activeStep === 1 && (
            <AppraisalForm
              data={data}
              meta={meta}
              page={1}
              onChange={handleChange}
              onSave={handleSave}
              onClear={clearForm}
              onNext={() => setActiveStep(2)}
              onPrevious={() => setActiveStep(1)}
              onBackToUpload={() => setActiveStep(3)}
              saving={saving}
            />
          )}
          {activeStep === 2 && (
            <AppraisalForm
              data={data}
              meta={meta}
              page={2}
              onChange={handleChange}
              onSave={handleSave}
              onClear={clearForm}
              onNext={() => setActiveStep(3)}
              onPrevious={() => setActiveStep(1)}
              onBackToUpload={() => setActiveStep(3)}
              saving={saving}
            />
          )}
          {activeStep === 3 && (
            <FileUpload
              onExtract={handleExtract}
              selectedFile={selectedFile}
              onFileChange={setSelectedFile}
              status={status}
              errorMessage={uploadError}
            />
          )}
          {activeStep === 4 && (
            <AppraisalForm
              data={data}
              meta={meta}
              page={1}
              review
              onChange={handleChange}
              onSave={handleSave}
              onClear={clearForm}
              onNext={() => setActiveStep(4)}
              onPrevious={() => setActiveStep(3)}
              onBackToUpload={() => setActiveStep(3)}
              saving={saving}
            />
          )}
        </div>
      </main>

      <footer className="print:hidden border-t border-[#dce4ee] bg-white">
        <div className="mx-auto flex max-w-360 flex-col gap-2 px-4 py-4 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-[#28456d]">
            <House aria-hidden="true" className="size-4" />
            <span className="font-semibold">Appraisal Form AI</span>
            <span className="text-[#8794a6]">Faster. Smarter. More Accurate.</span>
          </div>
          <p className="text-[#7b899c]">Powered by AI <span className="px-1.5 text-[#bdc7d4]">|</span> UAD 3.6 Compliant <span className="px-1.5 text-[#bdc7d4]">|</span> Secure &amp; Private</p>
        </div>
      </footer>

      {toast && (
        <div role={toast.kind === "error" ? "alert" : "status"} className={`fixed bottom-5 right-5 z-40 flex max-w-sm items-start gap-2 rounded-md border bg-white px-4 py-3 text-sm shadow-lg ${toast.kind === "success" ? "border-emerald-200 text-emerald-900" : "border-red-200 text-red-900"}`}>
          {toast.kind === "success" ? <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {showOverwriteDialog && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-[#102342]/45 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="overwrite-title" aria-describedby="overwrite-description" className="w-full max-w-md rounded-lg border border-[#dce4ef] bg-white p-5 shadow-xl">
            <h2 id="overwrite-title" className="text-base font-semibold text-[#21334e]">Re-run extraction?</h2>
            <p id="overwrite-description" className="mt-2 text-sm text-[#697991]">Re-run extraction and overwrite my edits?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setPendingFile(null); setShowOverwriteDialog(false); }} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cdd7e5] px-3 text-sm font-medium text-[#40536e] hover:bg-[#f5f8fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7892b6]">
                <X aria-hidden="true" className="size-4" /> Cancel
              </button>
              <button type="button" onClick={confirmOverwrite} className="inline-flex h-9 items-center rounded-md bg-[#1e3a6e] px-3 text-sm font-semibold text-white hover:bg-[#172f59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a6e] focus-visible:ring-offset-2">
                Overwrite
              </button>
            </div>
          </section>
        </div>
      )}

      {showHelp && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-[#102342]/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowHelp(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="help-title" className="w-full max-w-md rounded-lg border border-[#dce4ef] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="help-title" className="text-base font-semibold text-[#21334e]">Appraisal Form AI Help</h2>
                <p className="mt-2 text-sm leading-6 text-[#697991]">Enter appraisal details manually, or upload a PDF, JPG, or PNG document for AI-assisted extraction. Review the extracted values and sources before saving.</p>
              </div>
              <button type="button" onClick={() => setShowHelp(false)} aria-label="Close help" className="flex size-8 shrink-0 items-center justify-center rounded-md text-[#718097] hover:bg-[#f1f4f8]">
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <button type="button" onClick={() => setShowHelp(false)} className="mt-5 h-9 rounded-md bg-[#2168d5] px-4 text-sm font-semibold text-white hover:bg-[#1757bb]">Got it</button>
          </section>
        </div>
      )}
    </div>
  );
}
