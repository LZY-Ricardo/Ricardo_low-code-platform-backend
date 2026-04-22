import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryLogsDto } from './dto/query-logs.dto';
import { LogsService } from './logs.service';

@Controller('api/v1/logs')
@UseGuards(JwtAuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  findAll(
    @Request() req: { user: { userId: string } },
    @Query() query: QueryLogsDto,
  ) {
    return this.logsService.findAll(req.user.userId, query);
  }
}
