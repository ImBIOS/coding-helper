#!/bin/bash
# Performance analysis for staged files using Claude Code

set -e

# Get list of staged files for analysis
STAGED_LIST=$(git diff --cached --name-only --diff-filter=ACMR | tr '\n' ' ')

if [ -z "$STAGED_LIST" ]; then
  echo "No staged files to analyze"
  exit 0
fi

echo "⚡ Running Claude Code performance analysis..."

if ! command -v claude >/dev/null 2>&1; then
  echo "⚠️  Claude Code not found, skipping performance analysis"
  exit 0
fi

# Create a temporary file for the analysis
ANALYSIS_OUTPUT=$(mktemp)

# Run Claude analysis with structured output
cat <<EOF | claude --headless --output-format json \
  --json-schema '{"type":"object","properties":{"blocking_issues":{"type":"array","items":{"type":"object","properties":{"file":{"type":"string"},"line":{"type":"number"},"severity":{"type":"string","enum":["critical","high","medium","low"]},"type":{"type":"string","enum":["security","performance","quality"]},"message":{"type":"string"}},"required":["file","severity","type","message"]}}}},"required":["blocking_issues"]}' \
  --allowed-tools "Read" \
  2>&1 | tee "$ANALYSIS_OUTPUT" || true

You are a performance optimization expert. Review these staged files for performance issues: $STAGED_LIST

Check for:
1. Inefficient algorithms (bad time/space complexity)
2. Missing database indexes
3. N+1 query problems
4. Memory leaks or excessive memory usage
5. Unnecessary re-renders (React)
6. Missing caching opportunities
7. Blocking operations that could be async
8. Large bundle size issues

Return only the performance issues in the structured output format.
EOF

# Extract structured output and check for issues
CRITICAL_ISSUES=$(cat "$ANALYSIS_OUTPUT" | jq -r '.structured_output.blocking_issues[]? | select(.severity == "critical")' 2>/dev/null || echo "")
HIGH_ISSUES=$(cat "$ANALYSIS_OUTPUT" | jq -r '.structured_output.blocking_issues[]? | select(.severity == "high")' 2>/dev/null || echo "")

# Check for critical blocking issues
if [ -n "$CRITICAL_ISSUES" ]; then
  echo "❌ CRITICAL PERFORMANCE ISSUES FOUND - Commit blocked"
  echo "$CRITICAL_ISSUES" | jq -r '"\(.file):\(.line) - \(.message)"'
  echo "Review the analysis above and fix critical issues before committing."
  rm -f "$ANALYSIS_OUTPUT"
  exit 1
fi

# If high severity performance issues, warn but allow bypass
if [ -n "$HIGH_ISSUES" ]; then
  echo "⚠️  High severity performance issues found. Consider fixing before committing."
  echo "$HIGH_ISSUES" | jq -r '"\(.file):\(.line) - \(.message)"'
  echo "Press Enter to continue or Ctrl+C to abort..."
  read -r
fi

rm -f "$ANALYSIS_OUTPUT"
echo "✅ Performance analysis passed"
