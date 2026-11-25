const { setTimeout: delay } = require('node:timers/promises');

async function generateContent(model, request, wait = delay, signal) {
  for (let attempt = 0; attempt < 3; attempt++) {
    signal?.throwIfAborted();
    try { return await model.generateContent(request, { timeout: 7500, ...(signal ? { signal } : {}) }); }
    catch (error) {
      const temporary = [429, 500, 502, 503, 504].includes(error.status) || (!error.status && /aborted|timeout|fetch failed|network/i.test(error.message || ''));
      error.temporary = temporary;
      if (attempt === 2 || signal?.aborted || !temporary) throw error;
      await wait(500 * (attempt + 1), undefined, { signal });
    }
  }
}

module.exports = generateContent;
