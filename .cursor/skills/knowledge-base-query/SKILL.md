---
name: knowledge-base-query
description: Query enterprise knowledge base for technical docs, API specs, best practices, etc. Query knowledge base when uncertain; ask user only if not found. Do not speculate.
---

# Knowledge Base Query

## When to Use

- User asks technical questions, API specs, best practices, etc.
- Uncertain about implementation of a feature
- Need to find internal docs or config info
- When in doubt, query knowledge base first before asking user
- Need to access URL in format `https://365.kdocs.cn/l/xxxxx`, extract `link_id` to query

## Instructions

### KAD MCP Tools

| Tool | Purpose | Use Case |
|--------|------|----------|
| `get_drive_info_by_link_id` | Get drive_id and file_id by link ID | When have knowledge base link |
| `get_drive_info_by_file_id` | Get drive_id by file ID | When have file_id |
| `get_file_info_by_id` | Get full file content | When have file_id but no keyword |
| `search_wiki_list` | Search document list by keyword | Find docs by keyword |
| `search_wiki_detail` | Recall document fragments by keyword (recommended) | Precise recall when have keyword |
| `search_wiki_detail_with_brief` | Recall fragments + paragraph summary | When need summary |

### Step 1: Understand Query Intent

Analyze user query:
- Technical question (e.g., icon library usage)
- API spec (e.g., component library API)
- Best practice (e.g., code standards)
- Config info (e.g., project config)
- Knowledge base link (e.g., `https://365.kdocs.cn/l/cn7Ozl4MWefJ`)

### Step 2: Get drive_id and file_ids

Choose one based on user input:

#### Option A: Via knowledge base link

If user provides link in format `https://365.kdocs.cn/l/xxxxx`:

```javascript
// Extract link_id from URL
// Example: https://365.kdocs.cn/l/cn7Ozl4MWefJ → link_id = "cn7Ozl4MWefJ"
const linkId = "cn7Ozl4MWefJ"

// Use link_id to get document search drive info (includes drive_id and file_id)
CallMcpTool({
  server: "user-kad",
  toolName: "get_drive_info_by_link_id",
  arguments: { link_id: linkId }
})
```

#### Option B: Via keyword search

If user provides search keywords:

```javascript
// Search document list by keyword (returns drive_id list)
CallMcpTool({
  server: "user-kad",
  toolName: "search_wiki_list",
  arguments: {
    keyword: "search keyword",
    drive_ids: [],  // Empty array = search user's recent docs
    page_size: 10
  }
})
```

### Step 3: Get Document Content

Choose based on whether you have specific keyword:

#### Option A: With keyword (recommended)

Use `search_wiki_detail` for precise recall:

```javascript
CallMcpTool({
  server: "user-kad",
  toolName: "search_wiki_detail",
  arguments: {
    query: "query keyword",
    drives: [
      { drive_id: "xxx" },
      { drive_id: "yyy", file_ids: ["file1", "file2"] }  // Optional: specify files
    ],
    scene: ""  // Empty: recall from specified lib/files; "full_folder_recall": all libs
  }
})

// ✅ Returns simplified data, significantly saves tokens
```

#### Option B: Without keyword

When user only provides link or file_id but no query keyword, use `get_file_info_by_id` for full content:

```javascript
CallMcpTool({
  server: "user-kad",
  toolName: "get_file_info_by_id",
  arguments: {
    drive_id: "xxx",           // From step 2
    file_id: "yyy",            // From step 2
    include_elements: []       // Element types to include
  }
})

// ⚠️ Returns full file content, higher token usage
```

### Step 4: Organize and Present Results

- Extract key information
- Format output
- Provide related links

## Usage Examples

### Trigger Phrases

User says:
- "Query icon library usage"
- "Find component library docs"
- "Search API specs"
- "Learn code standards"
- "Help me check this doc https://365.kdocs.cn/l/cn7Ozl4MWefJ"

### Output Example

```
📚 Knowledge Base Query Result

From [KDicon-pro Icon Library Design and Development Standard.otl]:

**Icon Library Usage**:

1. **In-app local icon library** (preferred)
   - URL format: `https://example.com/icons/v1/<theme>/<iconname>`
   - Example: `<img src="https://example.com/icons/v1/icon1_16.svg" />`

2. **Online icon library** (fallback)
   - URL format: `https://global-volc.wpscdn.cn/icons/v1/<theme>/<iconname>`

3. **企业 Icon Web Component** (new spec icons)
   - Include: `<script type="module" src="https://example.com/uxkit/icon/index.js"></script>`
   - Use: `<wps-icon src="https://example.com/icons/pro/3dblueprint.svg"></wps-icon>`

📖 Full doc: https://365.kdocs.cn/l/xxx
```

## Notes

1. ✅ **Prioritize `search_wiki_detail`**: Returns simplified data, saves tokens
2. ⚠️ **`search_wiki_detail_with_brief`**: Includes paragraph summary, higher token usage
3. 🔍 **Query knowledge base when uncertain**: Must query when unsure about technical details
4. 📎 **Knowledge base links**: Extract `link_id` from URL, then use `get_drive_info_by_link_id`
