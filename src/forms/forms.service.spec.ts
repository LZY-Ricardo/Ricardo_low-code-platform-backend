import {
  BadRequestException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { FormsService } from './forms.service';

describe('FormsService', () => {
  const prisma = {
    project: {
      findUnique: jest.fn(),
    },
    formSchema: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    formRecord: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let service: FormsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FormsService(prisma as any);
  });

  it('creates form schema successfully', async () => {
    prisma.project.findUnique.mockResolvedValue({ userId: 'user_1' });
    prisma.formSchema.create.mockResolvedValue({
      id: 'form_1',
      name: '反馈表',
      fields: [],
    });

    const result = await service.create('user_1', {
      name: '反馈表',
      fields: [{ key: 'name', label: '姓名', type: 'text', required: true }],
      projectId: 'project_1',
    });

    expect(result.code).toBe(0);
    expect(prisma.formSchema.create).toHaveBeenCalled();
  });

  it('submits a valid form and increments submissions', async () => {
    prisma.formSchema.findUnique.mockResolvedValue({
      id: 'form_1',
      isActive: true,
      fields: [{ key: 'name', required: true, type: 'text' }],
    });
    prisma.formRecord.count.mockResolvedValue(0);
    prisma.formRecord.create.mockResolvedValue({ id: 'record_1' });

    const result = await service.submit(
      'form_1',
      { name: '张三' },
      '127.0.0.1',
      'Mozilla',
    );

    expect(result.code).toBe(0);
    expect(prisma.formSchema.update).toHaveBeenCalled();
  });

  it('rejects missing required field', async () => {
    prisma.formSchema.findUnique.mockResolvedValue({
      id: 'form_1',
      isActive: true,
      fields: [{ key: 'name', required: true, type: 'text' }],
    });

    await expect(service.submit('form_1', {}, '127.0.0.1', 'Mozilla')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects frequent submissions from same ip', async () => {
    prisma.formSchema.findUnique.mockResolvedValue({
      id: 'form_1',
      isActive: true,
      fields: [{ key: 'name', required: false, type: 'text' }],
    });
    prisma.formRecord.count.mockResolvedValue(5);

    await expect(
      service.submit('form_1', { name: '张三' }, '127.0.0.1', 'Mozilla'),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('returns stats including trend and field distribution', async () => {
    prisma.formSchema.findUnique.mockResolvedValue({
      id: 'form_1',
      userId: 'user_1',
      fields: [{ key: 'name', type: 'text' }],
      submissions: 2,
    });
    prisma.formRecord.count.mockResolvedValue(1);
    prisma.formRecord.findMany
      .mockResolvedValueOnce([
        {
          submittedAt: new Date('2026-04-21T10:00:00.000Z'),
          data: { name: '张三' },
        },
      ])
      .mockResolvedValueOnce([
        {
          submittedAt: new Date('2026-04-21T10:00:00.000Z'),
          data: { name: '张三' },
        },
        {
          submittedAt: new Date('2026-04-20T10:00:00.000Z'),
          data: { name: '李四' },
        },
      ]);

    const result = await service.getStats('form_1', 'user_1');

    expect(result.data.totalSubmissions).toBe(2);
    expect(result.data.fieldDistribution.name.uniqueValues).toBe(2);
  });

  it('exports csv rows', async () => {
    prisma.formSchema.findUnique.mockResolvedValue({
      id: 'form_1',
      userId: 'user_1',
      fields: [{ key: 'name', type: 'text' }],
    });
    prisma.formRecord.findMany.mockResolvedValue([
      {
        submittedAt: new Date('2026-04-21T10:00:00.000Z'),
        data: { name: '张三' },
      },
    ]);

    const csv = await service.exportCSV('form_1', 'user_1');

    expect(csv).toContain('submittedAt,name');
    expect(csv).toContain('"张三"');
  });

  it('forbids access to another users form', async () => {
    prisma.formSchema.findUnique.mockResolvedValue({
      id: 'form_1',
      userId: 'other_user',
    });

    await expect(service.findOne('form_1', 'user_1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
