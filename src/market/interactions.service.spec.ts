import { BadRequestException } from '@nestjs/common';
import { InteractionsService } from './interactions.service';

describe('InteractionsService', () => {
  const prisma = {
    customComponent: {
      findUnique: jest.fn(),
    },
    marketTemplate: {
      findUnique: jest.fn(),
    },
    marketLike: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    marketReview: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  let service: InteractionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InteractionsService(prisma as any);
  });

  it('toggles like on', async () => {
    prisma.customComponent.findUnique.mockResolvedValue({ id: 'cmp_1' });
    prisma.marketLike.findFirst.mockResolvedValue(null);
    prisma.marketLike.count.mockResolvedValue(1);

    const result = await service.toggleLike('user_1', 'component', 'cmp_1');

    expect(result.data.liked).toBe(true);
    expect(result.data.count).toBe(1);
  });

  it('creates review', async () => {
    prisma.customComponent.findUnique.mockResolvedValue({ id: 'cmp_1' });
    prisma.marketReview.findFirst.mockResolvedValue(null);
    prisma.marketReview.create.mockResolvedValue({ id: 'rev_1', rating: 5 });

    const result = await service.createReview('user_1', {
      targetType: 'component',
      targetId: 'cmp_1',
      rating: 5,
      content: '很好',
    });

    expect(result.code).toBe(0);
  });

  it('rejects invalid rating', async () => {
    prisma.customComponent.findUnique.mockResolvedValue({ id: 'cmp_1' });

    await expect(
      service.createReview('user_1', {
        targetType: 'component',
        targetId: 'cmp_1',
        rating: 6,
        content: 'bad',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
