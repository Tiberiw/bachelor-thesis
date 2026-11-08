import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {RouterOutlet} from '@angular/router';
import {ToastComponent} from './shared/toast/toast.component';
import {environment} from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'frontend';

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    // The free back-end (and the ASR service behind it) sleeps when idle.
    // Wake it now so it's ready by the time the user signs in.
    this.http.get(`${environment.apiUrl}/health`).subscribe({error: () => undefined});
  }
}
