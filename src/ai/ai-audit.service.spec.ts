import { existsSync, mkdtempSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ConfigService } from '@nestjs/config';
import { AiAuditService } from './ai-audit.service';

describe('AiAuditService', () => {
  it('writes a jsonl audit record to disk', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lingocode-ai-audit-'));
    const filePath = join(dir, 'audit.jsonl');
    const service = new AiAuditService({
      get: (key: string) => {
        if (key === 'AI_AUDIT_LOG_PATH') {
          return filePath;
        }
        return undefined;
      },
    } as unknown as ConfigService);

    await service.recordGeneratePage({
      prompt: '生成一个运营数据看板',
      source: 'openrouter',
      sourceModel: 'nvidia/demo',
      sourceProvider: 'OpenRouter',
      summary: '运营数据看板',
      confidence: 0.88,
      warnings: [],
    });

    expect(existsSync(filePath)).toBe(true);
    const lines = readFileSync(filePath, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0] ?? '{}');
    expect(parsed.source).toBe('openrouter');
    expect(parsed.summary).toBe('运营数据看板');
  });
});
