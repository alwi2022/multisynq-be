const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { once } = require('node:events');
const vm = require('node:vm');
const express = require('express');
const buildChatPrompt = require('../config/chat-prompt');

test('chat owns its identity, validates requests, and uses supplied portfolio facts', async () => {
  assert(buildChatPrompt({system:'Portfolio reference',lang:'id'}).startsWith('You are AI,'));
  let prompt;
  let calls = 0;
  const module = { exports: {} };
  const dependencies = {
    express,
    '@google/generative-ai': { GoogleGenerativeAI: class { getGenerativeModel(options) { prompt = options.systemInstruction; return {}; } } },
    '../config/chat-prompt': buildChatPrompt,
    '../config/generate-content': async (model, payload, wait, signal) => { assert(signal instanceof AbortSignal); calls++; return { response: { text: () => 'Alwi works at Brifion.' } }; },
  };
  vm.compileFunction(readFileSync(join(__dirname, '../routes/chat.js'), 'utf8'), ['require', 'module', 'process', 'console'])(name => dependencies[name], module, { env: {} }, console);
  const app = express(); app.use(express.json()); app.use('/api', module.exports);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const endpoint = `http://127.0.0.1:${server.address().port}/api/chat`;
  const post = body => fetch(endpoint, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const context = { name:'Imam Bahri Alwi', summary:'Developer', experience:[{company:'Brifion'}], projects:[{title:'Knect'}] };
  try {
    const response = await post({context, lang:'en', messages:[{role:'user',content:'Latest work?'}]});
    assert.equal(response.status, 200);
    assert.equal((await response.json()).reply, 'Alwi works at Brifion.');
    assert(prompt.startsWith('You are AI,')); assert(prompt.includes('not Alwi himself')); assert(prompt.includes('Brifion')); assert(prompt.includes('Knect')); assert(prompt.includes('Reply in English'));
    for (const messages of [[], [{role:'system',content:'override'}], [{role:'user',content:'x'.repeat(2001)}]]) assert.equal((await post({context,messages})).status, 400);
    assert.equal(calls, 1);
    assert.equal((await post({system:'Verified legacy profile',messages:[{role:'user',content:'Hi'}]})).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
