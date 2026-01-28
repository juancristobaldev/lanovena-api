import { Role } from '@prisma/client';

export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  SUPERADMIN: [Role.SUPERADMIN, Role.DIRECTOR, Role.COACH, Role.GUARDIAN],

  DIRECTOR: [Role.DIRECTOR, Role.COACH, Role.GUARDIAN],

  COACH: [Role.COACH, Role.GUARDIAN],

  GUARDIAN: [Role.GUARDIAN],
};
