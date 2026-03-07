import {Component, EventEmitter, Input, Output} from '@angular/core';

type ButtonSize = 'sm' | 'md' | 'lg';


@Component({
  selector: 'app-recording-button',
  imports: [],
  templateUrl: './recording-button.component.html',
  styleUrl: './recording-button.component.css'
})
export class RecordingButtonComponent {
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
      classes.push('bg-primary', 'animate-pulse-recording');
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
