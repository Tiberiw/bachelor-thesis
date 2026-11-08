import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {Recording} from '../../../domain/recording';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {RecordingService} from '../../../services/recording.service';
import {buildTranscriptPdf, transcriptFileName} from '../transcript-pdf';

type TranscriptionView = 'transcription' | 'summary';


@Component({
  selector: 'app-transcription-editor',
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: './transcription-editor.component.html',
  styleUrl: './transcription-editor.component.css'
})
export class TranscriptionEditorComponent implements OnInit, OnDestroy {
  @Input() recordingId: string = "";
  @Input() patientName = '';

  private destroy$ = new Subject<void>();

  recording: Recording | null = null;
  textControl = new FormControl('');
  wordCount = 0;
  isSaving = false;
  isLoading = false;
  transcriptionView: TranscriptionView = 'transcription';
  lastUpdated = new Date();

  constructor(private recordingService: RecordingService) {}

  ngOnInit(): void {
    this.loadRecording();

    // Subscribe to text changes for word count
    this.textControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(text => {
        this.updateWordCount(text || '');
      });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isTranscribing(): boolean {
    return this.recording?.status === 'transcribing';
  }

  get hasFailed(): boolean {
    return this.recording?.status === 'failed';
  }

  private loadRecording(): void {
    this.recordingService.getRecordingById(this.recordingId).subscribe(
      recording => {
        this.showRecording(recording);
        // The back-end transcribes in the background; keep checking until it finishes.
        if (recording.status === 'transcribing') {
          this.recordingService.waitForCompletion(this.recordingId)
            .pipe(takeUntil(this.destroy$))
            .subscribe(finished => this.showRecording(finished));
        }
      }
    );
  }

  private showRecording(recording: Recording): void {
    this.recording = recording;
    if (recording.updatedAt) {
      this.lastUpdated = new Date(recording.updatedAt);
    }
    if (recording.transcription) {
      this.textControl.setValue(recording.transcription, { emitEvent: false });
      this.updateWordCount(recording.transcription);
    }
  }

  private updateWordCount(text: string): void {
    this.wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  async saveChanges(): Promise<void> {
    if (!this.recording || this.isSaving) return;

    this.isSaving = true;
    const text = this.textControl.value || '';
    this.recordingService.updateTranscription(this.recordingId, text, this.recording.status).subscribe(
      transcription => {
        this.recording = transcription;
        this.lastUpdated = new Date(transcription.updatedAt!);
        this.isSaving = false;
        this.textControl.markAsPristine();
      });
  }

  /** Downloads what's in the editor (including unsaved edits) as a PDF. */
  async handleDownloadPDF(): Promise<void> {
    if (!this.recording) return;

    // Loaded on demand so the PDF library isn't in the main bundle.
    const {jsPDF} = await import('jspdf');
    const doc = buildTranscriptPdf(jsPDF, {
      patientName: this.patientName,
      date: this.recording.createdAt,
      durationSeconds: this.recording.duration,
      text: this.textControl.value || '',
    });
    doc.save(transcriptFileName(this.patientName, this.recording.createdAt, this.recording.id));
  }

  formatLastUpdated(): string {
    return this.lastUpdated.toLocaleString();
  }
}
