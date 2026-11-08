import {Component, OnInit} from '@angular/core';
import {ShellComponent} from './shell/shell.component';
import {RouterOutlet} from '@angular/router';
import {AuthService} from '../auth/auth.service';
import {TranscriptionWatcherService} from '../services/transcription-watcher.service';

@Component({
  selector: 'app-home',
  imports: [
    ShellComponent,
    RouterOutlet
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  constructor(
    private readonly authService: AuthService,
    private readonly transcriptionWatcher: TranscriptionWatcherService,
  ) {
  }

  ngOnInit(): void {
    // Keep waiting on transcriptions that were still running before a page refresh.
    this.transcriptionWatcher.resume();

    this.authService.getCurrentUser().subscribe(
      user => {
        console.log("Current user:", user);
      },
      error => {
        console.error("Error fetching current user:", error);
      }
    )
  }

}
