import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TrashService } from './trash.service';

describe('TrashService', () => {
  const prisma = {
    project: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  let service: TrashService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TrashService(prisma as any);
  });

  it('lists deleted projects', async () => {
    prisma.project.findMany.mockResolvedValue([{ id: 'project_1', deletedAt: new Date() }]);
    prisma.project.count.mockResolvedValue(1);

    const result = await service.list('user_1');

    expect(result.data.projects).toHaveLength(1);
    expect(result.data.pagination.total).toBe(1);
  });

  it('restores deleted project', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project_1',
      userId: 'user_1',
      deletedAt: new Date(),
    });
    prisma.project.update.mockResolvedValue({
      id: 'project_1',
      deletedAt: null,
    });

    const result = await service.restore('project_1', 'user_1');

    expect(result.code).toBe(0);
    expect(prisma.project.update).toHaveBeenCalled();
  });

  it('permanently deletes project in trash', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project_1',
      userId: 'user_1',
      deletedAt: new Date(),
    });

    const result = await service.permanentDelete('project_1', 'user_1');

    expect(result.code).toBe(0);
    expect(prisma.project.delete).toHaveBeenCalled();
  });

  it('rejects restore for other user', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project_1',
      userId: 'other_user',
      deletedAt: new Date(),
    });

    await expect(service.restore('project_1', 'user_1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects restore when project not in trash', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project_1',
      userId: 'user_1',
      deletedAt: null,
    });

    await expect(service.restore('project_1', 'user_1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
