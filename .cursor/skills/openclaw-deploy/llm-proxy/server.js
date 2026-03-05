import http from 'http';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';

const PORT = process.env.PORT || 3000;
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'opus-4.6';

// 性能优化配置
const CONFIG = {
  agentPath: process.env.AGENT_PATH || (process.env.HOME + '/.local/bin/agent'),
  // 使用 ask 模式（只读，可能更快）
  useAskMode: true,
  // 禁用沙箱
  disableSandbox: true,
  // 非流式请求时不使用 stream-partial-output（减少输出开销）
  optimizeNonStream: process.env.OPTIMIZE_NON_STREAM !== 'false',
  // 快速模型映射（自动将某些模型映射到更快的版本）
  fastModelMapping: {
    'gpt-4': 'gpt-5.2-codex-fast',
    'gpt-4-turbo': 'gpt-5.2-codex-fast',
    'gpt-3.5-turbo': 'gemini-3-flash',
  },
  // 是否启用快速模型映射
  useFastModels: process.env.USE_FAST_MODELS === 'true',
};

/**
 * 生成 tool call ID
 */
function generateToolCallId() {
  return `call_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

/**
 * 解析请求体
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * 从消息中提取文本内容
 */
function extractMessageContent(message) {
  if (!message) return '';
  
  if (typeof message.content === 'string') {
    return message.content;
  }
  
  if (Array.isArray(message.content)) {
    return message.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');
  }
  
  return '';
}

/**
 * 将 tools 定义转换为系统提示
 */
function buildToolsPrompt(tools) {
  if (!tools || tools.length === 0) return '';
  
  let prompt = '\n\n[TOOLS AVAILABLE]\n';
  prompt += '你有以下工具可以使用。如果用户的请求需要使用工具才能完成，你必须调用工具。\n';
  prompt += '调用工具时，请严格使用以下 JSON 格式输出（不要添加其他文字）：\n\n';
  prompt += '```tool_calls\n[{"name": "函数名", "arguments": {"参数名": "参数值"}}]\n```\n\n';
  prompt += '可用工具列表：\n';
  
  for (const tool of tools) {
    if (tool.type === 'function') {
      const func = tool.function;
      prompt += `\n- **${func.name}**: ${func.description || '无描述'}\n`;
      if (func.parameters && func.parameters.properties) {
        prompt += `  参数：\n`;
        for (const [paramName, paramDef] of Object.entries(func.parameters.properties)) {
          const required = func.parameters.required?.includes(paramName) ? '(必填)' : '(可选)';
          prompt += `    - ${paramName} ${required}: ${paramDef.description || paramDef.type}\n`;
        }
      }
    }
  }
  
  prompt += '\n[END TOOLS]\n';
  return prompt;
}

/**
 * 从响应内容中解析 tool calls
 */
function parseToolCalls(content) {
  if (!content) return null;
  
  // 匹配 ```tool_calls ... ``` 格式
  const toolCallsMatch = content.match(/```tool_calls\s*([\s\S]*?)\s*```/);
  if (toolCallsMatch) {
    try {
      const calls = JSON.parse(toolCallsMatch[1]);
      if (Array.isArray(calls) && calls.length > 0) {
        return {
          toolCalls: calls.map((call, index) => ({
            id: generateToolCallId(),
            type: 'function',
            function: {
              name: call.name,
              arguments: typeof call.arguments === 'string' 
                ? call.arguments 
                : JSON.stringify(call.arguments)
            }
          })),
          // 移除 tool_calls 块后的剩余内容
          remainingContent: content.replace(/```tool_calls\s*[\s\S]*?\s*```/, '').trim()
        };
      }
    } catch (e) {
      // 解析失败，返回 null
    }
  }
  
  // 也尝试匹配直接的 JSON 数组格式（兼容性）
  const jsonMatch = content.match(/\[[\s\S]*"name"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const calls = JSON.parse(jsonMatch[0]);
      if (Array.isArray(calls) && calls.length > 0 && calls[0].name) {
        return {
          toolCalls: calls.map((call) => ({
            id: generateToolCallId(),
            type: 'function',
            function: {
              name: call.name,
              arguments: typeof call.arguments === 'string' 
                ? call.arguments 
                : JSON.stringify(call.arguments)
            }
          })),
          remainingContent: content.replace(jsonMatch[0], '').trim()
        };
      }
    } catch (e) {
      // 解析失败，返回 null
    }
  }
  
  return null;
}

/**
 * 从 OpenAI 消息数组构建完整的对话 prompt
 */
function buildPromptFromMessages(messages, tools, toolChoice) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return '';
  }
  
  let prompt = '';
  
  // 添加 tools 定义到提示中
  if (tools && tools.length > 0 && toolChoice !== 'none') {
    prompt += buildToolsPrompt(tools);
    if (toolChoice === 'required') {
      prompt += '\n**重要**：你必须调用至少一个工具来完成用户的请求，不要直接回复。\n';
    } else if (typeof toolChoice === 'object' && toolChoice.function) {
      prompt += `\n**重要**：你必须调用工具 "${toolChoice.function.name}" 来完成用户的请求。\n`;
    }
    prompt += '\n';
  }
  
  // 构建对话历史
  for (const msg of messages) {
    const role = msg.role;
    const content = extractMessageContent(msg);
    
    if (role === 'system') {
      prompt += `${content}\n\n`;
    } else if (role === 'user') {
      prompt += `用户: ${content}\n\n`;
    } else if (role === 'assistant') {
      prompt += `助手: ${content}`;
      // 处理 tool_calls
      if (msg.tool_calls) {
        prompt += '\n```tool_calls\n' + JSON.stringify(msg.tool_calls.map(tc => ({
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments)
        })), null, 2) + '\n```';
      }
      prompt += '\n\n';
    } else if (role === 'tool') {
      prompt += `工具返回 (${msg.tool_call_id}): ${content}\n\n`;
    }
  }
  
  return prompt.trim();
}

/**
 * 生成 OpenAI 格式的响应 ID
 */
function generateChatId() {
  return `chatcmpl-${randomUUID().replace(/-/g, '').slice(0, 29)}`;
}

/**
 * 构建非流式响应
 */
function buildNonStreamResponse(content, model, toolCalls = null) {
  const message = {
    role: 'assistant',
    content: toolCalls ? (content || null) : content
  };
  
  if (toolCalls) {
    message.tool_calls = toolCalls;
  }
  
  return {
    id: generateChatId(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{
      index: 0,
      message: message,
      finish_reason: toolCalls ? 'tool_calls' : 'stop'
    }],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };
}

/**
 * 构建流式响应的 chunk
 */
function buildStreamChunk(content, model, chatId, finishReason = null) {
  const chunk = {
    id: chatId,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{
      index: 0,
      delta: finishReason ? {} : { content: content },
      finish_reason: finishReason
    }]
  };
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

/**
 * 构建 agent 命令参数
 */
function buildAgentArgs(model, prompt, isStream = false) {
  // 模型映射（可选快速模型）
  let finalModel = model;
  if (CONFIG.useFastModels && CONFIG.fastModelMapping[model]) {
    finalModel = CONFIG.fastModelMapping[model];
    console.log(`[Agent] Model mapped: ${model} -> ${finalModel}`);
  }
  
  const args = ['--model', finalModel, '--trust'];
  
  if (CONFIG.useAskMode) {
    args.push('--mode', 'ask');
  }
  if (CONFIG.disableSandbox) {
    args.push('--sandbox', 'disabled');
  }
  
  // 流式请求需要 stream-partial-output
  if (isStream) {
    args.push('--stream-partial-output');
  }
  
  args.push('--output-format', 'stream-json', '-p', prompt);
  
  return args;
}

/**
 * 执行 agent 命令并收集完整输出（非流式）
 * @returns {Promise<{content: string, toolCalls: Array|null}>}
 */
function executeAgentNonStream(prompt, model, hasTools = false) {
  return new Promise((resolve, reject) => {
    let agent;
    let isResolved = false;
    
    // 超时处理（默认 5 分钟）
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        console.error('[Agent] Timeout after 5 minutes');
        if (agent && !agent.killed) {
          agent.kill('SIGTERM');
        }
        reject(new Error('Agent request timed out after 5 minutes'));
      }
    }, 5 * 60 * 1000);
    
    const cleanup = () => {
      clearTimeout(timeout);
      isResolved = true;
    };
    
    try {
      const args = buildAgentArgs(model, prompt, false);
      
      console.log('[Agent] Starting:', CONFIG.agentPath, args.slice(0, -2).join(' '), `"${prompt.slice(0, 50)}..."`);
      
      agent = spawn(CONFIG.agentPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });
      
      // 立即关闭 stdin，防止 agent 等待输入
      agent.stdin.end();
    } catch (spawnError) {
      cleanup();
      reject(new Error(`Failed to spawn agent: ${spawnError.message}`));
      return;
    }
    
    let fullContent = '';
    let buffer = '';
    
    agent.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          // 收集 assistant 消息的内容
          if (json.type === 'assistant' && json.message?.content) {
            for (const part of json.message.content) {
              if (part.type === 'text') {
                fullContent += part.text;
              }
            }
          }
          // 如果是最终结果，使用完整内容
          if (json.type === 'result' && json.result) {
            fullContent = json.result;
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    });
    
    agent.stderr.on('data', (data) => {
      console.error('[agent stderr]', data.toString());
    });
    
    agent.on('close', (code) => {
      if (isResolved) return;
      cleanup();
      
      // 处理剩余的 buffer
      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer);
          if (json.type === 'result' && json.result) {
            fullContent = json.result;
          }
        } catch (e) {}
      }
      
      if (code !== 0 && !fullContent) {
        reject(new Error(`Agent process exited with code ${code}`));
      } else {
        // 如果有 tools 定义，尝试解析 tool calls
        let toolCalls = null;
        let content = fullContent;
        
        if (hasTools) {
          try {
            const parsed = parseToolCalls(fullContent);
            if (parsed) {
              toolCalls = parsed.toolCalls;
              content = parsed.remainingContent || null;
            }
          } catch (parseError) {
            console.error('[Agent] Error parsing tool calls:', parseError.message);
          }
        }
        
        resolve({ content, toolCalls });
      }
    });
    
    agent.on('error', (err) => {
      if (isResolved) return;
      cleanup();
      reject(new Error(`Failed to start agent: ${err.message}`));
    });
  });
}

/**
 * 构建流式 tool call chunk
 */
function buildStreamToolCallChunk(toolCall, index, model, chatId, isFirst = false) {
  const delta = isFirst ? {
    role: 'assistant',
    content: null,
    tool_calls: [{
      index: index,
      id: toolCall.id,
      type: 'function',
      function: {
        name: toolCall.function.name,
        arguments: ''
      }
    }]
  } : {
    tool_calls: [{
      index: index,
      function: {
        arguments: toolCall.function.arguments
      }
    }]
  };
  
  const chunk = {
    id: chatId,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{
      index: 0,
      delta: delta,
      finish_reason: null
    }]
  };
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

/**
 * 执行 agent 命令并流式输出
 */
function executeAgentStream(prompt, model, res, chatId, hasTools = false) {
  return new Promise((resolve, reject) => {
    let agent;
    let isResolved = false;
    
    // 超时处理（默认 10 分钟，流式请求可能需要更长时间）
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        console.error('[Agent Stream] Timeout after 10 minutes');
        if (agent && !agent.killed) {
          agent.kill('SIGTERM');
        }
        // 尝试发送错误并关闭连接
        try {
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ error: 'Request timed out' })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
          }
        } catch (e) {}
        reject(new Error('Agent stream request timed out after 10 minutes'));
      }
    }, 10 * 60 * 1000);
    
    const cleanup = () => {
      clearTimeout(timeout);
      isResolved = true;
    };
    
    try {
      const args = buildAgentArgs(model, prompt, true);
      
      console.log('[Agent] Starting stream:', CONFIG.agentPath, args.slice(0, -2).join(' '), `"${prompt.slice(0, 50)}..."`);
      
      agent = spawn(CONFIG.agentPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });
      
      // 立即关闭 stdin，防止 agent 等待输入
      agent.stdin.end();
    } catch (spawnError) {
      cleanup();
      reject(new Error(`Failed to spawn agent: ${spawnError.message}`));
      return;
    }
    
    let buffer = '';
    let sentFirstChunk = false;
    let fullContent = '';  // 用于检测 tool calls
    let toolCallsSent = false;
    
    agent.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          
          // 处理 assistant 消息（跳过没有 timestamp_ms 的完整内容消息）
          if (json.type === 'assistant' && json.message?.content && json.timestamp_ms) {
            for (const part of json.message.content) {
              if (part.type === 'text' && part.text) {
                fullContent += part.text;
                
                // 如果有 tools，检测是否开始输出 tool_calls
                if (hasTools && !toolCallsSent) {
                  // 检测是否在输出 tool_calls 块
                  if (fullContent.includes('```tool_calls')) {
                    // 等待完整的 tool_calls 块
                    continue;
                  }
                }
                
                // 发送第一个 chunk 时包含 role
                if (!sentFirstChunk) {
                  const firstChunk = {
                    id: chatId,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: model,
                    choices: [{
                      index: 0,
                      delta: { role: 'assistant', content: part.text },
                      finish_reason: null
                    }]
                  };
                  res.write(`data: ${JSON.stringify(firstChunk)}\n\n`);
                  sentFirstChunk = true;
                } else {
                  res.write(buildStreamChunk(part.text, model, chatId));
                }
              }
            }
          }
          
          // 处理最终结果，检测 tool calls
          if (json.type === 'result' && json.result && hasTools && !toolCallsSent) {
            const parsed = parseToolCalls(json.result);
            if (parsed && parsed.toolCalls) {
              toolCallsSent = true;
              // 发送 tool calls
              parsed.toolCalls.forEach((tc, idx) => {
                // 第一个 tool call 包含 role
                res.write(buildStreamToolCallChunk(tc, idx, model, chatId, idx === 0 && !sentFirstChunk));
                sentFirstChunk = true;
              });
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    });
    
    agent.stderr.on('data', (data) => {
      console.error('[agent stderr]', data.toString());
    });
    
    agent.on('close', (code) => {
      if (isResolved) return;
      cleanup();
      
      try {
        // 如果有 tools 但还没发送 tool calls，最后检查一次
        if (hasTools && !toolCallsSent) {
          try {
            const parsed = parseToolCalls(fullContent);
            if (parsed && parsed.toolCalls) {
              toolCallsSent = true;
              parsed.toolCalls.forEach((tc, idx) => {
                res.write(buildStreamToolCallChunk(tc, idx, model, chatId, idx === 0 && !sentFirstChunk));
                sentFirstChunk = true;
              });
            }
          } catch (parseError) {
            console.error('[Agent Stream] Error parsing tool calls:', parseError.message);
          }
        }
        
        // 发送结束 chunk
        const finishReason = toolCallsSent ? 'tool_calls' : 'stop';
        const endChunk = {
          id: chatId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: model,
          choices: [{
            index: 0,
            delta: {},
            finish_reason: finishReason
          }]
        };
        
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify(endChunk)}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      } catch (writeError) {
        console.error('[Agent Stream] Error writing final chunks:', writeError.message);
      }
      
      resolve();
    });
    
    agent.on('error', (err) => {
      if (isResolved) return;
      cleanup();
      
      console.error('[Agent Stream] Process error:', err.message);
      
      // 尝试发送错误并关闭连接
      try {
        if (!res.writableEnded) {
          res.write('data: [DONE]\n\n');
          res.end();
        }
      } catch (e) {}
      
      reject(new Error(`Failed to start agent: ${err.message}`));
    });
  });
}

/**
 * 处理 /v1/chat/completions 请求
 */
async function handleChatCompletions(req, res) {
  try {
    const body = await parseBody(req);
    const { 
      messages, 
      model = DEFAULT_MODEL, 
      stream = false,
      tools = null,
      tool_choice = 'auto'
    } = body;
    
    // 构建完整的 prompt（包含 tools 定义和对话历史）
    const prompt = buildPromptFromMessages(messages, tools, tool_choice);
    if (!prompt) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: {
          message: 'No valid messages found',
          type: 'invalid_request_error',
          code: 'invalid_messages'
        }
      }));
      return;
    }
    
    const hasTools = tools && tools.length > 0 && tool_choice !== 'none';
    console.log(`[${new Date().toISOString()}] Request: model=${model}, stream=${stream}, tools=${hasTools ? tools.length : 0}, prompt="${prompt.slice(0, 80)}..."`);
    
    if (stream) {
      // 流式响应
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      
      const chatId = generateChatId();
      await executeAgentStream(prompt, model, res, chatId, hasTools);
    } else {
      // 非流式响应
      const { content, toolCalls } = await executeAgentNonStream(prompt, model, hasTools);
      const response = buildNonStreamResponse(content, model, toolCalls);
      
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(response));
    }
  } catch (error) {
    console.error('[Error]', error);
    // 安全地发送错误响应（避免已经开始响应后再次 writeHead）
    try {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
      }
      if (!res.writableEnded) {
        res.end(JSON.stringify({
          error: {
            message: error.message || 'Internal server error',
            type: 'internal_error',
            code: 'agent_error'
          }
        }));
      }
    } catch (sendError) {
      console.error('[Error sending error response]', sendError.message);
    }
  }
}

/**
 * 处理 /v1/models 请求
 */
function handleModels(req, res) {
  const models = {
    object: 'list',
    data: [
      {
        id: DEFAULT_MODEL,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'agent-proxy'
      }
    ]
  };
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(models));
}

/**
 * 主服务器
 */
const server = http.createServer(async (req, res) => {
  try {
    const { method, url } = req;
    
    // 处理 CORS 预检请求
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      });
      res.end();
      return;
    }
    
    // 路由
    if (url === '/v1/chat/completions' && method === 'POST') {
      await handleChatCompletions(req, res);
    } else if (url === '/v1/models' && method === 'GET') {
      handleModels(req, res);
    } else if (url === '/health' || url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: {
          message: 'Not found',
          type: 'invalid_request_error',
          code: 'not_found'
        }
      }));
    }
  } catch (error) {
    console.error('[Server] Unhandled request error:', error);
    try {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
      }
      if (!res.writableEnded) {
        res.end(JSON.stringify({
          error: {
            message: 'Internal server error',
            type: 'internal_error',
            code: 'server_error'
          }
        }));
      }
    } catch (sendError) {
      console.error('[Server] Error sending error response:', sendError.message);
    }
  }
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║     OpenAI Agent Proxy Server                          ║
╠════════════════════════════════════════════════════════╣
║  Server: http://localhost:${String(PORT).padEnd(29)}║
║  Model:  ${DEFAULT_MODEL.padEnd(45)}║
╠════════════════════════════════════════════════════════╣
║  Performance Options:                                  ║
║    USE_ASK_MODE=${String(CONFIG.useAskMode).padEnd(39)}║
║    DISABLE_SANDBOX=${String(CONFIG.disableSandbox).padEnd(36)}║
║    USE_FAST_MODELS=${String(CONFIG.useFastModels).padEnd(36)}║
╠════════════════════════════════════════════════════════╣
║  Endpoints:                                            ║
║    POST /v1/chat/completions  - Chat completions API   ║
║    GET  /v1/models            - List available models  ║
║    GET  /health               - Health check           ║
╚════════════════════════════════════════════════════════╝
`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// 全局异常处理 - 防止未捕获的异常导致进程退出
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error(err.stack);
  // 不退出进程，继续运行
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // 不退出进程，继续运行
});

// 服务器错误处理
server.on('error', (err) => {
  console.error('[Server Error]', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port.`);
    process.exit(1);
  }
});

// 客户端连接错误处理
server.on('clientError', (err, socket) => {
  console.error('[Client Error]', err.message);
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

