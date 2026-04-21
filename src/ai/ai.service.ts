import { Injectable, Logger } from '@nestjs/common';
import type { BindDataDto } from './dto/bind-data.dto';
import { AiAuditService } from './ai-audit.service';
import { DataSourceContextService } from './data-source-context.service';
import type { EditSelectionDto } from './dto/edit-selection.dto';
import type { GenerateActionDto } from './dto/generate-action.dto';
import type { GeneratePageDto } from './dto/generate-page.dto';
import { OpenRouterService } from './openrouter.service';
import { PromptBuilderService } from './prompt-builder.service';
import {
  type ActionSuggestion,
  ResultParserService,
  type AiComponentNode,
  type BindDataResult,
  type BindDataSuggestion,
  type EditSelectionResult,
  type GenerateActionResult,
  type GeneratePageResult,
} from './result-parser.service';

export interface AiSuccessResponse<T> {
  code: 0;
  message: string;
  data: T;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly openRouterService: OpenRouterService,
    private readonly promptBuilderService: PromptBuilderService,
    private readonly resultParserService: ResultParserService,
    private readonly aiAuditService: AiAuditService,
    private readonly dataSourceContextService: DataSourceContextService,
  ) {}

  async generatePage(
    dto: GeneratePageDto,
  ): Promise<AiSuccessResponse<GeneratePageResult>> {
    const prompt = dto.prompt.trim();
    let result: GeneratePageResult;

    if (this.openRouterService.isConfigured()) {
      try {
        const builtPrompt = this.promptBuilderService.buildGeneratePagePrompt({
          ...dto,
          prompt,
        });
        const generation = await this.openRouterService.generate(builtPrompt);
        const parsed = this.resultParserService.parseGeneratePageResult(
          generation.content,
        );
        result = {
          ...parsed,
          source: 'openrouter',
          sourceModel: generation.model,
          sourceProvider: generation.provider,
        };
        this.logger.log(
          `generate-page source=openrouter model=${generation.model} prompt="${truncatePrompt(
            prompt,
          )}" confidence=${result.confidence}`,
        );
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : 'unknown_openrouter_error';
        result = this.buildFallbackResult(prompt, reason);
        this.logger.warn(
          `generate-page fallback=true prompt="${truncatePrompt(
            prompt,
          )}" reason="${reason}"`,
        );
      }
    } else {
      result = this.buildFallbackResult(prompt, 'openrouter_not_configured');
      this.logger.log(
        `generate-page source=fallback prompt="${truncatePrompt(
          prompt,
        )}" reason="openrouter_not_configured"`,
      );
    }

    await this.aiAuditService.recordGeneratePage({
      prompt,
      source: result.source,
      sourceModel: result.sourceModel,
      sourceProvider: result.sourceProvider,
      fallbackReason: result.fallbackReason,
      summary: result.summary,
      confidence: result.confidence,
      warnings: result.warnings,
    });

    return {
      code: 0,
      message: '生成成功',
      data: result,
    };
  }

  async editSelection(
    dto: EditSelectionDto,
  ): Promise<AiSuccessResponse<EditSelectionResult>> {
    const prompt = dto.prompt.trim();
    let result: EditSelectionResult;

    if (this.openRouterService.isConfigured()) {
      try {
        const builtPrompt = this.promptBuilderService.buildEditSelectionPrompt({
          ...dto,
          prompt,
        });
        const generation =
          await this.openRouterService.generateEditSelection(builtPrompt);
        const parsed = this.resultParserService.parseEditSelectionResult(
          generation.content,
        );
        result = {
          ...parsed,
          source: 'openrouter',
          sourceModel: generation.model,
          sourceProvider: generation.provider,
        };
        this.logger.log(
          `edit-selection source=openrouter model=${generation.model} target=${dto.selectedComponentId} prompt="${truncatePrompt(
            prompt,
          )}" confidence=${result.confidence}`,
        );
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : 'unknown_openrouter_error';
        result = this.buildFallbackEditSelection(dto, reason);
        this.logger.warn(
          `edit-selection fallback=true target=${dto.selectedComponentId} prompt="${truncatePrompt(
            prompt,
          )}" reason="${reason}"`,
        );
      }
    } else {
      result = this.buildFallbackEditSelection(
        dto,
        'openrouter_not_configured',
      );
      this.logger.log(
        `edit-selection source=fallback target=${dto.selectedComponentId} prompt="${truncatePrompt(
          prompt,
        )}" reason="openrouter_not_configured"`,
      );
    }

    await this.aiAuditService.recordEditSelection({
      prompt,
      selectedComponentId: dto.selectedComponentId,
      source: result.source,
      sourceModel: result.sourceModel,
      sourceProvider: result.sourceProvider,
      fallbackReason: result.fallbackReason,
      summary: result.summary,
      confidence: result.confidence,
      warnings: result.warnings,
    });

    return {
      code: 0,
      message: '修改成功',
      data: result,
    };
  }

  async bindData(
    dto: BindDataDto,
  ): Promise<AiSuccessResponse<BindDataResult>> {
    const prompt = dto.prompt?.trim() || '为当前页面生成数据绑定建议';
    const dataSourceSummary = this.dataSourceContextService.summarize(dto.dataSources);
    const componentSummary = summarizeComponents(dto.components);
    let result: BindDataResult;

    if (this.openRouterService.isConfigured()) {
      try {
        const builtPrompt = this.promptBuilderService.buildBindDataPrompt(
          { ...dto, prompt },
          dataSourceSummary,
          componentSummary,
        );
        const generation = await this.openRouterService.generateBindData(builtPrompt);
        const parsed = this.resultParserService.parseBindDataResult(generation.content);
        result = {
          ...parsed,
          suggestions: normalizeBindDataSuggestions(parsed.suggestions, dto.components),
          source: 'openrouter',
          sourceModel: generation.model,
          sourceProvider: generation.provider,
        };
        if (result.suggestions.length === 0) {
          result = this.buildFallbackBindData(dto, 'openrouter_empty_suggestions');
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown_openrouter_error';
        result = this.buildFallbackBindData(dto, reason);
      }
    } else {
      result = this.buildFallbackBindData(dto, 'openrouter_not_configured');
    }

    await this.aiAuditService.recordBindData({
      source: result.source,
      sourceModel: result.sourceModel,
      sourceProvider: result.sourceProvider,
      fallbackReason: result.fallbackReason,
      summary: result.summary,
      confidence: result.confidence,
      suggestionCount: result.suggestions.length,
    });

    return {
      code: 0,
      message: '绑定建议生成成功',
      data: result,
    };
  }

  async generateAction(
    dto: GenerateActionDto,
  ): Promise<AiSuccessResponse<GenerateActionResult>> {
    const prompt = dto.prompt?.trim() || '为当前页面生成动作链建议';
    const dataSourceSummary = this.dataSourceContextService.summarize(dto.dataSources);
    const componentSummary = summarizeComponents(dto.components);
    let result: GenerateActionResult;

    if (this.openRouterService.isConfigured()) {
      try {
        const builtPrompt = this.promptBuilderService.buildGenerateActionPrompt(
          { ...dto, prompt },
          dataSourceSummary,
          componentSummary,
        );
        const generation = await this.openRouterService.generateAction(builtPrompt);
        const parsed = this.resultParserService.parseGenerateActionResult(generation.content);
        result = {
          ...parsed,
          suggestions: normalizeActionSuggestions(
            parsed.suggestions,
            dto.components,
            dto.selectedComponentId,
          ),
          source: 'openrouter',
          sourceModel: generation.model,
          sourceProvider: generation.provider,
        };
        if (result.suggestions.length === 0) {
          result = this.buildFallbackGenerateAction(dto, 'openrouter_empty_suggestions');
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown_openrouter_error';
        result = this.buildFallbackGenerateAction(dto, reason);
      }
    } else {
      result = this.buildFallbackGenerateAction(dto, 'openrouter_not_configured');
    }

    await this.aiAuditService.recordGenerateAction({
      source: result.source,
      sourceModel: result.sourceModel,
      sourceProvider: result.sourceProvider,
      fallbackReason: result.fallbackReason,
      summary: result.summary,
      confidence: result.confidence,
      suggestionCount: result.suggestions.length,
    });

    return {
      code: 0,
      message: '动作建议生成成功',
      data: result,
    };
  }

  private buildFallbackResult(
    prompt: string,
    fallbackReason: string,
  ): GeneratePageResult {
    const normalized = prompt.toLowerCase();

    if (
      normalized.includes('表单') ||
      normalized.includes('报名') ||
      normalized.includes('申请')
    ) {
      return {
        taskType: 'generate-page',
        summary: '已生成活动报名表单骨架',
        patches: buildFormPage(),
        warnings: ['当前结果由本地规则生成器提供，建议后续补充真实数据绑定。'],
        confidence: 0.68,
        source: 'fallback',
        fallbackReason,
      };
    }

    if (
      normalized.includes('看板') ||
      normalized.includes('dashboard') ||
      normalized.includes('数据')
    ) {
      return {
        taskType: 'generate-page',
        summary: '已生成运营数据看板骨架',
        patches: buildDashboardPage(),
        warnings: ['当前结果由本地规则生成器提供，图表数据为演示数据。'],
        confidence: 0.72,
        source: 'fallback',
        fallbackReason,
      };
    }

    if (
      normalized.includes('列表') ||
      normalized.includes('管理') ||
      normalized.includes('用户')
    ) {
      return {
        taskType: 'generate-page',
        summary: '已生成后台管理列表骨架',
        patches: buildListPage(),
        warnings: ['当前结果由本地规则生成器提供，筛选与表格尚未绑定数据源。'],
        confidence: 0.7,
        source: 'fallback',
        fallbackReason,
      };
    }

    return {
      taskType: 'generate-page',
      summary: '已生成通用落地页骨架',
      patches: buildLandingPage(),
      warnings: ['当前结果由本地规则生成器提供，可继续通过 AI 做二次调整。'],
      confidence: 0.64,
      source: 'fallback',
      fallbackReason,
    };
  }

  private buildFallbackEditSelection(
    dto: EditSelectionDto,
    fallbackReason: string,
  ): EditSelectionResult {
    const normalized = dto.prompt.toLowerCase();
    let patch: AiComponentNode;
    let summary = '已根据本地规则生成选区替换结果';
    const warnings = ['当前结果由本地规则生成器提供，建议人工确认后应用。'];

    if (
      normalized.includes('表单') ||
      normalized.includes('报名') ||
      normalized.includes('申请')
    ) {
      patch = buildFormPage()[0]?.children?.[0] ?? {
        id: 1,
        name: 'Form',
        props: { layout: 'vertical' },
        desc: '表单',
      };
      summary = '已将当前选区改造成报名表单';
    } else if (
      normalized.includes('按钮') ||
      normalized.includes('cta') ||
      normalized.includes('提交')
    ) {
      patch = {
        id: 1,
        name: 'Button',
        props: { type: 'primary', text: '立即提交' },
        desc: '按钮',
      };
      summary = '已将当前选区改造成主操作按钮';
    } else {
      patch = {
        id: 1,
        name: 'Container',
        props: {},
        desc: '容器',
        children: [
          {
            id: 2,
            name: 'Title',
            props: { text: dto.prompt.slice(0, 12) || '智能改造区块', level: 3 },
            desc: '标题',
          },
          {
            id: 3,
            name: 'Text',
            props: { text: '该区域已按需求重新组织。' },
            desc: '文本',
          },
        ],
      };
    }

    return {
      taskType: 'edit-selection',
      summary,
      targetComponentId: dto.selectedComponentId,
      operation: 'replace',
      patch,
      warnings,
      confidence: 0.65,
      source: 'fallback',
      fallbackReason,
    };
  }

  private buildFallbackBindData(
    dto: BindDataDto,
    fallbackReason: string,
  ): BindDataResult {
    const suggestions = findBindableSuggestions(dto.components, dto.dataSources);
    return {
      taskType: 'bind-data',
      summary: suggestions.length > 0 ? '已生成当前页面的数据绑定建议' : '当前页面暂无可推荐的数据绑定建议',
      suggestions,
      warnings: suggestions.length > 0
        ? ['当前结果由本地规则生成器提供，请人工确认字段映射。']
        : ['未发现可绑定的数据组件或可用数据源。'],
      confidence: suggestions.length > 0 ? 0.72 : 0.4,
      source: 'fallback',
      fallbackReason,
    };
  }

  private buildFallbackGenerateAction(
    dto: GenerateActionDto,
    fallbackReason: string,
  ): GenerateActionResult {
    const suggestions = findActionSuggestions(dto.components, dto.dataSources);
    return {
      taskType: 'generate-action',
      summary: suggestions.length > 0 ? '已生成当前页面的动作链建议' : '当前页面暂无可推荐的动作链建议',
      suggestions,
      warnings: suggestions.length > 0
        ? ['当前结果由本地规则生成器提供，请人工确认事件与动作链。']
        : ['未发现合适的动作建议目标。'],
      confidence: suggestions.length > 0 ? 0.69 : 0.4,
      source: 'fallback',
      fallbackReason,
    };
  }
}

function truncatePrompt(prompt: string): string {
  return prompt.length > 80 ? `${prompt.slice(0, 77)}...` : prompt;
}

function buildDashboardPage(): AiComponentNode[] {
  return [
    {
      id: 1,
      name: 'Page',
      props: {},
      desc: '页面',
      children: [
        {
          id: 2,
          name: 'Title',
          props: { text: '运营数据看板', level: 2 },
          desc: '标题',
          parentId: 1,
        },
        {
          id: 3,
          name: 'Chart',
          props: {
            title: '核心趋势',
            chartType: 'line',
            dataText: '周一,120\n周二,180\n周三,160',
          },
          desc: '图表',
          parentId: 1,
        },
        {
          id: 4,
          name: 'Table',
          props: {
            columnsText: '指标,数值',
            dataText: '访问量,1200\n转化率,15',
          },
          desc: '表格',
          parentId: 1,
        },
      ],
    },
  ];
}

function buildFormPage(): AiComponentNode[] {
  return [
    {
      id: 1,
      name: 'Page',
      props: {},
      desc: '页面',
      children: [
        {
          id: 2,
          name: 'Form',
          props: { title: '活动报名', layout: 'vertical' },
          desc: '表单',
          parentId: 1,
          children: [
            {
              id: 3,
              name: 'Input',
              props: { placeholder: '请输入姓名', value: '' },
              desc: '输入框',
              parentId: 2,
            },
            {
              id: 4,
              name: 'Select',
              props: {
                placeholder: '请选择类型',
                optionsText: '学生,教师,访客',
                value: '',
              },
              desc: '下拉框',
              parentId: 2,
            },
            {
              id: 5,
              name: 'DatePicker',
              props: { placeholder: '请选择日期', value: '' },
              desc: '日期选择',
              parentId: 2,
            },
            {
              id: 6,
              name: 'Button',
              props: { type: 'primary', text: '提交' },
              desc: '按钮',
              parentId: 2,
            },
          ],
        },
      ],
    },
  ];
}

function buildListPage(): AiComponentNode[] {
  return [
    {
      id: 1,
      name: 'Page',
      props: {},
      desc: '页面',
      children: [
        {
          id: 2,
          name: 'Title',
          props: { text: '用户管理', level: 2 },
          desc: '标题',
          parentId: 1,
        },
        {
          id: 3,
          name: 'Form',
          props: { title: '筛选条件', layout: 'inline' },
          desc: '表单',
          parentId: 1,
          children: [
            {
              id: 4,
              name: 'Input',
              props: { placeholder: '搜索用户', value: '' },
              desc: '输入框',
              parentId: 3,
            },
            {
              id: 5,
              name: 'Button',
              props: { type: 'primary', text: '查询' },
              desc: '按钮',
              parentId: 3,
            },
          ],
        },
        {
          id: 6,
          name: 'Table',
          props: {
            columnsText: '姓名,角色,状态',
            dataText: '张三,管理员,启用\n李四,编辑,停用',
          },
          desc: '表格',
          parentId: 1,
        },
      ],
    },
  ];
}

function buildLandingPage(): AiComponentNode[] {
  return [
    {
      id: 1,
      name: 'Page',
      props: {},
      desc: '页面',
      children: [
        {
          id: 2,
          name: 'Title',
          props: { text: '智能生成页面', level: 2 },
          desc: '标题',
          parentId: 1,
        },
        {
          id: 3,
          name: 'Text',
          props: { text: '这是根据描述生成的页面骨架。' },
          desc: '文本',
          parentId: 1,
        },
        {
          id: 4,
          name: 'Button',
          props: { type: 'primary', text: '开始使用' },
          desc: '按钮',
          parentId: 1,
        },
      ],
    },
  ];
}

interface FlatComponentLike {
  id: number;
  name: string;
  parentId?: number;
  children?: FlatComponentLike[];
}

interface DataSourceLike {
  id?: string;
  resultKey?: string;
}

function findBindableSuggestions(
  components: unknown[],
  dataSources: unknown[],
): BindDataSuggestion[] {
  const firstDataSource = Array.isArray(dataSources)
    ? (dataSources.find(isDataSourceLike) as DataSourceLike | undefined)
    : undefined;

  if (!firstDataSource?.resultKey) {
    return [];
  }

  const flattened = flattenComponents(components);
  const suggestions: BindDataSuggestion[] = [];

  flattened.forEach((component) => {
    if (component.name === 'Table' || component.name === 'Chart') {
      suggestions.push({
        componentId: component.id,
        componentName: component.name,
        bindings: {
          dataSource: `requestResults.${firstDataSource.resultKey}`,
        },
        dataSourceId: firstDataSource.id,
        resultKey: firstDataSource.resultKey,
        stateSuggestions: [
          '建议补充加载态文案：数据加载中',
          '建议补充空状态：暂无数据',
          '建议补充错误态：加载失败，请重试',
        ],
      });
      return;
    }

    if (component.name === 'Title' || component.name === 'Text') {
      suggestions.push({
        componentId: component.id,
        componentName: component.name,
        bindings: {
          text: `{{requestResults.${firstDataSource.resultKey}.0.name}}`,
        },
        dataSourceId: firstDataSource.id,
        resultKey: firstDataSource.resultKey,
        stateSuggestions: ['建议在接口无结果时保留默认文案'],
      });
    }
  });

  return suggestions;
}

function findActionSuggestions(
  components: unknown[],
  dataSources: unknown[],
): ActionSuggestion[] {
  const flattened = flattenComponents(components);
  const firstDataSource = Array.isArray(dataSources)
    ? (dataSources.find(isDataSourceLike) as DataSourceLike | undefined)
    : undefined;
  const buttons = flattened.filter((item) => item.name === 'Button');
  const firstModal = flattened.find((item) => item.name === 'Modal');
  const suggestions: ActionSuggestion[] = [];

  if (firstDataSource?.id && buttons[0]) {
    suggestions.push({
      componentId: buttons[0].id,
      eventType: 'onClick',
      actionType: 'callAPI',
      actionConfig: {
        dataSourceId: firstDataSource.id,
        resultKey: firstDataSource.resultKey || '',
        actions: [
          {
            actionType: 'showMessage',
            actionConfig: { type: 'success', content: '提交成功' },
          },
        ],
      },
      reason: '按钮点击后触发接口请求并给出成功提示',
    });
  }

  if (firstModal && buttons[1]) {
    suggestions.push({
      componentId: buttons[1].id,
      eventType: 'onClick',
      actionType: 'setState',
      actionConfig: {
        componentId: firstModal.id,
        props: { open: true },
      },
      reason: '按钮点击后打开弹窗',
    });
  }

  if (buttons.length > 0) {
    suggestions.push({
      componentId: buttons[buttons.length - 1].id,
      eventType: 'onClick',
      actionType: 'navigate',
      actionConfig: {
        targetType: 'url',
        url: '/projects',
        openInNewTab: false,
      },
      reason: '提供典型页面跳转动作',
    });
  }

  return suggestions;
}

function flattenComponents(input: unknown[]): FlatComponentLike[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.flatMap((item) => {
    if (!isFlatComponentLike(item)) {
      return [];
    }

    return [item, ...flattenComponents(item.children ?? [])];
  });
}

function isFlatComponentLike(value: unknown): value is FlatComponentLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'number' &&
    typeof (value as { name?: unknown }).name === 'string'
  );
}

function isDataSourceLike(value: unknown): value is DataSourceLike {
  return typeof value === 'object' && value !== null;
}

function normalizeBindDataSuggestions(
  suggestions: BindDataSuggestion[],
  components: unknown[],
): BindDataSuggestion[] {
  const flattened = flattenComponents(components);

  return suggestions
    .map((suggestion) => {
      const exactTarget = flattened.find(
        (item) =>
          item.id === suggestion.componentId &&
          item.name === suggestion.componentName,
      );
      if (exactTarget) {
        return suggestion;
      }

      const fallbackTarget = flattened.find((item) => item.name === suggestion.componentName);
      if (!fallbackTarget) {
        return null;
      }

      return {
        ...suggestion,
        componentId: fallbackTarget.id,
      };
    })
    .filter((item): item is BindDataSuggestion => item !== null);
}

function normalizeActionSuggestions(
  suggestions: ActionSuggestion[],
  components: unknown[],
  selectedComponentId?: number,
): ActionSuggestion[] {
  const flattened = flattenComponents(components);
  const selected = selectedComponentId
    ? flattened.find((item) => item.id === selectedComponentId)
    : undefined;

  return suggestions
    .map((suggestion) => {
      const exists = flattened.some((item) => item.id === suggestion.componentId);
      let componentId = suggestion.componentId;

      if (!exists) {
        if (selected && isCompatibleActionTarget(selected, suggestion.actionType)) {
          componentId = selected.id;
        } else {
          const fallbackTarget = flattened.find((item) =>
            isCompatibleActionTarget(item, suggestion.actionType),
          );
          if (!fallbackTarget) {
            return null;
          }
          componentId = fallbackTarget.id;
        }
      }

      let actionConfig = suggestion.actionConfig;
      if (suggestion.actionType === 'setState') {
        const targetComponentId =
          typeof suggestion.actionConfig.componentId === 'number'
            ? suggestion.actionConfig.componentId
            : undefined;
        const targetExists = targetComponentId
          ? flattened.some((item) => item.id === targetComponentId)
          : false;
        if (!targetExists) {
          const modalTarget = flattened.find((item) => item.name === 'Modal');
          if (modalTarget) {
            actionConfig = {
              ...suggestion.actionConfig,
              componentId: modalTarget.id,
            };
          }
        }
      }

      return {
        ...suggestion,
        componentId,
        actionConfig,
      };
    })
    .filter((item): item is ActionSuggestion => item !== null);
}

function isCompatibleActionTarget(
  component: FlatComponentLike,
  actionType: string,
): boolean {
  if (actionType === 'callAPI' || actionType === 'navigate') {
    return component.name === 'Button' || component.name === 'Text' || component.name === 'Tag';
  }

  if (actionType === 'setState') {
    return component.name === 'Button' || component.name === 'Text' || component.name === 'Card';
  }

  return true;
}

function summarizeComponents(components: unknown[]): string {
  const flattened = flattenComponents(components);
  if (flattened.length === 0) {
    return '当前没有组件。';
  }

  return flattened
    .map((item) => `${item.id}: ${item.name}`)
    .join('\n');
}
