import {Component, OnInit} from '@angular/core';
import {User} from '../../auth/user';
import {AuthService} from '../../auth/auth.service';
import {PatientListComponent} from './patient-list/patient-list.component';

@Component({
  selector: 'app-patients',
  imports: [
    PatientListComponent
  ],
  templateUrl: './patients.component.html',
  styleUrl: './patients.component.css'
})
export class PatientsComponent implements OnInit {
  currentUser: User | null = null;

  constructor(private authService: AuthService) {
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }
}
