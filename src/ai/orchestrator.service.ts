import { BadRequestException, Injectable } from '@nestjs/common';
import { AiService } from './ai.service';
import type { WorkbenchTaskDto } from './dto/workbench-task.dto';
import { AiTelemetryService } from './telemetry.service';

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly aiService: AiService,
    private readonly telemetryService: AiTelemetryService,
  ) {}

  async runTask(dto: WorkbenchTaskDto) {
    const startedAt = Date.now();
    try {
      let result;

      switch (dto.taskType) {
        case 'generate-page':
          if (!dto.prompt) {
            throw new BadRequestException('generate-page 任务缺少 prompt');
          }
          result = await this.aiService.generatePage({
            prompt: dto.prompt,
            components: dto.components,
            currentThemeId: dto.currentThemeId,
            currentProjectId: dto.currentProjectId,
          });
          break;
        case 'edit-selection':
          if (!dto.prompt || !dto.selectedComponentId || !dto.components) {
            throw new BadRequestException('edit-selection 任务参数不完整');
          }
          result = await this.aiService.editSelection({
            prompt: dto.prompt,
            selectedComponentId: dto.selectedComponentId,
            components: dto.components,
            currentThemeId: dto.currentThemeId,
            currentProjectId: dto.currentProjectId,
            selectionSummary: dto.selectionSummary,
            conversationSummary: dto.conversationSummary,
          });
          break;
        case 'bind-data':
          result = await this.aiService.bindData({
            prompt: dto.prompt,
            components: dto.components ?? [],
            dataSources: dto.dataSources ?? [],
            currentThemeId: dto.currentThemeId,
            currentProjectId: dto.currentProjectId,
            selectedComponentId: dto.selectedComponentId,
            conversationSummary: dto.conversationSummary,
          });
          break;
        case 'generate-action':
          result = await this.aiService.generateAction({
            prompt: dto.prompt,
            components: dto.components ?? [],
            dataSources: dto.dataSources ?? [],
            currentThemeId: dto.currentThemeId,
            currentProjectId: dto.currentProjectId,
            selectedComponentId: dto.selectedComponentId,
            conversationSummary: dto.conversationSummary,
          });
          break;
        default:
          throw new BadRequestException('不支持的 workbench 任务类型');
      }

      await this.telemetryService.recordTask({
        taskType: dto.taskType,
        status: 'success',
        durationMs: Date.now() - startedAt,
        source: result.data?.source,
      });

      return result;
    } catch (error) {
      await this.telemetryService.recordTask({
        taskType: dto.taskType,
        status: 'error',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'unknown_error',
      });
      throw error;
    }
  }
}
