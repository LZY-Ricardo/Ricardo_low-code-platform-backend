import { SetMetadata } from '@nestjs/common';

export const LOG_OPERATION_KEY = 'logOperation';

export interface LogOperationOptions {
  action: string;
  resource: string;
  resourceIdBuilder?: (req: Record<string, any>) => string | null | undefined;
  detailBuilder?: (
    req: Record<string, any>,
    response: unknown,
  ) => Record<string, any> | null | undefined;
}

export const LogOperation = (options: LogOperationOptions) =>
  SetMetadata(LOG_OPERATION_KEY, options);
