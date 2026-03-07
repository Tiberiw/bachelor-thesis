import {Injectable, NgZone} from '@angular/core';
import {BehaviorSubject, filter, firstValueFrom, interval, Observable, of, Subscription, switchMap, take} from 'rxjs';
import {Recording} from '../domain/recording';
import {HttpClient} from '@angular/common/http';
import {TranscriptionComponent} from '../modules/transcription/transcription.component';
import {AuthService} from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RecordingService {

  private readonly apiUrl = 'http://localhost:3000/api/transcription';

  private pendingRecording: Blob | null = null;

  // State management
  private isRecordingSubject = new BehaviorSubject<boolean>(false);
  private recordingTimeSubject = new BehaviorSubject<number>(0);
  private currentRecordingSubject = new BehaviorSubject<Recording | null>(null);

  // Observables
  public isRecording$ = this.isRecordingSubject.asObservable();
  public recordingTime$ = this.recordingTimeSubject.asObservable();
  public currentRecording$ = this.currentRecordingSubject.asObservable();

  // Recording state
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private timerSubscription: Subscription | null = null;
  private startTime: number = 0;


  constructor(private readonly authService: AuthService, private readonly http: HttpClient, private zone: NgZone) {
  }

  async startRecording(patientId: string): Promise<void> {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        this.pendingRecording = new Blob(this.audioChunks, {type: 'audio/webm'});
        // await this.saveRecording(audioBlob, patientId);
      };

      // Start recording
      this.mediaRecorder.start();
      this.isRecordingSubject.next(true);
      this.startTime = Date.now();

      // Start timer
      this.startTimer();

      // Create recording entry
      const recording: Recording = {
        id: this.generateId(),
        patientId,
        status: 'recording',
        duration: 0
      };

      this.currentRecordingSubject.next(recording);
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to start recording. Please check microphone permissions.');
    }
  }

  public getRecordingById(id: string): Observable<Recording> {
    return this.http.get<Recording>(`${this.apiUrl}/${id}`);
  }

  waitForCompletion(id: string): Observable<Recording> {
    return interval(2000).pipe(
      switchMap(() => this.getRecordingById(id)),
      filter(transcription => transcription.status === 'ready' || transcription.status === 'failed'),
      take(1)
    );
  }

  private async saveRecording(audioBlob: Blob, patientId: string): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('audioBlob', audioBlob, 'recording.webm');
      formData.append('patientId', patientId);
      // formData.append('duration', this.recordingTimeSubject.value.toString());

      // Mock API call - replace with actual endpoint
      console.log('Saving recording for patient:', patientId);
      const response = await firstValueFrom(
        this.http.post<Recording>(`${this.apiUrl}`, formData)
      );

      // For demo purposes, update the current recording
      const currentRecording = this.currentRecordingSubject.value;
      if (currentRecording) {
        currentRecording.audioUrl = URL.createObjectURL(audioBlob);
        this.currentRecordingSubject.next(currentRecording);
      }
    } catch (error) {
      console.error('Error saving recording:', error);
      throw error;
    }
  }

  private startTimer(): void {
    this.recordingTimeSubject.next(0);
    this.timerSubscription = interval(1000).subscribe(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      this.recordingTimeSubject.next(elapsed);
    });
  }

  private stopTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }

  private generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clean up resources
  cleanup(): void {
    this.stopTimer();
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    this.isRecordingSubject.next(false);
    this.recordingTimeSubject.next(0);
    this.currentRecordingSubject.next(null);
  }


  getAllRecordings(): Observable<Recording[]> {
    return this.http.get<Recording[]>(this.apiUrl);
  }


  async stopRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      throw new Error('No active recording');
    }

    // Stop recording
    this.mediaRecorder.stop();
    this.isRecordingSubject.next(false);

    // Stop timer
    this.stopTimer();

    // Stop all tracks
    this.mediaRecorder.stream.getTracks().forEach(track => track.stop());

    // Update recording status
    const currentRecording = this.currentRecordingSubject.value;
    if (currentRecording) {
      currentRecording.status = 'recorded';
      currentRecording.duration = this.recordingTimeSubject.value;
      this.currentRecordingSubject.next(currentRecording);
    }
  }

  transcribeAudio(patientId: string): Observable<Recording> {
    const formData = new FormData();
    formData.append('audioBlob', this.pendingRecording!, 'recording.webm');
    formData.append('patientId', patientId);
    formData.append('duration', this.recordingTimeSubject.value.toString());
    formData.append('status', 'recording');
    this.recordingTimeSubject.next(0);
    return this.http.post<Recording>(`${this.apiUrl}`, formData);
  }

  public updateTranscription(id: string, transcription: string, status: "recording" | "recorded" | "transcribing" | "ready" | "failed"): Observable<Recording> {
    return this.http.put<Recording>(`${this.apiUrl}/${id}`, {id, transcription, status});
  }
}
