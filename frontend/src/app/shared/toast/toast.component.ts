import { Component } from '@angular/core';
import {ToastService} from '../../services/toast.service';
import {AsyncPipe} from '@angular/common';
import { animate, state, style, transition, trigger } from '@angular/animations';


@Component({
  selector: 'app-toast',
  imports: [
    AsyncPipe
  ],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}

  onToastClick(): void {
    this.toastService.clickToast();
  }

  close(event: Event): void {
    event.stopPropagation();
    this.toastService.hide();
  }
}
