/**
 * 测试脚本 — 验证 Cursor ACP Proxy
 *
 * 使用方法:
 *   1. 先启动服务器: npm start
 *   2. 新开终端运行: node test.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:18790';

async function testHealth() {
  console.log('=== 测试 Health 接口 ===\n');
  const response = await fetch(`${BASE_URL}/v1/health`);
  const data = await response.json();
  console.log('Health:', JSON.stringify(data, null, 2));

  if (data.mode !== 'acp') {
    console.error('⚠️  不是 ACP 模式！当前 mode:', data.mode);
  } else if (!data.acp?.running) {
    console.error('⚠️  ACP 进程未运行！');
  } else {
    console.log('✓ ACP 模式正常，进程运行中');
  }
  console.log('');
}

async function testModels() {
  console.log('=== 测试 Models 接口 ===\n');
  const response = await fetch(`${BASE_URL}/v1/models`);
  const data = await response.json();
  console.log('Models:', data.data?.map(m => m.id).join(', '));
  console.log('');
}

async function testNonStream() {
  console.log('=== 测试非流式请求 ===\n');
  const start = Date.now();

  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'opus-4.6',
      messages: [{ role: 'user', content: '只回复两个字：你好' }],
      stream: false
    })
  });

  const data = await response.json();
  const elapsed = Date.now() - start;

  console.log(`响应时间: ${elapsed}ms`);
  console.log('Content:', data.choices?.[0]?.message?.content);
  console.log('');
}

async function testStream() {
  console.log('=== 测试流式请求 ===\n');
  const start = Date.now();
  let firstChunkTime = 0;
  let chunks = 0;
  let fullContent = '';

  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'opus-4.6',
      messages: [{ role: 'user', content: '数到5' }],
      stream: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const chunk = JSON.parse(data);
        const content = chunk.choices?.[0]?.delta?.content || '';
        if (content) {
          if (chunks === 0) firstChunkTime = Date.now() - start;
          chunks++;
          fullContent += content;
          process.stdout.write(content);
        }
      } catch {}
    }
  }

  const totalTime = Date.now() - start;
  console.log(`\n\nTTFB: ${firstChunkTime}ms, 总耗时: ${totalTime}ms, Chunks: ${chunks}`);
  console.log('');
}

async function testWarmup() {
  console.log('=== 测试热启动延迟（连续 3 次非流式） ===\n');

  for (let i = 1; i <= 3; i++) {
    const start = Date.now();
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'opus-4.6',
        messages: [{ role: 'user', content: `只回复数字${i}` }],
        stream: false
      })
    });
    const data = await response.json();
    const elapsed = Date.now() - start;
    console.log(`[${i}] ${elapsed}ms → "${data.choices?.[0]?.message?.content}"`);
  }
  console.log('');
}

async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';

  try {
    switch (testType) {
      case 'health': await testHealth(); break;
      case 'models': await testModels(); break;
      case 'non-stream': await testNonStream(); break;
      case 'stream': await testStream(); break;
      case 'warmup': await testWarmup(); break;
      case 'all':
      default:
        await testHealth();
        await testModels();
        await testNonStream();
        await testWarmup();
        await testStream();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('\n请确保服务器已启动: npm start');
    process.exit(1);
  }
}

main();
