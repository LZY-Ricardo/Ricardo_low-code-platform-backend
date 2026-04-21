import { OrchestratorService } from './orchestrator.service';
import { AiService } from './ai.service';
import { AiTelemetryService } from './telemetry.service';

describe('OrchestratorService', () => {
  it('routes generate-page task to ai service', async () => {
    const aiService = {
      generatePage: jest.fn().mockResolvedValue({ code: 0, data: { taskType: 'generate-page' } }),
      editSelection: jest.fn(),
      bindData: jest.fn(),
      generateAction: jest.fn(),
    } as unknown as AiService;
    const telemetry = {
      recordTask: jest.fn().mockResolvedValue(undefined),
    } as unknown as AiTelemetryService;

    const service = new OrchestratorService(aiService, telemetry);
    const result = await service.runTask({ taskType: 'generate-page', prompt: '生成看板' });

    expect(aiService.generatePage).toHaveBeenCalled();
    expect(telemetry.recordTask).toHaveBeenCalledWith(expect.objectContaining({ taskType: 'generate-page', status: 'success' }));
    expect(result.data.taskType).toBe('generate-page');
  });

  it('routes generate-action task to ai service', async () => {
    const aiService = {
      generatePage: jest.fn(),
      editSelection: jest.fn(),
      bindData: jest.fn(),
      generateAction: jest.fn().mockResolvedValue({ code: 0, data: { taskType: 'generate-action' } }),
    } as unknown as AiService;
    const telemetry = {
      recordTask: jest.fn().mockResolvedValue(undefined),
    } as unknown as AiTelemetryService;

    const service = new OrchestratorService(aiService, telemetry);
    const result = await service.runTask({ taskType: 'generate-action', components: [], dataSources: [] });

    expect(aiService.generateAction).toHaveBeenCalled();
    expect(result.data.taskType).toBe('generate-action');
  });
});
