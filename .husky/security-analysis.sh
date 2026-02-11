#!/bin/bash
# Security analysis for staged files using Claude Code

set -e

# Get list of staged files for analysis
STAGED_LIST=$(git diff --cached --name-only --diff-filter=ACMR | tr '\n' ' ')

if [ -z "$STAGED_LIST" ]; then
  echo "No staged files to analyze"
  exit 0
fi

echo "🔒 Running Claude Code security analysis..."

if ! command -v claude >/dev/null 2>&1; then
  echo "⚠️  Claude Code not found, skipping security analysis"
  exit 0
fi

# Create a temporary file for the analysis
ANALYSIS_OUTPUT=$(mktemp)

# Run Claude analysis with structured output
cat <<EOF | claude --headless --output-format json \
  --json-schema '{"type":"object","properties":{"blocking_issues":{"type":"array","items":{"type":"object","properties":{"file":{"type":"string"},"line":{"type":"number"},"severity":{"type":"string","enum":["critical","high","medium","low"]},"type":{"type":"string","enum":["security","performance","quality"]},"message":{"type":"string"}},"required":["file","severity","type","message"]}}}},"required":["blocking_issues"]}' \
  --allowed-tools "Read" \
  2>&1 | tee "$ANALYSIS_OUTPUT" || true

You are a security expert. Review these staged files for security vulnerabilities: $STAGED_LIST

Check for:
1. SQL injection vulnerabilities
2. XSS (cross-site scripting) issues
3. Authentication and authorization flaws
4. Command injection vulnerabilities
5. Path traversal vulnerabilities
6. Insecure sensitive data handling
7. OWASP Top 10 vulnerabilities

Return only the security issues in the structured output format.
EOF

# Extract structured output and check for critical issues
CRITICAL_ISSUES=$(cat "$ANALYSIS_OUTPUT" | jq -r '.structured_output.blocking_issues[]? | select(.severity == "critical")' 2>/dev/null || echo "")
HIGH_ISSUES=$(cat "$ANALYSIS_OUTPUT" | jq -r '.structured_output.blocking_issues[]? | select(.severity == "high")' 2>/dev/null || echo "")

# Check for critical blocking issues
if [ -n "$CRITICAL_ISSUES" ]; then
  echo "❌ CRITICAL SECURITY ISSUES FOUND - Commit blocked"
  echo "$CRITICAL_ISSUES" | jq -r '"\(.file):\(.line) - \(.message)"'
  echo "Review the analysis above and fix critical issues before committing."
  rm -f "$ANALYSIS_OUTPUT"
  exit 1
fi

# If high severity security issues, warn but allow bypass
if [ -n "$HIGH_ISSUES" ]; then
  echo "⚠️  High severity security issues found. Consider fixing before committing."
  echo "$HIGH_ISSUES" | jq -r '"\(.file):\(.line) - \(.message)"'
  echo "Press Enter to continue or Ctrl+C to abort..."
  read -r
fi

rm -f "$ANALYSIS_OUTPUT"
echo "✅ Security analysis passed"
