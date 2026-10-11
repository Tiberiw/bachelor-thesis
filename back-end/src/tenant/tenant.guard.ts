import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenantContext: TenantContextService) {}


  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    console.log(request);
    const doctorId: string = request.user?.id as string;
    if (!doctorId) {
      throw new UnauthorizedException('No tenant context found');
    }
    this.tenantContext.setDoctorId(doctorId);
    return true;
  }
}
