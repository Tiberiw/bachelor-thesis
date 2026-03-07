import {Routes} from '@angular/router';
import {PatientsComponent} from '../modules/patients/patients.component';
import {RecordingComponent} from '../modules/recording/recording.component';
import {HomeComponent} from './home.component';
import {NewRecordingComponent} from '../modules/recording/new-recording/new-recording.component';
import {TranscriptionComponent} from '../modules/transcription/transcription.component';
import {NewPatientComponent} from '../modules/patients/new-patient/new-patient.component';
import {PatientDetailComponent} from '../modules/patients/patient-detail/patient-detail.component';

export const HOME_ROUTES: Routes = [
  {
    path: '',
    component: PatientsComponent
  },
  {
    path: 'patients',
    component: PatientsComponent
  },
  {
    path: 'patients/new-patient',
    component: NewPatientComponent,
  },
  {
    path: 'patients/:id',
    component: PatientDetailComponent,
  },
  {
    path: 'new-recording',
    component: NewRecordingComponent
  },
  {
    path: 'recording',
    component: RecordingComponent
  },
  {
    path: 'transcription/:id',
    component: TranscriptionComponent
  }
];
