import { Role } from '@prisma/client';

export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  SUPERADMIN: [
    Role.SUPERADMIN,
    Role.SUBADMIN,
    Role.DIRECTOR,
    Role.LEAGUE_OWNER,
    Role.COACH,
    Role.GUARDIAN,
  ],
  SUBADMIN: [
    Role.SUBADMIN,
    Role.DIRECTOR,
    Role.LEAGUE_OWNER,
    Role.COACH,
    Role.GUARDIAN,
  ],

  DIRECTOR: [Role.DIRECTOR, Role.COACH, Role.GUARDIAN],

  LEAGUE_OWNER: [Role.LEAGUE_OWNER, Role.PLANNER],

  COACH: [Role.COACH, Role.GUARDIAN],

  GUARDIAN: [Role.GUARDIAN],

  PLANNER: [Role.PLANNER],
};
