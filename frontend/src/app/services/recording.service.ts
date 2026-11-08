import {environment} from '../../environments/environment';
import {Injectable, NgZone} from '@angular/core';
import {BehaviorSubject, filter, firstValueFrom, interval, Observable, of, Subscription, switchMap, take} from 'rxjs';
import {Recording} from '../domain/recording';
import {HttpClient} from '@angular/common/http';
import {AuthService} from '../auth/auth.service';

/** Live microphone levels, each from 0 (silent) to 1 (loud). */
export interface AudioLevels {
  volume: number;
  /** Energy in the low (~80-400 Hz), mid (~400-1500 Hz) and high (~1.5-5 kHz) voice bands. */
  low: number;
  mid: number;
  high: number;
}

const SILENT: AudioLevels = {volume: 0, low: 0, mid: 0, high: 0};

@Injectable({
  providedIn: 'root'
})
export class RecordingService {

  private readonly apiUrl = `${environment.apiUrl}/transcription`;

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

  // Microphone analysis, used to animate the recording button
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private frequencyData = new Uint8Array(0);
  private waveformData = new Float32Array(0);


  constructor(private readonly authService: AuthService, private readonly http: HttpClient, private zone: NgZone) {
  }

  async startRecording(patientId: string): Promise<void> {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});

      this.startAnalyser(stream);

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

  /** Current microphone levels while recording; all zeros otherwise. */
  getAudioLevels(): AudioLevels {
    if (!this.analyser || !this.audioContext) return SILENT;

    this.analyser.getFloatTimeDomainData(this.waveformData);
    let sumSquares = 0;
    for (const sample of this.waveformData) sumSquares += sample * sample;
    const rms = Math.sqrt(sumSquares / this.waveformData.length);

    this.analyser.getByteFrequencyData(this.frequencyData);
    const hzPerBin = this.audioContext.sampleRate / this.analyser.fftSize;
    const band = (fromHz: number, toHz: number) => {
      const from = Math.max(1, Math.floor(fromHz / hzPerBin));
      const to = Math.min(this.frequencyData.length - 1, Math.ceil(toHz / hzPerBin));
      let sum = 0;
      for (let i = from; i <= to; i++) sum += this.frequencyData[i];
      return sum / ((to - from + 1) * 255);
    };

    return {
      // Speech RMS rarely goes above ~0.3, so scale it up to use the full range.
      volume: Math.min(1, rms * 4),
      low: band(80, 400),
      mid: band(400, 1500),
      high: band(1500, 5000),
    };
  }

  private startAnalyser(stream: MediaStream): void {
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.5;
      // Quiet rooms map to ~0 and normal speech to the upper half.
      this.analyser.minDecibels = -85;
      this.analyser.maxDecibels = -25;
      this.audioContext.createMediaStreamSource(stream).connect(this.analyser);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.waveformData = new Float32Array(this.analyser.fftSize);
    } catch (error) {
      // The animation is cosmetic; recording works without it.
      console.warn('Audio level analysis unavailable:', error);
      this.stopAnalyser();
    }
  }

  private stopAnalyser(): void {
    this.audioContext?.close().catch(() => undefined);
    this.audioContext = null;
    this.analyser = null;
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
    this.stopAnalyser();
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
    this.stopAnalyser();

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
