import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from './../src/app.module';
import { OpenRouterService } from '../src/ai/openrouter.service';

describe('AiController (e2e)', () => {
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
            summary: 'e2e 生成结果',
            patches: [
              {
                id: 1,
                name: 'Page',
                props: {},
                desc: '页面',
              },
            ],
            warnings: [],
            confidence: 0.91,
          }),
          model: 'e2e/mock-model',
          provider: 'OpenRouter',
        }),
        generateEditSelection: async () => ({
          content: JSON.stringify({
            taskType: 'edit-selection',
            summary: 'e2e 局部修改结果',
            targetComponentId: 2,
            operation: 'replace',
            patch: {
              id: 20,
              name: 'Form',
              props: {},
              desc: '表单',
            },
            warnings: [],
            confidence: 0.89,
          }),
          model: 'e2e/mock-model',
          provider: 'OpenRouter',
        }),
        generateBindData: async () => ({
          content: JSON.stringify({
            taskType: 'bind-data',
            summary: 'e2e 绑定建议',
            suggestions: [
              {
                componentId: 2,
                componentName: 'Table',
                bindings: { dataSource: 'requestResults.userList' },
                dataSourceId: 'ds_1',
                resultKey: 'userList',
                stateSuggestions: ['建议补充空状态'],
              },
            ],
            warnings: [],
            confidence: 0.87,
          }),
          model: 'e2e/mock-model',
          provider: 'OpenRouter',
        }),
        generateAction: async () => ({
          content: JSON.stringify({
            taskType: 'generate-action',
            summary: 'e2e 动作建议',
            suggestions: [
              {
                componentId: 2,
                eventType: 'onClick',
                actionType: 'callAPI',
                actionConfig: { dataSourceId: 'ds_1', resultKey: 'userList' },
                reason: '点击后请求数据',
              },
            ],
            warnings: [],
            confidence: 0.88,
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

  it('rejects generate-page without token', async () => {
    await request(app.getHttpServer())
      .post('/api/ai/generate-page')
      .send({
        prompt: '生成一个运营数据看板',
      })
      .expect(401);
  });

  it('returns generate-page response with auth', async () => {
    const token = jwtService.sign({
      userId: 'ai-e2e-user',
      username: 'ai-e2e',
    });

    const response = await request(app.getHttpServer())
      .post('/api/ai/generate-page')
      .set('Authorization', `Bearer ${token}`)
      .send({
        prompt: '生成一个运营数据看板',
        components: [],
        currentThemeId: 'ocean',
      })
      .expect(201);

    expect(response.body.code).toBe(0);
    expect(response.body.data.taskType).toBe('generate-page');
    expect(Array.isArray(response.body.data.patches)).toBe(true);
    expect(response.body.data.source).toBe('openrouter');
    expect(response.body.data.sourceModel).toBe('e2e/mock-model');
  }, 15000);

  it('returns edit-selection response with auth', async () => {
    const token = jwtService.sign({
      userId: 'ai-e2e-user',
      username: 'ai-e2e',
    });

    const response = await request(app.getHttpServer())
      .post('/api/ai/edit-selection')
      .set('Authorization', `Bearer ${token}`)
      .send({
        prompt: '把这个区块改成报名表单',
        selectedComponentId: 2,
        components: [
          {
            id: 1,
            name: 'Page',
            props: {},
            desc: '页面',
            children: [{ id: 2, name: 'Container', props: {}, desc: '容器', parentId: 1 }],
          },
        ],
      })
      .expect(201);

    expect(response.body.code).toBe(0);
    expect(response.body.data.taskType).toBe('edit-selection');
    expect(response.body.data.targetComponentId).toBe(2);
    expect(response.body.data.source).toBe('openrouter');
  }, 15000);

  it('returns bind-data response with auth', async () => {
    const token = jwtService.sign({ userId: 'ai-e2e-user', username: 'ai-e2e' });

    const response = await request(app.getHttpServer())
      .post('/api/ai/bind-data')
      .set('Authorization', `Bearer ${token}`)
      .send({
        components: [{ id: 1, name: 'Page', props: {}, desc: '页面', children: [{ id: 2, name: 'Table', props: {}, desc: '表格', parentId: 1 }] }],
        dataSources: [{ id: 'ds_1', name: '用户列表', resultKey: 'userList', method: 'GET', url: '/api/users' }],
      })
      .expect(201);

    expect(response.body.data.taskType).toBe('bind-data');
    expect(response.body.data.source).toBe('openrouter');
  });

  it('returns generate-action response with auth', async () => {
    const token = jwtService.sign({ userId: 'ai-e2e-user', username: 'ai-e2e' });

    const response = await request(app.getHttpServer())
      .post('/api/ai/generate-action')
      .set('Authorization', `Bearer ${token}`)
      .send({
        components: [{ id: 1, name: 'Page', props: {}, desc: '页面', children: [{ id: 2, name: 'Button', props: {}, desc: '按钮', parentId: 1 }] }],
        dataSources: [{ id: 'ds_1', name: '用户列表', resultKey: 'userList', method: 'GET', url: '/api/users' }],
      })
      .expect(201);

    expect(response.body.data.taskType).toBe('generate-action');
    expect(response.body.data.source).toBe('openrouter');
  });
});
