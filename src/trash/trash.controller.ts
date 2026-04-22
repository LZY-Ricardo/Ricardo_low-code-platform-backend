import { Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TrashService } from './trash.service';

@Controller('api/v1/trash')
@UseGuards(JwtAuthGuard)
export class TrashController {
  constructor(private readonly trashService: TrashService) {}

  @Get()
  list(
    @Request() req: { user: { userId: string } },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.trashService.list(
      req.user.userId,
      Number(page) || 1,
      Number(pageSize) || 20,
    );
  }

  @Post(':id/restore')
  restore(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.trashService.restore(id, req.user.userId);
  }

  @Delete(':id')
  permanentDelete(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.trashService.permanentDelete(id, req.user.userId);
  }
}
