import { appendFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TaskTelemetryRecord {
  taskType: string;
  status: 'success' | 'error';
  durationMs: number;
  source?: string;
  error?: string;
}

@Injectable()
export class AiTelemetryService {
  constructor(private readonly configService: ConfigService) {}

  async recordTask(record: TaskTelemetryRecord): Promise<void> {
    const targetPath = resolve(
      this.configService.get<string>('AI_TELEMETRY_LOG_PATH') ||
        '.runtime/ai-telemetry.jsonl',
    );

    await mkdir(dirname(targetPath), { recursive: true });
    await appendFile(
      targetPath,
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        ...record,
      })}\n`,
      'utf8',
    );
  }
}
