import {Component, OnDestroy, OnInit} from '@angular/core';
import {RecordingButtonComponent} from './recording-button/recording-button.component';
import {RecordingService} from '../../services/recording.service';
import {PatientService} from '../../services/patient.service';
import {RouterLink} from '@angular/router';
import {Recording} from '../../domain/recording';
import {RecordingTimerComponent} from './recording-timer/recording-timer.component';
import {combineLatest, Subject, takeUntil} from 'rxjs';
import {Patient} from '../../domain/patient';

@Component({
  selector: 'app-recording',
  imports: [
    RouterLink
  ],
  templateUrl: './recording.component.html',
  styleUrl: './recording.component.css'
})
export class RecordingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  recordings: Recording[] = [];
  patients: Patient[] = [];

  constructor(private readonly recordingService: RecordingService,
              private readonly patientService: PatientService) {}

  ngOnInit(): void {
    // Load recordings and patients
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    // Combine recordings and patients data
    combineLatest([
      this.recordingService.getAllRecordings(),
      this.patientService.getAllPatients(),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([recordings, patients]) => {
        this.recordings = recordings;
        this.patients = patients;
        console.log('Recordings and patients loaded:', this.recordings, this.patients);
      });
  }

  /**
   * Format seconds into MM:SS format
   */
  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get patient name from patient ID
   */
  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.id === patientId);
    return `${patient?.firstName} ${patient?.lastName}` || 'Unknown';
  }

  /**
   * Get status indicator color class
   */
  getStatusColorClass(status: string): string {
    switch (status) {
      case 'ready':
        return 'bg-green-500';
      case 'transcribing':
        return 'bg-amber-500';
      case 'recording':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  }

  /**
   * Get status text
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'ready':
        return 'Transcribed';
      case 'transcribing':
        return 'Processing';
      case 'recording':
        return 'Recording';
      default:
        return 'Recorded';
    }
  }

  /**
   * Get status text color class
   */
  getStatusTextClass(status: string): string {
    switch (status) {
      case 'ready':
        return 'text-green-600';
      case 'transcribing':
        return 'text-amber-600';
      case 'recording':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  }
}
