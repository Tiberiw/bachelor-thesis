import {Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output} from '@angular/core';
import {AudioLevels, RecordingService} from '../../../services/recording.service';

type ButtonSize = 'sm' | 'md' | 'lg';


@Component({
  selector: 'app-recording-button',
  imports: [],
  templateUrl: './recording-button.component.html',
  styleUrl: './recording-button.component.css'
})
export class RecordingButtonComponent implements OnChanges, OnDestroy {
  @Input() isRecording: boolean = false;
  @Input() disabled: boolean = false;
  @Input() size: ButtonSize = 'lg';
  @Output() onClick = new EventEmitter<void>();

  // Define size classes
  sizeClasses: Record<ButtonSize, string> = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-28 w-28'
  };

  private frameId: number | null = null;
  private smoothed: AudioLevels = {volume: 0, low: 0, mid: 0, high: 0};

  constructor(
    private readonly recordingService: RecordingService,
    private readonly host: ElementRef<HTMLElement>,
    private readonly zone: NgZone,
  ) {}

  ngOnChanges(): void {
    if (this.isRecording) {
      this.startLevelAnimation();
    } else {
      this.stopLevelAnimation();
    }
  }

  ngOnDestroy(): void {
    this.stopLevelAnimation();
  }

  /**
   * Feeds the live microphone levels into CSS variables (--volume, --low, --mid, --high)
   * every frame. It runs outside Angular so it doesn't trigger change detection 60 times a second.
   */
  private startLevelAnimation(): void {
    if (this.frameId !== null) return;
    this.zone.runOutsideAngular(() => {
      const tick = () => {
        const levels = this.recordingService.getAudioLevels();
        for (const key of ['volume', 'low', 'mid', 'high'] as const) {
          // Rise quickly so loud sounds "pop", fall slowly so the rings settle smoothly.
          const rate = levels[key] > this.smoothed[key] ? 0.5 : 0.1;
          this.smoothed[key] += (levels[key] - this.smoothed[key]) * rate;
          this.host.nativeElement.style.setProperty(`--${key}`, this.smoothed[key].toFixed(3));
        }
        this.frameId = requestAnimationFrame(tick);
      };
      this.frameId = requestAnimationFrame(tick);
    });
  }

  private stopLevelAnimation(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.smoothed = {volume: 0, low: 0, mid: 0, high: 0};
    for (const key of ['volume', 'low', 'mid', 'high']) {
      this.host.nativeElement.style.removeProperty(`--${key}`);
    }
  }

  handleClick(): void {
    if (!this.disabled) {
      this.onClick.emit();
    }
  }

  getButtonClasses(): string {
    const classes = [
      'recording-button',
      'rounded-full',
      'flex',
      'items-center',
      'justify-center',
      'transition-all',
      'duration-300',
      'focus:outline-none',
      this.sizeClasses[this.size]
    ];

    if (this.isRecording) {
      classes.push('bg-primary');
    } else {
      classes.push('bg-primary');
    }

    if (this.disabled) {
      classes.push('opacity-50', 'cursor-not-allowed');
    }

    return classes.join(' ');
  }

  getAriaLabel(): string {
    return this.isRecording ? 'Stop recording' : 'Start recording';
  }
}
