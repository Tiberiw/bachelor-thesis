import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {Recording} from '../../../domain/recording';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {RecordingService} from '../../../services/recording.service';

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

  private loadRecording(): void {
    this.recordingService.getRecordingById(this.recordingId).subscribe(
      recording => {
        this.recording = recording
        if (recording.transcription) {
          this.textControl.setValue(recording.transcription, { emitEvent: false });
          this.updateWordCount(recording.transcription);
        }
      }
    );
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

  handleDownloadPDF(): void {
    if (!this.recording) return;

    const content = this.transcriptionView === 'transcription'
      ? this.recording.transcription || ''
      : this.recording.summary || '';

    const duration = this.formatDuration(this.recording.duration!);

    // Create a simple PDF-like content
    const pdfContent = `Patient Conversation ${this.transcriptionView === 'transcription' ? 'Transcript' : 'Summary'}
                        Date: ${new Date(this.recording.createdAt!).toLocaleDateString()}
                        Duration: ${duration}

                        ${content}`;

    // Create and download file
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `conversation-${this.transcriptionView}-${this.recording.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatLastUpdated(): string {
    return this.lastUpdated.toLocaleString();
  }
}
