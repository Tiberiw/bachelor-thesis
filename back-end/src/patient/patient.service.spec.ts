import { Test, TestingModule } from '@nestjs/testing';
import { PatientService } from './patient.service';
import { PatientRepository } from './patient.repository';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Patient } from './entities/patient.entity';

describe('PatientService', () => {
  let service: PatientService;
  let repository: PatientRepository;

  const mockPatientRepository = {
    createForTenant: jest.fn(),
    findAllForTenant: jest.fn(),
    findOneForTenant: jest.fn(),
    updateForTenant: jest.fn(),
    deleteForTenant: jest.fn(),
  };

  const mockPatient: Patient = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    doctorId: 'doctor-123',
    firstName: 'John',
    lastName: 'Doe',
    dob: '1990-01-01',
    phone: '+1234567890',
    email: 'john.doe@example.com',
    gender: 'male',
    lastVisit: new Date('2023-12-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        {
          provide: PatientRepository,
          useValue: mockPatientRepository,
        },
      ],
    }).compile();

    service = module.get<PatientService>(PatientService);
    repository = module.get<PatientRepository>(PatientRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a patient successfully', async () => {
      const createPatientDto: CreatePatientDto = {
        firstName: 'John',
        lastName: 'Doe',
        dob: '1990-01-01',
        phone: '+1234567890',
        email: 'john.doe@example.com',
        gender: 'male',
      };

      const expectedPatient = { ...mockPatient };
      mockPatientRepository.createForTenant.mockResolvedValue(expectedPatient);

      const result = await service.create(createPatientDto);

      expect(repository.createForTenant).toHaveBeenCalledWith({
        ...createPatientDto,
        lastVisit: expect.any(Date),
      });
      expect(result).toEqual(expectedPatient);
    });

    it('should set lastVisit to current date when creating', async () => {
      const createPatientDto: CreatePatientDto = {
        firstName: 'John',
        lastName: 'Doe',
        dob: '1990-01-01',
        phone: '+1234567890',
        email: 'john.doe@example.com',
        gender: 'male',
      };

      const dateSpy = jest.spyOn(global, 'Date').mockImplementation(() => new Date('2023-12-15') as any);

      await service.create(createPatientDto);

      expect(repository.createForTenant).toHaveBeenCalledWith({
        ...createPatientDto,
        lastVisit: new Date('2023-12-15'),
      });

      dateSpy.mockRestore();
    });
  });

  describe('findAll', () => {
    it('should return all patients for tenant', async () => {
      const patients = [mockPatient, { ...mockPatient, id: 'another-id' }];
      mockPatientRepository.findAllForTenant.mockResolvedValue(patients);

      const result = await service.findAll();

      expect(repository.findAllForTenant).toHaveBeenCalled();
      expect(result).toEqual(patients);
    });

    it('should return empty array when no patients found', async () => {
      mockPatientRepository.findAllForTenant.mockResolvedValue([]);

      const result = await service.findAll();

      expect(repository.findAllForTenant).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a patient by id', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      mockPatientRepository.findOneForTenant.mockResolvedValue(mockPatient);

      const result = await service.findOne(patientId);

      expect(repository.findOneForTenant).toHaveBeenCalledWith(patientId);
      expect(result).toEqual(mockPatient);
    });

    it('should return null when patient not found', async () => {
      const patientId = 'non-existent-id';
      mockPatientRepository.findOneForTenant.mockResolvedValue(null);

      const result = await service.findOne(patientId);

      expect(repository.findOneForTenant).toHaveBeenCalledWith(patientId);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a patient successfully', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const updatePatientDto: UpdatePatientDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+0987654321',
        dob: '1985-05-15',
        gender: 'female',
      };

      const updatedPatient = { ...mockPatient, ...updatePatientDto };
      mockPatientRepository.updateForTenant.mockResolvedValue(updatedPatient);

      const result = await service.update(patientId, updatePatientDto);

      expect(repository.updateForTenant).toHaveBeenCalledWith(patientId, updatePatientDto);
      expect(result).toEqual(updatedPatient);
    });

    it('should handle partial updates', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      const updatePatientDto: Partial<UpdatePatientDto> = {
        firstName: 'Jane',
        email: 'jane.doe@example.com',
      };

      const updatedPatient = { ...mockPatient, ...updatePatientDto };
      mockPatientRepository.updateForTenant.mockResolvedValue(updatedPatient);

      const result = await service.update(patientId, updatePatientDto as UpdatePatientDto);

      expect(repository.updateForTenant).toHaveBeenCalledWith(patientId, updatePatientDto);
      expect(result).toEqual(updatedPatient);
    });
  });

  describe('remove', () => {
    it('should remove a patient successfully', async () => {
      const patientId = '123e4567-e89b-12d3-a456-426614174000';
      mockPatientRepository.deleteForTenant.mockResolvedValue({ affected: 1 });

      const result = await service.remove(patientId);

      expect(repository.deleteForTenant).toHaveBeenCalledWith(patientId);
      expect(result).toEqual({ affected: 1 });
    });

    it('should handle removal of non-existent patient', async () => {
      const patientId = 'non-existent-id';
      mockPatientRepository.deleteForTenant.mockResolvedValue({ affected: 0 });

      const result = await service.remove(patientId);

      expect(repository.deleteForTenant).toHaveBeenCalledWith(patientId);
      expect(result).toEqual({ affected: 0 });
    });
  });
});