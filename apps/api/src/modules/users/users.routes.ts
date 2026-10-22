import { patchMeSchema } from '@miniledger/shared';
import { Router } from 'express';

import type { AppContext } from '../../context';
import { canonicalTimeZone } from '../../lib/dates';
import { validationError } from '../../lib/errors';
import { authOf } from '../../middleware/require-auth';
import { toUserDto } from './user.dto';

export function createUserRoutes(ctx: AppContext): Router {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(toUserDto(authOf(req).user));
  });

  router.patch('/', async (req, res) => {
    const body = patchMeSchema.parse(req.body);
    const data: { displayName?: string | null; timezone?: string } = {};
    if (body.displayName !== undefined) data.displayName = body.displayName;
    if (body.timezone !== undefined) {
      const timezone = canonicalTimeZone(body.timezone);
      if (!timezone) throw validationError('timezone', 'Unknown timezone');
      data.timezone = timezone;
    }
    const user = await ctx.prisma.user.update({ where: { id: authOf(req).user.id }, data });
    res.json(toUserDto(user));
  });

  return router;
}
