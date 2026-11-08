import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {BehaviorSubject, of} from 'rxjs';
import {NewRecordingComponent} from './new-recording.component';
import {RecordingService} from '../../../services/recording.service';
import {PatientService} from '../../../services/patient.service';
import {ToastService} from '../../../services/toast.service';
import {TranscriptionWatcherService} from '../../../services/transcription-watcher.service';
import {Recording} from '../../../domain/recording';

describe('NewRecordingComponent', () => {
  let fixture: ComponentFixture<NewRecordingComponent>;
  let isRecording$: BehaviorSubject<boolean>;
  let currentRecording$: BehaviorSubject<Recording | null>;

  beforeEach(() => {
    isRecording$ = new BehaviorSubject(false);
    currentRecording$ = new BehaviorSubject<Recording | null>(null);

    TestBed.configureTestingModule({
      imports: [NewRecordingComponent],
      providers: [
        {
          provide: RecordingService,
          useValue: {
            isRecording$,
            currentRecording$,
            recordingTime$: of(0),
            getAudioLevels: () => ({volume: 0, low: 0, mid: 0, high: 0}),
          },
        },
        {provide: PatientService, useValue: {getAllPatients: () => of([])}},
        {provide: ToastService, useValue: {show: () => undefined}},
        {provide: TranscriptionWatcherService, useValue: {watch: () => undefined}},
        {provide: Router, useValue: {navigate: () => Promise.resolve(true)}},
        {provide: ActivatedRoute, useValue: {queryParams: of({})}},
      ],
    });
    fixture = TestBed.createComponent(NewRecordingComponent);
    fixture.detectChanges();
  });

  const transcribeButton = () => (fixture.nativeElement as HTMLElement).querySelector('.transcribe-button');

  it('hides the transcribe button before anything is recorded', () => {
    expect(transcribeButton()).toBeNull();
  });

  it('hides the transcribe button while recording', () => {
    isRecording$.next(true);
    currentRecording$.next({id: 'rec_1', status: 'recording'});
    fixture.detectChanges();

    expect(transcribeButton()).toBeNull();
  });

  it('shows the transcribe button once the recording is stopped', () => {
    isRecording$.next(false);
    currentRecording$.next({id: 'rec_1', status: 'recorded'});
    fixture.detectChanges();

    expect(transcribeButton()).not.toBeNull();
  });
});
