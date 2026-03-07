import {Component, OnDestroy, OnInit} from '@angular/core';
import {RecordingButtonComponent} from "../recording-button/recording-button.component";
import {RecordingTimerComponent} from "../recording-timer/recording-timer.component";
import {Recording} from '../../../domain/recording';
import {RecordingService} from '../../../services/recording.service';
import {PatientService} from '../../../services/patient.service';
import {ActivatedRoute, Router} from '@angular/router';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {Patient} from '../../../domain/patient';
import {Subject, takeUntil} from 'rxjs';
import {ToastService} from '../../../services/toast.service';

@Component({
  selector: 'app-new-recording',
  imports: [
    RecordingButtonComponent,
    RecordingTimerComponent,
    ReactiveFormsModule
  ],
  templateUrl: './new-recording.component.html',
  styleUrl: './new-recording.component.css'
})
export class NewRecordingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private componentRef: any;


  // Form controls
  patientControl = new FormControl<string>('');

  // Component state
  patients: Patient[] = [];
  selectedPatient: Patient | null = null;
  isRecording = false;
  recordingTime = 0;
  currentRecording: Recording | null = null;
  isTranscribing = false;
  isUploading = false;

  // File input reference
  fileInput: HTMLInputElement | null = null;

  constructor(
    private recordingService: RecordingService,
    private patientService: PatientService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    this.patientService.getAllPatients().subscribe(patients => this.patients = patients);

    this.recordingService.isRecording$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isRecording => {
        this.isRecording = isRecording;
      });

    this.recordingService.recordingTime$
      .pipe(takeUntil(this.destroy$))
      .subscribe(time => this.recordingTime = time);

    this.recordingService.currentRecording$
      .pipe(takeUntil(this.destroy$))
      .subscribe(recording => {
        this.currentRecording = recording;
      });

    // Check for patient ID in URL params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const patientId = params['patientId'];
        if (patientId) {
          console.log('Setting patient from URL:', patientId);
          this.patientControl.setValue(patientId);
          this.handlePatientChange(patientId);
        }
      });

    // Subscribe to patient selection changes
    this.patientControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(patientId => {
        if (patientId) {
          this.handlePatientChange(patientId);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handlePatientChange(patientId: string): void {
    const patient = this.patients.find(p => p.id === patientId);
    if (patient) {
      this.selectedPatient = patient;
      // this.patientService.selectPatient(patientId);
    }
  }

  toggleRecording(): void {
    if (!this.patientControl.value) {
      // this.toastService.error('Please select a patient before recording');
      return;
    }

    if (this.isRecording) {
      this.handleStopRecording();
    } else {
      this.handleStartRecording();
    }

  }

  private handleStartRecording() {
    const patientId = this.patientControl.value!;
    this.recordingService.startRecording(patientId);

    console.log("Starting recording for patient:", patientId);
  }

  private async handleStopRecording(): Promise<void> {
    try {
      console.log('Stopping recording');
      await this.recordingService.stopRecording();
      // this.toastService.success('Recording stopped successfully');
    } catch (error) {
      console.error('Error stopping recording:', error);
      // this.toastService.error('Failed to stop recording');
    }
  }

  async handleTranscribe(): Promise<void> {
    if (!this.currentRecording) {
      // this.toastService.error('No recording available to transcribe');
      return;
    }

    this.isTranscribing = true;
    this.recordingService.transcribeAudio(this.patientControl.value!).subscribe(
      response => {
        this.router.navigate(['/home/transcription', response.id]);
        this.recordingService.waitForCompletion(response.id).subscribe(result => {
          console.log('Transcription done:', result.transcription);
          this.isTranscribing = false;
          if (this.componentRef && this.componentRef.updateText) {
            this.componentRef.updateText(result.transcription);
          }
          this.toastService.show(`Transcription for recording ${result.id} is ready!`, `/home/transcription/${result.id}`);

        });
      });

  }

  async handleFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }
    //
    // if (!this.patientControl.value) {
    //   this.toastService.error('Please select a patient before uploading');
    //   return;
    // }

    try {
      this.isUploading = true;
      // console.log('Uploading file:', file.name, 'for patient:', this.patientControl.value);
      // await this.recordingService.uploadAudio(file, this.patientControl.value);
      // this.toastService.success(`File ${file.name} uploaded successfully`);

      // Reset file input
      input.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      // this.toastService.error(`Failed to upload file ${file.name}`);
    } finally {
      this.isUploading = false;
    }
  }

  navigateBack(): void {
    this.router.navigate(['..'], {relativeTo: this.route});
  }

  get canTranscribe(): boolean {
    return this.currentRecording !== null &&
      !this.isRecording &&
      !this.isTranscribing &&
      this.currentRecording.status === 'recorded';
  }

  get canUpload(): boolean {
    // return !!(this.patientControl.value && !this.isRecording && !this.isUploading);
    return !this.isRecording && !this.isUploading;
  }

  private generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
