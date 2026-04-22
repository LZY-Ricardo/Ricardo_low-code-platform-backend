import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LogOperation } from '../common/decorators/log-operation.decorator';
import { PublishProjectDto } from './dto/publish-project.dto';
import { PublishService } from './publish.service';

@Controller('api/v1')
export class PublishController {
  constructor(private readonly publishService: PublishService) {}

  @Post('projects/:id/publish')
  @UseGuards(JwtAuthGuard)
  @LogOperation({
    action: 'project.publish',
    resource: 'project',
    resourceIdBuilder: (req) => req.params?.id,
  })
  publish(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: PublishProjectDto,
  ) {
    return this.publishService.publish(id, req.user.userId, dto);
  }

  @Get('projects/:id/versions')
  @UseGuards(JwtAuthGuard)
  getVersions(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.publishService.getVersions(
      id,
      req.user.userId,
      Number(page) || 1,
      Number(pageSize) || 10,
    );
  }

  @Post('projects/:id/versions/:versionId/rollback')
  @UseGuards(JwtAuthGuard)
  @LogOperation({
    action: 'project.rollback',
    resource: 'project',
    resourceIdBuilder: (req) => req.params?.id,
  })
  rollback(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.publishService.rollback(id, versionId, req.user.userId);
  }

  @Delete('projects/:id/versions/:versionId')
  @UseGuards(JwtAuthGuard)
  archive(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.publishService.archiveVersion(id, versionId, req.user.userId);
  }

  @Get('p/:publishUrl')
  getPublishedPage(
    @Param('publishUrl') publishUrl: string,
    @Req() req: ExpressRequest,
  ) {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const protocol =
      typeof forwardedProto === 'string' && forwardedProto
        ? forwardedProto.split(',')[0].trim()
        : req.protocol;
    const host = req.get('host');
    const baseOrigin = host ? `${protocol}://${host}` : undefined;

    return this.publishService.getPublishedPage(publishUrl, baseOrigin);
  }
}
