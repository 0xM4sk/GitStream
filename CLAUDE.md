# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Management System

This repository includes a sophisticated project management workflow that transforms requirements into production code through spec-driven development, GitHub issues, Git worktrees, and parallel AI agents.

## Essential Commands

### Project Management Workflow
```bash
# Initialize PM system
/pm:init

# Create PRD for specific feature
/pm:prd-new feature-name

# Parse PRD into technical epic
/pm:prd-parse feature-name

# Decompose and sync to GitHub
/pm:epic-oneshot feature-name

# Start work on specific issue
/pm:issue-start 1234

# Check next priority task
/pm:next

# Project status
/pm:status
```

### Testing
```bash
# Always use test-runner agent for test execution
bash .claude/scripts/test-and-log.sh
```

### Context Management
```bash
/context:create   # Initialize project context
/context:update   # Refresh context
```

## Agent Usage (CRITICAL)

- **Always use file-analyzer agent** when reading logs or verbose files
- **Always use code-analyzer agent** for code analysis, bug research, and logic tracing
- **Always use test-runner agent** for all test execution
- **Use parallel-worker agent** for multi-stream epic execution in git worktrees

## Development Standards

### Code Quality
- **NO PARTIAL IMPLEMENTATION** - Complete every feature fully
- **NO CODE DUPLICATION** - Read existing codebase to reuse functions
- **NO DEAD CODE** - Use or delete completely
- **NO OVER-ENGINEERING** - Simple functions over enterprise patterns
- **IMPLEMENT TESTS** for every function with verbose, debugging-capable tests
- **NO INCONSISTENT NAMING** - Follow existing patterns
- **NO MIXED CONCERNS** - Proper separation of validation, API, database, and UI logic
- **NO RESOURCE LEAKS** - Close connections, clear timeouts, remove listeners

### Error Handling Philosophy
- **Fail fast** for critical configuration
- **Log and continue** for optional features
- **Graceful degradation** when external services unavailable
- **User-friendly messages** through resilience layer

## Parallel Execution System

### Multi-Stream Development
Single GitHub issues decompose into parallel work streams:
- Database layer modifications
- API endpoint development
- UI component implementation
- Test suite creation
- Documentation updates

### Agent Coordination
- Work occurs in git worktrees for conflict-free parallel development
- File-level parallelism prevents merge conflicts
- Atomic commits with clear, focused messages
- Progress tracking through structured update files
- Human intervention required for conflict resolution

## Architecture Overview

### Directory Structure
```
.claude/
├── agents/           # Specialized task agents
├── commands/         # PM workflow commands
├── context/          # Project context preservation
├── epics/           # Epic workspaces (git worktrees)
├── prds/            # Product Requirements Documents
├── rules/           # System behavior rules
└── scripts/         # Shell automation scripts
```

### GitHub Integration
- Uses GitHub CLI (`gh`) with `gh-sub-issue` extension
- Epic issues track sub-task completion automatically
- Labels provide organization (`epic:feature`, `task:feature`)
- File naming: `{issue-id}.md` for easy navigation

## Communication Guidelines

- Be critical and skeptical when appropriate
- Ask clarifying questions rather than making assumptions
- Provide concise, actionable feedback
- Point out better approaches or relevant standards
- No unnecessary flattery or compliments

## Context Optimization

The system maintains clean conversation context by:
- Using specialized agents for implementation details
- Keeping main thread strategic and high-level
- Preserving context through structured files
- Enabling parallel work without context pollution

This enables significantly faster development through structured, spec-driven workflows with multiple agents working simultaneously on different aspects of the same feature.