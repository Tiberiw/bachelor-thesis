import { Component } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {PatientService} from '../../../../services/patient.service';
import {Router} from '@angular/router';

interface PatientFormValues {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  email?: string;
  phone?: string;
}

@Component({
  selector: 'app-new-patient-form',
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: './new-patient-form.component.html',
  styleUrl: './new-patient-form.component.css'
})
export class NewPatientFormComponent {
  patientForm: FormGroup;
  isLoading = false;

  genderOptions = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' },
    { value: 'Prefer not to say', label: 'Prefer not to say' }
  ];

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
    // private toastService: ToastService,
    private router: Router
  ) {
    this.patientForm = this.createForm();
  }

  ngOnInit(): void {
    // Any initialization logic if needed
  }

  private createForm(): FormGroup {
    return this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(3)]],
      lastName: ['', [Validators.required, Validators.minLength(3)]],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      email: ['', [Validators.email]],
      phone: ['', [Validators.minLength(10)]]
    });
  }

  // Getters for form controls
  get firstName() {
    return this.patientForm.get('firstName');
  }

  get lastName() {
    return this.patientForm.get('lastName');
  }

  get dob() {
    return this.patientForm.get('dob');
  }

  get gender() {
    return this.patientForm.get('gender');
  }

  get email() {
    return this.patientForm.get('email');
  }

  get phone() {
    return this.patientForm.get('phone');
  }

  // Get error message for a specific field
  getErrorMessage(fieldName: string): string {
    const control = this.patientForm.get(fieldName);

    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }

    if (control.errors['minlength']) {
      const minLength = control.errors['minlength'].requiredLength;
      return `${this.getFieldLabel(fieldName)} must be at least ${minLength} characters`;
    }

    if (control.errors['email']) {
      return 'Please enter a valid email address';
    }

    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      dob: 'Date of birth',
      gender: 'Gender',
      email: 'Email',
      phone: 'Phone number'
    };
    return labels[fieldName] || fieldName;
  }

  async onSubmit(): Promise<void> {
    if (this.patientForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.patientForm.controls).forEach(key => {
        this.patientForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    const values: PatientFormValues = this.patientForm.value;
    console.log('Form submitted with values:', values);
    try {
      // Create patient object with proper typing
      await this.patientService.createPatient({
        firstName: values.firstName,
        lastName: values.lastName,
        dob: values.dob,
        email: values.email || undefined,
        phone: values.phone || undefined,
        gender: values.gender,
      });

      // this.toastService.success('Patient added successfully');
      this.router.navigate(['/home/patients']);
    } catch (error) {
      console.error('Failed to add patient:', error);
      // this.toastService.error('Failed to add patient. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  cancel(): void {
    this.router.navigate(['/home/patients']);
  }

  private generateMedicalRecordNumber(): string {
    // Generate a unique medical record number
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `MRN${timestamp}${random}`;
  }
}
