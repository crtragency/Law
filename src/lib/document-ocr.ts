import "server-only";
import { createSignedDownloadUrl, storageConfigured } from "@/lib/storage";

type OcrStatus = "INDEXED" | "NEEDS_OCR" | "FAILED";

export interface ExtractDocumentTextInput {
  storageKey: string;
  fileName: string;
  mimeType?: string | null;
  maxChars?: number;
}

export interface ExtractDocumentTextResult {
  text: string | null;
  status: OcrStatus;
  error?: string;
}

const DEFAULT_MAX_BYTES = Number(process.env.OCR_MAX_BYTES ?? 8 * 1024 * 1024);
const DEFAULT_MAX_CHARS = 30000;

function isStoredDocument(storageKey: string) {
  return storageKey.startsWith("cases/") || storageKey.startsWith("files/");
}

function extension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

function cleanText(text: string, maxChars = DEFAULT_MAX_CHARS) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxChars);
}

function isTextLike(mimeType: string | null | undefined, fileName: string) {
  const ext = extension(fileName);
  return (
    mimeType?.startsWith("text/") ||
    ["txt", "csv", "json", "xml", "html", "htm", "md", "svg", "rtf"].includes(ext) ||
    ["application/json", "application/xml", "application/rtf"].includes(mimeType ?? "")
  );
}

function decodeBuffer(buffer: Buffer) {
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

function decodePdfLiteral(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function extractBasicPdfText(buffer: Buffer, maxChars: number) {
  const raw = buffer.toString("latin1");
  const pieces: string[] = [];
  for (const match of raw.matchAll(/\((?:\\.|[^\\)]){2,}\)\s*Tj/g)) {
    pieces.push(decodePdfLiteral(match[0].replace(/\)\s*Tj$/, "").slice(1)));
    if (pieces.join("\n").length > maxChars) break;
  }
  for (const match of raw.matchAll(/\[(.*?)\]\s*TJ/gs)) {
    const arrayText = [...match[1].matchAll(/\((?:\\.|[^\\)]){1,}\)/g)]
      .map((part) => decodePdfLiteral(part[0].slice(1, -1)))
      .join("");
    if (arrayText.trim()) pieces.push(arrayText);
    if (pieces.join("\n").length > maxChars) break;
  }
  const fallback = cleanText(decodeBuffer(buffer), maxChars);
  const text = cleanText([...pieces, fallback].join("\n"), maxChars);
  return text.length >= 20 ? text : "";
}

async function extractWithExternalOcr(buffer: Buffer, input: ExtractDocumentTextInput) {
  const url = process.env.OCR_API_URL;
  if (!url) return null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.OCR_API_KEY) headers.Authorization = `Bearer ${process.env.OCR_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fileName: input.fileName,
      mimeType: input.mimeType,
      base64: buffer.toString("base64"),
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OCR service failed (${res.status})`);
  const data = (await res.json()) as { text?: string; error?: string };
  if (data.error) throw new Error(data.error);
  return cleanText(data.text ?? "", input.maxChars ?? DEFAULT_MAX_CHARS);
}

export async function extractDocumentTextFromStorage(
  input: ExtractDocumentTextInput
): Promise<ExtractDocumentTextResult> {
  if (!isStoredDocument(input.storageKey)) {
    return { text: null, status: "NEEDS_OCR", error: "External links are not fetched automatically" };
  }
  if (!storageConfigured()) {
    return { text: null, status: "NEEDS_OCR", error: "Storage is not configured" };
  }

  try {
    const url = await createSignedDownloadUrl(input.storageKey, 300);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > DEFAULT_MAX_BYTES) {
      return { text: null, status: "NEEDS_OCR", error: "File is larger than OCR_MAX_BYTES" };
    }

    const ext = extension(input.fileName);
    let text = "";
    if (isTextLike(input.mimeType, input.fileName)) {
      text = cleanText(decodeBuffer(bytes), input.maxChars);
    } else if (input.mimeType === "application/pdf" || ext === "pdf") {
      text = extractBasicPdfText(bytes, input.maxChars ?? DEFAULT_MAX_CHARS);
      if (!text) text = (await extractWithExternalOcr(bytes, input)) ?? "";
    } else if (input.mimeType?.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext)) {
      text = (await extractWithExternalOcr(bytes, input)) ?? "";
    } else {
      text = (await extractWithExternalOcr(bytes, input)) ?? "";
    }

    if (!text) return { text: null, status: "NEEDS_OCR", error: "No readable text found" };
    return { text, status: "INDEXED" };
  } catch (err) {
    return {
      text: null,
      status: "FAILED",
      error: err instanceof Error ? err.message : "OCR failed",
    };
  }
}
