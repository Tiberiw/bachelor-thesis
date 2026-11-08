import {ComponentFixture, TestBed} from '@angular/core/testing';
import {of, Subject} from 'rxjs';
import {TranscriptionEditorComponent} from './transcription-editor.component';
import {RecordingService} from '../../../services/recording.service';
import {Recording} from '../../../domain/recording';

describe('TranscriptionEditorComponent', () => {
  let fixture: ComponentFixture<TranscriptionEditorComponent>;
  let completion$: Subject<Recording>;
  let recordingService: jasmine.SpyObj<RecordingService>;

  const recording = (overrides: Partial<Recording>): Recording => ({
    id: 'r1',
    createdAt: '2026-11-07T10:00:00Z',
    updatedAt: '2026-11-07T10:00:00Z',
    duration: 5,
    status: 'transcribing',
    ...overrides,
  });

  function setup(initial: Recording) {
    completion$ = new Subject<Recording>();
    recordingService = jasmine.createSpyObj('RecordingService', ['getRecordingById', 'waitForCompletion', 'updateTranscription']);
    recordingService.getRecordingById.and.returnValue(of(initial));
    recordingService.waitForCompletion.and.returnValue(completion$);

    TestBed.configureTestingModule({
      imports: [TranscriptionEditorComponent],
      providers: [{provide: RecordingService, useValue: recordingService}],
    });
    fixture = TestBed.createComponent(TranscriptionEditorComponent);
    fixture.componentInstance.recordingId = 'r1';
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;

  it('shows a progress state while transcribing, then fills in the text', () => {
    setup(recording({status: 'transcribing'}));

    expect(recordingService.waitForCompletion).toHaveBeenCalledWith('r1');
    expect(el().querySelector('.transcribing-state')?.textContent).toContain('Transcribing');
    expect(el().querySelector('textarea')).toBeNull();

    completion$.next(recording({status: 'ready', transcription: 'the patient has a headache'}));
    fixture.detectChanges();

    expect(el().querySelector('.transcribing-state')).toBeNull();
    expect(el().querySelector('textarea')?.value).toBe('the patient has a headache');
    expect(el().querySelector('.meta-text')?.textContent).toContain('5 words');
  });

  it('shows an error when the transcription fails', () => {
    setup(recording({status: 'transcribing'}));

    completion$.next(recording({status: 'failed'}));
    fixture.detectChanges();

    expect(el().querySelector('.transcribing-state')).toBeNull();
    expect(el().querySelector('.failed-state')?.textContent).toContain('Transcription failed');
  });

  it('does not poll for a recording that is already transcribed', () => {
    setup(recording({status: 'ready', transcription: 'done'}));

    expect(recordingService.waitForCompletion).not.toHaveBeenCalled();
    expect(el().querySelector('textarea')?.value).toBe('done');
  });
});
