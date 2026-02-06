#!/usr/bin/env bash
#===============================================================================
# Global Multi-Language Code Formatter
# Primary: Biome (JS/TS/JSX/JSON/CSS/GraphQL)
# Fallbacks: Language-specific formatters for other languages
#===============================================================================

set -euo pipefail

# Colors for output (disabled if not a tty)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

log_info() {
    echo -e "${BLUE}[info]${NC}" "$@"
}

log_success() {
    echo -e "${GREEN}[ok]${NC}" "$@"
}

log_warn() {
    echo -e "${YELLOW}[warn]${NC}" "$@" >&2
}

log_error() {
    echo -e "${RED}[error]${NC}" "$@" >&2
}

has_command() {
    command -v "$1" >/dev/null 2>&1
}

format_biome() {
    local file="$1"
    if has_command biome; then
        biome format --write "$file" 2>/dev/null
        return 0
    fi
    return 1
}

format_json() {
    local file="$1"
    if has_command jq; then
        jq . "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        return 0
    fi
    return 1
}

format_go() {
    local file="$1"
    if has_command gofmt; then
        gofmt -w "$file"
        return 0
    fi
    return 1
}

format_rust() {
    local file="$1"
    if has_command rustfmt; then
        rustfmt "$file"
        return 0
    fi
    return 1
}

format_python() {
    local file="$1"
    if has_command black; then
        black "$file" 2>/dev/null
    fi
    if has_command isort; then
        isort --quiet "$file" 2>/dev/null
    fi
    return 0
}

format_c_cpp() {
    local file="$1"
    if has_command clang-format; then
        clang-format -i "$file"
        return 0
    fi
    return 1
}

format_shell() {
    local file="$1"
    if has_command shfmt; then
        shfmt -w -i 2 "$file"
        return 0
    fi
    return 1
}

format_file() {
    local file="$1"

    if [ ! -f "$file" ]; then
        return 1
    fi

    local filename
    filename=$(basename "$file")
    if [[ "$filename" == .* ]] && [ "$filename" != ".Biome" ]; then
        return 0
    fi

    local ext="${filename##*.}"
    local base="${filename%.*}"

    if [ "$ext" = "$filename" ]; then
        return 0
    fi

    ext=$(echo "$ext" | tr '[:upper:]' '[:lower:]')

    case "$ext" in
        js | mjs | cjs | ts | mts | cts | jsx | tsx | json | jsonc | json5 | css | scss | sass | less | gql | graphql)
            if ! format_biome "$file"; then
                if [[ "$ext" == json* ]]; then
                    format_json "$file" || true
                fi
            fi
            ;;
        html | htm | xhtml)
            if has_command prettier; then
                prettier --write "$file" 2>/dev/null || true
            fi
            ;;
        go)
            format_go "$file"
            ;;
        rs)
            format_rust "$file"
            ;;
        py | pyi)
            format_python "$file"
            ;;
        java | kt | kts | scala)
            if has_command google-java-format; then
                google-java-format -replace "$file" 2>/dev/null || true
            fi
            ;;
        c | cpp | cxx | cc | h | hpp | hxx | m | mm)
            format_c_cpp "$file"
            ;;
        sh | bash | zsh | fish)
            format_shell "$file" || true
            ;;
        yaml | yml)
            if has_command yq; then
                yq eval -i "$file" 2>/dev/null || true
            fi
            ;;
        toml)
            if has_command taplo; then
                taplo fmt "$file" 2>/dev/null || true
            fi
            ;;
        md | markdown)
            if has_command prettier; then
                prettier --write "$file" 2>/dev/null || true
            fi
            ;;
        *)
            return 1
            ;;
    esac
}

extract_file_path() {
    local input="$1"
    python3 -c "
import sys, json
data = json.load(open('$input'))
for key in ['file_path', 'path', 'file', 'destination', 'target']:
    if key in data:
        print(data[key])
        sys.exit(0)
if 'tool_input' in data:
    for key in ['file_path', 'path', 'file', 'destination', 'target']:
        if key in data['tool_input']:
            print(data['tool_input'][key])
            sys.exit(0)
" 2>/dev/null || echo ""
}

main() {
    local files=()
    local format_all=false
    local verbose=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --all | -a)
                format_all=true
                shift
                ;;
            --verbose | -v)
                verbose=true
                shift
                ;;
            --help | -h)
                echo "Usage: $0 [--all] [--verbose] [files...]"
                echo ""
                echo "Options:"
                echo "  --all, -a     Format all files in current directory"
                echo "  --verbose, -v  Show detailed output"
                echo "  --help, -h     Show this help message"
                exit 0
                ;;
            -*)
                shift
                ;;
            *)
                files+=("$1")
                shift
                ;;
        esac
    done

    if [ ${#files[@]} -eq 0 ] && [ "$format_all" = false ]; then
        if [ -t 0 ]; then
            echo "Usage: $0 [--all] [files...]"
            exit 0
        else
            local tmp_file
            tmp_file=$(mktemp)
            cat > "$tmp_file"
            local file_path
            file_path=$(extract_file_path "$tmp_file")
            rm -f "$tmp_file"
            if [ -n "$file_path" ] && [ -f "$file_path" ]; then
                files=("$file_path")
            else
                log_error "Could not determine file path from input"
                exit 1
            fi
        fi
    fi

    if [ "$format_all" = true ]; then
        while IFS= read -r -d '' file; do
            files+=("$file")
        done < <(find . -maxdepth 1 -type f ! -name '.*' -print0 2>/dev/null || true)
    fi

    local formatted_count=0
    local error_count=0

    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            if [ "$verbose" = true ]; then
                log_info "Formatting: $file"
            fi
            if format_file "$file"; then
                ((formatted_count++)) || true
            else
                ((error_count++)) || true
            fi
        fi
    done

    if [ "$verbose" = true ] || [ $error_count -gt 0 ]; then
        if [ $formatted_count -gt 0 ]; then
            log_success "Formatted $formatted_count file(s)"
        fi
        if [ $error_count -gt 0 ]; then
            log_error "$error_count file(s) could not be formatted"
        fi
    fi

    exit $error_count
}

main "$@"
