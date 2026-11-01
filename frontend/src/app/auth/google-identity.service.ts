import { Injectable } from '@angular/core';
import { GOOGLE_CLIENT_ID } from './google-client-id';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private scriptPromise?: Promise<void>;

  private loadScript(): Promise<void> {
    this.scriptPromise ??= new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        this.scriptPromise = undefined;
        reject(new Error('Failed to load Google sign-in'));
      };
      document.head.appendChild(script);
    });
    return this.scriptPromise;
  }

  async renderButton(host: HTMLElement, onCredential: (credential: string) => void): Promise<void> {
    await this.loadScript();
    const google = (window as any).google;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: { credential: string }) => onCredential(response.credential),
    });
    google.accounts.id.renderButton(host, { theme: 'outline', size: 'large', text: 'signin_with', width: 320 });
  }
}
