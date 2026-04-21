import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';

export interface AiComponentNode {
  id: number;
  name: string;
  props: Record<string, unknown>;
  desc: string;
  parentId?: number;
  children?: AiComponentNode[];
}

export interface GeneratePageResult {
  taskType: 'generate-page';
  summary: string;
  patches: AiComponentNode[];
  warnings: string[];
  confidence: number;
  source: 'openrouter' | 'fallback';
  sourceModel?: string;
  sourceProvider?: string;
  fallbackReason?: string;
}

export interface EditSelectionResult {
  taskType: 'edit-selection';
  summary: string;
  targetComponentId: number;
  operation: 'replace';
  patch: AiComponentNode;
  warnings: string[];
  confidence: number;
  source: 'openrouter' | 'fallback';
  sourceModel?: string;
  sourceProvider?: string;
  fallbackReason?: string;
}

export interface BindDataSuggestion {
  componentId: number;
  componentName: string;
  bindings: Record<string, string>;
  dataSourceId?: string;
  resultKey?: string;
  stateSuggestions: string[];
}

export interface BindDataResult {
  taskType: 'bind-data';
  summary: string;
  suggestions: BindDataSuggestion[];
  warnings: string[];
  confidence: number;
  source: 'openrouter' | 'fallback';
  sourceModel?: string;
  sourceProvider?: string;
  fallbackReason?: string;
}

export interface ActionSuggestion {
  componentId: number;
  eventType: string;
  actionType: string;
  actionConfig: Record<string, unknown>;
  reason: string;
}

export interface GenerateActionResult {
  taskType: 'generate-action';
  summary: string;
  suggestions: ActionSuggestion[];
  warnings: string[];
  confidence: number;
  source: 'openrouter' | 'fallback';
  sourceModel?: string;
  sourceProvider?: string;
  fallbackReason?: string;
}

@Injectable()
export class ResultParserService {
  parseGeneratePageResult(
    content: string,
  ): Omit<
    GeneratePageResult,
    'source' | 'sourceModel' | 'sourceProvider' | 'fallbackReason'
  > {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequestException('AI 返回结果不是合法 JSON');
    }

    const result = generatePageSchema.safeParse(parsed);
    if (!result.success) {
      throw new BadRequestException(
        `AI 返回结果结构不合法: ${result.error.issues
          .map((issue) => `${issue.path.join('.') || 'root'} ${issue.message}`)
          .join('; ')}`,
      );
    }

    return result.data;
  }

  parseEditSelectionResult(
    content: string,
  ): Omit<
    EditSelectionResult,
    'source' | 'sourceModel' | 'sourceProvider' | 'fallbackReason'
  > {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequestException('AI 返回结果不是合法 JSON');
    }

    const result = editSelectionSchema.safeParse(parsed);
    if (!result.success) {
      throw new BadRequestException(
        `AI 返回结果结构不合法: ${result.error.issues
          .map((issue) => `${issue.path.join('.') || 'root'} ${issue.message}`)
          .join('; ')}`,
      );
    }

    return result.data;
  }

  parseBindDataResult(
    content: string,
  ): Omit<
    BindDataResult,
    'source' | 'sourceModel' | 'sourceProvider' | 'fallbackReason'
  > {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequestException('AI 返回结果不是合法 JSON');
    }

    const result = bindDataSchema.safeParse(parsed);
    if (!result.success) {
      throw new BadRequestException(
        `AI 返回结果结构不合法: ${result.error.issues
          .map((issue) => `${issue.path.join('.') || 'root'} ${issue.message}`)
          .join('; ')}`,
      );
    }

    return result.data;
  }

  parseGenerateActionResult(
    content: string,
  ): Omit<
    GenerateActionResult,
    'source' | 'sourceModel' | 'sourceProvider' | 'fallbackReason'
  > {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequestException('AI 返回结果不是合法 JSON');
    }

    const result = generateActionSchema.safeParse(parsed);
    if (!result.success) {
      throw new BadRequestException(
        `AI 返回结果结构不合法: ${result.error.issues
          .map((issue) => `${issue.path.join('.') || 'root'} ${issue.message}`)
          .join('; ')}`,
      );
    }

    return result.data;
  }
}

const componentNodeSchema: z.ZodType<AiComponentNode> = z.lazy(() =>
  z.object({
    id: z.number().int(),
    name: z.string().min(1),
    props: z.record(z.string(), z.unknown()),
    desc: z.string().min(1),
    parentId: z.number().int().optional(),
    children: z.array(componentNodeSchema).optional(),
  }),
);

const generatePageSchema = z.object({
  taskType: z.literal('generate-page'),
  summary: z.string().min(1),
  patches: z.array(componentNodeSchema),
  warnings: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

const editSelectionSchema = z.object({
  taskType: z.literal('edit-selection'),
  summary: z.string().min(1),
  targetComponentId: z.number().int(),
  operation: z.literal('replace'),
  patch: componentNodeSchema,
  warnings: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

const bindDataSuggestionSchema = z.object({
  componentId: z.number().int(),
  componentName: z.string().min(1),
  bindings: z.record(z.string(), z.string()),
  dataSourceId: z.string().optional(),
  resultKey: z.string().optional(),
  stateSuggestions: z.array(z.string()),
});

const bindDataSchema = z.object({
  taskType: z.literal('bind-data'),
  summary: z.string().min(1),
  suggestions: z.array(bindDataSuggestionSchema),
  warnings: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

const actionSuggestionSchema = z.object({
  componentId: z.number().int(),
  eventType: z.string().min(1),
  actionType: z.string().min(1),
  actionConfig: z.record(z.string(), z.unknown()),
  reason: z.string().min(1),
});

const generateActionSchema = z.object({
  taskType: z.literal('generate-action'),
  summary: z.string().min(1),
  suggestions: z.array(actionSuggestionSchema),
  warnings: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});
