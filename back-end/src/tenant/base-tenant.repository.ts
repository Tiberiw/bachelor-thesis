import { TenantEntity } from './entities/tenant.entity';
import { DeepPartial, FindManyOptions, FindOneOptions, FindOptionsWhere, Repository } from 'typeorm';
import { TenantContextService } from './tenant-context.service';
import { NotFoundException } from '@nestjs/common';

export abstract class BaseTenantRepository<T extends TenantEntity> {

  constructor(protected readonly repository: Repository<T>, protected readonly tenantContext: TenantContextService) {}

  private applyTenantFilter(conditions: FindOptionsWhere<T> | FindOptionsWhere<T>[]): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    const doctorId = this.tenantContext.getDoctorId();
    if (Array.isArray(conditions)) {
      return conditions.map(condition => ({
        ...condition,
        doctorId,
      }));
    }
    return {
      ...conditions,
      doctorId,
    };
  }

  async findAllForTenant(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find({
      ...options,
      where: this.applyTenantFilter(options?.where || {}),
    });
  }

  async findOneForTenant(id: string, options?: FindOneOptions<T>): Promise<T> {
    const doctorId = this.tenantContext.getDoctorId();
    const entity = await this.repository.findOne({
      ...options,
      where: {
        id,
        doctorId,
        ...(options?.where || {}),
      } as FindOptionsWhere<T>,
    });
    if (!entity) {
      throw new NotFoundException('Resource not found');
    }
    return entity;
  }

  async createForTenant(entityData: DeepPartial<T>): Promise<T> {
    const doctorId = this.tenantContext.getDoctorId();
    const entity = this.repository.create({
      ...entityData,
      doctorId,
    });
    return this.repository.save(entity);
  }

  async updateForTenant(id: string, entityData: DeepPartial<T>): Promise<T> {
    const entity = await this.findOneForTenant(id);
    Object.assign(entity, entityData);
    entity.doctorId = this.tenantContext.getDoctorId();
    return this.repository.save(entity);
  }

  async deleteForTenant(id: string): Promise<void> {
    const entity = await this.findOneForTenant(id);
    await this.repository.remove(entity);
  }
}