import { BadRequestException } from '@nestjs/common';
import { ResultParserService } from './result-parser.service';

describe('ResultParserService', () => {
  const service = new ResultParserService();

  it('parses a valid generate-page response', () => {
    const result = service.parseGeneratePageResult(
      JSON.stringify({
        taskType: 'generate-page',
        summary: '生成了数据看板骨架',
        patches: [
          {
            id: 1,
            name: 'Page',
            props: {},
            desc: '页面',
          },
        ],
        warnings: ['已使用默认图表数据'],
        confidence: 0.82,
      }),
    );

    expect(result.taskType).toBe('generate-page');
    expect(result.patches[0]?.name).toBe('Page');
    expect(result.warnings).toContain('已使用默认图表数据');
  });

  it('throws when response is not valid json', () => {
    expect(() => service.parseGeneratePageResult('not-json')).toThrow(
      BadRequestException,
    );
  });

  it('throws when patches are missing', () => {
    expect(() =>
      service.parseGeneratePageResult(
        JSON.stringify({
          taskType: 'generate-page',
          summary: 'invalid',
        }),
      ),
    ).toThrow(BadRequestException);
  });

  it('throws when component node shape is invalid', () => {
    expect(() =>
      service.parseGeneratePageResult(
        JSON.stringify({
          taskType: 'generate-page',
          summary: 'invalid',
          patches: [
            {
              name: 'Page',
              props: {},
              desc: '页面',
            },
          ],
          warnings: [],
          confidence: 0.8,
        }),
      ),
    ).toThrow(BadRequestException);
  });

  it('parses a valid edit-selection response', () => {
    const result = service.parseEditSelectionResult(
      JSON.stringify({
        taskType: 'edit-selection',
        summary: '已将区块改为双列表单',
        targetComponentId: 2,
        operation: 'replace',
        patch: {
          id: 100,
          name: 'Form',
          props: { layout: 'vertical' },
          desc: '表单',
          children: [
            {
              id: 101,
              name: 'Input',
              props: { placeholder: '请输入姓名' },
              desc: '输入框',
            },
          ],
        },
        warnings: [],
        confidence: 0.81,
      }),
    );

    expect(result.taskType).toBe('edit-selection');
    expect(result.targetComponentId).toBe(2);
    expect(result.patch.name).toBe('Form');
  });

  it('parses a valid bind-data response', () => {
    const result = service.parseBindDataResult(
      JSON.stringify({
        taskType: 'bind-data',
        summary: '已生成绑定建议',
        suggestions: [
          {
            componentId: 3,
            componentName: 'Table',
            bindings: {
              dataSource: 'requestResults.userList',
            },
            dataSourceId: 'ds_1',
            resultKey: 'userList',
            stateSuggestions: ['建议补充空状态'],
          },
        ],
        warnings: [],
        confidence: 0.8,
      }),
    );

    expect(result.taskType).toBe('bind-data');
    expect(result.suggestions[0]?.componentName).toBe('Table');
  });

  it('parses a valid generate-action response', () => {
    const result = service.parseGenerateActionResult(
      JSON.stringify({
        taskType: 'generate-action',
        summary: '已生成动作建议',
        suggestions: [
          {
            componentId: 6,
            eventType: 'onClick',
            actionType: 'callAPI',
            actionConfig: {
              dataSourceId: 'ds_1',
            },
            reason: '提交后调用接口',
          },
        ],
        warnings: [],
        confidence: 0.79,
      }),
    );

    expect(result.taskType).toBe('generate-action');
    expect(result.suggestions[0]?.actionType).toBe('callAPI');
  });
});
