import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InteractionsService {
  constructor(private readonly prisma: PrismaService) {}

  async toggleLike(userId: string, targetType: 'component' | 'template', targetId: string) {
    await this.ensureTargetExists(targetType, targetId);

    const existing = await this.prisma.marketLike.findFirst({
      where: { userId, targetType, targetId },
    });

    if (existing) {
      await this.prisma.marketLike.delete({
        where: { id: existing.id },
      });
    } else {
      await this.prisma.marketLike.create({
        data: { userId, targetType, targetId },
      });
    }

    const count = await this.prisma.marketLike.count({
      where: { targetType, targetId },
    });

    return {
      code: 0,
      message: '操作成功',
      data: {
        liked: !existing,
        count,
      },
    };
  }

  async getLikeStatus(userId: string | undefined, targetType: 'component' | 'template', targetId: string) {
    await this.ensureTargetExists(targetType, targetId);

    const [count, existing] = await Promise.all([
      this.prisma.marketLike.count({
        where: { targetType, targetId },
      }),
      userId
        ? this.prisma.marketLike.findFirst({
            where: { userId, targetType, targetId },
          })
        : null,
    ]);

    return {
      code: 0,
      message: '获取成功',
      data: {
        liked: Boolean(existing),
        count,
      },
    };
  }

  async createReview(
    userId: string,
    dto: { targetType: 'component' | 'template'; targetId: string; rating: number; content: string },
  ) {
    await this.ensureTargetExists(dto.targetType, dto.targetId);

    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('评分必须在 1 到 5 之间');
    }

    if (!dto.content.trim() || dto.content.length > 1000) {
      throw new BadRequestException('评论内容长度必须在 1 到 1000 之间');
    }

    const sanitizedContent = dto.content.replace(/<script.*?>.*?<\/script>/gis, '').trim();

    const existing = await this.prisma.marketReview.findFirst({
      where: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });

    const review = existing
      ? await this.prisma.marketReview.update({
          where: { id: existing.id },
          data: {
            rating: dto.rating,
            content: sanitizedContent,
          },
        })
      : await this.prisma.marketReview.create({
          data: {
            userId,
            targetType: dto.targetType,
            targetId: dto.targetId,
            rating: dto.rating,
            content: sanitizedContent,
          },
        });

    return {
      code: 0,
      message: '评论成功',
      data: review,
    };
  }

  async getReviews(targetType: 'component' | 'template', targetId: string, page = 1, pageSize = 10) {
    await this.ensureTargetExists(targetType, targetId);
    const take = Math.min(pageSize, 100);
    const skip = (page - 1) * take;

    const [reviews, total] = await Promise.all([
      this.prisma.marketReview.findMany({
        where: { targetType, targetId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.marketReview.count({
        where: { targetType, targetId },
      }),
    ]);

    return {
      code: 0,
      message: '获取成功',
      data: {
        reviews,
        pagination: {
          total,
          page,
          pageSize: take,
          totalPages: Math.ceil(total / take),
        },
      },
    };
  }

  async updateReview(reviewId: string, userId: string, dto: { rating?: number; content?: string }) {
    const review = await this.prisma.marketReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('评论不存在');
    }

    if (review.userId !== userId) {
      throw new BadRequestException('无权修改该评论');
    }

    if (dto.rating !== undefined && (dto.rating < 1 || dto.rating > 5)) {
      throw new BadRequestException('评分必须在 1 到 5 之间');
    }

    const content =
      dto.content !== undefined
        ? dto.content.replace(/<script.*?>.*?<\/script>/gis, '').trim()
        : undefined;

    const updated = await this.prisma.marketReview.update({
      where: { id: reviewId },
      data: {
        ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
        ...(content !== undefined ? { content } : {}),
      },
    });

    return {
      code: 0,
      message: '更新成功',
      data: updated,
    };
  }

  async deleteReview(reviewId: string, userId: string) {
    const review = await this.prisma.marketReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('评论不存在');
    }

    if (review.userId !== userId) {
      throw new BadRequestException('无权删除该评论');
    }

    await this.prisma.marketReview.delete({
      where: { id: reviewId },
    });

    return {
      code: 0,
      message: '评论已删除',
    };
  }

  private async ensureTargetExists(targetType: 'component' | 'template', targetId: string) {
    const target =
      targetType === 'component'
        ? await this.prisma.customComponent.findUnique({ where: { id: targetId } })
        : await this.prisma.marketTemplate.findUnique({ where: { id: targetId } });

    if (!target) {
      throw new NotFoundException('目标资源不存在');
    }
  }
}
