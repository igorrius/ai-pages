#!/bin/bash

# ==============================================================================
# Site Maintenance Script
# Purpose: Scans the project for new HTML pages and uses the Gemini Agent
#          to update the index listings automatically.
# Usage:   ./scripts/update_site.sh
# ==============================================================================

# Ensure we are in the project root
if [ ! -d "web" ]; then
    echo "❌ Error: Please run this script from the project root."
    echo "   Usage: ./scripts/update_site.sh"
    exit 1
fi

# Check if Gemini CLI is available
if ! command -v gemini &> /dev/null; then
    echo "❌ Error: 'gemini' CLI command not found in your PATH."
    exit 1
fi

echo "🤖 detailed scanning of the site structure..."

# The prompt to send to the Gemini Agent
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
    -   **Timestamp**: Update the 'Updated' date in the header/footer.

Use the 'codebase_investigator' or 'glob' tools to find the files, then 'read_file' and 'write_file'/'replace' to update the indexes.
"

# Execute
echo "🚀 Sending instructions to Gemini..."
gemini "$PROMPT"
echo "✅ Request sent."
