import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiAuditService } from './ai-audit.service';
import { AiService } from './ai.service';
import { DataSourceContextService } from './data-source-context.service';
import { OpenRouterService } from './openrouter.service';
import { OrchestratorService } from './orchestrator.service';
import { PromptBuilderService } from './prompt-builder.service';
import { ResultParserService } from './result-parser.service';
import { AiTelemetryService } from './telemetry.service';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    AiAuditService,
    AiTelemetryService,
    DataSourceContextService,
    OpenRouterService,
    OrchestratorService,
    PromptBuilderService,
    ResultParserService,
  ],
})
export class AiModule {}
