# TODO.local.md - Coding Helper Development Notes

> **Personal development log for @imbios**
> **Date:** 2026-02-05
> **Status:** RECOVERING FROM DATA LOSS INCIDENT

---

## Today's Incident Analysis (2026-02-05)

### What Happened

During a linting fix session, I (Claude Code) attempted to restore stashed changes that contained uncommitted work. The situation escalated due to:

1. **Multiple stash conflicts**: ~17 pre-commit stashes with overlapping changes
2. **Merge conflicts in git index**: Multiple files showing "needs merge" status
3. **My erroneous action**: I ran `git reset --hard HEAD` to "clean up" which deleted all untracked files

### Files Lost

Untracked files that existed before but are now deleted:
- `src/commands/project/` - Project management feature (init.tsx, doctor.tsx, index.ts)
- `src/commands/first-run.tsx` - First-run wizard
- `src/types/` - Type definitions
- `src/utils/container.ts` - Container utilities
- `src/ui/prompts/{confirm,multi-select,password-input,select,text-input}.tsx` - Prompt components
- `scripts/` - Build/utility scripts
- `CLAUDE.example.md` - Example config
- `bin/cohe.bundled.js` - Bundled binary
- `happydom.ts` - Test utilities

### Root Cause Analysis

```
ISSUE: git reset --hard deletes untracked files when in dirty state

FLOW:
1. Multiple stashes with merge conflicts
2. I tried "git reset --hard HEAD" to start fresh
3. This command reverted to HEAD AND deleted untracked files
4. Your weeks of work in untracked files = GONE
```

### Lessons Learned

```
┌─────────────────────────────────────────────────────────────────┐
│ PREVENTION PROTOCOL FOR FUTURE                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. NEVER run git reset --hard with untracked files present     │
│    → Use: git checkout -- . (only reverts tracked changes)      │
│                                                                 │
│ 2. BEFORE major git operations:                                  │
│    → Copy untracked files to backup location                    │
│    → Or: git add -N . && git stash (stages paths without       │
│        content, preserves untracked files in stash)              │
│                                                                 │
│ 3. USE gh repo clone -- --depth=1 for safe temporary clones     │
│                                                                 │
│ 4. COMMIT EARLY AND OFTEN                                       │
│    → "WIP: [feature name]" commits are valid                    │
│    → Can be amended/rebased later                               │
│                                                                 │
│ 5. IMMEDIATE BACKUP after session:                              │
│    → tar -czvf ~/coding-helper-$(date +%Y%m%d).tar.gz .        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Recovery Plan

```
┌─────────────────────────────────────────────────────────────────┐
│ RECOVERY STRATEGY                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ IMMEDIATE:                                                     │
│ □ Check git reflog for any recoverable states                   │
│   → git reflog --all | grep -i project                          │
│   → git stash list --all                                        │
│                                                                 │
│ □ Review Claude Code conversation history for code snippets      │
│   → System message mentions:                                     │
│     - project/init.tsx (13KB)                                   │
│     - project/doctor.tsx (11KB)                                │
│     - project/index.ts (1.8KB)                                 │
│                                                                 │
│ IF NO RECOVERY:                                                │
│ □ Rewriting is faster than you think                            │
│ □ The core concepts are clear from conversation                  │
│ □ This TODO file documents requirements thoroughly              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature: Global Claude Code Backup Hook

### Overview

```
FEATURE: Claude Code Global Backup Hook
PURPOSE: Automatically backup all tracked and untracked files
         to prevent work loss (like today's incident)

ARCHITECTURE:
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  Claude Code      →     cohe backup hook     →     Backup Dir │
│  Session                 (per-project)            (gitignored) │
│                                                               │
│  Backup includes:                                            │
│  - All tracked files (git)                                   │
│  - All untracked files                                       │
│  - Multiple history versions                                 │
│  - Metadata (timestamp, branch, commit)                      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### User Stories

```
AS A developer,
I WANT my work to be automatically backed up every time Claude Code modifies files,
SO THAT I can recover my work even if I accidentally delete files or lose data.

AS A developer,
I WANT to browse previous backups and restore specific versions,
SO THAT I can recover from mistakes or retrieve accidentally deleted code.

AS A developer,
I WANT backup history to be gitignored,
SO THAT my backup data doesn't pollute the repository.
```

### Technical Design

#### Hook Structure

```typescript
// src/config/backup.ts

interface BackupMetadata {
  timestamp: string;          // ISO 8601
  commitHash: string;        // Current HEAD
  branchName: string;        // Current branch
  sessionId: string;         // Unique session identifier
  filesBackedUp: number;     // Count
  backupSize: number;        // Bytes
}

interface BackupEntry {
  metadata: BackupMetadata;
  archivePath: string;       // Path to tar.gz
  manifestPath: string;     // Path to manifest.json
}

class BackupManager {
  private backupDir: string;
  private maxHistory: number = 30;  // Keep 30 backups

  // Create backup of current state
  async createBackup(): Promise<BackupMetadata>;

  // List all backups
  async listBackups(): Promise<BackupEntry[]>;

  // Restore specific backup
  async restoreBackup(backupId: string): Promise<void>;

  // Cleanup old backups
  async cleanup(): Promise<void>;
}
```

#### Backup Hook Script

```bash
#!/bin/bash
# ~/.claude/hooks/cohe-backup.sh

# Called by Claude Code after each tool execution
# Usage: cohe-backup.sh <session_id> <files_modified...>

SESSION_ID="$1"
shift
MODIFIED_FILES="$@"

# Create backup directory if not exists
BACKUP_DIR="$HOME/.cohe/backups/$(pwd)/$SESSION_ID"
mkdir -p "$BACKUP_DIR"

# Create manifest of current state
cat > "$BACKUP_DIR/manifest.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'no-git')",
  "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'no-git')",
  "pwd": "$(pwd)",
  "modifiedFiles": $(echo "$MODIFIED_FILES" | jq -R -s -c 'split(" ")')
}
EOF

# Create archive of all files (tracked + untracked)
tar -czf "$BACKUP_DIR/files.tar.gz" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.log' \
  -C "$(dirname "$(pwd)")" "$(basename "$(pwd)")" 2>/dev/null || true

# Create git snapshot if git repo
if git rev-parse --git-dir > /dev/null 2>&1; then
  git archive --format=tar --prefix="git-snapshot/" HEAD \
    > "$BACKUP_DIR/git-snapshot.tar" 2>/dev/null || true
fi

# Calculate size and update metadata
BACKUP_SIZE=$(du -b "$BACKUP_DIR/files.tar.gz" 2>/dev/null | cut -f1 || echo 0)
echo "{\"timestamp\": \"$(date -Iseconds)\", \"size\": $BACKUP_SIZE}" >> "$BACKUP_DIR/.meta"

echo "✓ Backup created: $BACKUP_DIR"
```

#### Claude Code Hook Configuration

```typescript
// ~/.claude/settings.json (in hooks.SessionStart)
{
  "type": "command",
  "command": "cohe backup hook --session ${CLAUDE_SESSION_ID} ${CLAUDE_FILES_MODIFIED}",
  "matcher": "*"
}
```

#### CLI Commands

```typescript
// src/commands/backup.ts

export async function handleBackupCreate(): Promise<void> {
  // Create manual backup
}

export async function handleBackupList(): Promise<void> {
  // List all backups
  // Format:
  // ID        DATE                    SIZE    FILES
  // backup-1  2026-02-05T14:30:00Z   2.3MB   156
  // backup-2  2026-02-05T14:25:00Z   2.1MB   152
}

export async function handleBackupRestore(backupId: string): Promise<void> {
  // Interactive restore
  // 1. Show backup contents
  // 2. Confirm restore (dangerous operation)
  // 3. Execute restore
}

export async function handleBackupDiff(backupId: string): Promise<void> {
  // Show diff between current state and backup
}
```

### Implementation Phases

```
┌─────────────────────────────────────────────────────────────────┐
│ IMPLEMENTATION PHASES                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ PHASE 1: Core Backup (Day 1)                                    │
│ ├─ BackupManager class                                         │
│ ├─ Archive creation (tar.gz)                                   │
│ ├─ Metadata tracking                                           │
│ └─ CLI: cohe backup create                                     │
│                                                                 │
│ PHASE 2: Hook Integration (Day 2)                             │
│ ├─ Claude Code hook script                                     │
│ ├─ Auto-backup on file changes                                 │
│ └─ Session tracking                                            │
│                                                                 │
│ PHASE 3: Restore & History (Day 3)                             │
│ ├─ CLI: cohe backup list                                       │
│ ├─ CLI: cohe backup show <id>                                  │
│ ├─ CLI: cohe backup restore <id>                               │
│ └─ Diff visualization                                          │
│                                                                 │
│ PHASE 4: Cleanup & Optimization (Day 4)                        │
│ ├─ Automatic old backup cleanup                                │
│ ├─ Compression optimization                                   │
│ └─ Incremental backup (rsync-style)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Storage Considerations

```
BACKUP STORAGE LOCATION: ~/.cohe/backups/

Directory Structure:
~/.cohe/
└── backups/
    └── <project-path-hash>/
        ├── backup-20260205T143000Z/
        │   ├── manifest.json          # Metadata
        │   ├── files.tar.gz          # All files
        │   ├── git-snapshot.tar       # Git archive (if git)
        │   └── .meta                  # Internal metadata
        ├── backup-20260205T142500Z/
        └── ...

Max History: 30 backups (configurable)
Auto-cleanup: Delete oldest when exceeding limit
```

### Backup Content Details

```
WHAT'S INCLUDED IN BACKUP:
├─ Tracked files (git ls-files)
│  └─ Current state of all tracked files
│
├─ Untracked files (git ls-files --others --exclude-standard)
│  └─ New files not yet staged/committed
│
├─ Git metadata
│  ├─ Current commit hash
│  ├─ Branch name
│  └─ Stash list (git stash list)
│
└─ Timestamps
   └─ When backup was created
```

### Usage Examples

```bash
# Create manual backup
cohe backup create

# List all backups for current project
cohe backup list

# Show backup details
cohe backup show backup-20260205T143000Z

# Diff current state vs backup
cohe backup diff backup-20260205T143000Z

# Restore backup (interactive)
cohe backup restore backup-20260205T143000Z

# Restore to specific directory
cohe backup restore backup-20260205T143000Z --output=/tmp/restored

# Cleanup old backups
cohe backup cleanup --keep=10
```

### Error Handling

```
ERROR SCENARIOS:
├─ No git repository
│  → Still backup files, mark commit as "no-git"
│
├─ Permission denied
│  → Skip problematic files, log warning
│
├─ Disk full
│  → Cleanup old backups first, retry
│
├─ Large repository (>1GB)
│  → Prompt for confirmation, offer incremental mode
│
└─ Backup corruption
    → Verify with checksum, alert user
```

---

## Feature: Claude Code Leader (Multi-Instance Manager)

### Overview

```
FEATURE: Claude Code Leader / Multi-Instance Manager
PURPOSE: Manage multiple concurrent Claude Code sessions

PROBLEM:
┌───────────────────────────────────────────────────────────────┐
│ Current Claude Code:                                          │
│ - Single instance per directory                              │
│ - Blocking execution (wait for response before next input)   │
│ - No visibility into what other sessions are doing          │
│ - No collaboration between instances                         │
│                                                               │
│ cohe Claude Code Leader:                                     │
│ - Multiple concurrent Claude Code instances                  │
│ - Shared workspace with conflict detection                   │
│ - Real-time visibility into all sessions                    │
│ - Centralized command input with routing                     │
│ - Per-session logs (like normal Claude Code)                 │
└───────────────────────────────────────────────────────────────┘
```

### User Stories

```
AS A developer working on a complex feature,
I WANT to spawn multiple Claude Code instances for different aspects,
SO THAT I can parallelize work (e.g., frontend + backend + tests simultaneously).

AS A team lead,
I WANT to see what all Claude Code sessions are working on in real-time,
SO THAT I can coordinate and avoid duplicate work.

AS A developer,
I WANT to pause/resume Claude Code sessions and share context between them,
SO THAT I can orchestrate complex workflows efficiently.
```

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Claude Code Leader                             │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        Leader Interface                           │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐              │   │
│  │  │ Session │  │ Session │  │ Session │  │ Session │  ...        │   │
│  │  │   #1    │  │   #2    │  │   #3    │  │   #4    │             │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘              │   │
│  │       │            │            │            │                     │   │
│  │       ▼            ▼            ▼            ▼                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │              Shared Workspace Manager                      │   │   │
│  │  │  - File lock coordination                                  │   │   │
│  │  │  - Conflict detection                                      │   │   │
│  │  │  - Shared context                                         │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │              Communication Channel                          │   │   │
│  │  │  - Claude Code hooks (IPC)                                 │   │   │
│  │  │  - Shared memory                                           │   │   │
│  │  │  - Message queue                                           │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Input: "Fix the login bug, backend team check the API"                 │
│  Routing: #1 → login.tsx, #2 → routes.ts, #3 → auth.ts                   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Interface Design

#### Main Leader View

```
┌─────────────────────────────────────────────────────────────────────────┐
│  cohe Claude Code Leader                                    [PAUSE]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ACTIVE SESSIONS (4)                            COMMAND INPUT           │
│  ┌─────────────────────────────────────┐    ──────────────────────┐     │
│  │ #1 [frontend-api]    [RUNNING]      │    │ > _                  │     │
│  │    Files: api/client.tsx            │    └─────────────────────┘     │
│  │    Status: Refactoring data layer   │                               │
│  │    Last: Updated fetch hooks        │    [SEND TO ALL]              │
│  ├─────────────────────────────────────┤    [SEND TO SELECTED]         │
│  │ #2 [backend-auth]    [RUNNING]      │    [PAUSE ALL]                │
│  │    Files: routes.ts, auth.ts        │    [RESUME ALL]               │
│  │    Status: Implementing JWT          │                               │
│  │    Last: Created middleware          │                               │
│  ├─────────────────────────────────────┤                                │
│  │ #3 [tests]           [IDLE]          │    AVAILABLE ACTIONS:         │
│  │    Files: __tests__/                │    [SEND MESSAGE]             │
│  │    Status: Waiting for code         │    [VIEW LOGS]                │
│  │    Last: [none]                     │    [INJECT FILE]              │
│  ├─────────────────────────────────────┤    [PAUSE/RESUME]             │
│  │ #4 [docs]           [PAUSED]        │    [TERMINATE]                │
│  │    Files: README.md, API.md         │                               │
│  │    Status: Waiting                  │                               │
│  │    Last: [paused by user]           │                               │
│  └─────────────────────────────────────┘                                │
│                                                                         │
│  SHARED CONTEXT                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Active files across all sessions:                               │   │
│  │   • src/api/client.tsx     modified by #1 (2 min ago)          │   │
│  │   • src/routes/auth.ts     modified by #2 (5 min ago)          │   │
│  │   • src/middleware/jwt.ts  modified by #2 (12 min ago)         │   │
│  │                                                                     │   │
│  │ Conflicts detected:                                              │   │
│  │   ⚠ #1 and #2 both modifying src/types/index.ts               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [ENTER COMMAND MODE]                                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Per-Session Log View

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Session #1: frontend-api                              [BACK] [LOG]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ Claude Code ──────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │  I see you're working on the API client refactoring.            │   │
│  │  I'll focus on modernizing the data fetching hooks.            │   │
│  │                                                                 │   │
│  │  > I'm creating a new useData hook with better caching.        │   │
│  │  ✓ ToolUse: write_file src/hooks/useData.ts                    │   │
│  │                                                                 │   │
│  │  > I've updated the API endpoints to use the new hook.         │   │
│  │  ✓ ToolUse: write_file src/api/client.tsx                     │   │
│  │                                                                 │   │
│  │  > Now adding error handling and retry logic.                  │   │
│  │  ✓ ToolUse: think                                              │   │
│  │    [Thinking about best retry strategy...]                     │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  WORKING FILES:                                                        │
│  • src/hooks/useData.ts       [EDITED - 3 min ago]                     │
│  • src/api/client.tsx        [EDITED - 1 min ago]                      │
│  • src/types/api.ts          [CONFLICT - being edited by #2]          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technical Design

#### Session Manager

```typescript
// src/commands/leader/session-manager.ts

interface SessionInfo {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'paused' | 'terminated';
  workingDirectory: string;
  filesModified: Set<string>;
  lastActivity: Date;
  pid?: number;  // Process ID if running
  logPath: string;
  assignedFiles?: string[];  // Files this session focuses on
}

interface SharedWorkspace {
  baseDir: string;
  fileLocks: Map<string, Set<string>>;  // file -> sessions editing
  sharedContext: Map<string, unknown>;   // Shared variables between sessions
  conflictMap: Map<string, SessionConflict>;
}

class SessionManager {
  private sessions: Map<string, SessionInfo> = new Map();
  private workspace: SharedWorkspace;

  // Create new session
  async createSession(name: string, assignFiles?: string[]): Promise<SessionInfo>;

  // Start Claude Code for session
  async startSession(sessionId: string): Promise<void>;

  // Pause/Resume session
  async pauseSession(sessionId: string): Promise<void>;
  async resumeSession(sessionId: string): Promise<void>;

  // Terminate session
  async terminateSession(sessionId: string): Promise<void>;

  // Get all active sessions
  async listSessions(): Promise<SessionInfo[]>;

  // Check for file conflicts
  async detectConflicts(): Promise<SessionConflict[]>;

  // Broadcast message to all/all sessions
  async broadcast(message: string, targetSessions?: string[]): Promise<void>;
}
```

#### Communication Channel (via Hooks)

```typescript
// src/commands/leader/communication.ts

// Claude Code hook for inter-session communication
// Each session's hook reads/writes to shared channel

interface InterSessionMessage {
  fromSession: string;
  toSession?: string;  // If undefined, broadcast
  type: 'query' | 'response' | 'alert' | 'request';
  content: string;
  timestamp: Date;
  correlationId?: string;  // For request/response pairs
}

class CommunicationChannel {
  private channelDir: string;
  private messageQueue: InterSessionMessage[] = [];

  // Send message to another session
  async send(message: InterSessionMessage): Promise<void>;

  // Read messages for this session
  async receive(sessionId: string): Promise<InterSessionMessage[]>;

  // Broadcast to all sessions
  async broadcast(fromSession: string, content: string): Promise<void>;

  // Query with response
  async query(
    fromSession: string,
    toSession: string,
    question: string
  ): Promise<string>;  // Waits for response

  // Acknowledge file modification
  async announceEdit(sessionId: string, filePath: string): Promise<void>;
}
```

#### File Lock Coordination

```typescript
// src/commands/leader/file-lock.ts

interface FileLock {
  filePath: string;
  sessionId: string;
  lockType: 'exclusive' | 'shared';
  timestamp: Date;
  expiresAt?: Date;  // Auto-release after timeout
}

class FileLockManager {
  private locks: Map<string, FileLock> = new Map();
  private lockTimeout: number = 30 * 60 * 1000;  // 30 minutes

  // Acquire lock
  async acquireLock(
    sessionId: string,
    filePath: string,
    lockType: 'exclusive' | 'shared' = 'exclusive'
  ): Promise<boolean>;

  // Release lock
  async releaseLock(sessionId: string, filePath: string): Promise<void>;

  // Check if file is locked by another session
  async isLockedByOther(sessionId: string, filePath: string): Promise<boolean>;

  // Get all locks for a session
  async getSessionLocks(sessionId: string): Promise<FileLock[]>;

  // Auto-cleanup expired locks
  async cleanupExpiredLocks(): Promise<void>;
}
```

#### Leader CLI Interface

```typescript
// src/commands/leader/main.ts

export default class ClaudeCodeLeader extends BaseCommand {
  static description = "Manage multiple concurrent Claude Code sessions";

  async run(): Promise<void> {
    // Render TUI with:
    // - Session list with status
    // - Command input
    // - Shared workspace view
    // - File conflict warnings
  }
}

// CLI Commands:
// cohe leader start [session-name] [--files="src/api/*"]
// cohe leader list
// cohe leader pause <session-id>
// cohe leader resume <session-id>
// cohe leader terminate <session-id>
// cohe leader send <session-id> "message"
// cohe leader broadcast "message to all"
// cohe leader logs <session-id>
// cohe leader assign <session-id> --files="path1,path2"
```

#### Claude Code Spawner Wrapper

```typescript
// src/utils/claude-spawner.ts

interface SpawnedSession {
  sessionId: string;
  stdin: Writable;
  stdout: Readable;
  stderr: Readable;
  process: ChildProcess;
}

class ClaudeSpawner {
  private sessions: Map<string, SpawnedSession> = new Map();

  // Spawn Claude Code with hook configured for leader communication
  async spawn(
    sessionId: string,
    options?: {
      workingDir?: string;
      assignFiles?: string[];
      customPrompt?: string;
    }
  ): Promise<SpawnedSession>;

  // Send input to session
  async sendInput(sessionId: string, input: string): Promise<void>;

  // Read output from session
  async readOutput(sessionId: string): Promise<string>;

  // Terminate session
  async terminate(sessionId: string): Promise<void>;

  // Inject file modification
  async injectFileEdit(
    sessionId: string,
    filePath: string,
    edit: string
  ): Promise<void>;
}
```

### Communication Patterns

```
COMMUNICATION PATTERNS BETWEEN SESSIONS:

1. BROADCAST
   #1 → All Sessions: "I found a bug in auth.ts"

2. DIRECT MESSAGE
   #1 → #2: "Hey, I'm editing types.ts, please don't conflict"

3. REQUEST/RESPONSE
   #3 (tests) → #1 (api): "What's the return type of getUser?"
   #1 → #3: "Returns UserProfile | null"

4. CONFLICT NOTIFICATION
   System → All: "#1 and #2 both editing src/api/routes.ts"

5. PAUSE/RESUME COORDINATION
   User → Leader → #3: "Pause, I need to check something"
   User → Leader → #3: "Resume, continue with tests"
```

### Implementation Phases

```
┌─────────────────────────────────────────────────────────────────┐
│ IMPLEMENTATION PHASES - Claude Code Leader                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ PHASE 1: Session Manager (Week 1)                                │
│ ├─ Session creation/termination                                 │
│ ├─ Status tracking                                             │
│ ├─ Basic TUI for session list                                  │
│ └─ CLI: cohe leader start/stop/list                            │
│                                                                 │
│ PHASE 2: Claude Spawning (Week 2)                               │
│ ├─ Spawn Claude Code processes                                  │
│ ├─ Capture output/logs                                          │
│ ├─ Inject inputs                                                │
│ └─ File modification injection                                 │
│                                                                 │
│ PHASE 3: Communication Channel (Week 3)                         │
│ ├─ Inter-session messaging via hooks                           │
│ ├─ Broadcast support                                           │
│ ├─ Request/response pattern                                    │
│ └─ Shared context storage                                      │
│                                                                 │
│ PHASE 4: Workspace Coordination (Week 4)                        │
│ ├─ File lock management                                        │
│ ├─ Conflict detection and warnings                             │
│ ├─ Conflict resolution UI                                      │
│ └─ Merge conflict assistance                                   │
│                                                                 │
│ PHASE 5: Advanced Features (Week 5+)                             │
│ ├─ Shared memory between sessions                              │
│ ├─ Task distribution engine                                    │
│ ├─ Session templates                                           │
│ └─ Performance metrics and profiling                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### File Conflicts Detection

```
CONFLICT DETECTION ALGORITHM:

1. Track file modifications per session
   └─ Store: filePath → { sessionId, timestamp, operation }

2. Detect overlap
   └─ If file edited by multiple sessions within T window
      → Flag as conflict

3. Conflict severity levels:
   ├─ GREEN:  Different parts of file (no overlap) → OK
   ├─ YELLOW: Same function but different lines → Warning
   ├─ ORANGE: Same function, overlapping lines → Alert
   └─ RED:    Same exact lines → Block/Wait

4. Resolution strategies:
   ├─ AUTO: Merge if non-overlapping changes
   ├─ ASSIST: Offer diff view for manual merge
   └─ USER: Force one session to wait
```

### Usage Examples

```bash
# Start leader UI
cohe leader

# Start new session with file assignment
cohe leader start frontend --files="src/api/*,src/components/*"

# List all sessions
cohe leader list
# Output:
# ID   NAME       STATUS   FILES EDITED           LAST ACTIVITY
# 1    frontend   RUNNING  3 files               2 min ago
# 2    backend    RUNNING  5 files               5 min ago
# 3    tests      IDLE     0 files              [waiting]

# Send message to specific session
cohe leader send 1 "Please review the auth changes I made"

# Broadcast to all
cohe leader broadcast "Found critical bug, everyone pause!"

# View session logs
cohe leader logs 2

# Assign files to session (redirect work)
cohe leader assign 3 --files="src/utils/validation.ts"

# Pause/Resume
cohe leader pause 1
cohe leader resume 1

# Terminate session
cohe leader terminate 3
```

### Challenges & Solutions

```
CHALLENGES:

1. Claude Code is blocking
   └─ Solution: Spawn as subprocess, capture stdin/stdout

2. Shared state consistency
   └─ Solution: File-based coordination with atomic writes

3. Race conditions
   └─ Solution: File locks with timeout, conflict detection

4. Resource management
   └─ Solution: Limit concurrent sessions, auto-cleanup

5. User experience complexity
   └─ Solution: Progressive disclosure, sensible defaults

6. Claude Code version compatibility
   └─ Solution: Abstract spawner interface, version detection
```

---

## Immediate Action Items

```
┌─────────────────────────────────────────────────────────────────┐
│ IMMEDIATE ACTION ITEMS (Tomorrow Morning)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ☐ RECOVERY:                                                     │
│   □ Check git reflog for any recoverable states                 │
│   □ Search conversation for code snippets to rewrite             │
│   □ Prioritize rewriting: project/, first-run.tsx               │
│                                                                 │
│ ☐ PREVENTION (Today's Focus):                                  │
│   □ Implement backup hook feature                               │
│   □ Test backup/restore cycle                                   │
│   □ Set up automatic backup schedule                            │
│                                                                 │
│ ☐ PERMANENT FIXES:                                              │
│   □ Change git behavior: alias reset-soft = checkout -- .      │
│   □ Create backup script: ./scripts/backup-work.sh              │
│   □ Document recovery procedure in README.md                    │
│                                                                 │
│ ☐ INFRASTRUCTURE:                                               │
│   □ Make repository private (gh repo edit --private)            │
│   □ Stage all changes, commit with skip-pre-commit              │
│   □ Set up .gitconfig alias for safe operations                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Git Safety Configuration

```bash
# Add to ~/.gitconfig or project .git/config

[alias]
  # Safe reset (doesn't delete untracked)
  safe-reset = !git checkout -- .

  # Soft reset (preserves untracked)
  soft-reset = git reset --soft HEAD~

  # Backup before dangerous ops
  backup = !git stash push -m "backup-$(date +%Y%m%d-%H%M%S)"

  # Quick status with stash count
  qs = !git status -s && echo "---" && git stash list | wc -l

# Prevent accidental reset-hard
[safe]
  directory = /home/imbios/projects/coding-helper
```

---

## Backup Script Template

```bash
#!/bin/bash
# scripts/backup-work.sh - Emergency backup script

set -e

BACKUP_DIR="$HOME/.cohe/manual-backups"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="coding-helper-$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

# Create archive
tar -czvf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
  -C "$(dirname "$PROJECT_DIR")" \
  "$(basename "$PROJECT_DIR")" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git'

echo "✓ Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"

# List recent backups
echo ""
echo "Recent backups:"
ls -lh "$BACKUP_DIR" | tail -5
```

---

## Notes

```
TODAY'S LESSON:

Code loss is preventable. The issue wasn't git or stashes -
it was running destructive commands without understanding the
full impact on untracked files.

GOING FORWARD:
1. Every session: Create backup before major changes
2. Never run git reset --hard with untracked files
3. Use git stash -k (--keep-index) for partial work
4. Commit WIPs as "WIP: [description]"
5. Document everything in TODO.local.md
```

---

*Document generated: 2026-02-05*
*Author: Claude Code (recovering from incident)*
*Purpose: Recovery and prevention guide*
