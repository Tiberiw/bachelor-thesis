import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {catchError, EMPTY, filter, interval, switchMap, take, takeUntil, takeWhile, timer} from 'rxjs';
import {RecordingService} from './recording.service';
import {ToastService} from './toast.service';
import {AuthService} from '../auth/auth.service';

const STORAGE_KEY = 'watchedTranscriptions';
const POLL_MS = 2000;
const GIVE_UP_MS = 10 * 60 * 1000;

/**
 * Waits for background transcriptions to finish, app-wide, so the user can move
 * around the app and still get a toast (linking to the transcript) when one is done.
 */
@Injectable({
  providedIn: 'root'
})
export class TranscriptionWatcherService {
  private readonly watching = new Set<string>();

  constructor(
    private readonly recordingService: RecordingService,
    private readonly toastService: ToastService,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  /** Starts watching a recording. The patient name is only kept in memory, never stored. */
  watch(recordingId: string, patientName?: string): void {
    if (this.watching.has(recordingId)) return;
    this.watching.add(recordingId);
    this.save();

    interval(POLL_MS).pipe(
      takeWhile(() => !!this.authService.getToken()),
      // A failed check (network blip, cold start) shouldn't stop the watch.
      switchMap(() => this.recordingService.getRecordingById(recordingId).pipe(catchError(() => EMPTY))),
      filter(recording => recording.status === 'ready' || recording.status === 'failed'),
      take(1),
      takeUntil(timer(GIVE_UP_MS)),
    ).subscribe({
      next: recording => this.notify(recordingId, recording.status === 'ready', patientName),
      complete: () => this.stopWatching(recordingId),
    });
  }

  /** Picks up recordings that were still transcribing before a page refresh. */
  resume(): void {
    this.load().forEach(id => this.watch(id));
  }

  private notify(recordingId: string, succeeded: boolean, patientName?: string): void {
    const url = `/home/transcription/${recordingId}`;
    // That page shows the result itself.
    if (this.router.url === url) return;

    const subject = patientName ? `Transcription for ${patientName}` : 'Your transcription';
    this.toastService.show(`${subject} ${succeeded ? 'is ready' : 'failed'}. Click to view.`, url);
  }

  private stopWatching(recordingId: string): void {
    this.watching.delete(recordingId);
    this.save();
  }

  private load(): string[] {
    try {
      const ids: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.watching]));
    } catch {
      // Storage unavailable (private mode); watching still works until a refresh.
    }
  }
}
