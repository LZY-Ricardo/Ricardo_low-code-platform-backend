import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { BindDataDto } from './dto/bind-data.dto';
import { EditSelectionDto } from './dto/edit-selection.dto';
import { GenerateActionDto } from './dto/generate-action.dto';
import { GeneratePageDto } from './dto/generate-page.dto';
import { WorkbenchTaskDto } from './dto/workbench-task.dto';
import { OrchestratorService } from './orchestrator.service';

@Controller('api/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly orchestratorService: OrchestratorService,
  ) {}

  @Post('generate-page')
  generatePage(@Body() dto: GeneratePageDto) {
    return this.aiService.generatePage(dto);
  }

  @Post('edit-selection')
  editSelection(@Body() dto: EditSelectionDto) {
    return this.aiService.editSelection(dto);
  }

  @Post('bind-data')
  bindData(@Body() dto: BindDataDto) {
    return this.aiService.bindData(dto);
  }

  @Post('generate-action')
  generateAction(@Body() dto: GenerateActionDto) {
    return this.aiService.generateAction(dto);
  }

  @Post('workbench')
  runWorkbenchTask(@Body() dto: WorkbenchTaskDto) {
    return this.orchestratorService.runTask(dto);
  }
}
