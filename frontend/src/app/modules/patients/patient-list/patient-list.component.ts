import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {Patient} from '../../../domain/patient';
import {PatientService} from '../../../services/patient.service';
import {debounceTime, distinctUntilChanged, Subject, takeUntil} from 'rxjs';
import {DatePipe} from '@angular/common';

@Component({
  selector: 'app-patient-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe
  ],
  templateUrl: './patient-list.component.html',
  styleUrl: './patient-list.component.css'
})
export class PatientListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  searchControl = new FormControl('');
  filteredPatients: Patient[] = [];
  allPatients: Patient[] = [];
  isLoading = false;

  // Skeleton array for loading state
  skeletonArray = Array(6).fill(0);

  constructor(private patientService: PatientService, private readonly router: Router) {
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.patientService.getAllPatients().subscribe(patients => {
      this.allPatients = patients;
      this.filteredPatients = patients;
      this.isLoading = false;
    });

    // Set up search functionality with debounce
    this.searchControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(query => {
        this.searchPatients(query || '');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private searchPatients(query: string): void {
    if (!query.trim()) {
      this.filteredPatients = this.allPatients;
      return;
    }
    const searchTerm = query.toLowerCase();

    this.filteredPatients = this.allPatients.filter(patient =>
      patient.firstName.toLowerCase().includes(searchTerm)
      || patient.lastName.toLowerCase().includes(searchTerm)
    );
  }

  selectPatient(patientId: string): void {
    this.router.navigate(['/home/patients', patientId]);
    // this.patientService.selectPatient(patientId);
  }
}
