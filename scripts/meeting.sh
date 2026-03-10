#!/bin/zsh
# Multi-round Agent Meeting Script
# Usage: ./meeting.sh <topic_file> <rounds> [agents...]
# Example: ./meeting.sh /tmp/meeting-topic.md 3 requirement-analyst coder tester reviewer

set -e

TOPIC_FILE="$1"
ROUNDS="${2:-2}"
shift 2
AGENTS=("$@")

if [ ${#AGENTS[@]} -eq 0 ]; then
  AGENTS=("requirement-analyst" "coder" "tester" "reviewer")
fi

MEETING_FILE="/tmp/meeting-room-$(date +%s).md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

# Initialize meeting room with topic
cat > "$MEETING_FILE" << EOF
# Agent 团队会议记录
**时间**：${TIMESTAMP}
**参会者**：${AGENTS[*]}
**轮次**：共 ${ROUNDS} 轮

---

## 议题

$(cat "$TOPIC_FILE")

---

## 讨论记录

EOF

echo "🏠 会议室: $MEETING_FILE"
echo "👥 参会者: ${AGENTS[*]}"
echo "🔄 轮次: $ROUNDS"
echo ""

# Agent emoji mapping
typeset -A EMOJI
EMOJI=(
  [requirement-analyst]="📋 需求分析师"
  [coder]="💻 Coder"
  [tester]="🧪 测试工程师"
  [reviewer]="🔍 Code Reviewer"
  [product-writer]="✍️ 产品文案专家"
)

for round in $(seq 1 "$ROUNDS"); do
  echo "========== 第 ${round} 轮 =========="
  echo "" >> "$MEETING_FILE"
  echo "### 第 ${round} 轮" >> "$MEETING_FILE"
  echo "" >> "$MEETING_FILE"

  for agent in "${AGENTS[@]}"; do
    label="${EMOJI[$agent]:-$agent}"
    echo "🎤 ${label} 发言中..."

    # Build prompt: read full meeting history, ask agent to respond
    HISTORY=$(cat "$MEETING_FILE")

    if [ "$round" -eq 1 ]; then
      INSTRUCTION="你正在参加一个 Agent 团队会议（第${round}轮，共${ROUNDS}轮）。

请阅读以下完整的会议记录，然后发表你的观点。

${HISTORY}

---

你是 ${label}。这是第一轮发言，请：
1. 针对议题给出你的核心观点
2. 提出具体可执行的建议
3. 指出你看到的风险

要求：直接给观点，不要客套。200字以内。不要自己加标题（系统会自动添加你的名字）。"
    else
      INSTRUCTION="你正在参加一个 Agent 团队会议（第${round}轮，共${ROUNDS}轮）。

请阅读以下完整的会议记录（包含之前所有轮次的发言），然后发表你的观点。

${HISTORY}

---

你是 ${label}。这是第${round}轮发言，请：
1. 回应其他人的观点（赞同、反驳或补充）
2. 针对分歧点表明立场
3. 如果有新想法或之前遗漏的，补充提出

要求：可以反驳别人，有自己的判断。200字以内。不要自己加标题（系统会自动添加你的名字）。"
    fi

    # Call agent
    RESPONSE=$(openclaw agent --agent "$agent" --thinking off --message "$INSTRUCTION" --timeout 120 --json 2>&1 | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d['result']['payloads'][0]['text'])
except:
    print('[发言失败]')
" 2>/dev/null)

    # Append to meeting room
    echo "#### ${label}" >> "$MEETING_FILE"
    echo "" >> "$MEETING_FILE"
    echo "$RESPONSE" >> "$MEETING_FILE"
    echo "" >> "$MEETING_FILE"

    echo "✅ ${label} 发言完毕"
    echo ""
  done
done

# Add conclusion section
echo "" >> "$MEETING_FILE"
echo "---" >> "$MEETING_FILE"
echo "" >> "$MEETING_FILE"
echo "## 待总结" >> "$MEETING_FILE"
echo "" >> "$MEETING_FILE"
echo "_会议结束，等待主持人总结。_" >> "$MEETING_FILE"

echo "========================================="
echo "✅ 会议结束！共 ${ROUNDS} 轮 × ${#AGENTS[@]} 人 = $((ROUNDS * ${#AGENTS[@]})) 次发言"
echo "📄 完整记录: $MEETING_FILE"
