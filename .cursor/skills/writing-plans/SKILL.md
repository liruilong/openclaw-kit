---
name: writing-plans
description: Break down requirements or design documents into executable step-by-step implementation plans. Use when there are clear requirements and multi-step implementation, to bridge the gap between design and coding.
---

# Writing Implementation Plans

## When to Use

- `brainstorming` skill has produced design documents that need to be turned into implementation plans
- User says "help me create an implementation plan", "break down the tasks", "how to implement step by step"
- Multi-step tasks need order and dependencies clarified before starting to code
- Changes span multiple files or modules

## Core Principles

**Assume the executor has zero context about the project.** The plan must be detailed enough that an experienced developer unfamiliar with the project can pick it up directly: specify which files to change, what code to write, how to test, and expected results.

Keywords: **DRY, YAGNI, TDD, frequent commits**.

## Instructions

### Task Granularity

**Each step is an independent action (2–5 minutes):**

- "Write failing test" — one step
- "Run test to confirm failure" — one step
- "Write minimal implementation to make test pass" — one step
- "Run test to confirm pass" — one step
- "Commit" — one step

### Plan Document Structure

#### Document Header

Every plan must start with:

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One-sentence description of what to build]

**Architecture:** [2–3 sentences describing the approach]

**Tech Stack:** [Key technologies and libraries]

---
```

#### Task Structure

Each task follows this template:

````markdown
### Task N: [Component/Module Name]

**Files:**
- New: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts` (around lines XX–YY)
- Test: `tests/exact/path/to/test.ts`

**Step 1: Write failing test**

```typescript
describe('specific behavior', () => {
  it('should XXX', () => {
    const result = someFunction(input);
    expect(result).toBe(expected);
  });
});
```

**Step 2: Run test to confirm failure**

Run: `npm test -- tests/path/test.ts`
Expected: FAIL, with message "someFunction is not defined"

**Step 3: Write minimal implementation**

```typescript
export function someFunction(input: string): string {
  return expected;
}
```

**Step 4: Run test to confirm pass**

Run: `npm test -- tests/path/test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.ts src/path/file.ts
git commit -m "feat: Add XXX feature"
```
````

### Writing Requirements

| Requirement | Description |
|-------------|-------------|
| Exact file paths | Don't write "in appropriate location", write specific paths |
| Complete code | Don't write "add validation logic", provide actual code |
| Precise commands | Include expected output |
| Reference related skills | If using other skills, note in the task |
| TDD first | Write tests first for each feature |
| Frequent commits | Commit after each task completes |

### Saving the Plan

```bash
# Save to reports/ directory
reports/YYYY-MM-DD-<feature-name>-plan.md

# Commit
git add reports/
git commit -m "docs: <feature-name> implementation plan"
```

### Execution Handoff

After the plan is complete, suggest execution approach based on project type:

```
Plan complete
├── WPS component project (has tdd-workflow skill) → Hand off to tdd-workflow's component-level TDD loop
└── Generic project → Inform user to execute step by step according to plan
```

## Anti-patterns

| Anti-pattern | Why it's wrong |
|--------------|----------------|
| Steps too coarse ("implement user module") | Executor doesn't know where to start |
| No test steps | Skips TDD, no quality guarantee |
| Descriptions without code | "Add error handling" is useless instruction |
| One step modifying multiple files | Hard to revert, difficult to locate errors |
| No commit steps | Progress lost when interrupted |

## Boundaries

**Do:**
- Break down design into executable step-by-step plans
- Provide exact file paths, code, and commands
- Ensure each step can be executed and verified independently
- Connect with brainstorming output

**Don't:**
- Don't execute plans (execution is by developer or other skills)
- Don't modify existing code
- Don't clarify requirements (that's brainstorming's responsibility)

## Related Resources

- Requirement brainstorming & design: `.cursor/skills/brainstorming/SKILL.md` (upstream, produces design documents)
- Requirement extraction: `.cursor/skills/requirement-extraction/SKILL.md` (requirement docs can be plan input)
- TDD workflow: `.cursor/skills/tdd-workflow/SKILL.md` (execution handoff for WPS component projects)

## Inspiration

This skill's methodology references the [superpowers](https://github.com/obra/superpowers) project's writing-plans skill, adapted for this project's specification system.
