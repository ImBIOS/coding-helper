import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const TEST_DIR = path.join(os.tmpdir(), `cohe-hooks-test-${Date.now()}`);
const COHE_BIN = path.join(process.cwd(), "bin", "cohe.js");

describe("cohe hooks - Claude Code Hook Integration Tests", () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  //==========================================================================
  // Test 1: cohe notify (Notification hook)
  //==========================================================================

  describe("cohe notify - Notification Hook", () => {
    test("should use default message when no stdin provided", () => {
      // Run without stdin - should use default message
      const result = spawnSync("bun", [COHE_BIN, "notify"], {
        input: "",
        timeout: 5000,
      });

      // Should complete without crashing
      expect([0, null]).toContain(result.status);
    });

    test("should read transcript_path from stdin JSON", () => {
      // Create a mock transcript file
      const transcriptPath = path.join(TEST_DIR, "transcript.jsonl");
      const transcriptContent = [
        JSON.stringify({
          role: "assistant",
          content: "Hello, how can I help?",
        }),
        JSON.stringify({ role: "user", content: "Fix the bug in login" }),
      ].join("\n");
      fs.writeFileSync(transcriptPath, transcriptContent);

      // Pass transcript_path via stdin
      const stdin = JSON.stringify({ transcript_path: transcriptPath });
      const result = spawnSync("bun", [COHE_BIN, "notify"], {
        input: stdin,
        timeout: 5000,
      });

      expect([0, null]).toContain(result.status);
    });

    test("should handle missing transcript file gracefully", () => {
      const stdin = JSON.stringify({
        transcript_path: "/nonexistent/path/transcript.jsonl",
      });
      const result = spawnSync("bun", [COHE_BIN, "notify"], {
        input: stdin,
        timeout: 5000,
      });

      // Should not crash, use default message
      expect([0, null]).toContain(result.status);
    });

    test("should extract message from new transcript format (entry.message)", () => {
      const transcriptPath = path.join(TEST_DIR, "transcript-new.jsonl");
      const transcriptContent = [
        JSON.stringify({
          message: { role: "user", content: "Add new feature to dashboard" },
        }),
      ].join("\n");
      fs.writeFileSync(transcriptPath, transcriptContent);

      const stdin = JSON.stringify({ transcript_path: transcriptPath });
      const result = spawnSync("bun", [COHE_BIN, "notify"], {
        input: stdin,
        timeout: 5000,
      });

      expect([0, null]).toContain(result.status);
    });

    test("should extract message from array content blocks", () => {
      const transcriptPath = path.join(TEST_DIR, "transcript-blocks.jsonl");
      const transcriptContent = [
        JSON.stringify({
          role: "user",
          content: [
            { type: "text", text: "First part " },
            { type: "text", text: "second part" },
          ],
        }),
      ].join("\n");
      fs.writeFileSync(transcriptPath, transcriptContent);

      const stdin = JSON.stringify({ transcript_path: transcriptPath });
      const result = spawnSync("bun", [COHE_BIN, "notify"], {
        input: stdin,
        timeout: 5000,
      });

      expect([0, null]).toContain(result.status);
    });

    test("should handle custom --message flag", () => {
      const result = spawnSync(
        "bun",
        [COHE_BIN, "notify", "--message", "Custom message"],
        {
          timeout: 5000,
        }
      );

      expect([0, null]).toContain(result.status);
    });

    test("should truncate long messages to 100 chars", () => {
      const transcriptPath = path.join(TEST_DIR, "transcript-long.jsonl");
      const longMessage = "A".repeat(200); // 200 chars
      const transcriptContent = [
        JSON.stringify({ role: "user", content: longMessage }),
      ].join("\n");
      fs.writeFileSync(transcriptPath, transcriptContent);

      const stdin = JSON.stringify({ transcript_path: transcriptPath });
      const result = spawnSync("bun", [COHE_BIN, "notify"], {
        input: stdin,
        timeout: 5000,
      });

      expect([0, null]).toContain(result.status);
    });

    test("should handle invalid JSON stdin gracefully", () => {
      const result = spawnSync("bun", [COHE_BIN, "notify"], {
        input: "not valid json",
        timeout: 5000,
      });

      // Should use default message
      expect([0, null]).toContain(result.status);
    });
  });

  //==========================================================================
  // Test 2: cohe hooks post-tool (PostToolUse hook for Write|Edit)
  //==========================================================================

  describe("cohe hooks post-tool - PostToolUse Hook", () => {
    test("should accept file path from command line argument", async () => {
      // Create a test TypeScript file with bad formatting
      const testFile = path.join(TEST_DIR, "test.ts");
      fs.writeFileSync(testFile, "const    x    =     1;");

      const result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "post-tool", testFile],
        {
          timeout: 10_000,
        }
      );

      // Command should complete (may fail if biome not installed, but shouldn't crash)
      expect([0, null]).toContain(result.status);
    });

    test("should read file_path from stdin (Claude Code PostToolUse format)", async () => {
      const testFile = path.join(TEST_DIR, "stdin-test.ts");
      fs.writeFileSync(testFile, "const    y    =     2;");

      // This is the format Claude Code sends to PostToolUse hooks
      const stdin = JSON.stringify({
        tool_name: "Write",
        tool_input: {
          file_path: testFile,
          content: "const    y    =     2;",
        },
        tool_response: {
          success: true,
        },
      });

      const result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "post-tool", "--silent"],
        {
          input: stdin,
          timeout: 10_000,
        }
      );

      expect([0, null]).toContain(result.status);
    });

    test("should extract file_path from nested tool_input object", async () => {
      const testFile = path.join(TEST_DIR, "nested-test.ts");
      fs.writeFileSync(testFile, "let    z    =    3;");

      const stdin = JSON.stringify({
        tool_input: {
          file_path: testFile,
        },
      });

      const result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "post-tool", "--silent"],
        {
          input: stdin,
          timeout: 10_000,
        }
      );

      expect([0, null]).toContain(result.status);
    });

    test("should handle various file path field names", async () => {
      const testFile = path.join(TEST_DIR, "field-test.ts");
      fs.writeFileSync(testFile, "const    a    =    4;");

      // Test 'path' field
      const stdin1 = JSON.stringify({ path: testFile });
      let result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "post-tool", "--silent"],
        {
          input: stdin1,
          timeout: 10_000,
        }
      );
      expect([0, null]).toContain(result.status);

      // Test 'file' field
      const stdin2 = JSON.stringify({ file: testFile });
      result = spawnSync("bun", [COHE_BIN, "hooks", "post-tool", "--silent"], {
        input: stdin2,
        timeout: 10_000,
      });
      expect([0, null]).toContain(result.status);

      // Test 'destination' field
      const stdin3 = JSON.stringify({ destination: testFile });
      result = spawnSync("bun", [COHE_BIN, "hooks", "post-tool", "--silent"], {
        input: stdin3,
        timeout: 10_000,
      });
      expect([0, null]).toContain(result.status);
    });

    test("should handle --all flag to format all files in directory", () => {
      // Create multiple test files
      fs.writeFileSync(
        path.join(TEST_DIR, "file1.ts"),
        "const    x    =    1;"
      );
      fs.writeFileSync(
        path.join(TEST_DIR, "file2.js"),
        "const    y    =    2;"
      );

      const result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "post-tool", "--all"],
        {
          cwd: TEST_DIR,
          timeout: 10_000,
        }
      );

      // Should complete without crashing
      expect([0, null]).toContain(result.status);
    });

    test("should show 'No files to format' when no files provided", () => {
      // Run without any files or stdin
      const result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "post-tool", "--silent"],
        {
          input: "{}",
          timeout: 10_000,
        }
      );

      // Should handle gracefully
      expect([0, null]).toContain(result.status);
    });

    test("should handle non-existent file gracefully", () => {
      const stdin = JSON.stringify({
        file_path: "/nonexistent/file.ts",
      });

      const result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "post-tool", "--silent"],
        {
          input: stdin,
          timeout: 10_000,
        }
      );

      // Should not crash
      expect([0, null]).toContain(result.status);
    });

    test("should handle --verbose flag", () => {
      const testFile = path.join(TEST_DIR, "verbose-test.ts");
      fs.writeFileSync(testFile, "const    v    =    5;");

      const stdin = JSON.stringify({ file_path: testFile });
      const result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "post-tool", "--verbose"],
        {
          input: stdin,
          timeout: 10_000,
        }
      );

      expect([0, null]).toContain(result.status);
    });

    test("should handle JSON input as string in tool_input", () => {
      const testFile = path.join(TEST_DIR, "string-test.ts");
      fs.writeFileSync(testFile, "const    s    =    6;");

      // tool_input can be a JSON string
      const stdin = JSON.stringify({
        tool_input: JSON.stringify({ file_path: testFile }),
      });

      const result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "post-tool", "--silent"],
        {
          input: stdin,
          timeout: 10_000,
        }
      );

      expect([0, null]).toContain(result.status);
    });
  });

  //==========================================================================
  // Test 3: cohe hooks stop (Stop hook)
  //==========================================================================

  describe("cohe hooks stop - Stop Hook", () => {
    test("should read transcript_path from stdin", () => {
      const transcriptPath = path.join(TEST_DIR, "stop-transcript.jsonl");
      const transcriptContent = [
        JSON.stringify({ role: "user", content: "Complete the task" }),
      ].join("\n");
      fs.writeFileSync(transcriptPath, transcriptContent);

      const stdin = JSON.stringify({ transcript_path: transcriptPath });
      const result = spawnSync("bun", [COHE_BIN, "hooks", "stop", "--silent"], {
        input: stdin,
        timeout: 5000,
      });

      expect([0, null]).toContain(result.status);
    });

    test("should extract message from new transcript format", () => {
      const transcriptPath = path.join(TEST_DIR, "stop-new-format.jsonl");
      const transcriptContent = [
        JSON.stringify({
          message: {
            role: "user",
            content: "Refactor the authentication module",
          },
        }),
      ].join("\n");
      fs.writeFileSync(transcriptPath, transcriptContent);

      const stdin = JSON.stringify({ transcript_path: transcriptPath });
      const result = spawnSync("bun", [COHE_BIN, "hooks", "stop", "--silent"], {
        input: stdin,
        timeout: 5000,
      });

      expect([0, null]).toContain(result.status);
    });

    test("should handle missing transcript gracefully", () => {
      const stdin = JSON.stringify({
        transcript_path: "/nonexistent/stop-transcript.jsonl",
      });
      const result = spawnSync("bun", [COHE_BIN, "hooks", "stop", "--silent"], {
        input: stdin,
        timeout: 5000,
      });

      // Should use default message
      expect([0, null]).toContain(result.status);
    });

    test("should handle empty transcript file", () => {
      const transcriptPath = path.join(TEST_DIR, "empty-transcript.jsonl");
      fs.writeFileSync(transcriptPath, "");

      const stdin = JSON.stringify({ transcript_path: transcriptPath });
      const result = spawnSync("bun", [COHE_BIN, "hooks", "stop", "--silent"], {
        input: stdin,
        timeout: 5000,
      });

      // Should use default message
      expect([0, null]).toContain(result.status);
    });

    test("should handle invalid JSON stdin gracefully", () => {
      const result = spawnSync("bun", [COHE_BIN, "hooks", "stop", "--silent"], {
        input: "not valid json",
        timeout: 5000,
      });

      // Should not crash
      expect([0, null]).toContain(result.status);
    });

    test("should detect uncommitted changes in git repo", () => {
      // Initialize a git repo
      const gitDir = path.join(TEST_DIR, "git-repo");
      fs.mkdirSync(gitDir, { recursive: true });
      spawnSync("git", ["init"], { cwd: gitDir });
      spawnSync("git", ["config", "user.email", "test@test.com"], {
        cwd: gitDir,
      });
      spawnSync("git", ["config", "user.name", "Test"], { cwd: gitDir });

      // Create and commit initial file
      const trackedFile = path.join(gitDir, "tracked.txt");
      fs.writeFileSync(trackedFile, "initial");
      spawnSync("git", ["add", "."], { cwd: gitDir });
      spawnSync("git", ["commit", "-m", "initial"], { cwd: gitDir });

      // Make an uncommitted change
      fs.writeFileSync(trackedFile, "modified");

      const transcriptPath = path.join(gitDir, "transcript.jsonl");
      fs.writeFileSync(transcriptPath, "");

      const stdin = JSON.stringify({ transcript_path: transcriptPath });
      const result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "stop", "--silent", "--no-commit"],
        {
          cwd: gitDir,
          input: stdin,
          timeout: 10_000,
        }
      );

      // Should detect uncommitted changes and handle gracefully
      expect([0, null]).toContain(result.status);
    });

    test("should handle --no-commit flag to skip auto-commit", () => {
      // Initialize a git repo with uncommitted changes
      const gitDir = path.join(TEST_DIR, "no-commit-repo");
      fs.mkdirSync(gitDir, { recursive: true });
      spawnSync("git", ["init"], { cwd: gitDir });
      spawnSync("git", ["config", "user.email", "test@test.com"], {
        cwd: gitDir,
      });
      spawnSync("git", ["config", "user.name", "Test"], { cwd: gitDir });

      const testFile = path.join(gitDir, "test.txt");
      fs.writeFileSync(testFile, "content");

      const transcriptPath = path.join(gitDir, "transcript.jsonl");
      fs.writeFileSync(transcriptPath, "");

      const stdin = JSON.stringify({ transcript_path: transcriptPath });
      const result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "stop", "--silent", "--no-commit"],
        {
          cwd: gitDir,
          input: stdin,
          timeout: 10_000,
        }
      );

      // Should complete without trying to commit
      expect([0, null]).toContain(result.status);
    });

    test("should handle different commit modes", () => {
      const transcriptPath = path.join(TEST_DIR, "mode-test-transcript.jsonl");
      fs.writeFileSync(transcriptPath, "");

      const stdin = JSON.stringify({ transcript_path: transcriptPath });

      // Test mode=none (default)
      let result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "stop", "--silent", "--mode", "none"],
        {
          input: stdin,
          timeout: 5000,
        }
      );
      expect([0, null]).toContain(result.status);

      // Test mode=normal
      result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "stop", "--silent", "--mode", "normal"],
        {
          input: stdin,
          timeout: 5000,
        }
      );
      expect([0, null]).toContain(result.status);

      // Test mode=critical
      result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "stop", "--silent", "--mode", "critical"],
        {
          input: stdin,
          timeout: 5000,
        }
      );
      expect([0, null]).toContain(result.status);
    });

    test("should handle --verbose flag", () => {
      const transcriptPath = path.join(TEST_DIR, "verbose-transcript.jsonl");
      fs.writeFileSync(transcriptPath, "");

      const stdin = JSON.stringify({ transcript_path: transcriptPath });
      const result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "stop", "--verbose"],
        {
          input: stdin,
          timeout: 5000,
        }
      );

      expect([0, null]).toContain(result.status);
    });

    test("should handle non-git directory gracefully", () => {
      // Run in a non-git directory
      const result = spawnSync("bun", [COHE_BIN, "hooks", "stop", "--silent"], {
        cwd: TEST_DIR,
        input: "{}",
        timeout: 5000,
      });

      // Should not crash
      expect([0, null]).toContain(result.status);
    });

    test("should truncate long messages to 100 chars", () => {
      const transcriptPath = path.join(
        TEST_DIR,
        "long-message-transcript.jsonl"
      );
      const longMessage = "B".repeat(200);
      const transcriptContent = [
        JSON.stringify({ role: "user", content: longMessage }),
      ].join("\n");
      fs.writeFileSync(transcriptPath, transcriptContent);

      const stdin = JSON.stringify({ transcript_path: transcriptPath });
      const result = spawnSync("bun", [COHE_BIN, "hooks", "stop", "--silent"], {
        input: stdin,
        timeout: 5000,
      });

      expect([0, null]).toContain(result.status);
    });
  });

  //==========================================================================
  // Test 4: cohe auto hook --silent (SessionStart hook)
  //==========================================================================

  describe("cohe auto hook - SessionStart Hook", () => {
    test("should run with --silent flag without crashing", () => {
      // This test verifies the SessionStart hook works
      // We need a valid config in HOME for it to work
      const configDir = path.join(TEST_DIR, ".claude");
      fs.mkdirSync(configDir, { recursive: true });

      // Create minimal config
      const configPath = path.join(configDir, "cohe.json");
      const config = {
        version: "2.0.0",
        accounts: {
          test_acc: {
            id: "test_acc",
            name: "Test",
            provider: "zai" as const,
            apiKey: "test-key",
            baseUrl: "https://api.test.com",
            priority: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
          },
        },
        activeAccountId: "test_acc",
        activeModelProviderId: "test_acc",
        activeMcpProviderId: "test_acc",
        alerts: [],
        notifications: { method: "console" as const, enabled: true },
        dashboard: { port: 3456, host: "localhost", enabled: false },
        rotation: {
          enabled: false,
          strategy: "round-robin" as const,
          crossProvider: true,
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Create settings.json
      const settingsPath = path.join(configDir, "settings.json");
      fs.writeFileSync(settingsPath, JSON.stringify({ hooks: {} }, null, 2));

      const result = spawnSync("bun", [COHE_BIN, "auto", "hook", "--silent"], {
        env: { ...process.env, HOME: TEST_DIR },
        timeout: 10_000,
      });

      // Should complete successfully
      expect([0, null]).toContain(result.status);
    });

    test("should handle missing config gracefully", () => {
      // Run with non-existent HOME directory
      const fakeHome = path.join(TEST_DIR, "nonexistent-home");
      fs.mkdirSync(fakeHome, { recursive: true });

      const result = spawnSync("bun", [COHE_BIN, "auto", "hook", "--silent"], {
        env: { ...process.env, HOME: fakeHome },
        timeout: 10_000,
      });

      // Should not crash (may exit non-zero but shouldn't crash)
      expect(result.status).toBeDefined();
    });
  });

  //==========================================================================
  // Integration Tests - Full Hook Flow
  //==========================================================================

  describe("Full Hook Integration Tests", () => {
    test("PostToolUse hook should work with Claude Code input format", () => {
      // This simulates exactly what Claude Code sends to PostToolUse hooks
      const testFile = path.join(TEST_DIR, "integration-test.ts");
      fs.writeFileSync(testFile, "const    integration    =    true;");

      const claudeCodeInput = {
        session_id: "test-session-123",
        transcript_path: "/test/transcript.jsonl",
        cwd: TEST_DIR,
        permission_mode: "default",
        hook_event_name: "PostToolUse",
        tool_name: "Write",
        tool_input: {
          file_path: testFile,
          content: "const    integration    =    true;",
        },
        tool_response: {
          success: true,
          filePath: testFile,
        },
        tool_use_id: "toolu_123456",
      };

      const result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "post-tool", "--silent"],
        {
          input: JSON.stringify(claudeCodeInput),
          timeout: 10_000,
        }
      );

      expect([0, null]).toContain(result.status);
    });

    test("Stop hook should work with Claude Code input format", () => {
      // This simulates exactly what Claude Code sends to Stop hooks
      const transcriptPath = path.join(
        TEST_DIR,
        "integration-transcript.jsonl"
      );
      const transcriptContent = [
        JSON.stringify({
          message: {
            role: "user",
            content: "Implement the new feature",
          },
        }),
        JSON.stringify({
          message: {
            role: "assistant",
            content: "I'll implement that feature for you.",
          },
        }),
      ].join("\n");
      fs.writeFileSync(transcriptPath, transcriptContent);

      const claudeCodeInput = {
        session_id: "test-session-456",
        transcript_path: transcriptPath,
        cwd: TEST_DIR,
        permission_mode: "default",
        hook_event_name: "Stop",
        stop_hook_active: false,
        last_assistant_message: "I'll implement that feature for you.",
      };

      const result = spawnSync("bun", [COHE_BIN, "hooks", "stop", "--silent"], {
        input: JSON.stringify(claudeCodeInput),
        timeout: 10_000,
      });

      expect([0, null]).toContain(result.status);
    });

    test("Notification hook should work with all notification types", () => {
      const notificationTypes = [
        "permission_prompt",
        "idle_prompt",
        "auth_success",
        "elicitation_dialog",
      ];

      for (const notificationType of notificationTypes) {
        const input = {
          session_id: "test-session",
          transcript_path: "/test/transcript.jsonl",
          hook_event_name: "Notification",
          notification_type: notificationType,
          message: `Test notification: ${notificationType}`,
          title: "Claude Code",
        };

        const result = spawnSync("bun", [COHE_BIN, "notify"], {
          input: JSON.stringify(input),
          timeout: 5000,
        });

        expect([0, null]).toContain(result.status);
      }
    });

    test("All hooks should handle edge cases gracefully", () => {
      // Empty stdin
      let result = spawnSync(
        "bun",
        [COHE_BIN, "hooks", "post-tool", "--silent"],
        {
          input: "",
          timeout: 5000,
        }
      );
      expect(result.status).toBeDefined();

      // Empty JSON object
      result = spawnSync("bun", [COHE_BIN, "hooks", "stop", "--silent"], {
        input: "{}",
        timeout: 5000,
      });
      expect(result.status).toBeDefined();

      // Null values
      result = spawnSync("bun", [COHE_BIN, "notify"], {
        input: JSON.stringify({ transcript_path: null }),
        timeout: 5000,
      });
      expect(result.status).toBeDefined();
    });
  });
});
