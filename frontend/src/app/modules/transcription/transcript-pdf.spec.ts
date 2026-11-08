import {jsPDF} from 'jspdf';
import {buildTranscriptPdf, transcriptFileName} from './transcript-pdf';

describe('buildTranscriptPdf', () => {
  // Uncompressed output keeps the drawn text readable in the raw PDF.
  const raw = (doc: jsPDF) => doc.output();
  const JsPdfUncompressed = class extends jsPDF {
    constructor(options: object) {
      super({...options, compress: false});
    }
  } as unknown as typeof jsPDF;

  it('writes the title, patient details and transcript text', () => {
    const doc = buildTranscriptPdf(JsPdfUncompressed, {
      patientName: 'Ion Popescu',
      date: '2026-11-07T10:00:00Z',
      durationSeconds: 75,
      text: 'the patient has a headache',
    });

    const pdf = raw(doc);
    expect(pdf.startsWith('%PDF-')).toBeTrue();
    expect(pdf).toContain('Patient Conversation Transcript');
    expect(pdf).toContain('Patient: Ion Popescu');
    expect(pdf).toContain('Duration: 1:15');
    expect(pdf).toContain('Words: 5');
    expect(pdf).toContain('the patient has a headache');
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('continues long transcripts on more pages', () => {
    const text = Array.from({length: 200}, (_, i) => `Sentence number ${i} of a long consultation.`).join('\n');
    const doc = buildTranscriptPdf(JsPdfUncompressed, {text});

    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(raw(doc)).toContain(`Page 1 of ${doc.getNumberOfPages()}`);
  });

  it('says so when there is no text', () => {
    const doc = buildTranscriptPdf(JsPdfUncompressed, {text: '  '});

    expect(raw(doc)).toContain('No speech was detected in this recording.');
  });
});

describe('transcriptFileName', () => {
  it('uses the patient name and date', () => {
    expect(transcriptFileName('Ștefan Ionescu', '2026-11-07T10:00:00Z', 'r1')).toBe('transcript-stefan-ionescu-2026-11-07.pdf');
  });

  it('falls back to the recording id', () => {
    expect(transcriptFileName(undefined, undefined, 'r1')).toBe('transcript-r1.pdf');
  });
});
