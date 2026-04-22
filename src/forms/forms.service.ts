import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormDto } from './dto/create-form.dto';
import { QueryFormRecordsDto } from './dto/query-form-records.dto';
import { UpdateFormDto } from './dto/update-form.dto';

type FormField = {
  key: string;
  label?: string;
  type?: string;
  required?: boolean;
  options?: string[];
};

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFormDto) {
    await this.ensureProjectOwnership(userId, dto.projectId);
    this.validateFields(dto.fields);

    const form = await this.prisma.formSchema.create({
      data: {
        name: dto.name,
        description: dto.description || '',
        fields: dto.fields as Prisma.InputJsonValue,
        projectId: dto.projectId,
        pageId: dto.pageId ?? null,
        isActive: dto.isActive ?? true,
        userId,
      },
    });

    return {
      code: 0,
      message: '创建成功',
      data: form,
    };
  }

  async findAll(userId: string, page = 1, pageSize = 20) {
    const take = Math.min(pageSize, 100);
    const skip = (page - 1) * take;

    const [forms, total] = await Promise.all([
      this.prisma.formSchema.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.formSchema.count({
        where: { userId },
      }),
    ]);

    return {
      code: 0,
      message: '获取成功',
      data: {
        forms,
        pagination: {
          total,
          page,
          pageSize: take,
          totalPages: Math.ceil(total / take),
        },
      },
    };
  }

  async findOne(id: string, userId: string) {
    const form = await this.getOwnedForm(id, userId);
    return {
      code: 0,
      message: '获取成功',
      data: form,
    };
  }

  async update(id: string, userId: string, dto: UpdateFormDto) {
    await this.getOwnedForm(id, userId);
    if (dto.fields) {
      this.validateFields(dto.fields);
    }

    const updated = await this.prisma.formSchema.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.fields !== undefined
          ? { fields: dto.fields as Prisma.InputJsonValue }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return {
      code: 0,
      message: '更新成功',
      data: updated,
    };
  }

  async remove(id: string, userId: string) {
    await this.getOwnedForm(id, userId);

    await this.prisma.formSchema.delete({
      where: { id },
    });

    return {
      code: 0,
      message: '删除成功',
      data: { id },
    };
  }

  async submit(
    id: string,
    payload: Record<string, unknown>,
    ip?: string | null,
    userAgent?: string | null,
  ) {
    const form = await this.prisma.formSchema.findUnique({
      where: { id },
    });

    if (!form) {
      throw new NotFoundException('表单不存在');
    }

    if (!form.isActive) {
      throw new BadRequestException('表单已停用');
    }

    const fields = this.extractFields(form.fields);
    this.validateSubmission(fields, payload);
    await this.enforceRateLimit(id, ip ?? null);

    const record = await this.prisma.formRecord.create({
      data: {
        formSchemaId: id,
        data: payload as Prisma.InputJsonValue,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
    });

    await this.prisma.formSchema.update({
      where: { id },
      data: {
        submissions: {
          increment: 1,
        },
      },
    });

    return {
      code: 0,
      message: '提交成功',
      data: record,
    };
  }

  async getRecords(id: string, userId: string, query: QueryFormRecordsDto) {
    await this.getOwnedForm(id, userId);
    const page = query.page ?? 1;
    const take = Math.min(query.pageSize ?? 20, 100);
    const skip = (page - 1) * take;

    const [records, total] = await Promise.all([
      this.prisma.formRecord.findMany({
        where: { formSchemaId: id },
        skip,
        take,
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.formRecord.count({
        where: { formSchemaId: id },
      }),
    ]);

    return {
      code: 0,
      message: '获取成功',
      data: {
        records,
        pagination: {
          total,
          page,
          pageSize: take,
          totalPages: Math.ceil(total / take),
        },
      },
    };
  }

  async getStats(id: string, userId: string) {
    const form = await this.getOwnedForm(id, userId);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const trendStart = new Date();
    trendStart.setDate(trendStart.getDate() - 29);
    trendStart.setHours(0, 0, 0, 0);

    const [todaySubmissions, trendRecords, allRecords] = await Promise.all([
      this.prisma.formRecord.count({
        where: {
          formSchemaId: id,
          submittedAt: {
            gte: startOfToday,
          },
        },
      }),
      this.prisma.formRecord.findMany({
        where: {
          formSchemaId: id,
          submittedAt: {
            gte: trendStart,
          },
        },
        orderBy: { submittedAt: 'asc' },
      }),
      this.prisma.formRecord.findMany({
        where: { formSchemaId: id },
      }),
    ]);

    const trendMap = new Map<string, number>();
    for (let i = 0; i < 30; i += 1) {
      const day = new Date(trendStart);
      day.setDate(trendStart.getDate() + i);
      trendMap.set(day.toISOString().slice(0, 10), 0);
    }

    trendRecords.forEach((record) => {
      const dateKey = record.submittedAt.toISOString().slice(0, 10);
      trendMap.set(dateKey, (trendMap.get(dateKey) ?? 0) + 1);
    });

    const fieldDistribution = this.buildFieldDistribution(
      this.extractFields(form.fields),
      allRecords.map((record) => record.data),
    );

    return {
      code: 0,
      message: '获取成功',
      data: {
        totalSubmissions: form.submissions,
        todaySubmissions,
        trend: Array.from(trendMap.entries()).map(([date, count]) => ({ date, count })),
        fieldDistribution,
      },
    };
  }

  async exportCSV(id: string, userId: string) {
    const form = await this.getOwnedForm(id, userId);
    const fields = this.extractFields(form.fields);
    const records = await this.prisma.formRecord.findMany({
      where: { formSchemaId: id },
      orderBy: { submittedAt: 'asc' },
    });

    const headers = fields.map((field) => field.key);
    const lines = [
      ['submittedAt', ...headers].join(','),
      ...records.map((record) => {
        const data = (record.data ?? {}) as Record<string, unknown>;
        return [
          record.submittedAt.toISOString(),
          ...headers.map((key) => this.escapeCsvValue(data[key])),
        ].join(',');
      }),
    ];

    return lines.join('\n');
  }

  private async getOwnedForm(id: string, userId: string) {
    const form = await this.prisma.formSchema.findUnique({
      where: { id },
    });

    if (!form) {
      throw new NotFoundException('表单不存在');
    }

    if (form.userId !== userId) {
      throw new ForbiddenException('无权访问该表单');
    }

    return form;
  }

  private async ensureProjectOwnership(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('无权关联该项目');
    }
  }

  private extractFields(value: unknown): FormField[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((field): field is FormField => {
      return typeof field === 'object' && field !== null && typeof (field as FormField).key === 'string';
    });
  }

  private validateFields(fields: unknown) {
    const parsed = this.extractFields(fields);
    if (parsed.length === 0) {
      throw new BadRequestException('表单字段不能为空');
    }

    const keys = new Set<string>();
    for (const field of parsed) {
      if (!field.key.trim()) {
        throw new BadRequestException('字段 key 不能为空');
      }
      if (keys.has(field.key)) {
        throw new BadRequestException('字段 key 不能重复');
      }
      keys.add(field.key);
    }
  }

  private validateSubmission(fields: FormField[], payload: Record<string, unknown>) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('提交数据格式不正确');
    }

    for (const field of fields) {
      const value = payload[field.key];
      if (field.required && (value === undefined || value === null || value === '')) {
        throw new BadRequestException(`字段 ${field.key} 为必填项`);
      }

      if (field.type === 'select' && value !== undefined && field.options?.length) {
        if (typeof value !== 'string' || !field.options.includes(value)) {
          throw new BadRequestException(`字段 ${field.key} 选项不合法`);
        }
      }
    }
  }

  private async enforceRateLimit(formSchemaId: string, ip: string | null) {
    if (!ip) {
      return;
    }

    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const count = await this.prisma.formRecord.count({
      where: {
        formSchemaId,
        ip,
        submittedAt: {
          gte: oneMinuteAgo,
        },
      },
    });

    if (count >= 5) {
      throw new HttpException('提交频率过高，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private buildFieldDistribution(
    fields: FormField[],
    records: unknown[],
  ): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {};

    for (const field of fields) {
      const values = records
        .map((record) =>
          record && typeof record === 'object'
            ? (record as Record<string, unknown>)[field.key]
            : undefined,
        )
        .filter((value) => value !== undefined && value !== null && value !== '');

      if (field.type === 'text' || field.type === 'textarea' || field.type === 'email') {
        const lengths = values
          .map((value) => `${value}`.length)
          .filter((value) => Number.isFinite(value));
        result[field.key] = {
          uniqueValues: new Set(values.map((value) => `${value}`)).size,
          avgLength:
            lengths.length > 0
              ? Number((lengths.reduce((sum, value) => sum + value, 0) / lengths.length).toFixed(2))
              : 0,
        };
      } else {
        const counts = new Map<string, number>();
        values.forEach((value) => {
          const key = `${value}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        });
        result[field.key] = {
          topValues: Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([value, count]) => ({ value, count })),
        };
      }
    }

    return result;
  }

  private escapeCsvValue(value: unknown) {
    const text = `${value ?? ''}`.replace(/"/g, '""');
    return `"${text}"`;
  }
}
