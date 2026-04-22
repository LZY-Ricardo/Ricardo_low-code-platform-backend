import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_PUBLIC_COMPONENTS = 50;
const FORBIDDEN_CODE_PATTERNS = [
  'window',
  'document',
  'globalThis',
  'eval',
  'Function',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'import',
  'require',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'navigator',
  'location',
  'history',
  'parent',
  'top',
  'opener',
  'postMessage',
  'Image(',
];

@Injectable()
export class ComponentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: Record<string, any>) {
    this.validateComponentCode(dto.code);

    if (dto.isPublic) {
      const count = await this.prisma.customComponent.count({
        where: { userId, isPublic: true },
      });
      if (count >= MAX_PUBLIC_COMPONENTS) {
        throw new BadRequestException(`公开组件数量已达上限（${MAX_PUBLIC_COMPONENTS}个）`);
      }
    }

    const component = await this.prisma.customComponent.create({
      data: {
        name: dto.name,
        displayName: dto.displayName || dto.name,
        description: dto.description || '',
        category: dto.category || 'custom',
        icon: dto.icon || null,
        thumbnail: dto.thumbnail || null,
        code: dto.code,
        defaultProps: dto.defaultProps || {},
        setterConfig: dto.setterConfig || [],
        version: dto.version || '1.0.0',
        isPublic: dto.isPublic ?? false,
        status: 'active',
        userId,
      },
    });

    return {
      code: 0,
      message: '创建成功',
      data: component,
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
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = query.category;
    }

    const orderBy =
      query.sort === 'popular'
        ? { downloads: 'desc' as const }
        : { createdAt: 'desc' as const };

    const [components, total] = await Promise.all([
      this.prisma.customComponent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
      }),
      this.prisma.customComponent.count({ where }),
    ]);

    return {
      code: 0,
      message: '获取成功',
      data: {
        components,
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
    const components = await this.prisma.customComponent.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      code: 0,
      message: '获取成功',
      data: components,
    };
  }

  async findOne(id: string) {
    const component = await this.prisma.customComponent.findUnique({
      where: { id },
    });

    if (!component) {
      throw new NotFoundException('组件不存在');
    }

    const [likeCount, reviews] = await Promise.all([
      this.prisma.marketLike.count({
        where: { targetType: 'component', targetId: id },
      }),
      this.prisma.marketReview.findMany({
        where: { targetType: 'component', targetId: id },
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
        ...component,
        likeCount,
        reviewCount: reviews.length,
        avgRating,
        reviews,
      },
    };
  }

  async update(id: string, userId: string, dto: Record<string, any>) {
    const component = await this.prisma.customComponent.findUnique({
      where: { id },
    });

    if (!component) {
      throw new NotFoundException('组件不存在');
    }

    if (component.userId !== userId) {
      throw new ForbiddenException('无权修改该组件');
    }

    if (dto.code !== undefined) {
      this.validateComponentCode(dto.code);
    }

    const updated = await this.prisma.customComponent.update({
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
    const component = await this.prisma.customComponent.findUnique({
      where: { id },
    });

    if (!component) {
      throw new NotFoundException('组件不存在');
    }

    if (component.userId !== userId) {
      throw new ForbiddenException('无权删除该组件');
    }

    await this.prisma.customComponent.delete({
      where: { id },
    });

    await Promise.all([
      this.prisma.marketLike.deleteMany({
        where: { targetType: 'component', targetId: id },
      }),
      this.prisma.marketReview.deleteMany({
        where: { targetType: 'component', targetId: id },
      }),
    ]);

    return {
      code: 0,
      message: '删除成功',
      data: { id },
    };
  }

  async install(id: string) {
    const component = await this.prisma.customComponent.findUnique({
      where: { id },
    });

    if (!component) {
      throw new NotFoundException('组件不存在');
    }

    const updated = await this.prisma.customComponent.update({
      where: { id },
      data: {
        downloads: {
          increment: 1,
        },
      },
    });

    return {
      code: 0,
      message: '安装成功',
      data: updated,
    };
  }

  private validateComponentCode(code: unknown) {
    if (typeof code !== 'string' || !code.trim()) {
      throw new BadRequestException('组件代码不能为空');
    }

    for (const pattern of FORBIDDEN_CODE_PATTERNS) {
      let regex: RegExp;
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      if (pattern.endsWith('(')) {
        const ident = pattern.slice(0, -1);
        regex = new RegExp(`\\b${ident}\\s*\\(`);
      } else {
        regex = new RegExp(`\\b${escaped}\\b`);
      }

      if (regex.test(code)) {
        throw new BadRequestException('组件代码包含不安全内容');
      }
    }
  }
}
