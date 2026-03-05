/**
 * 性能和并发测试脚本
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// 测试配置
const CONFIG = {
  concurrency: 5,      // 并发数
  totalRequests: 10,   // 总请求数
  timeout: 120000,     // 超时时间 (ms)
};

// 简单请求测试数据
const simpleRequest = {
  model: 'opus-4.6',
  messages: [{ role: 'user', content: '说一个字' }]
};

// 统计数据
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  times: [],
  errors: []
};

async function makeRequest(id) {
  const start = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
    
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simpleRequest),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    const elapsed = Date.now() - start;
    
    if (response.ok && data.choices) {
      stats.success++;
      stats.times.push(elapsed);
      console.log(`[${id}] ✓ ${elapsed}ms - "${data.choices[0]?.message?.content?.slice(0, 20)}..."`);
    } else {
      stats.failed++;
      stats.errors.push({ id, error: data.error?.message || 'Unknown error' });
      console.log(`[${id}] ✗ ${elapsed}ms - Error: ${data.error?.message}`);
    }
  } catch (err) {
    const elapsed = Date.now() - start;
    stats.failed++;
    stats.errors.push({ id, error: err.message });
    console.log(`[${id}] ✗ ${elapsed}ms - ${err.message}`);
  }
  
  stats.total++;
}

async function runConcurrentBatch(batchSize, startId) {
  const promises = [];
  for (let i = 0; i < batchSize; i++) {
    promises.push(makeRequest(startId + i));
  }
  await Promise.all(promises);
}

async function runSequentialTest() {
  console.log('\n=== 顺序请求测试 (5次) ===\n');
  
  const seqStats = { times: [], success: 0 };
  
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    try {
      const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simpleRequest)
      });
      const data = await response.json();
      const elapsed = Date.now() - start;
      
      if (response.ok) {
        seqStats.times.push(elapsed);
        seqStats.success++;
        console.log(`[seq-${i+1}] ✓ ${elapsed}ms`);
      }
    } catch (err) {
      console.log(`[seq-${i+1}] ✗ ${err.message}`);
    }
  }
  
  if (seqStats.times.length > 0) {
    const avg = Math.round(seqStats.times.reduce((a, b) => a + b, 0) / seqStats.times.length);
    const min = Math.min(...seqStats.times);
    const max = Math.max(...seqStats.times);
    console.log(`\n顺序测试结果: 成功=${seqStats.success}/5, 平均=${avg}ms, 最小=${min}ms, 最大=${max}ms`);
  }
}

async function runConcurrencyTest() {
  console.log(`\n=== 并发请求测试 (${CONFIG.concurrency}并发 x ${CONFIG.totalRequests / CONFIG.concurrency}批) ===\n`);
  
  const overallStart = Date.now();
  
  // 分批执行并发请求
  for (let batch = 0; batch < CONFIG.totalRequests / CONFIG.concurrency; batch++) {
    console.log(`--- 批次 ${batch + 1} ---`);
    await runConcurrentBatch(CONFIG.concurrency, batch * CONFIG.concurrency + 1);
  }
  
  const totalTime = Date.now() - overallStart;
  
  // 输出统计
  console.log('\n========== 并发测试结果 ==========');
  console.log(`总请求数: ${stats.total}`);
  console.log(`成功: ${stats.success}, 失败: ${stats.failed}`);
  console.log(`总耗时: ${totalTime}ms`);
  
  if (stats.times.length > 0) {
    const avg = Math.round(stats.times.reduce((a, b) => a + b, 0) / stats.times.length);
    const min = Math.min(...stats.times);
    const max = Math.max(...stats.times);
    const p50 = stats.times.sort((a, b) => a - b)[Math.floor(stats.times.length * 0.5)];
    const p95 = stats.times.sort((a, b) => a - b)[Math.floor(stats.times.length * 0.95)];
    
    console.log(`平均响应时间: ${avg}ms`);
    console.log(`最小/最大: ${min}ms / ${max}ms`);
    console.log(`P50: ${p50}ms, P95: ${p95}ms`);
    console.log(`吞吐量: ${(stats.success / (totalTime / 1000)).toFixed(2)} req/s`);
  }
  
  if (stats.errors.length > 0) {
    console.log('\n错误详情:');
    stats.errors.forEach(e => console.log(`  [${e.id}] ${e.error}`));
  }
}

async function testStreamPerformance() {
  console.log('\n=== 流式请求测试 ===\n');
  
  const start = Date.now();
  let firstChunkTime = 0;
  let chunks = 0;
  
  try {
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...simpleRequest,
        messages: [{ role: 'user', content: '数到10' }],
        stream: true
      })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      if (chunks === 0) {
        firstChunkTime = Date.now() - start;
      }
      chunks++;
    }
    
    const totalTime = Date.now() - start;
    console.log(`首个chunk延迟 (TTFB): ${firstChunkTime}ms`);
    console.log(`总chunks数: ${chunks}`);
    console.log(`总耗时: ${totalTime}ms`);
    
  } catch (err) {
    console.log(`流式测试失败: ${err.message}`);
  }
}

async function main() {
  console.log('========================================');
  console.log('     OpenAI Proxy 性能测试');
  console.log('========================================');
  console.log(`目标: ${BASE_URL}`);
  console.log(`并发数: ${CONFIG.concurrency}`);
  console.log(`总请求数: ${CONFIG.totalRequests}`);
  
  // 先检查服务是否可用
  try {
    const health = await fetch(`${BASE_URL}/health`);
    if (!health.ok) throw new Error('Health check failed');
    console.log('服务状态: ✓ 正常\n');
  } catch (err) {
    console.error('服务不可用，请先启动服务器');
    process.exit(1);
  }
  
  // 运行测试
  await runSequentialTest();
  await runConcurrencyTest();
  await testStreamPerformance();
  
  console.log('\n========================================');
  console.log('     测试完成');
  console.log('========================================\n');
}

main().catch(console.error);

