import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ComponentsService } from './components.service';

describe('ComponentsService', () => {
  const prisma = {
    customComponent: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    marketLike: {
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    marketReview: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  let service: ComponentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ComponentsService(prisma as any);
  });

  it('creates custom component', async () => {
    prisma.customComponent.count.mockResolvedValue(0);
    prisma.customComponent.create.mockResolvedValue({ id: 'cmp_1', name: 'StarRate' });

    const result = await service.create('user_1', {
      name: 'StarRate',
      code: 'const a = 1;',
      setterConfig: [],
      defaultProps: {},
      isPublic: true,
    });

    expect(result.code).toBe(0);
    expect(prisma.customComponent.create).toHaveBeenCalled();
  });

  it('rejects unsafe code', async () => {
    await expect(
      service.create('user_1', {
        name: 'Bad',
        code: 'window.alert(1)',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('increments downloads on install', async () => {
    prisma.customComponent.findUnique.mockResolvedValue({ id: 'cmp_1' });
    prisma.customComponent.update.mockResolvedValue({ id: 'cmp_1', downloads: 1 });

    const result = await service.install('cmp_1');

    expect(result.code).toBe(0);
    expect(prisma.customComponent.update).toHaveBeenCalled();
  });

  it('forbids deleting others component', async () => {
    prisma.customComponent.findUnique.mockResolvedValue({ id: 'cmp_1', userId: 'other' });

    await expect(service.remove('cmp_1', 'user_1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
