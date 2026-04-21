import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from './../src/app.module';
import { OpenRouterService } from '../src/ai/openrouter.service';

describe('Ai workbench (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OpenRouterService)
      .useValue({
        isConfigured: () => true,
        generate: async () => ({
          content: JSON.stringify({
            taskType: 'generate-page',
            summary: 'workbench 生成结果',
            patches: [{ id: 1, name: 'Page', props: {}, desc: '页面' }],
            warnings: [],
            confidence: 0.9,
          }),
          model: 'e2e/mock-model',
          provider: 'OpenRouter',
        }),
        generateEditSelection: async () => ({
          content: JSON.stringify({
            taskType: 'edit-selection',
            summary: 'workbench 局部修改',
            targetComponentId: 2,
            operation: 'replace',
            patch: { id: 9, name: 'Form', props: {}, desc: '表单' },
            warnings: [],
            confidence: 0.85,
          }),
          model: 'e2e/mock-model',
          provider: 'OpenRouter',
        }),
        generateBindData: async () => ({
          content: JSON.stringify({
            taskType: 'bind-data',
            summary: 'workbench 绑定建议',
            suggestions: [],
            warnings: [],
            confidence: 0.8,
          }),
          model: 'e2e/mock-model',
          provider: 'OpenRouter',
        }),
        generateAction: async () => ({
          content: JSON.stringify({
            taskType: 'generate-action',
            summary: 'workbench 动作建议',
            suggestions: [],
            warnings: [],
            confidence: 0.8,
          }),
          model: 'e2e/mock-model',
          provider: 'OpenRouter',
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('routes workbench generate-page task', async () => {
    const token = jwtService.sign({ userId: 'wb-user', username: 'wb' });

    const response = await request(app.getHttpServer())
      .post('/api/ai/workbench')
      .set('Authorization', `Bearer ${token}`)
      .send({
        taskType: 'generate-page',
        prompt: '生成运营看板',
      })
      .expect(201);

    expect(response.body.code).toBe(0);
    expect(response.body.data.taskType).toBe('generate-page');
  });
});
