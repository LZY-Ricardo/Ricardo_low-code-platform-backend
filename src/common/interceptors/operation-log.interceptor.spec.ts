import { of } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { OperationLogInterceptor } from './operation-log.interceptor';
import { LOG_OPERATION_KEY } from '../decorators/log-operation.decorator';

describe('OperationLogInterceptor', () => {
  const prisma = {
    operationLog: {
      create: jest.fn(),
    },
  };

  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  let interceptor: OperationLogInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();
    interceptor = new OperationLogInterceptor(reflector, prisma as any);
  });

  it('writes log for decorated http handler', async () => {
    (reflector.getAllAndOverride as any).mockImplementation((key: string) => {
      if (key === LOG_OPERATION_KEY) {
        return {
          action: 'project.create',
          resource: 'project',
        };
      }
      return undefined;
    });

    const context = {
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId: 'user_1' },
          headers: { 'user-agent': 'Mozilla' },
          ip: '127.0.0.1',
        }),
      }),
    } as any;

    await new Promise<void>((resolve) => {
      interceptor.intercept(context, {
        handle: () => of({ ok: true }),
      } as any).subscribe({
        complete: resolve,
      });
    });

    expect(prisma.operationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_1',
          action: 'project.create',
          resource: 'project',
        }),
      }),
    );
  });
});
