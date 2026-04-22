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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { BatchImportDto } from './dto/batch-import.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LogOperation } from '../common/decorators/log-operation.decorator';

@Controller('api/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @LogOperation({
    action: 'project.create',
    resource: 'project',
    resourceIdBuilder: (_req) => null,
  })
  create(@Request() req, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(req.user.userId, createProjectDto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.projectsService.findAll(
      req.user.userId,
      Number(page) || 1,
      Number(pageSize) || 20,
      sortBy || 'updatedAt',
      order || 'desc',
    );
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.projectsService.findOne(req.user.userId, id);
  }

  @Put(':id')
  @LogOperation({
    action: 'project.update',
    resource: 'project',
    resourceIdBuilder: (req) => req.params?.id,
  })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(req.user.userId, id, updateProjectDto);
  }

  @Delete(':id')
  @LogOperation({
    action: 'project.delete',
    resource: 'project',
    resourceIdBuilder: (req) => req.params?.id,
  })
  remove(@Request() req, @Param('id') id: string) {
    return this.projectsService.remove(req.user.userId, id);
  }

  @Post('batch-import')
  @LogOperation({
    action: 'project.create',
    resource: 'project',
  })
  batchImport(@Request() req, @Body() batchImportDto: BatchImportDto) {
    return this.projectsService.batchImport(req.user.userId, batchImportDto);
  }
}
