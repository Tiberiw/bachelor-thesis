import { Injectable } from '@angular/core';
import {Patient} from '../domain/patient';
import {BehaviorSubject, firstValueFrom, Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PatientService {

  private readonly apiUrl = 'http://localhost:3000/api/patient';

  // State management
  private patientsSubject = new BehaviorSubject<Patient[]>([]);
  private selectedPatientSubject = new BehaviorSubject<Patient | null>(null);

  // Observables
  public patients$ = this.patientsSubject.asObservable();
  public selectedPatient$ = this.selectedPatientSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    this.loadPatients();
  }

  private async loadPatients(): Promise<void> {
    try {
      const patients = await firstValueFrom(this.getAllPatients());
      this.patientsSubject.next(patients);
    } catch (error) {
      console.error('Error loading patients:', error);
      this.patientsSubject.next([]);
    }
  }

  getAllPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.apiUrl);
  }

  async createPatient(patient: Patient): Promise<Patient> {
    try {
      const newPatient = await firstValueFrom(
        this.http.post<Patient>(this.apiUrl, patient)
      );

      const currentPatients = this.patientsSubject.value;
      this.patientsSubject.next([...currentPatients, newPatient]);
      return newPatient;
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  }

}
