import {
  createPersonSchema,
  patchPersonSchema,
  peopleListQuerySchema,
  type PeopleListResponse,
} from '@miniledger/shared';
import { Router } from 'express';

import { notFound } from '../../lib/errors';
import { routeId } from '../../lib/ids';
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

  router.get('/:id', async (req, res) => {
    const person = await people.find(authOf(req).user.id, routeId(req.params.id));
    if (!person) throw notFound();
    res.json(person);
  });

  router.patch('/:id', async (req, res) => {
    const personId = routeId(req.params.id);
    const input = patchPersonSchema.parse(req.body);
    res.json(await people.update(authOf(req).user.id, personId, input));
  });

  router.delete('/:id', async (req, res) => {
    await people.remove(authOf(req).user.id, routeId(req.params.id));
    res.status(204).end();
  });

  return router;
}
