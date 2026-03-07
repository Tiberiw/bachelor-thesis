import { Component } from '@angular/core';
import {NewPatientFormComponent} from './new-patient-form/new-patient-form.component';

@Component({
  selector: 'app-new-patient',
  imports: [
    NewPatientFormComponent
  ],
  templateUrl: './new-patient.component.html',
  styleUrl: './new-patient.component.css'
})
export class NewPatientComponent {

}
