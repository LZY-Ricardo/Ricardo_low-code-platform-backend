import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_PUBLIC_TEMPLATES = 50;

@Injectable()
export class MarketTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private async decorateTemplates<T extends { id: string }>(templates: T[]) {
    if (!templates.length) {
      return templates.map((item) => ({
        ...item,
        likeCount: 0,
        reviewCount: 0,
        avgRating: 0,
      }));
    }

    const ids = templates.map((item) => item.id);
    const [likeCounts, reviewGroups] = await Promise.all([
      this.prisma.marketLike.groupBy({
        by: ['targetId'],
        where: {
          targetType: 'template',
          targetId: { in: ids },
        },
        _count: { _all: true },
      }),
      this.prisma.marketReview.groupBy({
        by: ['targetId'],
        where: {
          targetType: 'template',
          targetId: { in: ids },
        },
        _count: { _all: true },
        _avg: { rating: true },
      }),
    ]);

    const likeMap = new Map(likeCounts.map((item) => [item.targetId, item._count._all]));
    const reviewMap = new Map(
      reviewGroups.map((item) => [
        item.targetId,
        {
          reviewCount: item._count._all,
          avgRating: Number((item._avg.rating ?? 0).toFixed(2)),
        },
      ]),
    );

    return templates.map((item) => {
      const review = reviewMap.get(item.id);
      return {
        ...item,
        likeCount: likeMap.get(item.id) ?? 0,
        reviewCount: review?.reviewCount ?? 0,
        avgRating: review?.avgRating ?? 0,
      };
    });
  }

  async create(userId: string, dto: Record<string, any>) {
    if (dto.isPublic) {
      const count = await this.prisma.marketTemplate.count({
        where: { userId, isPublic: true },
      });
      if (count >= MAX_PUBLIC_TEMPLATES) {
        throw new BadRequestException(`公开模板数量已达上限（${MAX_PUBLIC_TEMPLATES}个）`);
      }
    }

    const template = await this.prisma.marketTemplate.create({
      data: {
        name: dto.name,
        description: dto.description || '',
        category: dto.category || 'general',
        tags: dto.tags || [],
        thumbnail: dto.thumbnail || null,
        components: dto.components,
        pages: dto.pages || [],
        dataSources: dto.dataSources || {},
        variables: dto.variables || {},
        sharedStyles: dto.sharedStyles || [],
        themeId: dto.themeId || null,
        isPublic: dto.isPublic ?? false,
        status: 'active',
        userId,
      },
    });

    return {
      code: 0,
      message: '创建成功',
      data: template,
    };
  }

  async findPublic(query: Record<string, any>) {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(Number(query.pageSize) || 20, 100);
    const skip = (page - 1) * pageSize;

    const where: any = {
      isPublic: true,
      status: 'active',
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.tags) {
      const tags = Array.isArray(query.tags)
        ? query.tags
        : `${query.tags}`.split(',').map((item) => item.trim()).filter(Boolean);
      where.tags = {
        array_contains: tags,
      };
    }

    const [templates, total] = await Promise.all([
      this.prisma.marketTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.marketTemplate.count({ where }),
    ]);
    const decoratedTemplates = await this.decorateTemplates(templates);

    return {
      code: 0,
      message: '获取成功',
      data: {
        templates: decoratedTemplates,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    };
  }

  async findMine(userId: string) {
    const templates = await this.prisma.marketTemplate.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    const decoratedTemplates = await this.decorateTemplates(templates);

    return {
      code: 0,
      message: '获取成功',
      data: decoratedTemplates,
    };
  }

  async findOne(id: string) {
    const template = await this.prisma.marketTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    const [likeCount, reviews] = await Promise.all([
      this.prisma.marketLike.count({
        where: { targetType: 'template', targetId: id },
      }),
      this.prisma.marketReview.findMany({
        where: { targetType: 'template', targetId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const avgRating =
      reviews.length > 0
        ? Number(
            (
              reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length
            ).toFixed(2),
          )
        : 0;

    return {
      code: 0,
      message: '获取成功',
      data: {
        ...template,
        likeCount,
        reviewCount: reviews.length,
        avgRating,
        reviews,
      },
    };
  }

  async update(id: string, userId: string, dto: Record<string, any>) {
    const template = await this.prisma.marketTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    if (template.userId !== userId) {
      throw new ForbiddenException('无权修改该模板');
    }

    const updated = await this.prisma.marketTemplate.update({
      where: { id },
      data: dto,
    });

    return {
      code: 0,
      message: '更新成功',
      data: updated,
    };
  }

  async remove(id: string, userId: string) {
    const template = await this.prisma.marketTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    if (template.userId !== userId) {
      throw new ForbiddenException('无权删除该模板');
    }

    await this.prisma.marketTemplate.delete({
      where: { id },
    });

    await Promise.all([
      this.prisma.marketLike.deleteMany({
        where: { targetType: 'template', targetId: id },
      }),
      this.prisma.marketReview.deleteMany({
        where: { targetType: 'template', targetId: id },
      }),
    ]);

    return {
      code: 0,
      message: '删除成功',
      data: { id },
    };
  }

  async useTemplate(id: string) {
    const template = await this.prisma.marketTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('模板不存在');
    }

    const updated = await this.prisma.marketTemplate.update({
      where: { id },
      data: {
        useCount: {
          increment: 1,
        },
      },
    });

    return {
      code: 0,
      message: '操作成功',
      data: updated,
    };
  }
}
