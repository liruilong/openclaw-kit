---
name: code-validation
description: Validates code against security redlines and coding standards. Analyzes code content directly without external scripts. Use when user needs code validation, pre-commit check, security audit, or vulnerability scanning.
---

# Code Validation

## When to Use

- User requests "validate code", "check code standards", "check code security"
- User requests "scan vulnerabilities", "run security audit", "check hardcoded sensitive info"
- Pre-commit validation, check code in Git staging area
- Check code quality of specified files or directories
- Full project security scanning

## Instructions

Analyze code content directly to verify compliance with:
- **Security Redlines**: No hardcoded sensitive information and other security rules
- **Coding Standards**: Code style and quality requirements

### Validation Flow

### Step 1: Get Files to Validate

#### 1.1 Identify File Source

Based on user intent, identify file source and check mode:

| Mode | Trigger Scenario | File Scope |
| --- | --- | --- |
| **Staged Area Mode** (default) | "pre-commit check", "check staging area" | Files from `git diff --cached` |
| **Full Project Mode** | "security audit", "scan vulnerabilities", "full project check" | Entire `src/` directory |
| **Specified File Mode** | User explicitly specifies files or directories | User-specified scope |

#### 1.2 Get File List and Content

```bash
# Staged area mode: Get Git staging area files
git diff --cached --name-only --diff-filter=ACM

# Full project mode: Scan all code files under src/
find src -name '*.js' -o -name '*.ts' -o -name '*.jsx' -o -name '*.tsx' -o -name '*.vue' -o -name '*.py' -o -name '*.go' -o -name '*.java'

# Specified file mode: Use user-specified files or directories
```

Then read file content for analysis.

**Key Notes**:
- ✅ Staged area mode for quick pre-commit check of changed files
- ✅ Full project mode for security audit covering all code
- ✅ Support multiple file types: `.js`, `.ts`, `.jsx`, `.tsx`, `.vue`, `.py`, `.go`, `.java`, etc.
- ✅ Read file content directly for analysis

### Step 2: Query Knowledge Base Standards (Optional)

#### 2.1 Query Security Redline Standards

Use MCP tools to query security redline standards in knowledge base:

```javascript
// Step 1: Search document list
const wikiList = await mcp_kad_search_wiki_list({
  keyword: '代码红线要求 安全编程规范',
  drive_ids: [],
  page_size: 10
})

// Step 2: Get simplified data (recommended)
const driveIds = wikiList.data.items.map(item => item.file.drive_id)

const detail = await mcp_kad_search_wiki_detail({
  query: '代码红线要求 禁止硬编码 敏感信息 URL地址',
  drives: driveIds.map(id => ({ drive_id: id })),
  scene: ''
})

// ✅ Returns simplified data (paragraphs removed, significantly saves tokens)
```

**Key Notes**:
- ✅ **Prioritize `mcp_kad_search_wiki_detail`**: Get simplified data, save tokens
- ✅ If knowledge base query fails, use local rules for validation
- ✅ Knowledge base standards as reference, local rules as baseline

### Step 3: Analyze Code Content

Analyze the read code content directly, check for the following security redline issues:

#### 3.1 Security Redline Check Items

**Check pattern reference**:

```javascript
const securityPatterns = [
  { pattern: /cookie\s*[:=]\s*['"`]/, name: 'Hardcoded Cookie' },
  { pattern: /token\s*[:=]\s*['"`]/, name: 'Hardcoded Token' },
  { pattern: /api[_-]?key\s*[:=]\s*['"`]/i, name: 'Hardcoded API Key' },
  { pattern: /password\s*[:=]\s*['"`]/i, name: 'Hardcoded Password' },
  { pattern: /secret\s*[:=]\s*['"`]/i, name: 'Hardcoded Secret' },
  { pattern: /https?:\/\/[^\s'"]+/, name: 'Hardcoded URL' },
  { pattern: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, name: 'Hardcoded IP' },
]
```

**No hardcoded sensitive information**:

1. **Hardcoded Cookie**
   - Check pattern: `cookie: 'xxx'` or `cookie = 'xxx'`
   - Exclude: `process.env.XXX`, `undefined`, `config.xxx`
   - Example:
     ```javascript
     // ❌ Wrong
     headers: { cookie: 'session_id=abc123' }
     
     // ✅ Correct
     headers: { cookie: process.env.COOKIE }
     ```

2. **Hardcoded Token**
   - Check pattern: `token: 'xxx'` or `authorization: 'Bearer xxx'`
   - Exclude: `process.env.XXX`, `undefined`, `config.xxx`
   - Example:
     ```javascript
     // ❌ Wrong
     const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
     
     // ✅ Correct
     const token = process.env.API_TOKEN
     ```

3. **Hardcoded API Key**
   - Check pattern: `apiKey: 'xxx'` or `secret: 'xxx'`
   - Exclude: `process.env.XXX`, `undefined`, `config.xxx`
   - Example:
     ```javascript
     // ❌ Wrong
     const apiKey = 'sk-1234567890abcdef'
     
     // ✅ Correct
     const apiKey = process.env.API_KEY
     ```

4. **Hardcoded Password**
   - Check pattern: `password: 'xxx'` or `pwd: 'xxx'`
   - Exclude: `process.env.XXX`, `undefined`, `config.xxx`
   - Example:
     ```javascript
     // ❌ Wrong
     const password = 'admin123'
     
     // ✅ Correct
     const password = process.env.DB_PASSWORD
     ```

5. **Hardcoded URL**
   - Check pattern: `url: 'https://...'` or `baseUrl: 'https://...'`
   - Exclude: `process.env.XXX`, `undefined`, `config.xxx`, `localhost`, `127.0.0.1`
   - Example:
     ```javascript
     // ❌ Wrong
     const apiUrl = 'https://api.example.com'
     
     // ✅ Correct
     const apiUrl = process.env.API_URL
     ```

6. **Hardcoded IP**
   - Check pattern: `ip: '192.168.1.1'` or `host: '192.168.1.1'`
   - Exclude: `process.env.XXX`, `undefined`, `config.xxx`, `127.0.0.1`, `localhost`
   - Example:
     ```javascript
     // ❌ Wrong
     const host = '192.168.1.100'
     
     // ✅ Correct
     const host = process.env.DB_HOST
     ```

7. **Sensitive Info in Logs**
   - Check pattern: `console.log(password)` or `logger.info(token)`
   - Example:
     ```javascript
     // ❌ Wrong
     console.log('User password:', password)
     
     // ✅ Correct
     console.log('User logged in successfully')
     ```

8. **Plain Sensitive Data in Cookie**
   - Check pattern: `document.cookie = 'password=xxx'`
   - Example:
     ```javascript
     // ❌ Wrong
     document.cookie = 'token=' + userToken
     
     // ✅ Correct
     // Use encrypted data or do not store sensitive info in Cookie
     ```

#### 3.2 Exclude Legitimate Scenarios

Do not report errors for:
- ✅ Environment variable access: `process.env.XXX`
- ✅ Config file import: `config.xxx` or `import config from './config'`
- ✅ `undefined` value
- ✅ Example code in comments
- ✅ Local development (localhost, 127.0.0.1)

### Step 4: Execute Code Standards Check (Optional)

Check code style issues (as warnings, do not block commit):

1. **Hardcoded Style Values**
   - Check: `color: '#337ab7'`, `font-size: 14px`
   - Suggestion: Use CSS variables `var(--kd-color-primary)`

2. **Code Style**
   - Naming conventions, formatting standards

3. **Vue 3 Best Practices**
   - Prefer Composition API
   - Use `<script setup>` syntax

### Step 4.5: Requirements Coverage Check (Optional)

When requirement documents exist in the project (`requirements.md` or documents in `reports/` directory), the `design-conformance-check` skill can be orchestrated to check if code changes cover the functional points described in the requirement documents.

> See `.cursor/skills/design-conformance-check/SKILL.md` for the full requirements coverage check flow.

**Trigger Conditions** (any of the following):
- User explicitly requests "check requirements coverage"
- Detected `requirements.md` in the project before pushing, proactively suggest running

**Check Content**:
- Semantic matching between code changes and requirement functional points
- Prompts for uncovered functional points
- Explanations for changes exceeding the requirement scope

> This step only generates a report for reference and does not block pushing. Unlike the security redline check in Step 3 (which must be fixed), requirements coverage is auxiliary information.

### Step 5: Generate Validation Report

Generate detailed validation report:

```
🔍 Code Validation Report

📊 Statistics:
- Files checked: 5
- Files passed: 3
- Files with violations: 2
- Files with warnings: 1

🚨 Security Redline Violations:

1. src/api/client.js:23
   - Issue: Hardcoded Token
   - Code: const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   - Suggestion: Use environment variable process.env.API_TOKEN
   - Severity: ❌ Error (must fix)

2. config/database.js:12
   - Issue: Hardcoded URL
   - Code: url: 'https://api.example.com'
   - Suggestion: Use config file or environment variable
   - Severity: ❌ Error (must fix)

⚠️  Code Standards Suggestions:

1. src/components/Button.vue:45
   - Issue: Hardcoded color value
   - Code: color: '#337ab7'
   - Suggestion: Use CSS variable var(--kd-color-primary)
   - Severity: ⚠️  Warning (suggested fix)

✅ Files passed:
- src/utils/helper.js
- src/components/Header.vue
- src/store/index.js
```

**Key Notes**:
- ✅ Clearly show issue location and cause
- ✅ Provide specific fix suggestions
- ✅ Distinguish error vs warning severity
- ✅ Security redline violations must be fixed, code standards issues suggested fix

## Usage Examples

### Trigger Phrases

User says:
- "Validate code"
- "Check code security"
- "Check code standards"
- "Pre-commit validation"
- "Check code in Git staging area"
- "Check code in src/ directory"

### Complete Workflow

1. **Get file list**
   ```bash
   git diff --cached --name-only --diff-filter=ACM
   ```

2. **Read file content**
   - Use Read tool to read each file's content

3. **Query knowledge base standards** (optional)
   - Use `mcp_kad_search_wiki_detail` to get latest standards

4. **Analyze code content**
   - Check code line by line for security redline violations
   - Check code style issues

5. **Generate report**
   - Summarize all issues
   - Provide fix suggestions

6. **Notify user**
   - If security redline violations exist, clearly state they must be fixed
   - If code standards issues exist, suggest fixes

## Related Rules

- Refer to `.cursor/team/rules/SECURITY-REDLINES.mdc` for detailed security redline requirements
- Refer to `.cursor/team/rules/GLOBAL.mdc` for code standards
- Refer to `.cursor/skills/design-conformance-check/SKILL.md` for requirements coverage check (Step 4.5 orchestration)
- **Prioritize `mcp_kad_search_wiki_detail` to get simplified data, significantly saves tokens**

## Notes

1. ✅ **Analyze code content directly**: No external scripts, read and analyze code directly
2. ✅ **Prioritize search_wiki_detail**: Get simplified data directly (paragraphs removed)
3. 🔍 **Query knowledge base when uncertain**: Must query knowledge base when unsure about technical details
4. 🚨 **Security redline violations must be fixed**: Company security redline, must be strictly followed
5. ⚠️ **Code standards issues suggested fix**: Does not block commit, but suggested to fix
6. 📋 **Exclude legitimate scenarios**: Legitimate use cases like env vars and config files need exclusion
7. 🔄 **Use local rules when knowledge base query fails**: Ensure validation always works

## Best Practices

1. **Get files**:
   - ✅ Prioritize Git staging area files
   - ✅ Support user-specified files or directories
   - ✅ Read file content directly

2. **Query knowledge base**:
   - ✅ Prioritize `search_wiki_detail` for simplified data
   - ✅ Use local rules if knowledge base query fails
   - ✅ Knowledge base standards as reference, local rules as baseline

3. **Analyze code**:
   - ✅ Check code content line by line
   - ✅ Check context to avoid false positives
   - ✅ Exclude legitimate use cases

4. **Generate report**:
   - ✅ Clearly show issue location and cause
   - ✅ Provide specific fix suggestions
   - ✅ Distinguish error vs warning severity

5. **Handle results**:
   - ✅ Security redline violations must notify user to fix
   - ✅ Code standards issues suggested fix
   - ✅ Provide clear error messages and suggestions
