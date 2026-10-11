import { Injectable, Scope } from "@nestjs/common";

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private doctorId: string;

  setDoctorId(doctorId: string): void {
    this.doctorId = doctorId;
  }

  getDoctorId(): string {
    if (!this.doctorId) {
      throw new Error("Doctor ID is not set in the tenant context.");
    }
    return this.doctorId;
  }

  hasDoctorId(): boolean {
    return !!this.doctorId;
  }
}
