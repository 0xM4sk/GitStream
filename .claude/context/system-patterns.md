---
created: 2025-08-22T11:46:31Z
last_updated: 2025-08-22T11:46:31Z
version: 1.0
author: Claude Code PM System
---

# System Patterns

## Architectural Style

### Command Pattern
- **Structure**: Commands defined as markdown files with metadata
- **Execution**: Shell scripts implement command logic
- **Organization**: Hierarchical command categories (`/pm:`, `/context:`, etc.)

### Agent-Based Architecture
- **Specialization**: Different agents for different task types
- **Coordination**: Git-based communication and file-based progress tracking
- **Isolation**: Agents work in separate contexts to optimize performance

### Document-Driven Design
- **Configuration**: Markdown files with YAML frontmatter
- **State Management**: File-based persistence for project state
- **Traceability**: Complete audit trail through structured documentation

## Design Patterns

### Factory Pattern (Agent Creation)
- **Agent Selection**: Dynamic agent selection based on task type
- **Initialization**: Standardized agent setup and context loading
- **Specialization**: Role-specific capabilities and tools

### Observer Pattern (Progress Tracking)
- **Events**: Git commits trigger progress updates
- **Notification**: Progress files updated automatically
- **Aggregation**: Epic-level progress calculated from task progress

### Strategy Pattern (Execution Methods)
- **Serial Execution**: Traditional single-threaded approach
- **Parallel Execution**: Multi-agent worktree-based approach
- **Hybrid Execution**: Dynamic selection based on task analysis

## Data Flow Architecture

### Workflow Progression
```
PRD Creation → Epic Planning → Task Decomposition → GitHub Sync → Parallel Execution
```

### Information Flow
```
User Input → Command Processing → Script Execution → File Updates → Git Operations → GitHub Sync
```

### Context Management
```
Global Context (.claude/context/) → Epic Context (epics/*/epic.md) → Task Context (epics/*/task.md)
```

## Coordination Patterns

### File-Based Communication
- **Progress Files**: Agents communicate through structured progress files
- **Lock Files**: Coordination for shared resource access
- **Status Files**: Real-time status communication between agents

### Git-Based Synchronization
- **Atomic Commits**: Each agent makes focused, atomic commits
- **Merge Strategy**: Pull-rebase to maintain clean history
- **Conflict Resolution**: Human intervention required for conflicts

### Event-Driven Updates
- **Commit Triggers**: Progress updates triggered by Git commits
- **Status Changes**: Issue status changes propagate to local files
- **Synchronization Points**: Regular bidirectional sync with GitHub

## Error Handling Patterns

### Fail-Fast Approach
- **Critical Failures**: Immediate exit on essential prerequisite failures
- **Early Validation**: Check requirements before beginning operations
- **Clear Messaging**: Specific error messages with resolution steps

### Graceful Degradation
- **Optional Features**: Continue operation when non-essential features fail
- **Fallback Mechanisms**: Alternative approaches when primary methods fail
- **Recovery Procedures**: Automatic recovery from transient failures

### Human Intervention Points
- **Conflict Resolution**: Merge conflicts require human resolution
- **Ambiguous Decisions**: Complex decisions deferred to humans
- **Validation Gates**: Human approval for destructive operations

## Scalability Patterns

### Horizontal Scaling (Multiple Agents)
- **Work Distribution**: Tasks distributed across multiple agents
- **Resource Isolation**: Each agent works in isolated environment
- **Coordination Overhead**: Minimal coordination through Git operations

### Vertical Scaling (Context Optimization)
- **Context Partitioning**: Large contexts split across specialized agents
- **Memory Management**: Context cleanup and optimization strategies
- **Performance Monitoring**: Track and optimize context usage

## Security Patterns

### Least Privilege
- **File Permissions**: Minimal required file system access
- **Git Permissions**: Repository-level access controls
- **API Access**: Limited GitHub API scope and permissions

### Credential Management
- **External Authentication**: Relies on system-level authentication
- **No Credential Storage**: No credentials stored in system files
- **Token Refresh**: Automatic token refresh through CLI tools

## Maintenance Patterns

### Version Management
- **Semantic Versioning**: Clear version tracking for all components
- **Backward Compatibility**: Maintain compatibility across versions
- **Migration Strategies**: Clear upgrade paths for system changes

### Monitoring and Logging
- **Operation Logging**: All major operations logged with timestamps
- **Progress Tracking**: Detailed progress information for debugging
- **Error Logging**: Comprehensive error information for troubleshooting

### Documentation Patterns
- **Self-Documenting**: System behavior documented within system files
- **Living Documentation**: Documentation updated automatically with changes
- **Contextual Help**: Help information available at point of use