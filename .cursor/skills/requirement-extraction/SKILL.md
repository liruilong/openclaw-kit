---
name: requirement-extraction
description: Extract user requirements (Kingsoft Docs links, Figma links, verbal descriptions, etc.) into structured Markdown requirement documents and save to project root. Use when the user says "extract requirements", "organize requirement document", "organize this document", or provides a Kingsoft Docs link requesting a requirement document.
---

# Requirement Extraction

## When to Use

- User provides a Kingsoft Docs link (`https://365.kdocs.cn/l/xxxxx`) and requests extraction into a requirement document
- User provides a Figma design link and requests extraction of functional requirements
- User describes requirements verbally and requests organization into a document
- User says "extract requirements", "organize requirement document", or "organize this document"
- `project-init-workflow` input collection phase needs to generate a requirement document

## Instructions

Extract core information from user-provided requirement sources, generate a structured Markdown requirement document, and save it to the project root.

### Input Sources (by priority)

| Priority | Source | Retrieval Method | Description |
| -------- | ------ | ---------------- | ----------- |
| 1 | Verbal description | User message | Organize requirement points from conversation |
| 2 | Local file | Read tool | Read user-specified local file |
| 3 | Kingsoft Docs link | KAD MCP tool query | Extract link_id, fetch full document content |
| 4 | Pencil (.pen) file | Read tool | Pencil is the single source of truth for design |
| 5 | Figma design | Figma MCP tool | Use when project has no .pen file; extract feature modules and interaction logic |

> 🔴 **Design source priority**: When extracting requirements from design, if the project contains `.pen` files, Pencil must be used first; do not fall back to Figma analysis.

---

## Step 1: Obtain Original Requirements

### From verbal description

Extract requirement points directly from user messages; use AskQuestion to fill in missing information.

### From local file

```javascript
// Read user-specified local file
const content = Read({ path: '<file_path>' })
```

### From Kingsoft Docs

```javascript
// 1. Extract link_id from URL
// https://365.kdocs.cn/l/cn7Ozl4MWefJ → link_id = "cn7Ozl4MWefJ"

// 2. Get drive_id and file_id
CallMcpTool({
  server: 'user-kad',
  toolName: 'get_drive_info_by_link_id',
  arguments: { link_id: linkId },
})

// 3. Get full document content
CallMcpTool({
  server: 'user-kad',
  toolName: 'get_file_info_by_id',
  arguments: {
    drive_id: driveInfo.drive_id,
    file_id: driveInfo.file_id,
    include_elements: ['all'],
  },
})
```

### From Pencil (.pen) file

When extracting requirements from design, Pencil is the single source of truth. First check if the project contains `.pen` files:

```bash
find . -name "*.pen" -not -path "./node_modules/*" 2>/dev/null
```

```javascript
// 1. Read .pen file content
const penContent = Read({ path: '<pen_file_path>' })

// 2. Parse page structure: identify from .pen file
//    - Page list and hierarchy
//    - Components and their states/variants
//    - Interaction annotations and navigation logic
//    - Text content (button labels, titles, descriptions, etc.)
```

### From Figma design (when no .pen file)

Use Figma as design input only when the project has no `.pen` file.

```javascript
// Get design context, extract page structure and feature modules
const context = await figma.get_design_context({ nodeId: '<node_id>' })
```

---

## Step 2: Extract Requirement Structure

Extract the following from the original content:

| Extraction Item | Description | Required |
| --------------- | ----------- | -------- |
| Project background | Business context and objectives | Yes |
| Feature list | Feature points grouped by module | Yes |
| Page/view list | Pages or views involved | Yes |
| Interaction rules | User actions and system responses | No |
| Data structure | Key data fields and interfaces | No |
| Non-functional requirements | Performance, compatibility, security, etc. | No |
| Design resources | Figma links, design notes | No |
| Constraints and limitations | Tech stack, platform limits, etc. | No |

### Information completion

If the original content is incomplete, use AskQuestion to confirm with the user:

```javascript
AskQuestion({
  title: 'Requirement Information Completion',
  questions: [
    {
      id: 'missing_info',
      prompt: 'The following information was not found in the document. Please provide:\n\n1. [Missing item 1]\n2. [Missing item 2]',
      options: [
        { id: 'provide', label: 'I will provide' },
        { id: 'skip', label: 'Skip for now, add later' },
        { id: 'na', label: 'Not needed' },
      ],
    },
  ],
})
```

---

## Step 3: Generate Requirement Document

### Document template

```markdown
# [Project Name] Requirement Document

> Source: [Kingsoft Docs link / Figma link / Verbal description]
> Extraction date: YYYY-MM-DD

## Project Background

[Brief description of project background, business goals, and user scenarios]

## Feature Overview

### Module 1: [Module name]

- Feature 1: [Description]
- Feature 2: [Description]

### Module 2: [Module name]

- Feature 1: [Description]
- Feature 2: [Description]

## Page/View List

| Page Name | Path | Description | Design |
| --------- | ---- | ----------- | ------ |
| Home | `/` | Main page | [Figma link] |

## Interaction Rules

### [Interaction scenario 1]

- Trigger: [User action]
- Expected behavior: [System response]
- Error handling: [Error scenario]

## Data Structure

### [Entity/Interface name]

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| field1 | string | Yes | Description |

## Non-Functional Requirements

- Compatibility: [Browser/device requirements]
- Performance: [Load time/response time]
- Security: [Permission/authentication requirements]

## Design Resources

| Type | Path/Link |
| ---- | --------- |
| Pencil design file | [.pen file path] |
| Figma design | [Link] |
| Product document | [Link] |

## Constraints and Limitations

- Tech stack: [Vue 3 / React / ...]
- Deployment environment: [Description]
- Other limitations: [Description]
```

### File naming

- Filename format: `requirements.md`
- Save location: Project root

> If `requirements.md` already exists in the project root, prompt the user whether to overwrite or append.

---

## Step 4: Confirm Document

After generating the document, show a summary for user confirmation:

```javascript
AskQuestion({
  title: 'Confirm Requirement Document',
  questions: [
    {
      id: 'confirm_requirements',
      prompt:
        'Requirement document generated: requirements.md\n\nContains:\n- X feature modules\n- Y pages/views\n- Z interaction rules\n\nPlease review the document.',
      options: [
        { id: 'confirm', label: 'Confirm, document is complete' },
        { id: 'modify', label: 'Need changes (tell me what to change)' },
        { id: 'regenerate', label: 'Regenerate' },
      ],
    },
  ],
})
```

---

## Deliverables

| Deliverable | Path | Description |
| ----------- | ---- | ----------- |
| Requirement document | `requirements.md` | Structured Markdown requirement document |

---

## Step 5: Handoff to Downstream Skills

After the requirement document is confirmed, suggest the user proceed to solution design:

- If the project has a `methodology` preset (with `brainstorming` skill) → Suggest calling `brainstorming` to explore and design solutions based on `requirements.md`
- If the project follows the `design` preset path → Hand off to `component-structure-analysis` or `project-init-workflow`

```
Requirement document confirmed
├── Solution design needed → brainstorming (explore solutions → design document → writing-plans)
└── Requirements clear, ready to implement → project-init-workflow or component-structure-analysis
```

---

## Checklist

- [ ] Have all feature points been extracted from the original content?
- [ ] Are features grouped by module?
- [ ] Is the page/view list complete?
- [ ] Do interaction rules cover main user actions?
- [ ] Has missing information been confirmed with the user?
- [ ] Is the document saved to the project root?
- [ ] Is the original source link recorded in the document?

---

## Related Resources

- **Requirement brainstorming and design**: `.cursor/skills/brainstorming/SKILL.md` (requirement document → solution exploration → design document)
- **Knowledge base query**: `.cursor/skills/knowledge-base-query/SKILL.md` (fetch Kingsoft Docs content)
- **Component structure analysis**: `.cursor/skills/component-structure-analysis/SKILL.md` (requirement document → component structure diagram)
- **Project init workflow**: `.cursor/skills/project-init-workflow/SKILL.md` (requirement document as input source)
