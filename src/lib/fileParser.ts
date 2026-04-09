import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export async function extractText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'txt') {
    return file.text();
  }

  if (ext === 'pdf') {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => item.str).join(' '));
    }
    return pages.join('\n\n');
  }

  if (ext === 'docx' || ext === 'doc') {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
  }

  throw new Error('Unsupported file type');
}
