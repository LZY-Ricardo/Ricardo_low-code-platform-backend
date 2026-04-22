import {
  ForbiddenException,
  GoneException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ShareService } from './share.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value: string) => `hashed:${value}`),
  compare: jest.fn(async (plain: string, hashed: string) => hashed === `hashed:${plain}`),
}));

describe('ShareService', () => {
  const prisma = {
    project: {
      findUnique: jest.fn(),
    },
    projectShare: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    projectCollaborator: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  let service: ShareService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ShareService(prisma as any);
  });

  it('creates share successfully', async () => {
    prisma.project.findUnique.mockResolvedValue({ userId: 'user_1' });
    prisma.projectShare.create.mockResolvedValue({
      id: 'share_1',
      shareToken: 'token_1',
      permission: 'view',
      expiresAt: null,
      password: null,
    });

    const result = await service.createShare('project_1', 'user_1', {
      permission: 'view',
    });

    expect(result.code).toBe(0);
    expect(result.data.shareToken).toBe('token_1');
  });

  it('accesses password protected share', async () => {
    prisma.projectShare.findUnique.mockResolvedValue({
      shareToken: 'token_1',
      isActive: true,
      expiresAt: null,
      password: 'hashed:abc123',
      permission: 'edit',
      project: { id: 'project_1' },
    });

    const result = await service.accessSharedProject('token_1', 'abc123');

    expect(result.data.permission).toBe('edit');
  });

  it('rejects wrong password', async () => {
    prisma.projectShare.findUnique.mockResolvedValue({
      shareToken: 'token_1',
      isActive: true,
      expiresAt: null,
      password: 'hashed:abc123',
      permission: 'edit',
      project: { id: 'project_1' },
    });

    await expect(service.accessSharedProject('token_1', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects expired share', async () => {
    prisma.projectShare.findUnique.mockResolvedValue({
      shareToken: 'token_1',
      isActive: true,
      expiresAt: new Date(Date.now() - 1000),
      password: null,
      permission: 'view',
      project: { id: 'project_1' },
    });

    await expect(service.accessSharedProject('token_1')).rejects.toBeInstanceOf(
      GoneException,
    );
  });

  it('adds collaborator for owner', async () => {
    prisma.project.findUnique.mockResolvedValue({ userId: 'owner_1' });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_2',
      username: 'alice',
      email: 'alice@example.com',
    });
    prisma.projectCollaborator.upsert.mockResolvedValue({
      id: 'collab_1',
      projectId: 'project_1',
      userId: 'user_2',
      role: 'editor',
    });

    const result = await service.addCollaborator('project_1', 'owner_1', {
      username: 'alice',
      role: 'editor',
    });

    expect(result.code).toBe(0);
    expect(result.data.role).toBe('editor');
  });

  it('rejects non-owner collaborator management', async () => {
    prisma.project.findUnique.mockResolvedValue({ userId: 'owner_1' });

    await expect(
      service.addCollaborator('project_1', 'other_user', {
        username: 'alice',
        role: 'viewer',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws not found when share missing', async () => {
    prisma.projectShare.findUnique.mockResolvedValue(null);

    await expect(service.accessSharedProject('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
