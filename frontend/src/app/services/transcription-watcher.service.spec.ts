import {discardPeriodicTasks, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {Router} from '@angular/router';
import {of, throwError} from 'rxjs';
import {TranscriptionWatcherService} from './transcription-watcher.service';
import {RecordingService} from './recording.service';
import {ToastService} from './toast.service';
import {AuthService} from '../auth/auth.service';
import {Recording} from '../domain/recording';

describe('TranscriptionWatcherService', () => {
  let watcher: TranscriptionWatcherService;
  let recordingService: jasmine.SpyObj<RecordingService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let router: {url: string};

  const recording = (status: Recording['status']): Recording => ({id: 'r1', status});

  beforeEach(() => {
    localStorage.removeItem('watchedTranscriptions');
    recordingService = jasmine.createSpyObj('RecordingService', ['getRecordingById']);
    toastService = jasmine.createSpyObj('ToastService', ['show']);
    router = {url: '/home/patients'};

    TestBed.configureTestingModule({
      providers: [
        {provide: RecordingService, useValue: recordingService},
        {provide: ToastService, useValue: toastService},
        {provide: AuthService, useValue: {getToken: () => 'token'}},
        {provide: Router, useValue: router},
      ],
    });
    watcher = TestBed.inject(TranscriptionWatcherService);
  });

  afterEach(() => localStorage.removeItem('watchedTranscriptions'));

  it('shows a clickable toast when the transcription finishes on another page', fakeAsync(() => {
    recordingService.getRecordingById.and.returnValue(of(recording('transcribing')));
    watcher.watch('r1', 'Ion Popescu');

    tick(2000);
    expect(toastService.show).not.toHaveBeenCalled();

    recordingService.getRecordingById.and.returnValue(of(recording('ready')));
    tick(2000);

    expect(toastService.show).toHaveBeenCalledOnceWith(
      'Transcription for Ion Popescu is ready. Click to view.',
      '/home/transcription/r1',
    );
    expect(localStorage.getItem('watchedTranscriptions')).toBe('[]');
  }));

  it('tells the user when the transcription fails', fakeAsync(() => {
    recordingService.getRecordingById.and.returnValue(of(recording('failed')));
    watcher.watch('r1', 'Ion Popescu');
    tick(2000);

    expect(toastService.show).toHaveBeenCalledOnceWith(
      'Transcription for Ion Popescu failed. Click to view.',
      '/home/transcription/r1',
    );
  }));

  it('does not show a toast when the user is already on that transcript', fakeAsync(() => {
    router.url = '/home/transcription/r1';
    recordingService.getRecordingById.and.returnValue(of(recording('ready')));
    watcher.watch('r1', 'Ion Popescu');
    tick(2000);

    expect(toastService.show).not.toHaveBeenCalled();
  }));

  it('keeps watching after a failed check', fakeAsync(() => {
    recordingService.getRecordingById.and.returnValue(throwError(() => new Error('network')));
    watcher.watch('r1', 'Ion Popescu');
    tick(2000);

    recordingService.getRecordingById.and.returnValue(of(recording('ready')));
    tick(2000);

    expect(toastService.show).toHaveBeenCalledTimes(1);
  }));

  it('resumes watching after a page refresh', fakeAsync(() => {
    localStorage.setItem('watchedTranscriptions', JSON.stringify(['r1']));
    recordingService.getRecordingById.and.returnValue(of(recording('ready')));

    watcher.resume();
    tick(2000);

    expect(toastService.show).toHaveBeenCalledOnceWith(
      'Your transcription is ready. Click to view.',
      '/home/transcription/r1',
    );
  }));

  it('gives up after 10 minutes', fakeAsync(() => {
    recordingService.getRecordingById.and.returnValue(of(recording('transcribing')));
    watcher.watch('r1', 'Ion Popescu');
    tick(10 * 60 * 1000);

    expect(localStorage.getItem('watchedTranscriptions')).toBe('[]');
    const calls = recordingService.getRecordingById.calls.count();
    tick(10_000);
    expect(recordingService.getRecordingById.calls.count()).toBe(calls);
    discardPeriodicTasks();
  }));
});
