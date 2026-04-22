import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FilesService } from './files.service';

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn(),
  unlink: jest.fn(),
  writeFile: jest.fn(),
}));

describe('FilesService', () => {
  const prisma = {
    fileAsset: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
  };

  let service: FilesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FilesService(prisma as any);
  });

  it('uploads a valid png file', async () => {
    prisma.fileAsset.create.mockResolvedValue({
      id: 'file_1',
      fileName: 'hash_1.png',
      originalName: 'demo.png',
      mimeType: 'image/png',
      fileSize: 68,
      url: '/uploads/hash_1.png',
      userId: 'user_1',
      projectId: null,
      createdAt: new Date('2026-04-21T10:00:00.000Z'),
    });

    const result = await service.upload('user_1', {
      originalname: 'demo.png',
      mimetype: 'image/png',
      size: 68,
      buffer: Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
      ]),
    });

    expect(prisma.fileAsset.create).toHaveBeenCalled();
    expect(result.code).toBe(0);
    expect(result.data.type).toBe('image');
  });

  it('rejects unsupported file types', async () => {
    await expect(
      service.upload('user_1', {
        originalname: 'evil.exe',
        mimetype: 'application/x-msdownload',
        size: 32,
        buffer: Buffer.from('MZ'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns paginated files', async () => {
    prisma.fileAsset.findMany.mockResolvedValue([
      {
        id: 'file_1',
        fileName: 'hash_1.png',
        originalName: 'demo.png',
        mimeType: 'image/png',
        fileSize: 68,
        url: '/uploads/hash_1.png',
        userId: 'user_1',
        projectId: null,
        createdAt: new Date('2026-04-21T10:00:00.000Z'),
      },
    ]);
    prisma.fileAsset.count.mockResolvedValue(1);

    const result = await service.findAll('user_1', {
      page: 1,
      pageSize: 20,
      type: 'image',
    });

    expect(result.data.files).toHaveLength(1);
    expect(result.data.pagination.total).toBe(1);
  });

  it('throws forbidden when deleting another user file', async () => {
    prisma.fileAsset.findUnique.mockResolvedValue({
      id: 'file_1',
      fileName: 'hash_1.png',
      userId: 'other_user',
    });

    await expect(service.remove('user_1', 'file_1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws not found for missing file', async () => {
    prisma.fileAsset.findUnique.mockResolvedValue(null);

    await expect(service.remove('user_1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
