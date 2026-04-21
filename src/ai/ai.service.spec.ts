import { AiService } from './ai.service';
import { AiAuditService } from './ai-audit.service';
import { OpenRouterService } from './openrouter.service';
import { PromptBuilderService } from './prompt-builder.service';
import { ResultParserService } from './result-parser.service';

describe('AiService', () => {
  it('falls back to local generation when openrouter is unavailable', async () => {
    const openRouterService = {
      isConfigured: jest.fn().mockReturnValue(false),
      generate: jest.fn(),
    } as unknown as OpenRouterService;

    const aiAuditService = {
      recordGeneratePage: jest.fn().mockResolvedValue(undefined),
    } as unknown as AiAuditService;

    const service = new AiService(
      openRouterService,
      new PromptBuilderService(),
      new ResultParserService(),
      aiAuditService,
      { summarize: () => 'ds summary' } as any,
    );

    const result = await service.generatePage({
      prompt: '生成一个运营数据看板',
    });

    expect(result.data.taskType).toBe('generate-page');
    expect(result.data.patches[0]?.name).toBe('Page');
    expect(result.data.summary).toContain('运营数据看板');
    expect(result.data.source).toBe('fallback');
    expect(result.data.fallbackReason).toBe('openrouter_not_configured');
    expect(aiAuditService.recordGeneratePage).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'fallback',
      }),
    );
  });

  it('parses openrouter output when available', async () => {
    const openRouterService = {
      isConfigured: jest.fn().mockReturnValue(true),
      generate: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          taskType: 'generate-page',
          summary: '生成了表单骨架',
          patches: [
            {
              id: 1,
              name: 'Page',
              props: {},
              desc: '页面',
            },
          ],
          warnings: [],
          confidence: 0.9,
        }),
        model: 'nvidia/demo',
        provider: 'OpenRouter',
      }),
    } as unknown as OpenRouterService;

    const aiAuditService = {
      recordGeneratePage: jest.fn().mockResolvedValue(undefined),
    } as unknown as AiAuditService;

    const service = new AiService(
      openRouterService,
      new PromptBuilderService(),
      new ResultParserService(),
      aiAuditService,
      { summarize: () => 'ds summary' } as any,
    );

    const result = await service.generatePage({
      prompt: '生成一个报名表单',
    });

    expect(result.data.summary).toBe('生成了表单骨架');
    expect(openRouterService.generate).toHaveBeenCalled();
    expect(result.data.source).toBe('openrouter');
    expect(result.data.sourceModel).toBe('nvidia/demo');
    expect(result.data.sourceProvider).toBe('OpenRouter');
    expect(aiAuditService.recordGeneratePage).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'openrouter',
        sourceModel: 'nvidia/demo',
      }),
    );
  });

  it('falls back to local edit-selection when openrouter is unavailable', async () => {
    const openRouterService = {
      isConfigured: jest.fn().mockReturnValue(false),
      generate: jest.fn(),
    } as unknown as OpenRouterService;

    const aiAuditService = {
      recordGeneratePage: jest.fn().mockResolvedValue(undefined),
      recordEditSelection: jest.fn().mockResolvedValue(undefined),
    } as unknown as AiAuditService;

    const service = new AiService(
      openRouterService,
      new PromptBuilderService(),
      new ResultParserService(),
      aiAuditService,
    );

    const result = await service.editSelection({
      prompt: '把这个区块改成报名表单',
      selectedComponentId: 2,
      components: [
        { id: 1, name: 'Page', props: {}, desc: '页面', children: [{ id: 2, name: 'Container', props: {}, desc: '容器', parentId: 1 }] },
      ],
    });

    expect(result.data.taskType).toBe('edit-selection');
    expect(result.data.targetComponentId).toBe(2);
    expect(result.data.source).toBe('fallback');
    expect(aiAuditService.recordEditSelection).toHaveBeenCalled();
  });

  it('falls back to bind-data suggestions when openrouter is unavailable', async () => {
    const openRouterService = {
      isConfigured: jest.fn().mockReturnValue(false),
    } as unknown as OpenRouterService;

    const aiAuditService = {
      recordGeneratePage: jest.fn().mockResolvedValue(undefined),
      recordEditSelection: jest.fn().mockResolvedValue(undefined),
      recordBindData: jest.fn().mockResolvedValue(undefined),
      recordGenerateAction: jest.fn().mockResolvedValue(undefined),
    } as unknown as AiAuditService;

    const service = new AiService(
      openRouterService,
      new PromptBuilderService(),
      new ResultParserService(),
      aiAuditService,
      { summarize: () => 'ds summary' } as any,
    );

    const result = await service.bindData({
      components: [
        { id: 1, name: 'Page', props: {}, desc: '页面', children: [{ id: 2, name: 'Table', props: {}, desc: '表格', parentId: 1 }] },
      ],
      dataSources: [{ id: 'ds_1', resultKey: 'userList' }],
    });

    expect(result.data.taskType).toBe('bind-data');
    expect(result.data.suggestions[0]?.componentName).toBe('Table');
    expect(aiAuditService.recordBindData).toHaveBeenCalled();
  });

  it('falls back to action suggestions when openrouter is unavailable', async () => {
    const openRouterService = {
      isConfigured: jest.fn().mockReturnValue(false),
    } as unknown as OpenRouterService;

    const aiAuditService = {
      recordGeneratePage: jest.fn().mockResolvedValue(undefined),
      recordEditSelection: jest.fn().mockResolvedValue(undefined),
      recordBindData: jest.fn().mockResolvedValue(undefined),
      recordGenerateAction: jest.fn().mockResolvedValue(undefined),
    } as unknown as AiAuditService;

    const service = new AiService(
      openRouterService,
      new PromptBuilderService(),
      new ResultParserService(),
      aiAuditService,
      { summarize: () => 'ds summary' } as any,
    );

    const result = await service.generateAction({
      components: [
        { id: 1, name: 'Page', props: {}, desc: '页面', children: [{ id: 2, name: 'Button', props: {}, desc: '按钮', parentId: 1 }] },
      ],
      dataSources: [{ id: 'ds_1', resultKey: 'userList' }],
    });

    expect(result.data.taskType).toBe('generate-action');
    expect(result.data.suggestions[0]?.eventType).toBe('onClick');
    expect(aiAuditService.recordGenerateAction).toHaveBeenCalled();
  });

  it('normalizes bind-data suggestion targets to existing component ids', async () => {
    const openRouterService = {
      isConfigured: jest.fn().mockReturnValue(true),
      generateBindData: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          taskType: 'bind-data',
          summary: '绑定建议',
          suggestions: [
            {
              componentId: 999,
              componentName: 'Table',
              bindings: { dataSource: 'requestResults.userList' },
              dataSourceId: 'ds_1',
              resultKey: 'userList',
              stateSuggestions: [],
            },
          ],
          warnings: [],
          confidence: 0.8,
        }),
        model: 'nvidia/demo',
        provider: 'OpenRouter',
      }),
    } as unknown as OpenRouterService;

    const aiAuditService = {
      recordGeneratePage: jest.fn().mockResolvedValue(undefined),
      recordEditSelection: jest.fn().mockResolvedValue(undefined),
      recordBindData: jest.fn().mockResolvedValue(undefined),
      recordGenerateAction: jest.fn().mockResolvedValue(undefined),
    } as unknown as AiAuditService;

    const service = new AiService(
      openRouterService,
      new PromptBuilderService(),
      new ResultParserService(),
      aiAuditService,
      { summarize: () => 'ds summary' } as any,
    );

    const result = await service.bindData({
      components: [{ id: 1, name: 'Page', props: {}, desc: '页面', children: [{ id: 2, name: 'Table', props: {}, desc: '表格', parentId: 1 }] }],
      dataSources: [{ id: 'ds_1', resultKey: 'userList' }],
    });

    expect(result.data.suggestions[0]?.componentId).toBe(2);
  });

  it('normalizes action suggestions to existing trigger components', async () => {
    const openRouterService = {
      isConfigured: jest.fn().mockReturnValue(true),
      generateAction: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          taskType: 'generate-action',
          summary: '动作建议',
          suggestions: [
            {
              componentId: 999,
              eventType: 'onClick',
              actionType: 'callAPI',
              actionConfig: { dataSourceId: 'ds_1', resultKey: 'userList' },
              reason: '点击后调用接口',
            },
          ],
          warnings: [],
          confidence: 0.8,
        }),
        model: 'nvidia/demo',
        provider: 'OpenRouter',
      }),
    } as unknown as OpenRouterService;

    const aiAuditService = {
      recordGeneratePage: jest.fn().mockResolvedValue(undefined),
      recordEditSelection: jest.fn().mockResolvedValue(undefined),
      recordBindData: jest.fn().mockResolvedValue(undefined),
      recordGenerateAction: jest.fn().mockResolvedValue(undefined),
    } as unknown as AiAuditService;

    const service = new AiService(
      openRouterService,
      new PromptBuilderService(),
      new ResultParserService(),
      aiAuditService,
      { summarize: () => 'ds summary' } as any,
    );

    const result = await service.generateAction({
      selectedComponentId: 2,
      components: [{ id: 1, name: 'Page', props: {}, desc: '页面', children: [{ id: 2, name: 'Button', props: {}, desc: '按钮', parentId: 1 }] }],
      dataSources: [{ id: 'ds_1', resultKey: 'userList' }],
    });

    expect(result.data.suggestions[0]?.componentId).toBe(2);
  });
});
