// Integration tests for GET /api/rentals (UNI-307 rental feed).
// Runs the real Express app; only prisma.rentalListing.findMany is replaced by an in-memory table that follows
// Prisma's documented findMany semantics (where / orderBy / take / cursor + skip), so no database is needed.
// Run: npm test
import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

// ---------- in-memory rental_listings ----------
let rows = [];
let lastQuery = null;
let failWith = null;

function listing(id, overrides = {}) {
  const isVehicle = overrides.itemType !== 'EQUIPMENT';
  return {
    id,
    title: `Rental ${id}`,
    description: 'Long description that the feed must not send',
    condition: 'Good',
    rentalPrice: new Prisma.Decimal('1500.00'),
    rentalPeriod: 'DAILY',
    itemType: 'VEHICLE',
    status: 'ACTIVE',
    images: [
      { id: id * 10 + 1, imageUrl: `https://cdn.unimart.lk/r/${id}-old.jpg`, isPrimary: false },
      { id: id * 10 + 2, imageUrl: `https://cdn.unimart.lk/r/${id}-primary.jpg`, isPrimary: true },
    ],
    vehicleDetail: isVehicle
      ? {
          vehicleType: 'MOTORCYCLE',
          makeModel: 'Honda Dio',
          specifications: 'Long specifications that the feed must not send',
          pickupLocationName: 'Main Gate',
          latitude: new Prisma.Decimal('6.9022000'),
          longitude: new Prisma.Decimal('79.8612000'),
        }
      : null,
    ...overrides,
  };
}

const pick = (obj, select) =>
  Object.fromEntries(Object.entries(select).filter(([, v]) => v).map(([k, v]) => [k, v === true ? obj[k] : applyRelation(obj[k], v)]));

function applyRelation(value, spec) {
  if (value == null) return null;
  if (!Array.isArray(value)) return pick(value, spec.select);
  let list = [...value];
  for (const order of [...(spec.orderBy || [])].reverse()) {
    const [[field, dir]] = Object.entries(order);
    list.sort((a, b) => (a[field] === b[field] ? 0 : (a[field] > b[field] ? 1 : -1) * (dir === 'desc' ? -1 : 1)));
  }
  if (spec.take !== undefined) list = list.slice(0, spec.take);
  return list.map((item) => pick(item, spec.select));
}

// Prisma findMany for this model: filter, sort by id, cursor (+ skip), take, select
async function fakeFindMany(args) {
  lastQuery = args;
  if (failWith) throw failWith;
  let result = rows.filter((row) => {
    const where = args.where || {};
    if (where.status && row.status !== where.status) return false;
    if (where.id?.lt !== undefined && !(row.id < where.id.lt)) return false;
    return true;
  });
  const dir = args.orderBy?.id === 'asc' ? 1 : -1;
  result.sort((a, b) => (a.id - b.id) * dir);
  if (args.cursor) {
    // "Using a nonexistent cursor returns null" / "does not try to locate adjacent values" (Prisma docs)
    const cursorRow = rows.find((row) => row.id === args.cursor.id);
    if (!cursorRow) return [];
    // rows from the cursor's position onwards, in sort order
    result = result.filter((row) => (dir === -1 ? row.id <= cursorRow.id : row.id >= cursorRow.id));
  }
  if (args.skip) result = result.slice(args.skip);
  if (args.take !== undefined) result = result.slice(0, args.take);
  return result.map((row) => pick(row, args.select));
}

// ---------- server ----------
let server;
let baseUrl;
let originalFindMany;
const originalConsoleError = console.error;

before(async () => {
  originalFindMany = prisma.rentalListing.findMany;
  prisma.rentalListing.findMany = fakeFindMany;
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  prisma.rentalListing.findMany = originalFindMany;
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});

beforeEach(() => {
  rows = Array.from({ length: 45 }, (_, i) => listing(i + 1));
  lastQuery = null;
  failWith = null;
  console.error = originalConsoleError;
});

const get = async (path, headers = {}) => {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  return { response, body: await response.json() };
};
const ids = (body) => body.data.rentals.map((r) => r.id);
const activeIdsNewestFirst = () => rows.filter((row) => row.status === 'ACTIVE').map((row) => row.id).sort((a, b) => b - a);

// Follow nextCursor from the first page to the end, like the app does. `beforeNextPage` can change the data
// between requests (it gets the cursor about to be requested). Returns every id seen and every nextCursor.
async function walkAllPages(limit, beforeNextPage = () => {}) {
  const seen = [];
  const cursors = [];
  let cursor = null;
  for (let page = 0; page < 100; page++) {      // guard against an endless loop; limit=1 needs 45 pages
    const { response, body } = await get(`/api/rentals?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`);
    assert.equal(response.status, 200);
    const pageIds = ids(body);
    assert.ok(pageIds.length <= limit, 'page not larger than limit');
    assert.deepEqual(pageIds, [...pageIds].sort((a, b) => b - a), 'newest first within the page');
    if (seen.length && pageIds.length) assert.ok(pageIds[0] < seen[seen.length - 1], 'every page is older than the one before');
    seen.push(...pageIds);
    cursor = body.data.nextCursor;
    cursors.push(cursor);
    if (cursor === null) return { seen, cursors };
    assert.equal(cursor, pageIds[pageIds.length - 1], 'nextCursor is the last id on the page');
    await beforeNextPage(cursor);
  }
  throw new Error('pagination did not end');
}

// No rental missing, none repeated
function assertEveryRentalOnce(seen, expected) {
  assert.equal(new Set(seen).size, seen.length, `duplicates: ${seen.filter((id, i) => seen.indexOf(id) !== i)}`);
  assert.deepEqual(seen, expected, `missing: ${expected.filter((id) => !seen.includes(id))}`);
}

// ---------- response structure ----------
describe('GET /api/rentals response', () => {
  test('wraps the page in { status: "success", data: { rentals, nextCursor } }', async () => {
    const { response, body } = await get('/api/rentals');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.deepEqual(Object.keys(body).sort(), ['data', 'status']);
    assert.equal(body.status, 'success');
    assert.deepEqual(Object.keys(body.data).sort(), ['nextCursor', 'rentals']);
    assert.ok(Array.isArray(body.data.rentals));
  });

  test('each rental has exactly the fields the app uses, with numbers for price and coordinates', async () => {
    const { body } = await get('/api/rentals?limit=1');
    const [rental] = body.data.rentals;
    assert.deepEqual(Object.keys(rental).sort(), ['condition', 'id', 'itemType', 'primaryImageUrl', 'rentalPeriod', 'rentalPrice', 'status', 'title', 'vehicle']);
    assert.deepEqual(rental, {
      id: 45, title: 'Rental 45', condition: 'Good', rentalPrice: 1500, rentalPeriod: 'DAILY', itemType: 'VEHICLE', status: 'ACTIVE',
      primaryImageUrl: 'https://cdn.unimart.lk/r/45-primary.jpg',
      vehicle: { vehicleType: 'MOTORCYCLE', makeModel: 'Honda Dio', pickupLocationName: 'Main Gate', latitude: 6.9022, longitude: 79.8612 },
    });
  });

  test('large text fields are not selected (description, specifications)', async () => {
    await get('/api/rentals');
    assert.equal(lastQuery.select.description, undefined);
    assert.equal(lastQuery.select.vehicleDetail.select.specifications, undefined);
    assert.deepEqual(lastQuery.select.images, { select: { imageUrl: true }, orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }], take: 1 });
  });

  test('only ACTIVE listings, newest first', async () => {
    rows[44] = listing(45, { status: 'INACTIVE' });
    rows[43] = listing(44, { status: 'RENTED' });
    const { body } = await get('/api/rentals?limit=3');
    assert.deepEqual(ids(body), [43, 42, 41]);
    assert.equal(lastQuery.where.status, 'ACTIVE');
  });

  test('coordinates are finite numbers within range; equipment rentals have vehicle: null', async () => {
    rows[44] = listing(45, { itemType: 'EQUIPMENT' });
    rows[43] = listing(44, { vehicleDetail: { ...listing(44).vehicleDetail, latitude: new Prisma.Decimal('-33.8688000'), longitude: new Prisma.Decimal('151.2093000') } });
    const { body } = await get('/api/rentals?limit=3');
    assert.equal(body.data.rentals[0].vehicle, null);
    for (const rental of body.data.rentals.slice(1)) {
      const { latitude, longitude } = rental.vehicle;
      assert.equal(typeof latitude, 'number');
      assert.equal(typeof longitude, 'number');
      assert.ok(Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180);
    }
    assert.deepEqual([body.data.rentals[1].vehicle.latitude, body.data.rentals[1].vehicle.longitude], [-33.8688, 151.2093]);
  });

  test('image: primary image first, otherwise the oldest image, otherwise null', async () => {
    rows[44] = listing(45);                                             // has a primary image
    rows[43] = listing(44, { images: [{ id: 2, imageUrl: 'https://cdn.unimart.lk/r/b.jpg', isPrimary: false }, { id: 1, imageUrl: 'https://cdn.unimart.lk/r/a.jpg', isPrimary: false }] });
    rows[42] = listing(43, { images: [] });
    const { body } = await get('/api/rentals?limit=3');
    assert.deepEqual(body.data.rentals.map((r) => r.primaryImageUrl), ['https://cdn.unimart.lk/r/45-primary.jpg', 'https://cdn.unimart.lk/r/a.jpg', null]);
  });

  test('prices with cents stay exact numbers', async () => {
    rows[44] = listing(45, { rentalPrice: new Prisma.Decimal('1234.50') });
    const { body } = await get('/api/rentals?limit=1');
    assert.equal(body.data.rentals[0].rentalPrice, 1234.5);
  });
});

// ---------- limit ----------
describe('limit parameter', () => {
  test('defaults to 20 and asks the database for one extra row', async () => {
    const { body } = await get('/api/rentals');
    assert.equal(body.data.rentals.length, 20);
    assert.equal(lastQuery.take, 21);
  });

  test('accepts 1 and 50', async () => {
    assert.equal((await get('/api/rentals?limit=1')).body.data.rentals.length, 1);
    assert.equal((await get('/api/rentals?limit=50')).body.data.rentals.length, 45);
  });

  for (const bad of ['0', '51', '-1', '1.5', 'abc', '', '20&limit=30']) {
    test(`rejects limit=${bad} with 400`, async () => {
      const { response, body } = await get(`/api/rentals?limit=${bad}`);
      assert.equal(response.status, 400);
      assert.deepEqual(body, { status: 'error', message: 'limit must be a whole number between 1 and 50.' });
      assert.equal(lastQuery, null, 'database not queried');
    });
  }
});

// ---------- cursor pagination ----------
describe('cursor pagination', () => {
  test('pages follow nextCursor without gaps or duplicates, and the last page has nextCursor: null', async () => {
    const { seen, cursors } = await walkAllPages(20);
    assert.deepEqual(cursors, [26, 6, null], 'nextCursor values across pages');
    assertEveryRentalOnce(seen, Array.from({ length: 45 }, (_, i) => 45 - i));
  });

  for (const limit of [1, 7, 44, 45, 50]) {
    test(`walking every page with limit=${limit} returns each rental exactly once`, async () => {
      const { seen, cursors } = await walkAllPages(limit);
      // another page is reported only when more than `limit` rentals remain, so no empty trailing page
      assert.equal(cursors.length, Math.ceil(45 / limit), 'number of pages');
      assertEveryRentalOnce(seen, activeIdsNewestFirst());
    });
  }

  test('inactive rentals mixed in are never returned and never break the walk', async () => {
    rows = rows.map((row) => (row.id % 4 === 0 ? { ...row, status: 'INACTIVE' } : row));
    const { seen } = await walkAllPages(10);
    assertEveryRentalOnce(seen, activeIdsNewestFirst());
    assert.ok(seen.every((id) => id % 4 !== 0));
  });

  test('a page that exactly fills the limit with nothing after it has nextCursor: null', async () => {
    rows = Array.from({ length: 20 }, (_, i) => listing(i + 1));
    const { body } = await get('/api/rentals?limit=20');
    assert.equal(body.data.rentals.length, 20);
    assert.equal(body.data.nextCursor, null);
  });

  test('empty results: rentals [] and nextCursor null', async () => {
    rows = [];
    const { response, body } = await get('/api/rentals');
    assert.equal(response.status, 200);
    assert.deepEqual(body, { status: 'success', data: { rentals: [], nextCursor: null } });
  });

  test('the cursor becomes an "older than" id filter (no Prisma cursor/skip)', async () => {
    const { response, body } = await get('/api/rentals?limit=5&cursor=30');
    assert.equal(response.status, 200);
    assert.deepEqual(ids(body), [29, 28, 27, 26, 25]);
    assert.deepEqual(lastQuery.where, { status: 'ACTIVE', id: { lt: 30 } });
    assert.equal(lastQuery.cursor, undefined);
    assert.equal(lastQuery.skip, undefined);
    assert.deepEqual((await get('/api/rentals?limit=5')).body.data.rentals.length, 5);
    assert.deepEqual(lastQuery.where, { status: 'ACTIVE' }, 'first page has no id filter');
  });

  test('cursor past the oldest rental returns an empty last page', async () => {
    const { body } = await get('/api/rentals?cursor=1');
    assert.deepEqual(body.data, { rentals: [], nextCursor: null });
  });

  test('the next page still loads if the cursor rental was deleted meanwhile', async () => {
    const first = (await get('/api/rentals?limit=20')).body.data;        // nextCursor = 26
    rows = rows.filter((row) => row.id !== first.nextCursor);              // provider deletes listing 26
    const { body } = await get(`/api/rentals?limit=20&cursor=${first.nextCursor}`);
    assert.deepEqual(ids(body), Array.from({ length: 20 }, (_, i) => 25 - i), 'continues with 25..6');
    assert.equal(body.data.nextCursor, 6);
  });

  test('deleted cursor rental: walking all pages returns every remaining rental once, with correct cursors', async () => {
    const { seen, cursors } = await walkAllPages(20, (cursor) => {
      if (cursor === 26) rows = rows.filter((row) => row.id !== 26);      // deleted after page 1 was shown
    });
    assert.deepEqual(cursors, [26, 6, null]);
    // 26 was already shown on page 1 before it was deleted; every other rental appears once
    assertEveryRentalOnce(seen, Array.from({ length: 45 }, (_, i) => 45 - i));
  });

  test('cursor rental deleted before EVERY page: nothing missing or repeated among the rest', async () => {
    const deleted = [];
    const { seen, cursors } = await walkAllPages(10, (cursor) => {
      rows = rows.filter((row) => row.id !== cursor);
      deleted.push(cursor);
    });
    assert.deepEqual(cursors, [36, 26, 16, 6, null]);
    assert.deepEqual(deleted, [36, 26, 16, 6]);
    assertEveryRentalOnce(seen, Array.from({ length: 45 }, (_, i) => 45 - i));
  });

  test('no rental is skipped if the cursor rental stopped being ACTIVE meanwhile', async () => {
    const first = (await get('/api/rentals?limit=20')).body.data;        // nextCursor = 26
    rows = rows.map((row) => (row.id === first.nextCursor ? { ...row, status: 'RENTED' } : row));
    const { body } = await get(`/api/rentals?limit=20&cursor=${first.nextCursor}`);
    assert.equal(ids(body)[0], 25, 'rental 25 is not skipped');
    assert.equal(body.data.rentals.length, 20);
    assert.equal(body.data.nextCursor, 6);
  });

  test('cursor rental no longer ACTIVE: walking all pages misses nothing and repeats nothing', async () => {
    const { seen, cursors } = await walkAllPages(20, (cursor) => {
      rows = rows.map((row) => (row.id === cursor ? { ...row, status: 'RENTED' } : row));   // each cursor gets rented
    });
    assert.deepEqual(cursors, [26, 6, null]);
    assertEveryRentalOnce(seen, Array.from({ length: 45 }, (_, i) => 45 - i));
  });

  test('a rental further down becoming inactive or deleted mid-walk is simply not shown', async () => {
    const { seen } = await walkAllPages(20, (cursor) => {
      if (cursor === 26) {
        rows = rows.filter((row) => row.id !== 10).map((row) => (row.id === 15 ? { ...row, status: 'INACTIVE' } : row));
      }
    });
    assertEveryRentalOnce(seen, Array.from({ length: 45 }, (_, i) => 45 - i).filter((id) => id !== 10 && id !== 15));
  });

  test('rentals added at the top while paging do not shift or repeat older pages', async () => {
    const first = (await get('/api/rentals?limit=20')).body.data;
    rows.push(listing(46), listing(47));
    const { body } = await get(`/api/rentals?limit=20&cursor=${first.nextCursor}`);
    assert.deepEqual(ids(body), Array.from({ length: 20 }, (_, i) => 25 - i));
  });

  for (const bad of ['0', '-5', '1.5', 'abc', '']) {
    test(`rejects cursor=${bad} with 400`, async () => {
      const { response, body } = await get(`/api/rentals?cursor=${encodeURIComponent(bad)}`);
      assert.equal(response.status, 400);
      assert.deepEqual(body, { status: 'error', message: 'cursor must be a positive whole number.' });
      assert.equal(lastQuery, null, 'database not queried');
    });
  }
});

// ---------- errors ----------
describe('errors', () => {
  test('database unreachable -> 503 with a friendly message', async () => {
    console.error = () => {};
    failWith = new Prisma.PrismaClientInitializationError("Can't reach database server at `localhost:3306`", '5.22.0');
    const { response, body } = await get('/api/rentals');
    assert.equal(response.status, 503);
    assert.deepEqual(body, { status: 'error', message: 'Rental service is temporarily unavailable. Please try again later.' });
  });

  test('any other failure -> 500 without leaking details', async () => {
    console.error = () => {};
    failWith = new Error('SELECT ... secret table detail');
    const { response, body } = await get('/api/rentals');
    assert.equal(response.status, 500);
    assert.deepEqual(body, { status: 'error', message: 'Internal server error while loading rentals' });
  });
});

// ---------- what the app sends and reads ----------
describe('frontend contract', () => {
  test('the app\'s requests (/api + /rentals?limit=20[&cursor=N]) hit this endpoint', async () => {
    const first = await get('/api/rentals?limit=20');
    assert.equal(first.response.status, 200);
    const next = await get(`/api/rentals?limit=20&cursor=${first.body.data.nextCursor}`);
    assert.equal(next.response.status, 200);
  });

  test('works with the headers the app sends (JSON content type, bearer token) and allows CORS', async () => {
    const { response } = await get('/api/rentals', { 'Content-Type': 'application/json', Authorization: 'Bearer test-token', Origin: 'http://localhost:8081' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
  });

  test('nextCursor is always a positive whole number or null (what the app accepts)', async () => {
    for (const path of ['/api/rentals?limit=7', '/api/rentals?limit=50', '/api/rentals?cursor=3']) {
      const { nextCursor } = (await get(path)).body.data;
      assert.ok(nextCursor === null || (Number.isInteger(nextCursor) && nextCursor > 0), `${path}: ${nextCursor}`);
    }
  });

  test('responses are gzip-compressed when the client accepts it', async () => {
    const { response } = await get('/api/rentals?limit=20', { 'Accept-Encoding': 'gzip' });
    assert.equal(response.headers.get('content-encoding'), 'gzip');
  });
});
