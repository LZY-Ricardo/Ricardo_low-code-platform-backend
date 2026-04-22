import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { LogOperation } from '../common/decorators/log-operation.decorator';
import { ComponentsService } from './components.service';
import { InteractionsService } from './interactions.service';
import { MarketTemplatesService } from './templates.service';

@Controller('api/v1/market')
export class MarketController {
  constructor(
    private readonly componentsService: ComponentsService,
    private readonly templatesService: MarketTemplatesService,
    private readonly interactionsService: InteractionsService,
  ) {}

  @Post('components')
  @UseGuards(JwtAuthGuard)
  @LogOperation({ action: 'component.create', resource: 'component' })
  createComponent(@Request() req: { user: { userId: string } }, @Body() dto: Record<string, any>) {
    return this.componentsService.create(req.user.userId, dto);
  }

  @Get('components')
  findPublicComponents(@Query() query: Record<string, any>) {
    return this.componentsService.findPublic(query);
  }

  @Get('components/mine')
  @UseGuards(JwtAuthGuard)
  findMyComponents(@Request() req: { user: { userId: string } }) {
    return this.componentsService.findMine(req.user.userId);
  }

  @Get('components/:id')
  findComponentDetail(@Param('id') id: string) {
    return this.componentsService.findOne(id);
  }

  @Put('components/:id')
  @UseGuards(JwtAuthGuard)
  updateComponent(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.componentsService.update(id, req.user.userId, dto);
  }

  @Delete('components/:id')
  @UseGuards(JwtAuthGuard)
  removeComponent(@Request() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.componentsService.remove(id, req.user.userId);
  }

  @Post('components/:id/install')
  @UseGuards(JwtAuthGuard)
  @LogOperation({
    action: 'component.install',
    resource: 'component',
    resourceIdBuilder: (req) => req.params?.id,
  })
  installComponent(@Param('id') id: string) {
    return this.componentsService.install(id);
  }

  @Post('templates')
  @UseGuards(JwtAuthGuard)
  createTemplate(@Request() req: { user: { userId: string } }, @Body() dto: Record<string, any>) {
    return this.templatesService.create(req.user.userId, dto);
  }

  @Get('templates')
  findPublicTemplates(@Query() query: Record<string, any>) {
    return this.templatesService.findPublic(query);
  }

  @Get('templates/mine')
  @UseGuards(JwtAuthGuard)
  findMyTemplates(@Request() req: { user: { userId: string } }) {
    return this.templatesService.findMine(req.user.userId);
  }

  @Get('templates/:id')
  findTemplateDetail(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Put('templates/:id')
  @UseGuards(JwtAuthGuard)
  updateTemplate(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.templatesService.update(id, req.user.userId, dto);
  }

  @Delete('templates/:id')
  @UseGuards(JwtAuthGuard)
  removeTemplate(@Request() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.templatesService.remove(id, req.user.userId);
  }

  @Post('templates/:id/use')
  @UseGuards(JwtAuthGuard)
  @LogOperation({
    action: 'template.use',
    resource: 'template',
    resourceIdBuilder: (req) => req.params?.id,
  })
  useTemplate(@Param('id') id: string) {
    return this.templatesService.useTemplate(id);
  }

  @Post('like')
  @UseGuards(JwtAuthGuard)
  @LogOperation({
    action: 'market.like',
    resource: 'market',
  })
  toggleLike(
    @Request() req: { user: { userId: string } },
    @Body() dto: { targetType: 'component' | 'template'; targetId: string },
  ) {
    return this.interactionsService.toggleLike(req.user.userId, dto.targetType, dto.targetId);
  }

  @Get(':targetType/:targetId/likes')
  @UseGuards(OptionalJwtAuthGuard)
  getLikeStatus(
    @Request() req: { user?: { userId?: string } },
    @Param('targetType') targetType: 'component' | 'template',
    @Param('targetId') targetId: string,
  ) {
    return this.interactionsService.getLikeStatus(req.user?.userId, targetType, targetId);
  }

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  @LogOperation({
    action: 'market.review',
    resource: 'market',
  })
  createReview(
    @Request() req: { user: { userId: string } },
    @Body()
    dto: { targetType: 'component' | 'template'; targetId: string; rating: number; content: string },
  ) {
    return this.interactionsService.createReview(req.user.userId, dto);
  }

  @Get(':targetType/:targetId/reviews')
  getReviews(
    @Param('targetType') targetType: 'component' | 'template',
    @Param('targetId') targetId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.interactionsService.getReviews(
      targetType,
      targetId,
      Number(page) || 1,
      Number(pageSize) || 10,
    );
  }

  @Put('reviews/:id')
  @UseGuards(JwtAuthGuard)
  updateReview(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: { rating?: number; content?: string },
  ) {
    return this.interactionsService.updateReview(id, req.user.userId, dto);
  }

  @Delete('reviews/:id')
  @UseGuards(JwtAuthGuard)
  deleteReview(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.interactionsService.deleteReview(id, req.user.userId);
  }
}
