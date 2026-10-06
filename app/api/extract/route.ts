import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { extractText, renderPagesToImages } from "@/lib/pdf";
import {
  appraisalSchema,
  FIELD_KEYS,
  type ExtractionResult,
} from "@/types/appraisal";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 128 * 1024;

const fieldResponseSchema = z.strictObject({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  source: z.string(),
});

const extractionResponseSchema = z.strictObject(
  Object.fromEntries(FIELD_KEYS.map((key) => [key, fieldResponseSchema])),
);

const responseFormat = {
  type: "json_schema",
  json_schema: {
    name: "appraisal_extraction",
    strict: true,
    schema: {
      type: "object",
      properties: Object.fromEntries(
        FIELD_KEYS.map((key) => [
          key,
          {
            type: "object",
            properties: {
              value: { type: ["string", "null"] },
              confidence: { type: "number" },
              source: { type: "string" },
            },
            required: ["value", "confidence", "source"],
            additionalProperties: false,
          },
        ]),
      ),
      required: [...FIELD_KEYS],
      additionalProperties: false,
    },
  },
} as const;

const systemPrompt = `You extract appraisal form data from the supplied document text and page images.

Rules:
- Use ONLY information present in the supplied document. Return null for a value not found; never guess or infer missing values.
- Return every requested field as an object containing value, confidence from 0 to 1, and a short source citation (for example, "Order Sheet p1" or "MLS listing p2"). Use confidence 0 and an empty source when the value is null.
- Prefer the signed contract for contractPrice, contractDate, sellerName, and borrowerName.
- Prefer the MLS/listing for listPrice, mlsNumber, and daysOnMarket.
- Prefer the appraisal order sheet for client, lender, appraiser, and assignment dates.
- For subject physical details, prefer the MLS listing for new construction; do NOT use old public-record data for those details.
- If documents conflict, choose the most authoritative source according to these preferences and mention the conflict in source.
- Normalize dates to YYYY-MM-DD. Normalize money values to digits only, without currency symbols, commas, or decimal points.
- Preserve textual values as printed, except for harmless whitespace normalization.`;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
    return jsonError("The document must be 25 MB or smaller.", 413);
  }

  let formData: FormData;
  try {
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    const reader = request.body?.getReader();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_REQUEST_SIZE) {
          await reader.cancel();
          return jsonError("The document must be 25 MB or smaller.", 413);
        }
        chunks.push(value);
      }
    }

    const boundedBody = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    const boundedRequest = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: boundedBody,
    });
    formData = await boundedRequest.formData();
  } catch {
    return jsonError("Send the PDF as multipart form data in the 'file' field.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("A PDF, JPG, or PNG file is required in the 'file' field.", 400);
  }
  const extension = file.name.toLowerCase().split(".").pop();
  const mimeType = file.type || (extension === "pdf" ? "application/pdf" : extension === "png" ? "image/png" : ["jpg", "jpeg"].includes(extension ?? "") ? "image/jpeg" : "");
  if (!["application/pdf", "image/jpeg", "image/png"].includes(mimeType)) {
    return jsonError("The uploaded file must be a PDF, JPG, or PNG image.", 400);
  }
  if (file.size > MAX_FILE_SIZE) {
    return jsonError("The document must be 25 MB or smaller.", 400);
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return jsonError("The uploaded document could not be read.", 400);
  }

  const isPdf = mimeType === "application/pdf";
  const hasPdfSignature = buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF";
  const hasJpegSignature = buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const hasPngSignature = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  if ((isPdf && !hasPdfSignature) || (mimeType === "image/jpeg" && !hasJpegSignature) || (mimeType === "image/png" && !hasPngSignature)) {
    return jsonError("The uploaded document does not match its file type or is damaged.", 400);
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonError("AI extraction is not configured on this server.", 500);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      void (async () => {
        try {
          send({ type: "status", status: "reading" });

          let documentText = "";
          let images: { pageNumber: number; base64: string }[] = [];
          if (isPdf) {
            let pages;
            let renderedImages;
            try {
              [pages, renderedImages] = await Promise.all([
                extractText(buffer),
                renderPagesToImages(buffer, 12),
              ]);
            } catch {
              throw new Error("The PDF could not be read. It may be damaged or password-protected.");
            }
            documentText = pages
              .map(({ pageNumber, text }) => `--- Page ${pageNumber} ---\n${text}`)
              .join("\n\n");
            images = renderedImages;
          } else {
            images = [{ pageNumber: 1, base64: buffer.toString("base64") }];
          }

          send({ type: "status", status: "extracting" });
          const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
            {
              type: "text",
              text: `Extract all available appraisal fields from this document.\n\n${documentText || "No selectable text was supplied; use the image content."}`,
            },
            ...images.flatMap(({ pageNumber, base64 }) => [
              { type: "text" as const, text: `Document page ${pageNumber}:` },
              {
                type: "image_url" as const,
                image_url: { url: `data:${isPdf ? "image/png" : mimeType};base64,${base64}`, detail: "high" as const },
              },
            ]),
          ];

          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content },
            ],
            response_format: responseFormat,
          });

          const responseContent = completion.choices[0]?.message.content;
          if (!responseContent) throw new Error("The AI service did not return extraction data. Please try again.");

          let parsedResponse: unknown;
          try {
            parsedResponse = JSON.parse(responseContent);
          } catch {
            throw new Error("The AI service returned unreadable extraction data. Please try again.");
          }

          const parsedFields = extractionResponseSchema.safeParse(parsedResponse);
          if (!parsedFields.success) throw new Error("The AI service returned incomplete or invalid extraction data.");

          send({ type: "status", status: "mapping" });
          const data: ExtractionResult["data"] = {};
          const meta: ExtractionResult["meta"] = {};
          for (const key of FIELD_KEYS) {
            const field = parsedFields.data[key];
            data[key] = field.value;
            meta[key] = { confidence: field.confidence, source: field.source };
          }

          const nonNullData = Object.fromEntries(
            FIELD_KEYS.flatMap((key) => (data[key] === null ? [] : [[key, data[key]]])),
          );
          if (!appraisalSchema.partial().safeParse(nonNullData).success) {
            throw new Error("The AI service returned invalid appraisal values.");
          }

          send({ type: "status", status: "done" });
          send({ type: "result", result: { data, meta } });
        } catch (error) {
          if (error instanceof OpenAI.APIError && error.status === 429) {
            send({ type: "error", status: 429, error: "The AI service is rate-limited. Please wait a moment and try again." });
          } else if (error instanceof OpenAI.APIError) {
            send({ type: "error", status: 502, error: "The AI service could not process this document. Please try again." });
          } else {
            const message = error instanceof Error ? error.message : "An unexpected error occurred while extracting this document.";
            send({
              type: "error",
              status: 502,
              error: message,
            });
          }
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}