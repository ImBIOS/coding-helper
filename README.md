# coding-helper - Z.AI & MiniMax API Manager for Claude Code

[![NPM Version](https://img.shields.io/npm/v/%40imbios%2Fcoding-helper?logo=npm)](https://www.npmjs.com/package/@imbios/coding-helper)
[![NPM Downloads](https://img.shields.io/npm/dm/%40imbios%2Fcoding-helper)](https://www.npmjs.com/package/@imbios/coding-helper)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.2.0+-black?logo=bun)](https://bun.sh)

A powerful **CLI tool** and **Claude Code plugin** for seamless management of Z.AI (GLM) and MiniMax API providers. Switch between providers, manage multiple accounts, track usage, rotate API keys, and monitor quotas directly from your terminal.

## What is coding-helper?

coding-helper is a developer utility that enables Claude Code users to switch between Z.AI (GLM) and MiniMax API providers without code changes. It provides a unified CLI interface for:

- **Provider switching** - Toggle between Z.AI and MiniMax instantly
- **Multi-account management** - Configure and switch between multiple API accounts
- **API key rotation** - Automatic rotation with configurable strategies
- **Usage tracking** - Monitor quotas, costs, and consumption in real-time
- **Web dashboard** - Visual interface for monitoring (v2.0+)

## Features

### Provider Management
| Feature | Description |
|---------|-------------|
| **Unified CLI** | Configure and switch providers with simple commands |
| **Interactive Setup** | Guided configuration wizard |
| **Multi-Account Support** | Manage multiple accounts per provider |
| **API Key Rotation** | Round-robin, least-used, or priority strategies |

### Monitoring & Tracking
| Feature | Description |
|---------|-------------|
| **Real-time Usage** | Monitor API consumption instantly |
| **Usage History** | Visualize patterns over last 30 days |
| **Cost Estimation** | Calculate costs for different models |
| **Alert System** | Get notified when approaching limits |

### Developer Experience
| Feature | Description |
|---------|-------------|
| **Shell Completion** | Full tab completion for bash, zsh, fish |
| **Claude Code Plugin** | Native `/imbios:` slash commands |
| **Configuration Profiles** | Switch between configurations |
| **Web Dashboard** | Visual monitoring on port 3456 |

## Quick Start

### Installation

```bash
# Install via npm
npm install -g @imbios/coding-helper

# Or via bun (recommended)
bun install -g @imbios/coding-helper

# Run directly with npx
npx @imbios/coding-helper config
```

### Basic Usage

```bash
# Configure API providers
imbios config

# Switch between providers
imbios switch zai      # Use Z.AI (GLM)
imbios switch minimax  # Use MiniMax

# Check status
imbios status

# View usage
imbios usage
```

### Claude Code Integration

After installation, use slash commands in Claude Code:

```
/imbios:status   - Show current provider and API status
/imbios:usage    - Query usage for active provider
/imbios:switch   - Switch between providers
/imbios:models   - List available models
/imbios:test     - Test API connection
```

## Supported Models

### Z.AI (GLM)

| Model | Tier | Use Case |
|-------|------|----------|
| `GLM-4.7` | Opus | Most capable, complex tasks |
| `GLM-4.5-Air` | Haiku | Fast, efficient responses |
| `GLM-4.5-Air-X` | Sonnet | Balanced performance |

### MiniMax

| Model | Tier | Use Case |
|-------|------|----------|
| `MiniMax-M2.1` | Opus/Sonnet | Latest flagship model |
| `MiniMax-M2` | Haiku | Efficient, cost-effective |

## Commands Reference

### Core Commands

| Command | Description |
|---------|-------------|
| `imbios config` | Interactive provider configuration |
| `imbios switch <provider>` | Switch active provider (zai/minimax) |
| `imbios status` | Show current provider and status |
| `imbios usage` | Query usage statistics |
| `imbios history` | Show usage history (30 days) |
| `imbios cost [model]` | Estimate costs for models |
| `imbios test` | Test API connection |
| `imbios doctor` | Diagnose configuration issues |

### Multi-Account Management (v2.0)

| Command | Description |
|---------|-------------|
| `imbios account list` | List all configured accounts |
| `imbios account add` | Add new API account |
| `imbios account switch <id>` | Switch to specific account |
| `imbios account remove <id>` | Remove an account |

### API Key Rotation (v2.0)

```bash
# Rotate to next available key
imbios rotate zai
imbios rotate minimax
```

### Web Dashboard (v2.0)

```bash
# Start dashboard (default port 3456)
imbios dashboard start

# Custom port
imbios dashboard start 8080

# Check status
imbios dashboard status
```

### Alerts (v2.0)

```bash
# List alerts
imbios alert list

# Add new alert
imbios alert add

# Enable/disable alerts
imbios alert enable <id>
imbios alert disable <id>
```

### Shell Completion

```bash
# Generate completion for your shell
imbios completion bash >> ~/.bashrc
imbios completion zsh >> ~/.zshrc
imbios completion fish > ~/.config/fish/completions/imbios.fish
```

## Environment Variables

When active, coding-helper sets:

```bash
ANTHROPIC_AUTH_TOKEN=<provider_api_key>
ANTHROPIC_BASE_URL=<provider_base_url>
ANTHROPIC_MODEL=<default_model>
API_TIMEOUT_MS=3000000
```

Export for shell integration:

```bash
eval "$(imbios env export)"
```

## Configuration Files

- **Primary**: `~/.claude/imbios.json`
- **Profiles**: `~/.claude/imbios-profiles.json`
- **v2.0 Config**: `~/.claude/imbios-v2.json`

## Installation from Source

```bash
git clone https://github.com/imbios/coding-helper.git
cd coding-helper
bun install
bun run build
./bin/imbios.js config
```

## Requirements

- **Runtime**: Bun 1.2.0+ or Node.js 18+
- **Shell**: Bash, Zsh, or Fish
- **OS**: Linux, macOS, Windows (WSL)

## Technology Stack

- **Language**: TypeScript (ES2022)
- **Runtime**: Bun (primary), Node.js (fallback)
- **CLI Framework**: Inquirer.js
- **Code Quality**: Biome with Ultracite preset

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **NPM Package**: [@imbios/coding-helper](https://www.npmjs.com/package/@imbios/coding-helper)
- **Issues**: [GitHub Issues](https://github.com/imbios/coding-helper/issues)
- **Author**: [ImBIOS](https://github.com/ImBIOS)

## Keywords

anthropic-api, claude-code, glm, minimax, api-client, cli-tool, provider-management, api-key-rotation, usage-tracking, shell-completion, multi-account, developer-tools, ai-assistant, terminal-tool, zai-api, glmmodel, bun, typescript
