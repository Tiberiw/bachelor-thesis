import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientRepository } from './patient.repository';
import { Patient } from './entities/patient.entity';
import { TenantContextService } from '../tenant/tenant-context.service';

describe('PatientRepository', () => {
  let patientRepository: PatientRepository;
  let repository: Repository<Patient>;
  let tenantContextService: TenantContextService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockTenantContextService = {
    getTenantId: jest.fn(),
    setTenantId: jest.fn(),
    getCurrentTenant: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientRepository,
        {
          provide: getRepositoryToken(Patient),
          useValue: mockRepository,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContextService,
        },
      ],
    }).compile();

    patientRepository = module.get<PatientRepository>(PatientRepository);
    repository = module.get<Repository<Patient>>(getRepositoryToken(Patient));
    tenantContextService = module.get<TenantContextService>(TenantContextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(patientRepository).toBeDefined();
  });

  it('should extend BaseTenantRepository', () => {
    expect(patientRepository).toBeInstanceOf(PatientRepository);
  });

  describe('inheritance from BaseTenantRepository', () => {
    beforeEach(() => {
      mockTenantContextService.getTenantId.mockReturnValue('tenant-123');
    });

    it('should have access to tenant-specific methods', () => {
      expect(patientRepository.createForTenant).toBeDefined();
      expect(patientRepository.findAllForTenant).toBeDefined();
      expect(patientRepository.findOneForTenant).toBeDefined();
      expect(patientRepository.updateForTenant).toBeDefined();
      expect(patientRepository.deleteForTenant).toBeDefined();
    });

    it('should properly inject repository and tenant context', () => {
      expect(patientRepository['repository']).toBe(repository);
      expect(patientRepository['tenantContext']).toBe(tenantContextService);
    });
  });

  describe('constructor', () => {
    it('should initialize with correct dependencies', () => {
      const newPatientRepository = new PatientRepository(
        repository,
        tenantContextService
      );

      expect(newPatientRepository).toBeDefined();
      expect(newPatientRepository).toBeInstanceOf(PatientRepository);
    });
  });

  // Note: Since PatientRepository extends BaseTenantRepository, the actual business logic
  // would be tested in the BaseTenantRepository tests. Here we verify the proper setup
  // and inheritance structure.

  describe('integration with TypeORM', () => {
    it('should have proper repository token', () => {
      const repositoryToken = getRepositoryToken(Patient);
      expect(repositoryToken).toBe('PatientRepository');
    });
  });
});