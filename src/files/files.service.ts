import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { QueryFilesDto } from './dto/query-files.dto';

type UploadFileInput = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type AssetCategory = 'image' | 'document' | 'video';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MIME_CATEGORY_MAP: Record<string, AssetCategory> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/svg+xml': 'image',
  'image/webp': 'image',
  'application/pdf': 'document',
  'video/mp4': 'video',
};

@Injectable()
export class FilesService {
  private readonly uploadDir = join(process.cwd(), 'uploads');

  constructor(private readonly prisma: PrismaService) {}

  async upload(userId: string, file: UploadFileInput, projectId?: string) {
    if (!file) {
      throw new BadRequestException('文件不能为空');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('文件大小超过 5MB');
    }

    const category = this.validateFile(file);

    if (projectId) {
      await this.ensureProjectOwnership(userId, projectId);
    }

    await mkdir(this.uploadDir, { recursive: true });

    const extension = this.resolveExtension(file);
    const hash = createHash('sha256').update(file.buffer).digest('hex').slice(0, 8);
    const fileName = `${hash}_${Date.now()}_${randomUUID().slice(0, 8)}${extension}`;
    const filePath = join(this.uploadDir, fileName);
    const url = `/uploads/${fileName}`;

    await writeFile(filePath, file.buffer);

    const asset = await this.prisma.fileAsset.create({
      data: {
        fileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        url,
        userId,
        projectId: projectId ?? null,
      },
    });

    return {
      code: 0,
      message: '上传成功',
      data: {
        ...asset,
        type: category,
      },
    };
  }

  async findAll(userId: string, query: QueryFilesDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where = {
      userId,
      ...(query.type
        ? {
            mimeType: {
              in: Object.entries(MIME_CATEGORY_MAP)
                .filter(([, value]) => value === query.type)
                .map(([mimeType]) => mimeType),
            },
          }
        : {}),
    };

    const [files, total] = await Promise.all([
      this.prisma.fileAsset.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fileAsset.count({ where }),
    ]);

    return {
      code: 0,
      message: '获取成功',
      data: {
        files: files.map((item) => ({
          ...item,
          type: MIME_CATEGORY_MAP[item.mimeType],
        })),
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    };
  }

  async remove(userId: string, id: string) {
    const asset = await this.prisma.fileAsset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException('文件不存在');
    }

    if (asset.userId !== userId) {
      throw new ForbiddenException('无权删除该文件');
    }

    const filePath = join(this.uploadDir, asset.fileName);

    try {
      await unlink(filePath);
    } catch {
      // 物理文件缺失时继续删除数据库记录，避免僵尸数据
    }

    await this.prisma.fileAsset.delete({
      where: { id },
    });

    return {
      code: 0,
      message: '删除成功',
      data: { id },
    };
  }

  private async ensureProjectOwnership(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('无权关联该项目');
    }
  }

  private validateFile(file: UploadFileInput): AssetCategory {
    const category = MIME_CATEGORY_MAP[file.mimetype];
    if (!category) {
      throw new BadRequestException('不支持的文件类型');
    }

    if (!this.matchesFileSignature(file)) {
      throw new BadRequestException('文件内容与类型不匹配');
    }

    return category;
  }

  private resolveExtension(file: UploadFileInput) {
    const originalExt = extname(file.originalname);
    if (originalExt) {
      return originalExt.toLowerCase();
    }

    switch (file.mimetype) {
      case 'image/png':
        return '.png';
      case 'image/jpeg':
        return '.jpg';
      case 'image/gif':
        return '.gif';
      case 'image/svg+xml':
        return '.svg';
      case 'image/webp':
        return '.webp';
      case 'application/pdf':
        return '.pdf';
      case 'video/mp4':
        return '.mp4';
      default:
        return '';
    }
  }

  private matchesFileSignature(file: UploadFileInput) {
    const buffer = file.buffer;

    switch (file.mimetype) {
      case 'image/png':
        return buffer.subarray(0, 8).equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        );
      case 'image/jpeg':
        return buffer[0] === 0xff && buffer[1] === 0xd8;
      case 'image/gif':
        return (
          buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
          buffer.subarray(0, 6).toString('ascii') === 'GIF89a'
        );
      case 'image/webp':
        return (
          buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
          buffer.subarray(8, 12).toString('ascii') === 'WEBP'
        );
      case 'image/svg+xml': {
        const content = buffer.subarray(0, 256).toString('utf8').trimStart();
        return content.startsWith('<svg') || content.startsWith('<?xml');
      }
      case 'application/pdf':
        return buffer.subarray(0, 4).toString('ascii') === '%PDF';
      case 'video/mp4':
        return buffer.subarray(4, 8).toString('ascii') === 'ftyp';
      default:
        return false;
    }
  }
}
