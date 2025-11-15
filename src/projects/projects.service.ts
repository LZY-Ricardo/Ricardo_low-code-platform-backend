import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { BatchImportDto } from './dto/batch-import.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createProjectDto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        components: createProjectDto.components || [],
        userId,
      },
    });

    return {
      code: 0,
      message: '创建成功',
      data: project,
    };
  }

  async findAll(
    userId: string,
    page = 1,
    pageSize = 20,
    sortBy = 'updatedAt',
    order = 'desc',
  ) {
    const skip = (page - 1) * pageSize;
    const take = Math.min(pageSize, 100);

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { [sortBy]: order },
      }),
      this.prisma.project.count({ where: { userId } }),
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

  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('无权访问该项目');
    }

    return {
      code: 0,
      message: '获取成功',
      data: project,
    };
  }

  async update(userId: string, id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('无权修改该项目');
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
    });

    return {
      code: 0,
      message: '更新成功',
      data: updated,
    };
  }

  async remove(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('无权删除该项目');
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return {
      code: 0,
      message: '删除成功',
      data: { id },
    };
  }

  async batchImport(userId: string, batchImportDto: BatchImportDto) {
    const createdProjects: { id: string; name: string }[] = [];
    const failedProjects: string[] = [];

    for (const projectDto of batchImportDto.projects) {
      try {
        const project = await this.prisma.project.create({
          data: {
            name: projectDto.name,
            components: projectDto.components || [],
            userId,
          },
        });
        createdProjects.push({ id: project.id, name: project.name });
      } catch (error) {
        failedProjects.push(projectDto.name);
      }
    }

    return {
      code: 0,
      message: '批量导入成功',
      data: {
        imported: createdProjects.length,
        failed: failedProjects.length,
        projects: createdProjects,
      },
    };
  }
}
