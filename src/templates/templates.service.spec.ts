import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TemplatesService } from './templates.service';

describe('TemplatesService', () => {
  const prisma = {
    template: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  let service: TemplatesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TemplatesService(prisma as any);
  });

  it('returns built-in templates and mine when authenticated', async () => {
    prisma.template.findMany.mockResolvedValue([
      { id: 'tpl_dashboard', builtIn: true, userId: null },
      { id: 'tpl_custom', builtIn: false, userId: 'user_1' },
    ]);
    prisma.template.count.mockResolvedValue(2);

    const result = await service.findAll({ page: 1, pageSize: 12 }, 'user_1');

    expect(prisma.template.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ builtIn: true }, { userId: 'user_1' }],
        },
      }),
    );
    expect(result.data.templates).toHaveLength(2);
    expect(result.data.pagination.total).toBe(2);
  });

  it('returns only mine when mine filter is enabled', async () => {
    prisma.template.findMany.mockResolvedValue([{ id: 'tpl_custom', builtIn: false, userId: 'user_1' }]);
    prisma.template.count.mockResolvedValue(1);

    await service.findAll({ mine: true, page: 1, pageSize: 12 }, 'user_1');

    expect(prisma.template.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user_1',
        },
      }),
    );
  });

  it('creates template with array defaults', async () => {
    prisma.template.count.mockResolvedValue(0);
    prisma.template.create.mockResolvedValue({ id: 'tpl_new' });

    await service.create('user_1', {
      name: '新模板',
      components: [],
    } as any);

    expect(prisma.template.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pages: [],
          dataSources: [],
          sharedStyles: [],
          variables: {},
        }),
      }),
    );
  });

  it('forbids updating built-in template', async () => {
    prisma.template.findUnique.mockResolvedValue({
      id: 'tpl_dashboard',
      builtIn: true,
      userId: null,
    });

    await expect(service.update('user_1', 'tpl_dashboard', {} as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('increments use count for existing template', async () => {
    prisma.template.findUnique.mockResolvedValue({ id: 'tpl_dashboard' });
    prisma.template.update.mockResolvedValue({ id: 'tpl_dashboard', useCount: 3 });

    const result = await service.incrementUseCount('tpl_dashboard');

    expect(prisma.template.update).toHaveBeenCalledWith({
      where: { id: 'tpl_dashboard' },
      data: { useCount: { increment: 1 } },
    });
    expect(result.code).toBe(0);
  });

  it('throws when incrementing missing template', async () => {
    prisma.template.findUnique.mockResolvedValue(null);

    await expect(service.incrementUseCount('tpl_missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
