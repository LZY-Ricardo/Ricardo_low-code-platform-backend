import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OpenRouterResponse {
  model?: string;
  provider?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export interface OpenRouterGeneration {
  content: string;
  model: string;
  provider?: string;
}

@Injectable()
export class OpenRouterService {
  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.configService.get<string>('OPENROUTER_API_KEY'));
  }

  async generate(prompt: string): Promise<OpenRouterGeneration> {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('OPENROUTER_API_KEY 未配置');
    }

    const model =
      this.configService.get<string>('OPENROUTER_MODEL') ||
      'openai/gpt-4o-mini';
    const primary = await this.executeCompletionRequest({
      apiKey,
      model,
      prompt,
      useJsonMode: true,
    });

    if (primary.content) {
      return primary;
    }

    if (shouldRetryWithoutJsonMode(model)) {
      const fallback = await this.executeCompletionRequest({
        apiKey,
        model,
        prompt,
        useJsonMode: false,
      });

      if (fallback.content) {
        return fallback;
      }
    }

    throw new ServiceUnavailableException('OpenRouter 返回内容为空');
  }

  async generateEditSelection(prompt: string): Promise<OpenRouterGeneration> {
    return this.generate(prompt);
  }

  async generateBindData(prompt: string): Promise<OpenRouterGeneration> {
    return this.generate(prompt);
  }

  async generateAction(prompt: string): Promise<OpenRouterGeneration> {
    return this.generate(prompt);
  }

  private async executeCompletionRequest(input: {
    apiKey: string;
    model: string;
    prompt: string;
    useJsonMode: boolean;
  }): Promise<OpenRouterGeneration> {
    const timeoutMs = Number(
      this.configService.get<string>('OPENROUTER_TIMEOUT_MS') || '90000',
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: input.model,
          ...(input.useJsonMode ? { response_format: { type: 'json_object' } } : {}),
          temperature: 0.2,
          messages: [
            {
              role: 'user',
              content: input.prompt,
            },
          ],
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException(
          `OpenRouter 请求超时: ${timeoutMs}ms`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(`OpenRouter 请求失败: ${response.status}`);
    }

    const data = (await response.json()) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content;

    return {
      content: typeof content === 'string' ? content.trim() : '',
      model: data.model || input.model,
      provider: data.provider,
    };
  }
}

function shouldRetryWithoutJsonMode(model: string): boolean {
  const normalized = model.toLowerCase();
  return normalized.includes('minimax');
}
