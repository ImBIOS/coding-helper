import { describe, expect, it, vi } from "bun:test";
import { debug, divider, error, info, log, section, success, table, warning, } from "./logger";
describe("logger", () => {
    describe("log", () => {
        it("should log message with default info level", () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
            log("test message");
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
        it("should log message with specified level", () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
            log("test message", "error");
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
        it("should include timestamp in log output", () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
            log("test message");
            const output = consoleSpy.mock.calls[0][0];
            expect(output).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
            consoleSpy.mockRestore();
        });
    });
    describe("log levels", () => {
        it("should call success with success level", () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
            success("success message");
            const output = consoleSpy.mock.calls[0][0];
            expect(output).toContain("✓");
            consoleSpy.mockRestore();
        });
        it("should call info with info level", () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
            info("info message");
            const output = consoleSpy.mock.calls[0][0];
            expect(output).toContain("ℹ");
            consoleSpy.mockRestore();
        });
        it("should call warning with warning level", () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
            warning("warning message");
            const output = consoleSpy.mock.calls[0][0];
            expect(output).toContain("⚠");
            consoleSpy.mockRestore();
        });
        it("should call error with error level", () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
            error("error message");
            const output = consoleSpy.mock.calls[0][0];
            expect(output).toContain("✗");
            consoleSpy.mockRestore();
        });
        it("should call debug with debug level", () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
            debug("debug message");
            const output = consoleSpy.mock.calls[0][0];
            expect(output).toContain("↪");
            consoleSpy.mockRestore();
        });
    });
    describe("table", () => {
        it("should format data as table", () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
            table({ key1: "value1", key2: "value2" });
            expect(consoleSpy).toHaveBeenCalled();
            const output = consoleSpy.mock.calls[0][0];
            expect(output).toContain("→");
            consoleSpy.mockRestore();
        });
    });
    describe("section", () => {
        it("should print section header", () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
            section("Test Section");
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
    describe("divider", () => {
        it("should print empty line", () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
            divider();
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
