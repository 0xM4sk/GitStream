---
created: 2025-08-22T11:46:31Z
last_updated: 2025-08-22T11:46:31Z
version: 1.0
author: Claude Code PM System
---

# Technology Context

## Project Type
**Documentation/Workflow System** - No traditional programming language dependencies

## Core Technologies

### Shell Scripting (Bash)
- **Purpose**: Command automation and system operations
- **Location**: `.claude/scripts/` directory
- **Usage**: PM workflow automation, Git operations, GitHub CLI integration

### Markdown
- **Purpose**: Documentation, configuration, and structured data
- **Usage**: Command definitions, rules, context files, PRDs, epics
- **Standards**: GitHub Flavored Markdown with YAML frontmatter

### YAML Frontmatter
- **Purpose**: Metadata and structured configuration
- **Usage**: All `.md` files include frontmatter for versioning and tracking
- **Format**: ISO 8601 timestamps, semantic versioning

## Development Tools

### Git
- **Version Control**: Primary repository management
- **Worktrees**: Used for parallel development isolation
- **Branches**: Epic-based branching strategy

### GitHub CLI (`gh`)
- **Purpose**: Issue management and repository operations
- **Extensions**: `gh-sub-issue` for parent-child issue relationships
- **Authentication**: Required for PM workflow operations

### System Dependencies
- **bash**: Shell script execution
- **date**: Timestamp generation (UTC format)
- **find**: File system operations
- **grep/ripgrep**: Content searching
- **git**: Version control operations

## File System Requirements

### Directory Structure
- Write permissions in `.claude/` directory tree
- Ability to create git worktrees (`../epic-*` directories)
- Temporary file creation capabilities

### File Operations
- Markdown file creation and editing
- Shell script execution permissions
- Git repository operations

## Environment Specifications

### Operating System
- **Linux-based systems** (primary target)
- **macOS** compatible
- **Windows WSL** supported

### Shell Environment
- **bash** shell required
- **POSIX-compliant** utilities
- **UTF-8** text encoding support

## Integration Requirements

### GitHub Integration
- **Repository access**: Read/write permissions required
- **Issues API**: Full access for issue management
- **CLI authentication**: `gh auth login` required

### Git Configuration
- **Remote repository**: Properly configured origin
- **User identity**: Git user.name and user.email set
- **Branch permissions**: Ability to create and push branches

## Security Considerations

### Authentication
- GitHub CLI token-based authentication
- No hardcoded credentials in any files
- User-managed authentication workflows

### Permissions
- Local file system read/write access
- Git repository modification rights
- GitHub repository collaboration permissions

## Performance Characteristics

### File Operations
- **Lightweight**: Primarily text file operations
- **Scalable**: Designed for large project repositories
- **Efficient**: Minimal system resource requirements

### Network Dependencies
- **GitHub API**: Rate-limited but efficient usage
- **Git operations**: Standard push/pull overhead
- **Offline capable**: Core functionality works without network

## Version Requirements

### Minimum Versions
- **git**: 2.20+ (worktree support)
- **gh**: 2.0+ (extension support)
- **bash**: 4.0+ (associative arrays)

### Recommended Versions
- **git**: Latest stable
- **gh**: Latest stable with extensions
- **bash**: 5.0+ for optimal compatibility