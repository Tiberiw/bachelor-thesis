import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-recording-timer',
  imports: [],
  templateUrl: './recording-timer.component.html',
  styleUrl: './recording-timer.component.css'
})
export class RecordingTimerComponent {
  @Input() seconds: number = 0;
  @Input() isRecording: boolean = false;

  /**
   * Format seconds into MM:SS format
   */
  formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get the status text based on recording state
   */
  getStatusText(): string {
    return this.isRecording ? 'Recording...' : 'Duration';
  }
}
