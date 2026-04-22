import { ForbiddenException } from '@nestjs/common';
import { MarketTemplatesService } from './templates.service';

describe('MarketTemplatesService', () => {
  const prisma = {
    marketTemplate: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    marketLike: {
      count: jest.fn(),
      groupBy: jest.fn(),
      deleteMany: jest.fn(),
    },
    marketReview: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  let service: MarketTemplatesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MarketTemplatesService(prisma as any);
  });

  it('creates market template', async () => {
    prisma.marketTemplate.count.mockResolvedValue(0);
    prisma.marketTemplate.create.mockResolvedValue({ id: 'tpl_1', name: 'Landing' });

    const result = await service.create('user_1', {
      name: 'Landing',
      components: [],
      pages: [],
      dataSources: {},
      variables: {},
      sharedStyles: [],
      isPublic: true,
    });

    expect(result.code).toBe(0);
  });

  it('increments use count', async () => {
    prisma.marketTemplate.findUnique.mockResolvedValue({ id: 'tpl_1' });
    prisma.marketTemplate.update.mockResolvedValue({ id: 'tpl_1', useCount: 1 });

    const result = await service.useTemplate('tpl_1');

    expect(result.code).toBe(0);
    expect(prisma.marketTemplate.update).toHaveBeenCalled();
  });

  it('forbids removing others template', async () => {
    prisma.marketTemplate.findUnique.mockResolvedValue({ id: 'tpl_1', userId: 'other' });

    await expect(service.remove('tpl_1', 'user_1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('decorates public templates with quality stats', async () => {
    prisma.marketTemplate.findMany.mockResolvedValue([
      { id: 'tpl_1', name: 'Landing', isPublic: true, status: 'active' },
    ]);
    prisma.marketTemplate.count.mockResolvedValue(1);
    prisma.marketLike.groupBy.mockResolvedValue([{ targetId: 'tpl_1', _count: { _all: 8 } }]);
    prisma.marketReview.groupBy.mockResolvedValue([
      { targetId: 'tpl_1', _count: { _all: 4 }, _avg: { rating: 4.75 } },
    ]);

    const result = await service.findPublic({});

    expect(result.data.templates[0]).toMatchObject({
      id: 'tpl_1',
      likeCount: 8,
      reviewCount: 4,
      avgRating: 4.75,
    });
  });
});
