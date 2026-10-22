import {
  createPersonSchema,
  peopleListQuerySchema,
  type PeopleListResponse,
} from '@miniledger/shared';
import { Router } from 'express';

import { authOf } from '../../middleware/require-auth';
import type { PeopleService } from './people.service';

export function createPeopleRoutes(people: PeopleService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = peopleListQuerySchema.parse(req.query);
    const body: PeopleListResponse = { items: await people.list(authOf(req).user.id, query) };
    res.json(body);
  });

  router.post('/', async (req, res) => {
    const input = createPersonSchema.parse(req.body);
    const { status, person } = await people.create(authOf(req).user.id, input);
    res.status(status).json(person);
  });

  return router;
}
