#!/bin/bash
# cohe-notify.sh - Dynamic notification script for Claude Code
# Reads the session transcript and sends a notification with task details

set -euo pipefail

# Paths
CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
NOTIFY_SCRIPT_DIR="$CLAUDE_DIR"
NOTIFY_SCRIPT_PATH="$NOTIFY_SCRIPT_DIR/cohe-notify.sh"

# Get the hook input from stdin
HOOK_INPUT=$(cat)
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('transcript_path', ''))" 2>/dev/null || echo "")

# Fallback message
MESSAGE="Claude task completed"

# Extract the last user message from transcript
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
    # Use Python to parse the transcript JSONL file
    EXTRACTED=$(python3 -c "
import sys
import json

transcript_path = '$TRANSCRIPT_PATH'
message = 'Task completed'

try:
    with open(transcript_path, 'r') as f:
        lines = f.readlines()

        # Search backwards for the last user message
        for line in reversed(lines):
            try:
                entry = json.loads(line)
                role = entry.get('role', '')
                content = entry.get('content', '')

                if role == 'user':
                    # Handle different content formats
                    if isinstance(content, list):
                        text_parts = []
                        for block in content:
                            if isinstance(block, dict):
                                text = block.get('text', '')
                                if text:
                                    text_parts.append(text)
                            elif isinstance(block, str):
                                text_parts.append(block)
                        message = ' '.join(text_parts)
                    elif isinstance(content, str):
                        message = content
                    else:
                        message = str(content)
                    break
            except (json.JSONDecodeError, TypeError):
                continue
except Exception as e:
    pass

# Truncate for notification
if len(message) > 100:
    message = message[:97] + '...'
print(message)
" 2>/dev/null || echo "Task completed")

    if [ -n "$EXTRACTED" ]; then
        MESSAGE="$EXTRACTED"
    fi
fi

# Send notification using notify-send (Linux) or osascript (macOS)
if command -v notify-send &>/dev/null; then
    notify-send "Claude Code" "$MESSAGE" -i dialog-information 2>/dev/null || true
elif command -v osascript &>/dev/null; then
    osascript -e "display notification \"$MESSAGE\" with title \"Claude Code\"" 2>/dev/null || true
fi

# Play sound (Linux or fallback)
if command -v paplay &>/dev/null; then
    paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || true
elif command -v aplay &>/dev/null; then
    aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true
fi

exit 0
