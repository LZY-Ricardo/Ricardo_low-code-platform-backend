import {
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShareDto } from './dto/create-share.dto';
import { UpdateShareDto } from './dto/update-share.dto';
import { AddCollaboratorDto } from './dto/add-collaborator.dto';

@Injectable()
export class ShareService {
  constructor(private readonly prisma: PrismaService) {}

  async createShare(projectId: string, userId: string, dto: CreateShareDto) {
    await this.ensureOwner(projectId, userId);

    const share = await this.prisma.projectShare.create({
      data: {
        projectId,
        shareToken: this.generateShareToken(),
        permission: dto.permission,
        expiresAt: dto.expiresIn ? this.buildExpiresAt(dto.expiresIn) : null,
        password: dto.password ? await bcrypt.hash(dto.password, 10) : null,
        isActive: true,
        createdBy: userId,
      },
    });

    return {
      code: 0,
      message: '创建成功',
      data: {
        id: share.id,
        shareToken: share.shareToken,
        permission: share.permission,
        expiresAt: share.expiresAt,
        hasPassword: Boolean(share.password),
        url: `/s/${share.shareToken}`,
      },
    };
  }

  async getShares(projectId: string, userId: string) {
    await this.ensureOwner(projectId, userId);

    const shares = await this.prisma.projectShare.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        shareToken: true,
        permission: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        password: true,
      },
    });

    return {
      code: 0,
      message: '获取成功',
      data: shares.map((share) => ({
        id: share.id,
        shareToken: share.shareToken,
        permission: share.permission,
        expiresAt: share.expiresAt,
        isActive: share.isActive,
        createdAt: share.createdAt,
        hasPassword: Boolean(share.password),
        url: `/s/${share.shareToken}`,
      })),
    };
  }

  async updateShare(projectId: string, shareId: string, userId: string, dto: UpdateShareDto) {
    await this.ensureOwner(projectId, userId);
    const share = await this.getOwnedShare(projectId, shareId);

    const updated = await this.prisma.projectShare.update({
      where: { id: share.id },
      data: {
        ...(dto.permission ? { permission: dto.permission } : {}),
        ...(dto.expiresIn !== undefined
          ? { expiresAt: this.buildExpiresAt(dto.expiresIn) }
          : {}),
        ...(dto.password !== undefined
          ? { password: dto.password ? await bcrypt.hash(dto.password, 10) : null }
          : {}),
      },
    });

    return {
      code: 0,
      message: '更新成功',
      data: {
        id: updated.id,
        shareToken: updated.shareToken,
        permission: updated.permission,
        expiresAt: updated.expiresAt,
        hasPassword: Boolean(updated.password),
        url: `/s/${updated.shareToken}`,
      },
    };
  }

  async revokeShare(projectId: string, shareId: string, userId: string) {
    await this.ensureOwner(projectId, userId);
    const share = await this.getOwnedShare(projectId, shareId);

    await this.prisma.projectShare.update({
      where: { id: share.id },
      data: { isActive: false },
    });

    return {
      code: 0,
      message: '取消分享成功',
    };
  }

  async accessSharedProject(token: string, password?: string) {
    const share = await this.getAccessibleShare(token, password);

    return {
      code: 0,
      message: '获取成功',
      data: {
        permission: share.permission,
        project: share.project,
      },
    };
  }

  async updateSharedProject(
    token: string,
    password: string | undefined,
    dto: { name?: string; components?: unknown },
  ) {
    const share = await this.getAccessibleShare(token, password);

    if (share.permission !== 'edit') {
      throw new ForbiddenException('当前分享仅支持查看');
    }

    const updated = await this.prisma.project.update({
      where: { id: share.project.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.components !== undefined
          ? { components: dto.components as any }
          : {}),
      },
    });

    return {
      code: 0,
      message: '保存成功',
      data: updated,
    };
  }

  private async getAccessibleShare(token: string, password?: string) {
    const share = await this.prisma.projectShare.findUnique({
      where: { shareToken: token },
      include: {
        project: true,
      },
    });

    if (!share || !share.isActive) {
      throw new NotFoundException('分享链接不存在');
    }

    if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
      throw new GoneException('分享链接已过期');
    }

    if (share.password) {
      if (!password || !(await bcrypt.compare(password, share.password))) {
        throw new UnauthorizedException('访问密码错误');
      }
    }

    return share;
  }

  async addCollaborator(projectId: string, userId: string, dto: AddCollaboratorDto) {
    await this.ensureOwner(projectId, userId);

    const targetUser = await this.prisma.user.findUnique({
      where: { username: dto.username },
      select: { id: true, username: true, email: true },
    });

    if (!targetUser) {
      throw new NotFoundException('目标用户不存在');
    }

    const collaborator = await this.prisma.projectCollaborator.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUser.id,
        },
      },
      create: {
        projectId,
        userId: targetUser.id,
        role: dto.role,
        invitedBy: userId,
      },
      update: {
        role: dto.role,
        invitedBy: userId,
      },
    });

    return {
      code: 0,
      message: '协作者添加成功',
      data: collaborator,
    };
  }

  async getCollaborators(projectId: string, userId: string) {
    await this.ensureOwner(projectId, userId);

    const collaborators = await this.prisma.projectCollaborator.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return {
      code: 0,
      message: '获取成功',
      data: collaborators,
    };
  }

  async updateCollaboratorRole(
    projectId: string,
    targetUserId: string,
    userId: string,
    role: 'editor' | 'viewer',
  ) {
    await this.ensureOwner(projectId, userId);

    const collaborator = await this.prisma.projectCollaborator.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    if (!collaborator) {
      throw new NotFoundException('协作者不存在');
    }

    const updated = await this.prisma.projectCollaborator.update({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
      data: { role },
    });

    return {
      code: 0,
      message: '角色更新成功',
      data: updated,
    };
  }

  async removeCollaborator(projectId: string, targetUserId: string, userId: string) {
    await this.ensureOwner(projectId, userId);

    await this.prisma.projectCollaborator.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    return {
      code: 0,
      message: '协作者已移除',
    };
  }

  async getMyCollaborations(userId: string) {
    const collaborations = await this.prisma.projectCollaborator.findMany({
      where: { userId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            components: true,
            publishUrl: true,
            deletedAt: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: { id: true, username: true, email: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return {
      code: 0,
      message: '获取成功',
      data: collaborations
        .filter((c) => !c.project.deletedAt)
        .map((c) => ({
          id: c.project.id,
          name: c.project.name,
          components: c.project.components,
          publishUrl: c.project.publishUrl,
          createdAt: c.project.createdAt,
          updatedAt: c.project.updatedAt,
          owner: c.project.user,
          role: c.role,
        })),
    };
  }

  private async ensureOwner(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('仅项目所有者可执行该操作');
    }
  }

  private async getOwnedShare(projectId: string, shareId: string) {
    const share = await this.prisma.projectShare.findFirst({
      where: {
        id: shareId,
        projectId,
      },
    });

    if (!share) {
      throw new NotFoundException('分享记录不存在');
    }

    return share;
  }

  private buildExpiresAt(days?: number) {
    if (!days) {
      return null;
    }

    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private generateShareToken() {
    return randomBytes(16).toString('base64url');
  }
}
