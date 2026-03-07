import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {Recording} from '../../domain/recording';
import {Patient} from '../../domain/patient';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {RecordingService} from '../../services/recording.service';
import {PatientService} from '../../services/patient.service';
import {TranscriptionEditorComponent} from './transcription-editor/transcription-editor.component';

@Component({
  selector: 'app-transcription',
  imports: [
    TranscriptionEditorComponent,
    RouterLink
  ],
  templateUrl: './transcription.component.html',
  styleUrl: './transcription.component.css'
})
export class TranscriptionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  recordingId: string | null = null;
  recording: Recording | null = null;
  patient: Patient | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recordingService: RecordingService,
    private patientService: PatientService
  ) {
  }

  ngOnInit(): void {
    // Get recording ID from route params
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.recordingId = params['id'];
        if (this.recordingId) {
          this.loadRecordingData();
        } else {
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRecordingData(): void {
    this.isLoading = true;
    this.recordingService.getRecordingById(this.recordingId!).subscribe(
      recording => {
        this.recording = recording;
        this.patientService.getAllPatients().subscribe(
          patients => {
            this.patient = patients.find(p => p.id === recording.patientId) || null;
          }
        )
        this.isLoading = false;
      });
  }

  navigateBack(): void {
    this.router.navigate(['/home/recording'], {relativeTo: this.route});
  }

  navigateToPatient(): void {
    if (this.recording) {
      this.router.navigate(['/home/patients', this.recording.patientId]);
    }
  }

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  }
}
