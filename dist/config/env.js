import * as fs from "node:fs";
import * as path from "node:path";
export function getEnvPath() {
    return path.join(process.env.HOME || process.env.USERPROFILE || "", ".claude", "imbios.env");
}
export function exportEnvVars(apiKey, baseUrl, model) {
    return `# ImBIOS Environment Variables
# Run: eval "$(imbios env export)"
export ANTHROPIC_AUTH_TOKEN="${apiKey}"
export ANTHROPIC_BASE_URL="${baseUrl}"
export ANTHROPIC_MODEL="${model}"
export API_TIMEOUT_MS=3000000
`;
}
export function writeEnvVars(apiKey, baseUrl, model) {
    const envContent = exportEnvVars(apiKey, baseUrl, model);
    const envPath = getEnvPath();
    const envDir = path.dirname(envPath);
    if (!fs.existsSync(envDir)) {
        fs.mkdirSync(envDir, { recursive: true });
    }
    fs.writeFileSync(envPath, envContent);
}
export function loadEnvVars() {
    const envPath = getEnvPath();
    if (!fs.existsSync(envPath)) {
        return {};
    }
    const content = fs.readFileSync(envPath, "utf-8");
    const vars = {};
    content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
            const [key, ...valueParts] = trimmed.split("=");
            if (key && valueParts.length > 0) {
                vars[key.trim()] = valueParts.join("=").replace(/^["']|["']$/g, "");
            }
        }
    });
    return vars;
}
