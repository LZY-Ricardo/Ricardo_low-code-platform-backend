import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import {
  LOG_OPERATION_KEY,
  type LogOperationOptions,
} from '../decorators/log-operation.decorator';
import { PrismaService } from '../../prisma/prisma.service';

type AuthenticatedRequest = Request & {
  user?: {
    userId?: string;
  };
};

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.getAllAndOverride<LogOperationOptions>(
      LOG_OPERATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options || context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return next.handle().pipe(
      tap((response) => {
        void this.writeLog(options, request, response);
      }),
    );
  }

  private async writeLog(
    options: LogOperationOptions,
    request: AuthenticatedRequest,
    response: unknown,
  ): Promise<void> {
    try {
      await this.prisma.operationLog.create({
        data: {
          userId: request.user?.userId ?? null,
          action: options.action,
          resource: options.resource,
          resourceId: options.resourceIdBuilder?.(request) ?? null,
          detail: options.detailBuilder?.(request, response) ?? undefined,
          ip: this.extractIp(request),
          userAgent: request.headers['user-agent'] ?? null,
        },
      });
    } catch (error) {
      console.error('Failed to persist operation log', error);
    }
  }

  private extractIp(request: AuthenticatedRequest): string | null {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0].trim();
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0];
    }

    return request.ip ?? null;
  }
}
