import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RecordingButtonComponent} from './recording-button.component';
import {AudioLevels, RecordingService} from '../../../services/recording.service';

describe('RecordingButtonComponent', () => {
  let fixture: ComponentFixture<RecordingButtonComponent>;
  let levels: AudioLevels;

  const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const cssVar = (name: string) => Number(fixture.nativeElement.style.getPropertyValue(`--${name}`) || 0);

  beforeEach(() => {
    levels = {volume: 0, low: 0, mid: 0, high: 0};
    TestBed.configureTestingModule({
      imports: [RecordingButtonComponent],
      providers: [{provide: RecordingService, useValue: {getAudioLevels: () => levels}}],
    });
    fixture = TestBed.createComponent(RecordingButtonComponent);
  });

  afterEach(() => fixture.destroy());

  it('moves the rings with the microphone while recording', async () => {
    fixture.componentRef.setInput('isRecording', true);
    fixture.detectChanges();
    await nextFrame();
    expect(cssVar('volume')).toBe(0);

    levels = {volume: 0.9, low: 0.2, mid: 0.8, high: 0.4};
    await nextFrame();

    expect(cssVar('volume')).toBeGreaterThan(0.3);
    expect(cssVar('mid')).toBeGreaterThan(cssVar('low'));
    expect(fixture.nativeElement.querySelectorAll('.ring').length).toBe(3);
  });

  it('stops and resets when recording ends', async () => {
    levels = {volume: 1, low: 1, mid: 1, high: 1};
    fixture.componentRef.setInput('isRecording', true);
    fixture.detectChanges();
    await nextFrame();

    fixture.componentRef.setInput('isRecording', false);
    fixture.detectChanges();

    expect(cssVar('volume')).toBe(0);
    expect(fixture.nativeElement.querySelector('.ring')).toBeNull();
  });
});
