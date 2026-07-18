#!/bin/bash

# ==============================================================================
# Site Maintenance Script (Claude Code)
# Purpose: Scans the project for new HTML pages and uses the Claude Code agent
#          to update the index listings automatically.
# Usage:   ./scripts/update_site_claude.sh [model]
#          model — optional, defaults to "sonnet" (e.g. opus, sonnet, haiku)
# ==============================================================================

set -euo pipefail

# Ensure we are in the project root
if [ ! -d "web" ]; then
    echo "❌ Error: Please run this script from the project root."
    echo "   Usage: ./scripts/update_site_claude.sh"
    exit 1
fi

# Check if Claude Code CLI is available
if ! command -v claude &> /dev/null; then
    echo "❌ Error: 'claude' CLI command not found in your PATH."
    echo "   Install: https://docs.claude.com/claude-code"
    exit 1
fi

MODEL="${1:-sonnet}"

echo "🤖 detailed scanning of the site structure..."

# The prompt to send to the Claude Code agent
PROMPT="
I need to update the website's index pages to reflect the current file structure.

Please perform the following maintenance steps:

1.  **Scan the 'web/' Directory**:
    -   Recursively identify all functional HTML files (tools, calculators, presentations).
    -   Ignore 'index.html' files during the tool discovery phase.

2.  **Update Sub-Category Indexes** (e.g., web/math/index.html, web/money/index.html):
    -   For each subdirectory in 'web/':
        -   If an 'index.html' is missing, create it using the style of 'web/math/index.html' (Slate theme, Tailwind).
        -   If it exists, read it and add cards for any HTML files in that folder that are not yet linked.
        -   Ensure the design (cards, icons, layout) matches the existing theme.

3.  **Update the Root 'index.html'**:
    -   **Categories**: Ensure all sub-folders in 'web/' have a corresponding category card.
    -   **All Tools List**: Re-generate or update the 'All Tools' grid to include EVERY tool found in the sub-directories.
    -   **Keywords**: Add relevant data-keywords to new items for the search functionality.
    -   **Timestamp**: The root index sets the 'Updated' date via JavaScript automatically — do not hardcode it.

Use the 'Glob'/'Grep' tools to find the files, then 'Read' and 'Write'/'Edit' to update the indexes.
Only modify index.html files; never alter the content HTML pages themselves.
"

# Execute — headless print mode with edit permissions scoped to file tools.
echo "🚀 Sending instructions to Claude Code (model: ${MODEL})..."
claude -p "$PROMPT" \
    --model "$MODEL" \
    --permission-mode acceptEdits \
    --allowedTools "Glob" "Grep" "Read" "Write" "Edit"
echo "✅ Request sent."
