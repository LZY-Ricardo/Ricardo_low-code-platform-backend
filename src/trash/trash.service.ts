import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrashService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, page = 1, pageSize = 20) {
    const take = Math.min(pageSize, 100);
    const skip = (page - 1) * take;

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where: {
          userId,
          deletedAt: {
            not: null,
          },
        },
        skip,
        take,
        orderBy: {
          deletedAt: 'desc',
        },
      }),
      this.prisma.project.count({
        where: {
          userId,
          deletedAt: {
            not: null,
          },
        },
      }),
    ]);

    return {
      code: 0,
      message: '获取成功',
      data: {
        projects,
        pagination: {
          total,
          page,
          pageSize: take,
          totalPages: Math.ceil(total / take),
        },
      },
    };
  }

  async restore(projectId: string, userId: string) {
    const project = await this.ensureOwnedDeletedProject(projectId, userId);

    const restored = await this.prisma.project.update({
      where: { id: project.id },
      data: {
        deletedAt: null,
      },
    });

    return {
      code: 0,
      message: '项目已恢复',
      data: restored,
    };
  }

  async permanentDelete(projectId: string, userId: string) {
    const project = await this.ensureOwnedDeletedProject(projectId, userId);

    await this.prisma.project.delete({
      where: { id: project.id },
    });

    return {
      code: 0,
      message: '项目已永久删除',
      data: { id: project.id },
    };
  }

  async autoCleanup() {
    const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.project.deleteMany({
      where: {
        deletedAt: {
          lt: threshold,
        },
      },
    });

    return result.count;
  }

  private async ensureOwnedDeletedProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('无权操作该项目');
    }

    if (!project.deletedAt) {
      throw new NotFoundException('项目不在回收站中');
    }

    return project;
  }
}
