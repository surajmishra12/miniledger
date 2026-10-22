import { peopleListResponseSchema, personDtoSchema } from '@miniledger/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createTestApp,
  expectError,
  prisma,
  resetDatabase,
  signIn,
  uuid,
  type SignedIn,
  type TestApp,
} from '../helpers';

let t: TestApp;
let user: SignedIn;

beforeEach(async () => {
  await resetDatabase();
  t = createTestApp();
  user = await signIn(t);
});

const createPerson = (auth: SignedIn, body: Record<string, unknown>) =>
  request(t.app).post('/v1/people').set(auth.auth).send(body);

describe('POST /v1/people', () => {
  it('creates a person with a client ID and normalizes the name', async () => {
    const id = uuid();
    const res = await createPerson(user, { id, name: '  Priya   Sharma ' });
    expect(res.status).toBe(201);
    expect(personDtoSchema.parse(res.body)).toMatchObject({
      id,
      name: 'Priya Sharma',
      archived: false,
      owesYouPaise: 0,
      youOwePaise: 0,
      loanCount: 0,
    });
  });

  it('replays a retry with the same ID and rejects a conflicting one', async () => {
    const id = uuid();
    expect((await createPerson(user, { id, name: 'Priya' })).status).toBe(201);
    expect((await createPerson(user, { id, name: 'Priya' })).status).toBe(200);
    expectError(await createPerson(user, { id, name: 'Rahul' }), 409, 'ID_CONFLICT');

    const other = await signIn(t);
    expectError(await createPerson(other, { id, name: 'Priya' }), 409, 'ID_CONFLICT');
    expect(await prisma.person.count()).toBe(1);
  });

  it('validates names', async () => {
    expectError(await createPerson(user, { id: uuid(), name: '   ' }), 422, 'VALIDATION_FAILED');
    expectError(
      await createPerson(user, { id: uuid(), name: 'x'.repeat(81) }),
      422,
      'VALIDATION_FAILED',
    );
    expectError(await createPerson(user, { id: 'nope', name: 'A' }), 422, 'VALIDATION_FAILED');
  });
});

describe('GET /v1/people', () => {
  it('lists active people alphabetically with case-insensitive search', async () => {
    for (const name of ['rahul', 'Aarav', 'Priya', 'Rahim']) {
      await createPerson(user, { id: uuid(), name });
    }
    const archivedId = uuid();
    await createPerson(user, { id: archivedId, name: 'Archie' });
    await prisma.person.update({ where: { id: archivedId }, data: { archivedAt: new Date() } });

    const all = peopleListResponseSchema.parse(
      (await request(t.app).get('/v1/people').set(user.auth)).body,
    );
    expect(all.items.map((p) => p.name)).toEqual(['Aarav', 'Priya', 'Rahim', 'rahul']);

    const search = await request(t.app).get('/v1/people?search=RAH').set(user.auth);
    expect(search.body.items.map((p: { name: string }) => p.name)).toEqual(['Rahim', 'rahul']);

    const archived = await request(t.app).get('/v1/people?archived=true').set(user.auth);
    expect(archived.body.items.map((p: { name: string }) => p.name)).toEqual(['Archie']);
  });

  it('treats LIKE wildcards in search literally', async () => {
    await createPerson(user, { id: uuid(), name: 'Ravi' });
    const res = await request(t.app).get('/v1/people?search=%25').set(user.auth);
    expect(res.body.items).toEqual([]);
  });

  it('never shows another user’s people', async () => {
    await createPerson(user, { id: uuid(), name: 'Priya' });
    const other = await signIn(t);
    expect((await request(t.app).get('/v1/people').set(other.auth)).body.items).toEqual([]);
  });
});
