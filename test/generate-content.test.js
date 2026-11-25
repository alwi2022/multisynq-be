const { test } = require('node:test');
const assert = require('node:assert/strict');
const generateContent = require('../config/generate-content');

test('retries temporary provider failures and returns a successful reply', async () => {
  let attempts = 0;
  const result = await generateContent({ async generateContent(request, options) {
    assert.equal(options.timeout, 7500);
    if (++attempts < 3) throw Object.assign(new Error('Busy'), { status: 503 });
    return 'reply';
  } }, 'question', async () => {});
  assert.equal(result, 'reply'); assert.equal(attempts, 3);
});

test('stops after three temporary failures and never retries an invalid key', async () => {
  for (const status of [503, 400]) {
    let attempts = 0;
    await assert.rejects(generateContent({ async generateContent() {
      attempts++; throw Object.assign(new Error('Provider failure'), {status});
    } }, 'question', async () => {}), {status});
    assert.equal(attempts, status === 503 ? 3 : 1);
  }
});

test('retries provider timeouts but stops immediately after visitor cancellation', async () => {
  let attempts = 0;
  const result = await generateContent({ async generateContent() {
    if (++attempts === 1) throw new Error('Request aborted when fetching: timeout');
    return 'reply';
  } }, 'question', async () => {});
  assert.equal(result, 'reply'); assert.equal(attempts, 2);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(generateContent({ async generateContent() { throw new Error('Should not call provider'); } }, 'question', async () => {}, controller.signal), {name:'AbortError'});
});
