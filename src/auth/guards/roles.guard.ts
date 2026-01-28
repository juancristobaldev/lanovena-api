import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ROLE_HIERARCHY } from '../constants/role-hierarchy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no se definieron roles, se permite
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user;

    if (!user?.role) {
      throw new ForbiddenException('Usuario sin rol');
    }

    const allowedRoles = ROLE_HIERARCHY[user.role as Role];

    if (!allowedRoles) {
      throw new ForbiddenException('Rol no reconocido');
    }

    const hasAccess = requiredRoles.some((role) => allowedRoles.includes(role));

    if (!hasAccess) {
      throw new ForbiddenException(`Rol ${user.role} no autorizado`);
    }

    return true;
  }
}
