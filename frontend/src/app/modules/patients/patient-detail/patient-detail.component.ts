import {Component, OnDestroy, OnInit} from '@angular/core';
import {Patient} from '../../../domain/patient';
import {Recording} from '../../../domain/recording';
import {combineLatest, Subject, takeUntil} from 'rxjs';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {PatientService} from '../../../services/patient.service';
import {RecordingService} from '../../../services/recording.service';
import {DatePipe} from '@angular/common';

type TabValue = 'recordings' | 'history';

@Component({
  selector: 'app-patient-detail',
  imports: [
    RouterLink,
    DatePipe
  ],
  templateUrl: './patient-detail.component.html',
  styleUrl: './patient-detail.component.css'
})
export class PatientDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  patientId: string | null = null;
  patient: Patient | null = null;
  recordings: Recording[] = [];
  activeTab: TabValue = 'recordings';
  isLoading = true;

  constructor(private route: ActivatedRoute,
              private router: Router,
              private patientService: PatientService,
              private recordingService: RecordingService) {
  }

  ngOnInit(): void {
    // Get patient ID from route params
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.patientId = params['id'];
        if (this.patientId) {
          this.loadPatientData();
        } else {
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPatientData(): void {
    if (!this.patientId) return;

    this.isLoading = true;

    // Load patient and recordings data
    combineLatest([
      this.patientService.patients$,
      this.recordingService.getAllRecordings()
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([patients, recordings]) => {
        // Find patient
        this.patient = patients.find(p => p.id === this.patientId) || null;

        // Filter recordings for this patient
        if (this.patientId) {
          this.recordings = recordings.filter(r => r.patientId === this.patientId);
        }

        this.isLoading = false;
      });
  }

  calculateAge(dob?: string): number {
    if (!dob) return 0;

    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  formatDate(date?: string | Date): string {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  }

  formatDateTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString();
  }

  setActiveTab(tab: TabValue): void {
    this.activeTab = tab;
  }

  navigateToPatients(): void {
    this.router.navigate(['/patients']);
  }

  getDisplayValue(value?: string | null): string {
    return value || '-';
  }

  getLastVisitText(lastVisit?: string): string {
    return lastVisit ? this.formatDate(lastVisit) : 'New patient';
  }

  protected readonly Date = Date;
}
