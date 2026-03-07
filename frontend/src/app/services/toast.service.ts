import { Injectable } from '@angular/core';
import {Router} from '@angular/router';
import {Toast, ToastConfig} from '../domain/toast';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  private showToast = new BehaviorSubject<boolean>(false);
  private toastMessage = new BehaviorSubject<string>('');
  private redirectUrl = new BehaviorSubject<string>('');

  showToast$ = this.showToast.asObservable();
  message$ = this.toastMessage.asObservable();
  redirectUrl$ = this.redirectUrl.asObservable();

  constructor(private router: Router) {}

  show(message: string, redirectUrl?: string): void {
    this.toastMessage.next(message);
    this.redirectUrl.next(redirectUrl || '');
    this.showToast.next(true);
  }

  hide(): void {
    this.showToast.next(false);
  }

  clickToast(): void {
    const url = this.redirectUrl.value;
    if (url) {
      this.router.navigate([url]).then(_ => this.hide());
    }
  }
}
