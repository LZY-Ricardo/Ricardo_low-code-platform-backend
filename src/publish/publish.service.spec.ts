import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PublishService } from './publish.service';

describe('PublishService', () => {
  const prisma = {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    publishedPage: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  const htmlGenerator = {
    generateHTML: jest.fn(() => '<!DOCTYPE html><html></html>'),
  };

  let service: PublishService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PublishService(prisma as any, htmlGenerator as any);
  });

  it('publishes first version successfully', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project_1',
      name: 'Demo',
      components: [{ name: 'Page', props: {} }],
      publishUrl: null,
      userId: 'user_1',
    });
    prisma.publishedPage.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.publishedPage.create.mockResolvedValue({
      id: 'pub_1',
      version: 1,
      publishUrl: 'demo-abcd',
      status: 'active',
      publishedBy: 'user_1',
      createdAt: new Date('2026-04-21T10:00:00.000Z'),
    });

    const result = await service.publish('project_1', 'user_1', {});

    expect(result.code).toBe(0);
    expect(result.data.version).toBe(1);
    expect(prisma.project.update).toHaveBeenCalled();
  });

  it('throws conflict for slug already used by another project', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project_1',
      name: 'Demo',
      components: [],
      publishUrl: null,
      userId: 'user_1',
    });
    prisma.publishedPage.findFirst.mockResolvedValue({
      id: 'pub_conflict',
    });

    await expect(
      service.publish('project_1', 'user_1', { slug: 'same-slug' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws forbidden for another users project', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project_1',
      userId: 'other_user',
    });

    await expect(service.publish('project_1', 'user_1', {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rolls back to target version and creates a new version', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project_1',
      name: 'Demo',
      components: [],
      publishUrl: 'demo',
      userId: 'user_1',
    });
    prisma.publishedPage.findFirst
      .mockResolvedValueOnce({
        id: 'v1',
        projectId: 'project_1',
        publishUrl: 'demo',
        title: 'T1',
        description: 'D1',
        components: [{ name: 'Page', props: {} }],
      })
      .mockResolvedValueOnce({ version: 2 });
    prisma.publishedPage.create.mockResolvedValue({
      id: 'v3',
      version: 3,
      publishUrl: 'demo',
    });

    const result = await service.rollback('project_1', 'v1', 'user_1');

    expect(prisma.project.update).toHaveBeenCalled();
    expect(result.data.version).toBe(3);
  });

  it('returns latest active published page', async () => {
    prisma.publishedPage.findFirst.mockResolvedValue({
      htmlContent:
        '<!DOCTYPE html><html><body><script>const api="__LOWCODE_API_V1_BASE__";</script></body></html>',
      title: 'Demo',
      description: 'Desc',
    });

    const result = await service.getPublishedPage('demo', 'http://localhost:3000');

    expect(result.data.title).toBe('Demo');
    expect(result.data.html).toContain('http://localhost:3000/api/v1');
  });

  it('throws not found when published page missing', async () => {
    prisma.publishedPage.findFirst.mockResolvedValue(null);

    await expect(service.getPublishedPage('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
