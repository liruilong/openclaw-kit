---
name: systematic-debugging
description: Systematic debugging methodology. When encountering bugs, test failures, or anomalous behavior, root cause must be identified before fixing—no blind guessing. Use when users report bugs, failing tests, or unexpected behavior.
---

# Systematic Debugging

## When to Use

- Test failures
- Production bugs
- Behavior deviates from expectations
- Performance issues
- Build failures
- Integration anomalies

**Especially required in these scenarios:**
- Time pressure (the more urgent, the easier to guess blindly)
- "One line change should fix it" (often not that simple)
- Multiple fix attempts have failed
- Root cause is not fully understood

## Core Rule

```
No fix proposal without completing root cause investigation
```

Symptom-level fixes = failure.

## Instructions

### Four-Phase Flow

Each phase must be completed in order. Do not skip.

---

### Phase 1: Root Cause Investigation

**Before attempting any fix:**

#### 1.1 Read Error Messages Carefully

- Do not skip errors or warnings
- Read the full stack trace
- Note line numbers, file paths, error codes
- Error messages often contain clues to the solution

#### 1.2 Stabilize Reproduction

- Can the issue be reliably triggered?
- What are the exact reproduction steps?
- Does it reproduce every time?
- If not reproducible → collect more data, do not guess

#### 1.3 Check Recent Changes

- What changes might have caused this?
- `git diff`, recent commits
- New dependencies, config changes
- Environment differences

#### 1.4 Evidence Collection for Multi-Component Systems

**When the system involves multiple components**, add diagnostic logging before proposing a fix:

```
For each component boundary:
  - Log data entering the component
  - Log data leaving the component
  - Verify environment/config propagation
  - Check state at each layer

Run once to collect evidence → analyze evidence to locate the break point → investigate that component
```

#### 1.5 Trace Data Flow

- Where does the wrong value come from?
- Who called here with the wrong value?
- Keep tracing upward until the source is found
- Fix at the source, not at the symptom

---

### Phase 2: Pattern Analysis

#### 2.1 Find Working Examples

- Find similar working code in the same codebase
- What is similar to this but works correctly?

#### 2.2 Compare with Reference Implementation

- If implementing a known pattern, read the reference code fully
- Do not skim; read line by line
- Apply only after fully understanding the pattern

#### 2.3 Identify Differences

- What differs between working and broken cases?
- List every difference, no matter how small
- Do not assume "this cannot have an effect"

#### 2.4 Clarify Dependencies

- What other components are required?
- What config and environment are needed?
- What implicit assumptions exist?

---

### Phase 3: Hypothesis and Verification

#### 3.1 Form a Single Hypothesis

- State clearly: "I believe X is the root cause because Y"
- Write it down
- Must be specific, not vague

#### 3.2 Minimal Testing

- Make the smallest change to verify the hypothesis
- Change only one variable at a time
- Do not fix multiple things at once

#### 3.3 Proceed Only After Verification

- Valid? → Proceed to Phase 4
- Invalid? → Form a new hypothesis
- **Do not layer more fixes on top of invalid ones**

---

### Phase 4: Implement the Fix

#### 4.1 Create a Failing Test Case

- Simplest reproduction method
- Prefer automated tests
- Test must exist before the fix

#### 4.2 Implement a Single Fix

- Fix the root cause found in Phase 1
- One change at a time
- Do not "incidentally" change other things
- Do not bundle refactoring

#### 4.3 Verify the Fix

- Does the new test pass?
- Are other tests still passing?
- Is the issue actually resolved?

#### 4.4 Escalation After Three Failed Fixes

**If 3+ fix attempts have failed:**

- **Stop**
- This signals an architectural problem, not a wrong hypothesis
- Each fix exposes new issues in different places? → Architectural problem
- Fix requires "large-scale refactoring"? → Fundamental design flaw
- **Discuss with the user whether to redesign the architecture** instead of continuing to patch

---

### Red Flags — Stop Immediately

If you find yourself thinking:
- "Quick fix first, investigate later"
- "Let me try changing X"
- "Change several places at once and run tests"
- "Skip tests, verify manually"
- "It's probably X, just fix it"
- "I don't fully understand, but this might work"

**All of the above mean: stop and return to Phase 1.**

---

## Common Excuses vs Reality

| Excuse | Reality |
|--------|---------|
| "The problem is simple, no need for the flow" | Simple problems have root causes too; the flow is fast for simple cases |
| "Emergency, no time for the flow" | Systematic debugging is faster than repeated guessing |
| "Try first, then investigate" | The first fix sets the tone; get it right from the start |
| "Skip tests for now, add them after confirming the fix works" | Fixes without tests are unreliable |
| "Change multiple things at once to save time" | Cannot tell which change worked; may introduce new bugs |
| "Looks like this is the problem" | Seeing symptoms ≠ understanding root cause |
| "Try again" (after 2+ failures) | 3+ failures = architectural issue; stop patching |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|----------------|------------------|
| 1. Root Cause Investigation | Read errors, reproduce, check changes, collect evidence | Understand "what" and "why" |
| 2. Pattern Analysis | Find working examples, compare differences | Identify the differences |
| 3. Hypothesis Verification | Form hypothesis, minimal testing | Hypothesis confirmed or ruled out |
| 4. Implement Fix | Create test, fix, verify | Bug resolved, tests pass |

## Boundaries

**Do:**
- Investigate root cause systematically
- Progress through phases in order
- Base conclusions on evidence
- Write tests before fixing

**Don't:**
- Guess the cause
- Skip root cause investigation
- Change multiple things at once
- Claim a fix without tests

## Inspiration

This skill's methodology is adapted from the [superpowers](https://github.com/obra/superpowers) project's systematic-debugging skill, tailored to this project's rule system.
