import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserSummary } from '@bnb/shared';

export const CurrentUser = createParamDecorator(
  (data: keyof UserSummary | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserSummary;
    return data ? user?.[data] : user;
  },
);
