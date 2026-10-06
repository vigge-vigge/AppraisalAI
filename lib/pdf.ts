import { PDFParse } from "pdf-parse";

export type PdfPageText = {
  pageNumber: number;
  text: string;
};

export type PdfPageImage = {
  pageNumber: number;
  base64: string;
};

export async function extractText(buffer: Buffer | Uint8Array): Promise<PdfPageText[]> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText();
    return result.pages.map((page) => ({
      pageNumber: page.num,
      text: page.text,
    }));
  } finally {
    await parser.destroy();
  }
}

export async function renderPagesToImages(
  buffer: Buffer | Uint8Array,
  maxPages = 12,
): Promise<PdfPageImage[]> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const textResult = await parser.getText();
    const textLengthByPage = new Map(
      textResult.pages.map(({ num, text }) => [num, text.trim().length]),
    );
    const pageNumbers = Array.from({ length: textResult.total }, (_, index) => index + 1)
      .sort(
        (left, right) =>
          (textLengthByPage.get(left) ?? 0) - (textLengthByPage.get(right) ?? 0) || left - right,
      )
      .slice(0, Math.max(0, Math.floor(maxPages)));

    const screenshotResult = await parser.getScreenshot({
      partial: pageNumbers,
      scale: 1.5,
      imageDataUrl: true,
      imageBuffer: false,
    });

    return screenshotResult.pages.map((page) => ({
      pageNumber: page.pageNumber,
      base64: page.dataUrl.slice(page.dataUrl.indexOf(",") + 1),
    }));
  } finally {
    await parser.destroy();
  }
}