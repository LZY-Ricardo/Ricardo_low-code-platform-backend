import {
  BadRequestException,
  Controller,
  Delete,
  Param,
  Post,
  Get,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LogOperation } from '../common/decorators/log-operation.decorator';
import { QueryFilesDto } from './dto/query-files.dto';
import { FilesService } from './files.service';

@Controller('api/v1/files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  @LogOperation({
    action: 'file.upload',
    resource: 'file',
    resourceIdBuilder: (_req) => null,
  })
  async upload(
    @Request() req: { user: { userId: string } },
    @UploadedFile() file?: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    @Query('projectId') projectId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('文件不能为空');
    }

    return this.filesService.upload(req.user.userId, file, projectId);
  }

  @Get()
  findAll(
    @Request() req: { user: { userId: string } },
    @Query() query: QueryFilesDto,
  ) {
    return this.filesService.findAll(req.user.userId, query);
  }

  @Delete(':id')
  @LogOperation({
    action: 'file.delete',
    resource: 'file',
    resourceIdBuilder: (req) => req.params?.id,
  })
  remove(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.filesService.remove(req.user.userId, id);
  }
}
