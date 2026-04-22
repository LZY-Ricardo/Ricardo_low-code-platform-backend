import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { QueryTemplateDto } from './dto/query-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { LogOperation } from '../common/decorators/log-operation.decorator';

@Controller('api/templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(@Request() req, @Query() query: QueryTemplateDto) {
    const userId = req.user?.userId;
    return this.templatesService.findAll(query, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @LogOperation({
    action: 'template.create',
    resource: 'template',
  })
  create(@Request() req, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(req.user.userId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @LogOperation({
    action: 'template.update',
    resource: 'template',
    resourceIdBuilder: (req) => req.params?.id,
  })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @LogOperation({
    action: 'template.delete',
    resource: 'template',
    resourceIdBuilder: (req) => req.params?.id,
  })
  remove(@Request() req, @Param('id') id: string) {
    return this.templatesService.remove(req.user.userId, id);
  }

  @Post(':id/use')
  @UseGuards(JwtAuthGuard)
  @LogOperation({
    action: 'template.use',
    resource: 'template',
    resourceIdBuilder: (req) => req.params?.id,
  })
  incrementUseCount(@Param('id') id: string) {
    return this.templatesService.incrementUseCount(id);
  }
}
