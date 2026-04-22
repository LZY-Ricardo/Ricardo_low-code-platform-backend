import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LogOperation } from '../common/decorators/log-operation.decorator';
import { AddCollaboratorDto } from './dto/add-collaborator.dto';
import { CreateShareDto } from './dto/create-share.dto';
import { UpdateShareDto } from './dto/update-share.dto';
import { UpdateSharedProjectDto } from './dto/update-shared-project.dto';
import { ShareService } from './share.service';

@Controller('api/v1')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post('projects/:id/share')
  @UseGuards(JwtAuthGuard)
  @LogOperation({
    action: 'project.share',
    resource: 'project',
    resourceIdBuilder: (req) => req.params?.id,
  })
  createShare(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: CreateShareDto,
  ) {
    return this.shareService.createShare(id, req.user.userId, dto);
  }

  @Get('projects/:id/shares')
  @UseGuards(JwtAuthGuard)
  getShares(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.shareService.getShares(id, req.user.userId);
  }

  @Put('projects/:id/shares/:shareId')
  @UseGuards(JwtAuthGuard)
  updateShare(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Param('shareId') shareId: string,
    @Body() dto: UpdateShareDto,
  ) {
    return this.shareService.updateShare(id, shareId, req.user.userId, dto);
  }

  @Delete('projects/:id/shares/:shareId')
  @UseGuards(JwtAuthGuard)
  revokeShare(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Param('shareId') shareId: string,
  ) {
    return this.shareService.revokeShare(id, shareId, req.user.userId);
  }

  @Post('s/:shareToken/access')
  accessSharedProject(
    @Param('shareToken') shareToken: string,
    @Body('password') password?: string,
  ) {
    return this.shareService.accessSharedProject(shareToken, password);
  }

  @Put('s/:shareToken')
  updateSharedProject(
    @Param('shareToken') shareToken: string,
    @Body() dto: UpdateSharedProjectDto,
  ) {
    return this.shareService.updateSharedProject(shareToken, dto.password, {
      name: dto.name,
      components: dto.components,
    });
  }

  @Get('collaborations')
  @UseGuards(JwtAuthGuard)
  getMyCollaborations(@Request() req: { user: { userId: string } }) {
    return this.shareService.getMyCollaborations(req.user.userId);
  }

  @Post('projects/:id/collaborators')
  @UseGuards(JwtAuthGuard)
  addCollaborator(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: AddCollaboratorDto,
  ) {
    return this.shareService.addCollaborator(id, req.user.userId, dto);
  }

  @Get('projects/:id/collaborators')
  @UseGuards(JwtAuthGuard)
  getCollaborators(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.shareService.getCollaborators(id, req.user.userId);
  }

  @Put('projects/:id/collaborators/:userId')
  @UseGuards(JwtAuthGuard)
  updateCollaboratorRole(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Body('role') role: 'editor' | 'viewer',
  ) {
    return this.shareService.updateCollaboratorRole(
      id,
      targetUserId,
      req.user.userId,
      role,
    );
  }

  @Delete('projects/:id/collaborators/:userId')
  @UseGuards(JwtAuthGuard)
  removeCollaborator(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.shareService.removeCollaborator(id, targetUserId, req.user.userId);
  }
}
