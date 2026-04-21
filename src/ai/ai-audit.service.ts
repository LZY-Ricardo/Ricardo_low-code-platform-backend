import { appendFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GeneratePageAuditRecord {
  prompt: string;
  source: 'openrouter' | 'fallback';
  sourceModel?: string;
  sourceProvider?: string;
  fallbackReason?: string;
  summary: string;
  confidence: number;
  warnings: string[];
}

interface EditSelectionAuditRecord {
  prompt: string;
  selectedComponentId: number;
  source: 'openrouter' | 'fallback';
  sourceModel?: string;
  sourceProvider?: string;
  fallbackReason?: string;
  summary: string;
  confidence: number;
  warnings: string[];
}

interface BindDataAuditRecord {
  source: 'openrouter' | 'fallback';
  sourceModel?: string;
  sourceProvider?: string;
  fallbackReason?: string;
  summary: string;
  confidence: number;
  suggestionCount: number;
}

interface GenerateActionAuditRecord {
  source: 'openrouter' | 'fallback';
  sourceModel?: string;
  sourceProvider?: string;
  fallbackReason?: string;
  summary: string;
  confidence: number;
  suggestionCount: number;
}

@Injectable()
export class AiAuditService {
  constructor(private readonly configService: ConfigService) {}

  async recordGeneratePage(record: GeneratePageAuditRecord): Promise<void> {
    const targetPath = this.getAuditLogPath();
    await mkdir(dirname(targetPath), { recursive: true });
    await appendFile(
      targetPath,
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        taskType: 'generate-page',
        ...record,
        promptPreview:
          record.prompt.length > 120
            ? `${record.prompt.slice(0, 117)}...`
            : record.prompt,
      })}\n`,
      'utf8',
    );
  }

  async recordEditSelection(record: EditSelectionAuditRecord): Promise<void> {
    const targetPath = this.getAuditLogPath();
    await mkdir(dirname(targetPath), { recursive: true });
    await appendFile(
      targetPath,
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        taskType: 'edit-selection',
        ...record,
        promptPreview:
          record.prompt.length > 120
            ? `${record.prompt.slice(0, 117)}...`
            : record.prompt,
      })}\n`,
      'utf8',
    );
  }

  async recordBindData(record: BindDataAuditRecord): Promise<void> {
    await this.appendSimpleRecord('bind-data', { ...record });
  }

  async recordGenerateAction(record: GenerateActionAuditRecord): Promise<void> {
    await this.appendSimpleRecord('generate-action', { ...record });
  }

  private getAuditLogPath(): string {
    const configuredPath = this.configService.get<string>('AI_AUDIT_LOG_PATH');
    return resolve(configuredPath || '.runtime/ai-audit.jsonl');
  }

  private async appendSimpleRecord(
    taskType: string,
    record: Record<string, unknown>,
  ): Promise<void> {
    const targetPath = this.getAuditLogPath();
    await mkdir(dirname(targetPath), { recursive: true });
    await appendFile(
      targetPath,
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        taskType,
        ...record,
      })}\n`,
      'utf8',
    );
  }
}
