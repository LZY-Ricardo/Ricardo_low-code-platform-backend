import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LogOperation } from '../common/decorators/log-operation.decorator';
import { CreateFormDto } from './dto/create-form.dto';
import { QueryFormRecordsDto } from './dto/query-form-records.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { FormsService } from './forms.service';

@Controller('api/v1/forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @LogOperation({
    action: 'form.create',
    resource: 'form',
  })
  create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateFormDto,
  ) {
    return this.formsService.create(req.user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Request() req: { user: { userId: string } },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.formsService.findAll(
      req.user.userId,
      Number(page) || 1,
      Number(pageSize) || 20,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.formsService.findOne(id, req.user.userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateFormDto,
  ) {
    return this.formsService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.formsService.remove(id, req.user.userId);
  }

  @Post(':id/submit')
  @LogOperation({
    action: 'form.submit',
    resource: 'form',
    resourceIdBuilder: (req) => req.params?.id,
    detailBuilder: (_req, response) =>
      response && typeof response === 'object'
        ? { status: 'submitted' }
        : { status: 'submitted' },
  })
  submit(
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
    @Req() req: ExpressRequest,
  ) {
    return this.formsService.submit(id, payload, req.ip, req.headers['user-agent'] ?? null);
  }

  @Get(':id/records')
  @UseGuards(JwtAuthGuard)
  getRecords(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Query() query: QueryFormRecordsDto,
  ) {
    return this.formsService.getRecords(id, req.user.userId, query);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  getStats(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.formsService.getStats(id, req.user.userId);
  }

  @Get(':id/export')
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename=form_data.csv')
  async exportCsv(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.formsService.exportCSV(id, req.user.userId);
  }
}
