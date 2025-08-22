---
created: 2025-08-22T11:46:31Z
last_updated: 2025-08-22T11:46:31Z
version: 1.0
author: Claude Code PM System
---

# Project Style Guide

## File Organization Standards

### Naming Conventions

**Command Files**
```
Pattern: /[category]:[action]
Examples: /pm:epic-start, /context:create, /testing:prime
Implementation: .claude/commands/[category]/[action].md
```

**Script Files**
```
Pattern: [category]/[action].sh
Examples: pm/epic-start.sh, context/create.sh
Location: .claude/scripts/[category]/[action].sh
```

**Context Files**
```
Pattern: [purpose].md
Examples: project-overview.md, tech-context.md
Location: .claude/context/[purpose].md
```

**Epic and Task Files**
```
Pattern: epic.md, [issue-id].md
Examples: epic.md, 1234.md, 1235.md
Location: .claude/epics/[epic-name]/[file].md
```

### Directory Structure Patterns

**Hierarchical Organization**
- Commands organized by functional category
- Scripts mirror command structure
- Context files grouped by information type
- Epic workspaces isolated in separate directories

**Separation of Concerns**
- Configuration separate from implementation
- Documentation separate from executable code
- Context separate from operational files
- Temporary files isolated from permanent storage

## Documentation Standards

### Frontmatter Requirements

**All .md files MUST include:**
```yaml
---
created: 2025-08-22T11:46:31Z
last_updated: 2025-08-22T11:46:31Z
version: 1.0
author: Claude Code PM System
---
```

**Epic and Task files MUST include:**
```yaml
---
epic: epic-name
status: pending|in_progress|completed|blocked
priority: high|medium|low
parallel: true|false
created: 2025-08-22T11:46:31Z
last_updated: 2025-08-22T11:46:31Z
---
```

### Content Structure

**Command Files**
1. Title and description
2. Required rules reference
3. Preflight checklist
4. Detailed instructions
5. Error handling
6. Success criteria

**Context Files**
1. Frontmatter
2. Overview section
3. Detailed content organized by subsections
4. Integration points
5. Current status

**Epic Files**
1. Frontmatter with epic metadata
2. Overview and objectives
3. Technical approach
4. Task breakdown
5. Dependencies and constraints
6. Success criteria

## Comment and Documentation Style

### Inline Comments

**Shell Scripts**
```bash
# Brief description of what this section does
command_here

# Complex operations need explanation
if [ complex_condition ]; then
    # Explain why this is necessary
    complex_operation
fi
```

**Markdown Files**
```markdown
<!-- Use HTML comments for editorial notes -->
<!-- TODO: Add more detailed examples -->

<!-- Reference external documents when needed -->
<!-- See: .claude/rules/standard-patterns.md -->
```

### Documentation Tone

**Concise and Direct**
- Avoid unnecessary verbosity
- Get to the point quickly
- Use bullet points for lists
- Structure information hierarchically

**Action-Oriented**
- Start with verbs for instructions
- Use imperative mood for commands
- Provide specific examples
- Include expected outcomes

**User-Focused**
- Anticipate user questions
- Provide context for decisions
- Explain the "why" behind requirements
- Offer alternatives when appropriate

## Code Quality Standards

### Shell Script Conventions

**Error Handling**
```bash
# Always check critical operations
if ! command_that_might_fail; then
    echo "❌ Operation failed: specific error message"
    exit 1
fi

# Use descriptive error messages
test -f required_file || {
    echo "❌ Required file not found: run /pm:init first"
    exit 1
}
```

**Variable Naming**
```bash
# Use descriptive names
epic_name="memory-system"
issue_number="1234"
current_datetime=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Avoid abbreviations unless obvious
# Good: task_count, epic_dir
# Bad: tc, ed
```

**Function Structure**
```bash
# Function names use underscores
function validate_prerequisites() {
    # Brief comment explaining purpose
    local required_file="$1"
    
    # Clear logic flow
    if [ ! -f "$required_file" ]; then
        return 1
    fi
    
    return 0
}
```

### Markdown Conventions

**Heading Hierarchy**
```markdown
# H1: Document Title (only one per file)
## H2: Major sections
### H3: Subsections
#### H4: Detail sections (rarely used)
```

**List Formatting**
```markdown
**Ordered Lists** (for procedures):
1. First step
2. Second step
3. Third step

**Unordered Lists** (for features, items):
- Feature one
- Feature two
- Feature three

**Definition Lists**:
**Term**: Definition or explanation
**Another Term**: Another definition
```

**Code Block Standards**
```markdown
**Shell Commands:**
```bash
command --with-flags
```

**File Content:**
```yaml
# For configuration files
key: value
```

**Examples:**
```
# For example output or generic content
Example output here
```
```

### Git Commit Standards

**Commit Message Format**
```
[Category] Brief description (50 chars max)

Optional longer description explaining why this change
was made and any important context.

- List specific changes if multiple
- Reference issue numbers when relevant
- Explain impact on system behavior
```

**Commit Categories**
- `feat:` New features or capabilities
- `fix:` Bug fixes and corrections
- `docs:` Documentation updates
- `style:` Code formatting and style changes
- `refactor:` Code restructuring without behavior changes
- `test:` Test additions or modifications
- `chore:` Maintenance and administrative tasks

## Consistency Guidelines

### Language and Terminology

**Standard Terms**
- "Epic" not "feature" or "project"
- "Task" not "story" or "ticket"
- "Agent" not "assistant" or "bot"
- "Worktree" not "workspace" or "branch"

**Status Terms**
- `pending`: Not yet started
- `in_progress`: Currently being worked on
- `completed`: Successfully finished
- `blocked`: Cannot proceed due to dependency

**Priority Terms**
- `high`: Urgent, blocks other work
- `medium`: Important, normal timeline
- `low`: Nice to have, flexible timing

### Time and Date Formatting

**Always use ISO 8601 UTC format:**
```
2025-08-22T11:46:31Z
```

**Get current time:**
```bash
current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
```

### File Permissions and Security

**File Creation**
- All created files should have appropriate permissions
- No executable permissions on documentation files
- Shell scripts should be executable only when necessary

**Credential Handling**
- Never store credentials in any files
- Always use external authentication (gh CLI)
- Reference authentication setup in error messages

### Error Message Standards

**Format**
```
❌ [What failed]: [Specific solution]
```

**Examples**
```
❌ Epic not found: Run /pm:prd-parse feature-name first
❌ GitHub CLI failed: Run gh auth login
❌ Cannot write to directory: Check permissions on .claude/
```

**Success Messages**
```
✅ [Action] complete
  - [Key result 1]
  - [Key result 2]
Next: [Suggested action]
```

This style guide ensures consistency across all project files and facilitates collaboration between multiple contributors, both human and AI agents.