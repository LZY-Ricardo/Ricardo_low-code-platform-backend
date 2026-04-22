import { LogsService } from './logs.service';

describe('LogsService', () => {
  const prisma = {
    operationLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  let service: LogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LogsService(prisma as any);
  });

  it('returns paginated logs with filters', async () => {
    prisma.operationLog.findMany.mockResolvedValue([
      {
        id: 'log_1',
        userId: 'user_1',
        action: 'project.create',
        resource: 'project',
        resourceId: 'project_1',
        detail: null,
        ip: '127.0.0.1',
        userAgent: 'Mozilla',
        createdAt: new Date('2026-04-21T10:00:00.000Z'),
      },
    ]);
    prisma.operationLog.count.mockResolvedValue(1);

    const result = await service.findAll('user_1', {
      page: 1,
      pageSize: 20,
      action: 'project.create',
      resource: 'project',
    });

    expect(prisma.operationLog.findMany).toHaveBeenCalled();
    expect(result.data.logs).toHaveLength(1);
    expect(result.data.pagination.total).toBe(1);
  });
});
