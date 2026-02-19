---
name: cli-tester
description: Test and validate CLI commands for the cohe CLI tool. Use when testing CLI commands, validating command output, verifying flags, checking error handling, or running integration tests for the cohe CLI (built with oclif and Ink).
---

# CLI Tester

## Overview

This skill provides guidance for testing the cohe CLI tool. It helps verify that CLI commands work correctly, handle errors properly, and provide good user feedback.

## Project Context

- **CLI Name**: `cohe` (short for "coding helper")
- **Package Manager**: Bun
- **Test Framework**: Bun test
- **Commands**:
  - `bun test` - Run unit tests
  - `bun run dev` - Start development server
  - `bun run build` - Build CLI
  - `bun run typecheck` - TypeScript validation

## Testing Checklist

When testing CLI commands:

1. **Build first**: Always run `bun run build` before testing the built CLI
2. **Test success cases**: Verify normal operation works
3. **Test failure cases**: Verify error handling and messages
4. **Check exit codes**: Use `echo $?` after running commands
5. **Validate output**: Check both stdout and stderr
6. **Test flags**: Verify all CLI flags work as expected
7. **Test help**: Verify `--help` and `-h` flags work

## Running Tests

### Unit Tests
```bash
bun test
bun test:watch  # watch mode
bun run test:coverage  # with coverage
```

### CLI Command Testing
```bash
# Test built CLI
./dist/bin/dev.js [command]

# Or use bun run dev
bun run dev [command]
```

### Common Test Patterns

```bash
# Capture output and exit code
output=$(./dist/bin/dev.js account list 2>&1)
exit_code=$?
echo "Exit code: $exit_code"
echo "Output: $output"

# Test error handling
./dist/bin/dev.js account add 2>&1 | grep -q "Error" && echo "Error handled"
```

## Available Commands

List of cohe commands to test (check `src/commands/`):
- `account` - Manage API accounts
- `provider` - Switch between Z.AI and MiniMax
- `hooks` - Control MCP hooks
- `init` - Initialize configuration

## Test Files Location

- Unit tests: `src/**/*.test.ts`
- Integration tests: `tests/**/*.test.ts`
- Test utilities: `tests/utils/`
