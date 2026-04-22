import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Project } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PublishProjectDto } from './dto/publish-project.dto';
import { HtmlGenerator } from './html-generator';

@Injectable()
export class PublishService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly htmlGenerator: HtmlGenerator,
  ) {}

  async publish(projectId: string, userId: string, dto: PublishProjectDto) {
    const project = await this.getOwnedProject(projectId, userId);
    const publishUrl = await this.resolvePublishUrl(project, dto.slug);
    const version = await this.getNextVersion(projectId);
    const title = dto.title || project.name;
    const description = dto.description || null;
    const htmlContent = this.htmlGenerator.generateHTML(project.components, {
      title,
      description: description ?? '',
    });

    const publishedPage = await this.prisma.publishedPage.create({
      data: {
        projectId,
        version,
        publishUrl,
        title,
        description,
        htmlContent,
        components: project.components as Prisma.InputJsonValue,
        status: 'active',
        publishedBy: userId,
      },
    });

    await this.prisma.project.update({
      where: { id: projectId },
      data: { publishUrl },
    });

    return {
      code: 0,
      message: '发布成功',
      data: {
        id: publishedPage.id,
        version: publishedPage.version,
        publishUrl: publishedPage.publishUrl,
        status: publishedPage.status,
        publishedBy: publishedPage.publishedBy,
        createdAt: publishedPage.createdAt,
        url: `/p/${publishedPage.publishUrl}`,
      },
    };
  }

  async getVersions(projectId: string, userId: string, page = 1, pageSize = 10) {
    await this.getOwnedProject(projectId, userId);
    const take = Math.min(pageSize, 100);
    const skip = (page - 1) * take;

    const [versions, total] = await Promise.all([
      this.prisma.publishedPage.findMany({
        where: { projectId },
        skip,
        take,
        orderBy: { version: 'desc' },
        select: {
          id: true,
          version: true,
          publishUrl: true,
          title: true,
          description: true,
          status: true,
          publishedBy: true,
          createdAt: true,
        },
      }),
      this.prisma.publishedPage.count({ where: { projectId } }),
    ]);

    return {
      code: 0,
      message: '获取成功',
      data: {
        versions,
        pagination: {
          total,
          page,
          pageSize: take,
          totalPages: Math.ceil(total / take),
        },
      },
    };
  }

  async rollback(projectId: string, versionId: string, userId: string) {
    const project = await this.getOwnedProject(projectId, userId);
    const targetVersion = await this.prisma.publishedPage.findFirst({
      where: { id: versionId, projectId },
    });

    if (!targetVersion) {
      throw new NotFoundException('目标版本不存在');
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        components: targetVersion.components as Prisma.InputJsonValue,
        publishUrl: targetVersion.publishUrl,
      },
    });

    const version = await this.getNextVersion(projectId);
    const htmlContent = this.htmlGenerator.generateHTML(targetVersion.components, {
        title: targetVersion.title || project.name,
        description: targetVersion.description || '',
      });

    const rollbackVersion = await this.prisma.publishedPage.create({
      data: {
        projectId,
        version,
        publishUrl: targetVersion.publishUrl,
        title: targetVersion.title,
        description: targetVersion.description,
        htmlContent,
        components: targetVersion.components as Prisma.InputJsonValue,
        status: 'active',
        publishedBy: userId,
      },
    });

    return {
      code: 0,
      message: '回滚成功',
      data: {
        id: rollbackVersion.id,
        version: rollbackVersion.version,
        publishUrl: rollbackVersion.publishUrl,
      },
    };
  }

  async archiveVersion(projectId: string, versionId: string, userId: string) {
    await this.getOwnedProject(projectId, userId);

    const existing = await this.prisma.publishedPage.findFirst({
      where: { id: versionId, projectId },
    });

    if (!existing) {
      throw new NotFoundException('版本不存在');
    }

    await this.prisma.publishedPage.update({
      where: { id: versionId },
      data: { status: 'archived' },
    });

    return {
      code: 0,
      message: '版本已归档',
    };
  }

  async getPublishedPage(publishUrl: string, baseOrigin?: string) {
    const page = await this.prisma.publishedPage.findFirst({
      where: {
        publishUrl,
        status: 'active',
      },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });

    if (!page) {
      throw new NotFoundException('发布页面不存在');
    }

    return {
      code: 0,
      message: '获取成功',
      data: {
        html: this.injectApiBaseUrl(page.htmlContent, baseOrigin),
        title: page.title,
        description: page.description,
      },
    };
  }

  private async getOwnedProject(projectId: string, userId: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('无权访问该项目');
    }

    return project;
  }

  private async resolvePublishUrl(project: Project, requestedSlug?: string) {
    const slug = requestedSlug || project.publishUrl || this.generateSlug(project.name);

    const conflict = await this.prisma.publishedPage.findFirst({
      where: {
        publishUrl: slug,
        projectId: { not: project.id },
      },
      select: { id: true },
    });

    if (conflict) {
      throw new ConflictException('slug 已存在');
    }

    return slug;
  }

  private async getNextVersion(projectId: string) {
    const latest = await this.prisma.publishedPage.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return (latest?.version ?? 0) + 1;
  }

  private generateSlug(name: string) {
    const base = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const asciiBase = base || 'project';
    return `${asciiBase}-${Math.random().toString(36).slice(2, 6)}`;
  }

  private injectApiBaseUrl(html: string, baseOrigin?: string) {
    const normalizedOrigin = (baseOrigin || '').replace(/\/+$/, '');
    const apiBase = normalizedOrigin ? `${normalizedOrigin}/api/v1` : '/api/v1';
    return html.replace(/__LOWCODE_API_V1_BASE__/g, apiBase);
  }
}
