import type {jsPDF} from 'jspdf';

export interface TranscriptPdfData {
  patientName?: string;
  date?: string;
  durationSeconds?: number;
  text: string;
}

const MARGIN = 56;
const LINE_HEIGHT = 16;
const MUTED: [number, number, number] = [110, 110, 110];

/** Lays out a transcript as an A4 PDF: title, details, then the text across as many pages as needed. */
export function buildTranscriptPdf(JsPdf: typeof jsPDF, data: TranscriptPdfData): jsPDF {
  const doc = new JsPdf({unit: 'pt', format: 'a4'});
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const bottom = pageHeight - MARGIN;
  let y = MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Patient Conversation Transcript', MARGIN, y);
  y += 28;

  const text = data.text.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const details = [
    `Patient: ${data.patientName || 'Unknown'}`,
    data.date ? `Date: ${new Date(data.date).toLocaleDateString()}` : null,
    data.durationSeconds != null ? `Duration: ${formatDuration(data.durationSeconds)}` : null,
    `Words: ${words}`,
  ].filter((line): line is string => line !== null);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(details.join('   |   '), MARGIN, y);
  y += 14;

  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 24;

  doc.setFontSize(11);
  if (!text) {
    doc.text('No speech was detected in this recording.', MARGIN, y);
  } else {
    doc.setTextColor(30, 30, 30);
    const paragraphs = text.split(/\n+/);
    paragraphs.forEach((paragraph, index) => {
      for (const line of doc.splitTextToSize(paragraph, contentWidth) as string[]) {
        if (y > bottom) {
          doc.addPage();
          y = MARGIN;
        }
        doc.text(line, MARGIN, y);
        y += LINE_HEIGHT;
      }
      if (index < paragraphs.length - 1) y += LINE_HEIGHT / 2;
    });
  }

  // Page numbers, once the total is known.
  const pages = doc.getNumberOfPages();
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.text(`Page ${page} of ${pages}`, pageWidth - MARGIN, pageHeight - MARGIN / 2, {align: 'right'});
  }

  return doc;
}

/** File name like "transcript-ion-popescu-2026-11-08.pdf". */
export function transcriptFileName(patientName: string | undefined, date: string | undefined, fallbackId: string): string {
  const slug = (patientName ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const day = date ? new Date(date).toISOString().slice(0, 10) : '';
  const parts = ['transcript', slug || fallbackId, day].filter(Boolean);
  return `${parts.join('-')}.pdf`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}
