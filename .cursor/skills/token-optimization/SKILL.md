---
name: token-optimization
description: Analyze OpenClaw token consumption and optimize costs. Checks heartbeat model, QMD status, session token usage, and generates optimization reports. Use when user says "check token usage", "optimize costs", "token report", "why is it so expensive", "reduce token consumption".
---

# Token Cost Optimization

## When to Use

- User asks about token consumption or costs
- User says "optimize costs", "check token usage", "generate cost report"
- Periodic self-check (can be added to HEARTBEAT.md)
- After noticing unusually high token consumption

## Execution Flow

### Step 1: Collect Current Status

Run all diagnostic commands and collect results:

```bash
# 1. Overall status with deep probe
openclaw status --deep

# 2. Session-level token consumption
openclaw sessions list --verbose

# 3. Current model configuration
openclaw models list

# 4. Memory system status
openclaw memory status

# 5. Current config
cat ~/.openclaw/openclaw.json
```

### Step 2: Check Optimization Points

Analyze collected data against the following checklist:

#### 2.1 Heartbeat Model Check

| Check Item | Optimal State | Problem Indicator |
|-----------|--------------|-------------------|
| Heartbeat model | Local model (ollama/*) | Uses cloud model (opus/gpt/gemini via proxy) |
| lightContext | `true` | `false` or not set |
| Heartbeat interval | >= 30m | < 30m means higher frequency, more cost |
| Ollama running | `curl http://127.0.0.1:11434/api/tags` returns 200 | Connection refused |

If heartbeat uses a cloud model, recommend switching:

```json
{
  "agents": {
    "defaults": {
      "heartbeat": {
        "model": "ollama/qwen2.5:3b",
        "lightContext": true
      }
    }
  }
}
```

#### 2.2 QMD Status Check

```bash
openclaw qmd status 2>&1
```

| Status | Action |
|--------|--------|
| QMD initialized and indexed | Good — check maxChunks/maxChars/threshold tuning |
| QMD not initialized | Recommend: `openclaw qmd init && openclaw qmd index` |
| QMD command not found | Version too old or QMD not available, skip |

QMD tuning parameters (in openclaw.json):

| Parameter | Conservative | Balanced | Generous |
|-----------|-------------|----------|----------|
| maxChunks | 3 | 5 | 10 |
| maxChars | 2000 | 5000 | 10000 |
| threshold | 0.7 | 0.5 | 0.3 |

#### 2.3 Model Allocation Check

| Role | Config Path | Cost-Optimal Choice |
|------|------------|-------------------|
| Primary (chat) | `agents.defaults.model` | Subscription-based (e.g., Cursor proxy) |
| Subagents (dev) | `agents.defaults.subagents.model` | Same as primary if subscription |
| Heartbeat | `agents.defaults.heartbeat.model` | Local model (zero cost) |

Flag if:
- Heartbeat uses an API-billed model
- Primary model uses API billing when subscription is available
- Subagents use a more expensive model than necessary

#### 2.4 Workspace File Size Check

```bash
# Check total size of workspace files that get injected
du -sh ~/agent-workspace/ --exclude=.git --exclude=node_modules --exclude=memory 2>/dev/null
find ~/agent-workspace/ -name "*.md" -not -path "*/memory/*" -not -path "*/.git/*" | xargs wc -c 2>/dev/null | tail -1
```

Flag if total workspace markdown exceeds 50KB — consider using QMD or trimming files.

#### 2.5 Session Token Check

From `openclaw sessions list --verbose`, check:
- Sessions with high token percentage (>70% of context window)
- Long-running sessions that should be compacted or reset

### Step 3: Generate Report

Output a structured report in this format:

```markdown
## Token Cost Report

### Current Configuration
- Primary model: {model} ({billing type})
- Heartbeat model: {model} ({billing type})
- Heartbeat interval: {interval}
- QMD: {enabled/disabled}
- Workspace size: {size}

### Health Score: {X}/10

### Issues Found
1. {issue description} — {impact: high/medium/low}
2. ...

### Recommendations
| Priority | Action | Expected Savings |
|----------|--------|-----------------|
| 1 | {action} | {savings} |
| 2 | {action} | {savings} |

### Commands to Execute
{list of commands to fix issues, ready to copy-paste}
```

### Step 4: Apply Fixes (with user confirmation)

If the user agrees, apply recommended changes:
- Edit `~/.openclaw/openclaw.json` for config changes
- Run `openclaw gateway restart` after config changes
- Run `openclaw qmd init && openclaw qmd index` if QMD needs setup
- Verify with `openclaw health`

## Notes

- Never modify model configurations without user confirmation
- Local models (Ollama) need Ollama service running
- QMD requires memory system to be functional
- Compaction mode "safeguard" is recommended to prevent context overflow
