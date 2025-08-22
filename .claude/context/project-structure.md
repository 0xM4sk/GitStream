---
created: 2025-08-22T11:46:31Z
last_updated: 2025-08-22T11:46:31Z
version: 1.0
author: Claude Code PM System
---

# Project Structure

## Root Directory Organization

```
GitStream/
├── .claude/              # Claude Code PM system
│   ├── agents/          # Specialized task agents
│   ├── commands/        # PM workflow commands
│   ├── context/         # Project context files (this directory)
│   ├── rules/           # System behavior rules
│   └── scripts/         # Shell automation scripts
├── AGENTS.md            # Agent documentation
├── CLAUDE.md            # Claude Code guidance (generalized)
├── COMMANDS.md          # Command documentation
├── LICENSE              # MIT License
├── README.md            # Project documentation
└── screenshot.webp      # System screenshot
```

## Key Directories

### `.claude/` System Directory
- **agents/**: Specialized agents for parallel execution
  - `code-analyzer.md`, `file-analyzer.md`, `test-runner.md`, `parallel-worker.md`
- **commands/**: Command definitions organized by function
  - `pm/`: Project management commands (25+ commands)
  - `context/`: Context management commands
  - `testing/`: Test execution commands
- **rules/**: System behavior and coordination rules
  - `agent-coordination.md`, `standard-patterns.md`, `github-operations.md`
- **scripts/**: Shell scripts for command execution
  - `pm/`: PM workflow automation scripts
  - `test-and-log.sh`: Test execution script

### Documentation Files
- **AGENTS.md**: Agent system documentation
- **COMMANDS.md**: Command reference guide
- **README.md**: Comprehensive system documentation and workflow guide

## File Naming Patterns

### Command Files
- Pattern: `/[category]:[action]` (e.g., `/pm:epic-start`, `/context:create`)
- Implementation: `.claude/commands/[category]/[action].md`

### Script Files
- Pattern: `.claude/scripts/[category]/[action].sh`
- Executable shell scripts for command implementation

### Rule Files
- Pattern: `.claude/rules/[domain]-[topic].md`
- System behavior and coordination guidelines

### Context Files
- Pattern: `.claude/context/[purpose].md`
- Project state and documentation files

## Module Organization

### Project Management System
- Commands for PRD creation, epic management, issue tracking
- GitHub integration and synchronization
- Parallel execution and agent coordination

### Agent System
- Specialized agents for different task types
- Context optimization and parallel execution
- Git worktree management for conflict-free development

### Development Tools
- Test execution and analysis
- Code analysis and bug research
- File analysis and summarization

## Integration Points

- **GitHub CLI**: Issue management and repository operations
- **Git Worktrees**: Parallel development isolation
- **Shell Scripts**: Command automation and system operations
- **Markdown Files**: Documentation and structured data storage