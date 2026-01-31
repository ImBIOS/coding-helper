const ZAI_MODEL_MAPPING = {
    opus: "GLM-4.7",
    sonnet: "GLM-4.7",
    haiku: "GLM-4.5-Air",
};
export class ZAIProvider {
    name = "zai";
    displayName = "Z.AI (GLM)";
    getConfig() {
        return {
            apiKey: process.env.ZAI_API_KEY || "",
            baseUrl: process.env.ZAI_BASE_URL || "https://api.z.ai/api/anthropic",
            defaultModel: "GLM-4.7",
            models: ["GLM-4.7", "GLM-4.5-Air", "GLM-4.5-Air-X"],
        };
    }
    getModels() {
        return ["GLM-4.7", "GLM-4.5-Air", "GLM-4.5-Air-X"];
    }
    getDefaultModel(type) {
        return ZAI_MODEL_MAPPING[type];
    }
    getModelMapping() {
        return ZAI_MODEL_MAPPING;
    }
    async testConnection() {
        const config = this.getConfig();
        if (!config.apiKey) {
            return false;
        }
        try {
            const response = await fetch(`${config.baseUrl}/messages`, {
                method: "HEAD",
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    "Content-Type": "application/json",
                },
            });
            return response.ok || response.status === 405;
        }
        catch {
            return false;
        }
    }
    async getUsage() {
        const config = this.getConfig();
        if (!config.apiKey) {
            return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
        }
        try {
            const response = await fetch(`${config.baseUrl}/credits`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
            }
            const data = (await response.json());
            const used = data.used || 0;
            const limit = data.limit || 0;
            const remaining = Math.max(0, limit - used);
            return {
                used,
                limit,
                remaining,
                percentUsed: limit > 0 ? (used / limit) * 100 : 0,
            };
        }
        catch {
            return { used: 0, limit: 0, remaining: 0, percentUsed: 0 };
        }
    }
}
export const zaiProvider = new ZAIProvider();
