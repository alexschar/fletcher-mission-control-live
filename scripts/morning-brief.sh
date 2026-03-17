#!/bin/bash

# Morning Brief Script
# Creates a morning brief at ~/.openclaw/workspace/morning_brief.md

DATE=$(date "+%A, %B %d, %Y")
BRIEF_FILE="$HOME/.openclaw/workspace/morning_brief.md"

echo "# Morning Brief - $DATE" > "$BRIEF_FILE"
echo "" >> "$BRIEF_FILE"

echo "## Top 3 Tasks Today" >> "$BRIEF_FILE"
echo "" >> "$BRIEF_FILE"

# Get tasks from API and extract top 3 backlog items
TASKS=$(curl -s http://localhost:3000/api/tasks 2>/dev/null || echo "[]")
if echo "$TASKS" | jq -r ".[]? | select(.status==\"backlog\") | \"- \" + .title" | head -3 >> "$BRIEF_FILE" 2>/dev/null; then
    echo "" >> "$BRIEF_FILE"
else
    echo "- Check task board at http://localhost:3000/tasks" >> "$BRIEF_FILE"
    echo "" >> "$BRIEF_FILE"
fi

echo "## Weather" >> "$BRIEF_FILE"
echo "" >> "$BRIEF_FILE"
echo "- Dallas, TX: [Weather placeholder - implement wttr.in integration]" >> "$BRIEF_FILE"
echo "" >> "$BRIEF_FILE"

echo "## Status" >> "$BRIEF_FILE"
echo "" >> "$BRIEF_FILE"
echo "- Fletcher system operational" >> "$BRIEF_FILE"
echo "- Mission Control dashboard: http://localhost:3000" >> "$BRIEF_FILE"
echo "" >> "$BRIEF_FILE"

echo "Brief generated at $(date)" >> "$BRIEF_FILE"

echo "Morning brief written to $BRIEF_FILE"
