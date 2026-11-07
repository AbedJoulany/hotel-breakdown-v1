import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const isBrowser =
  typeof window !== 'undefined' && !window.navigator.userAgent.toLowerCase().includes('jsdom');

if (isBrowser) {
  GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfTextPage {
  pageNumber: number;
  width: number;
  height: number;
  items: PdfTextItem[];
}

export async function extractPdfTextPages(data: ArrayBuffer): Promise<PdfTextPage[]> {
  const document = await getDocument({
    data: new Uint8Array(data),
    ...(isBrowser ? {} : { disableWorker: true }),
  } as Parameters<typeof getDocument>[0]).promise;

  try {
    const pages: PdfTextPage[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      pages.push({
        pageNumber,
        width: viewport.width,
        height: viewport.height,
        items: content.items.flatMap((item) => {
          if (!('str' in item) || !item.str.trim()) {
            return [];
          }

          const [scaleX, skewY, skewX, scaleY, x, y] = item.transform;
          return [{
            text: item.str,
            x,
            y: viewport.height - y - Math.abs(scaleY),
            width: item.width ?? Math.abs(scaleX),
            height: item.height ?? Math.abs(scaleY),
          }];
        }),
      });
    }

    return pages;
  } finally {
    await document.destroy();
  }
}
