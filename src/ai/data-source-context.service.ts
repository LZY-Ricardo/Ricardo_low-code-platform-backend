import { Injectable } from '@nestjs/common';

interface DataSourceLike {
  id?: string;
  name?: string;
  resultKey?: string;
  method?: string;
  url?: string;
  paramsText?: string;
}

@Injectable()
export class DataSourceContextService {
  summarize(dataSources: unknown[]): string {
    const items = Array.isArray(dataSources)
      ? dataSources.filter((item): item is DataSourceLike => typeof item === 'object' && item !== null)
      : [];

    if (items.length === 0) {
      return '当前没有可用数据源。';
    }

    return items
      .map((item, index) => {
        const params = parseKeys(item.paramsText);
        return [
          `${index + 1}. ${item.name || '未命名数据源'}`,
          `id=${item.id || '-'}`,
          `resultKey=${item.resultKey || '-'}`,
          `method=${item.method || 'GET'}`,
          `url=${item.url || '-'}`,
          params.length ? `params=${params.join(',')}` : 'params=无',
        ].join('；');
      })
      .join('\n');
  }
}

function parseKeys(text?: string): string[] {
  if (!text?.trim()) {
    return [];
  }

  try {
    return Object.keys(JSON.parse(text) as Record<string, unknown>);
  } catch {
    return [];
  }
}
