import { Injectable } from '@angular/core';
import {io, Socket} from 'socket.io-client';
import {AuthService} from '../auth/auth.service';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket;

  constructor(private authService: AuthService) {
    const token = this.authService.getToken();
    this.socket = io('http://localhost:3000', {
      auth: { token }
    });
  }

  createTranscription(data: any): Observable<any> {
    return new Observable(observer => {
      this.socket.once('transcriptionCreated', (response) => {
        observer.next({ type: 'created', data: response });
      });

      this.socket.once('transcriptionCompleted', (result) => {
        observer.next({ type: 'completed', data: result });
        observer.complete();
      });

      this.socket.once('transcriptionError', (error) => {
        observer.error(error);
      });

      this.socket.emit('createTranscription', data);
    });
  }
}
