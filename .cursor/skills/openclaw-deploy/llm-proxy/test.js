/**
 * 测试脚本 - 验证 OpenAI Agent Proxy
 * 
 * 使用方法:
 *   1. 先启动服务器: npm start
 *   2. 新开终端运行: node test.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testNonStream() {
  console.log('=== 测试非流式请求 ===\n');
  
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'opus-4.6',
      messages: [{ role: 'user', content: '你好' }],
      stream: false
    })
  });
  
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  console.log('\nContent:', data.choices?.[0]?.message?.content);
  console.log('\n');
}

async function testStream() {
  console.log('=== 测试流式请求 ===\n');
  
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'opus-4.6',
      messages: [{ role: 'user', content: '你好' }],
      stream: true
    })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  
  console.log('Streaming chunks:');
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const text = decoder.decode(value);
    const lines = text.split('\n').filter(line => line.startsWith('data: '));
    
    for (const line of lines) {
      const data = line.slice(6); // 去掉 'data: ' 前缀
      if (data === '[DONE]') {
        console.log('\n[DONE]');
        continue;
      }
      
      try {
        const chunk = JSON.parse(data);
        const content = chunk.choices?.[0]?.delta?.content || '';
        if (content) {
          process.stdout.write(content);
          fullContent += content;
        }
        if (chunk.choices?.[0]?.finish_reason === 'stop') {
          console.log('\n[finish_reason: stop]');
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }
  
  console.log('\n\nFull content:', fullContent);
  console.log('\n');
}

async function testModels() {
  console.log('=== 测试 Models 接口 ===\n');
  
  const response = await fetch(`${BASE_URL}/v1/models`);
  const data = await response.json();
  console.log('Models:', JSON.stringify(data, null, 2));
  console.log('\n');
}

async function testHealth() {
  console.log('=== 测试 Health 接口 ===\n');
  
  const response = await fetch(`${BASE_URL}/health`);
  const data = await response.json();
  console.log('Health:', JSON.stringify(data, null, 2));
  console.log('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';
  
  try {
    switch (testType) {
      case 'stream':
        await testStream();
        break;
      case 'non-stream':
        await testNonStream();
        break;
      case 'models':
        await testModels();
        break;
      case 'health':
        await testHealth();
        break;
      case 'all':
      default:
        await testHealth();
        await testModels();
        await testNonStream();
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

