import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { QueryTemplateDto } from './dto/query-template.dto';
import { Prisma } from '@prisma/client';

const MAX_USER_TEMPLATES = 50;

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryTemplateDto, userId?: string) {
    const { page = 1, pageSize = 12, category, search, builtIn, mine } = query;
    const skip = (page - 1) * pageSize;
    const take = Math.min(pageSize, 100);

    const where: Prisma.TemplateWhereInput = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (typeof builtIn === 'boolean') {
      where.builtIn = builtIn;
    }

    if (mine && userId) {
      where.userId = userId;
    }

    // 如果筛选"我的模板"，只返回用户自己的
    // 否则返回内置模板 + 用户自己的模板
    if (!mine) {
      if (userId) {
        where.OR = [
          { builtIn: true },
          { userId },
        ];
      } else {
        where.builtIn = true;
      }
    }

    const [templates, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          thumbnail: true,
          builtIn: true,
          useCount: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.template.count({ where }),
    ]);

    return {
      code: 0,
      message: '获取成功',
      data: {
        templates,
        pagination: {
          total,
          page,
          pageSize: take,
          totalPages: Math.ceil(total / take),
        },
      },
    };
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    return {
      code: 0,
      message: '获取成功',
      data: template,
    };
  }

  async create(userId: string, dto: CreateTemplateDto) {
    // 检查用户模板数量上限
    const count = await this.prisma.template.count({
      where: { userId, builtIn: false },
    });

    if (count >= MAX_USER_TEMPLATES) {
      throw new BadRequestException(
        `自定义模板数量已达上限（${MAX_USER_TEMPLATES}个）`,
      );
    }

    const template = await this.prisma.template.create({
      data: {
        name: dto.name,
        description: dto.description || '',
        category: dto.category || 'general',
        thumbnail: dto.thumbnail,
        components: dto.components,
        pages: dto.pages || [],
        dataSources: dto.dataSources || [],
        variables: dto.variables || {},
        sharedStyles: dto.sharedStyles || [],
        themeId: dto.themeId || null,
        userId,
      },
    });

    return {
      code: 0,
      message: '模板创建成功',
      data: template,
    };
  }

  async update(userId: string, id: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    if (template.builtIn) {
      throw new ForbiddenException('内置模板不可修改');
    }

    if (template.userId !== userId) {
      throw new ForbiddenException('无权修改该模板');
    }

    const updated = await this.prisma.template.update({
      where: { id },
      data: dto,
    });

    return {
      code: 0,
      message: '模板更新成功',
      data: updated,
    };
  }

  async remove(userId: string, id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    if (template.builtIn) {
      throw new ForbiddenException('内置模板不可删除');
    }

    if (template.userId !== userId) {
      throw new ForbiddenException('无权删除该模板');
    }

    await this.prisma.template.delete({
      where: { id },
    });

    return {
      code: 0,
      message: '模板删除成功',
      data: { id },
    };
  }

  async incrementUseCount(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    await this.prisma.template.update({
      where: { id },
      data: { useCount: { increment: 1 } },
    });

    return {
      code: 0,
      message: '操作成功',
    };
  }
}
