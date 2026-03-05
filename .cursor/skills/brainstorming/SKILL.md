---
name: brainstorming
description: Before any creative work (new features, new components, behavior changes, etc.), clarify requirements, explore options, and produce design documents through conversation. Use when users propose new requirements, feature requests, or design discussions.
---

# Requirements Brainstorming and Design

## When to Use

- User proposes new feature requests or architecture discussions
- User says "help me design this", "I want to build XXX", "I have an idea"
- Before starting any creative work that requires multiple implementation steps
- User's description is vague and needs clarification before implementation

## Core Principles

**Do not jump straight into writing code.** No matter how simple the project may seem, always go through the design process first. "Simple" projects often hide the most assumptions that have never been validated. Design documents can be short (a few sentences for simple projects), but they must exist and be confirmed.

## Instructions

### Process Checklist

Execute the following steps in order:

1. **Understand project context** — Check file structure, documentation, recent commits
2. **Clarify through questions one at a time** — Ask only one question at a time to clarify purpose, constraints, and success criteria
3. **Propose 2–3 options** — Include trade-off analysis and recommendations
4. **Present design in segments** — Adjust segment length by complexity; ask for confirmation after each segment
5. **Save design document** — Write to `reports/YYYY-MM-DD-<name>-design.md` and commit
6. **Hand off to implementation plan** — Invoke `writing-plans` skill to create the implementation plan

### Step 1: Understand Project Context

- Browse project file structure and key documentation
- Run `git log --oneline -10` to understand recent changes
- **Check for `requirements.md`** — If a requirements document was generated via `requirement-extraction`, use it as the starting point to reduce redundant questions
- If design files exist (`.pen` files / Figma links), browse the overall structure first

### Step 2: Clarify Through Questions One at a Time

**Ask only one question at a time** — do not pack multiple questions into a single message.

Questioning strategy:
- Prefer multiple-choice questions (easier to answer); use open-ended when necessary
- Focus on: purpose, constraints, success criteria, edge cases
- If the user's answer raises new questions, follow up

Example:

```
✅ Good: "Who is this feature primarily for?
A. Internal developers
B. End users
C. Operations staff"

❌ Bad: "Who is this feature for? Any tech stack preferences? Performance requirements? What's the deadline?"
```

### Step 3: Propose 2–3 Options

- Clearly explain pros and cons of each option
- Provide your recommendation and rationale
- Present the recommended option first, then alternatives
- Follow YAGNI — cut unnecessary features

### Step 4: Present Design in Segments

Adjust segment length by complexity:
- Simple parts: a few sentences
- Complex parts: 200–300 words

Cover as needed:
- Architecture
- Core components and data flow
- Error handling strategy
- Testing approach
- Potential risks

**After each segment, ask "Any issues with this part?"** — only proceed to the next segment after confirmation.

### Step 5: Save Design Document

Write the confirmed design to a file:

```bash
# File path
reports/YYYY-MM-DD-<feature-name>-design.md

# Commit
git add reports/
git commit -m "docs: <feature-name> design document"
```

### Step 6: Hand Off to Implementation Plan

After design is confirmed, invoke the `writing-plans` skill to create a detailed implementation plan.

**Do not invoke any implementation skills** (e.g. `figma-to-component`, `pencil-to-component`, etc.). The next step is always `writing-plans`.

## Anti-patterns

| Anti-pattern | Why it's wrong |
|--------------|-----------------|
| "Too simple to need design" | Unvalidated assumptions in simple projects cause the most rework |
| Asking multiple questions at once | Users tend to miss answers or give vague responses |
| Giving design without option comparison | May miss better alternatives |
| Starting implementation before design is confirmed | Very high risk of rework |
| Skipping design document | Later sessions lose context |

## Boundaries

**Do:**
- Clarify requirements through conversation
- Explore and compare options
- Produce design documents
- Hand off to `writing-plans`

**Do not:**
- Write code
- Create components
- Set up project structure
- Invoke implementation skills

## Related Resources

- **Requirement extraction**: `.cursor/skills/requirement-extraction/SKILL.md` (upstream — structures scattered input into `requirements.md`)
- **Writing implementation plans**: `.cursor/skills/writing-plans/SKILL.md` (downstream — breaks design into step-by-step plans)

## Inspiration

This skill's methodology is adapted from the [superpowers](https://github.com/obra/superpowers) project's brainstorming skill, tailored to this project's conventions.
