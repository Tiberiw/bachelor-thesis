import {Component, OnInit} from '@angular/core';
import {ShellComponent} from './shell/shell.component';
import {RouterOutlet} from '@angular/router';
import {AuthService} from '../auth/auth.service';

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
  constructor(private readonly authService: AuthService) {
  }

  ngOnInit(): void {
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
