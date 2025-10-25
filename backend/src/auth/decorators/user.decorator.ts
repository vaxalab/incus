import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import '../../types/session.types';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
