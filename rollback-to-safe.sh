#!/bin/bash

# ============================================================
# ROLLBACK SCRIPT - Restore to Stable Safe State
# ============================================================
# 
# Usage: bash rollback-to-safe.sh
#
# This script safely rolls back the system to the last known
# stable and tested version (650e02a)
#
# ============================================================

echo "================================================"
echo "  SYSTEM ROLLBACK TO STABLE STATE"
echo "  v1.0-stable-safe (650e02a)"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Step 1: Check git status
echo -e "${YELLOW}[Step 1/6] Checking git status...${NC}"
if ! git status > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not a git repository or git not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Git repository found${NC}"
echo ""

# Step 2: Show current commit
echo -e "${YELLOW}[Step 2/6] Current commit:${NC}"
currentCommit=$(git log --oneline -1)
echo "$currentCommit"
echo ""

# Step 3: Confirmation
echo -e "${YELLOW}[Step 3/6] Ready to rollback?${NC}"
echo "This will reset to commit: 650e02a (v1.0-stable-safe)"
echo ""
read -p "Type 'ROLLBACK' to confirm (or press Enter to cancel): " confirm
if [ "$confirm" != "ROLLBACK" ]; then
    echo -e "${RED}❌ Rollback cancelled${NC}"
    exit 0
fi
echo ""

# Step 4: Stash any uncommitted changes
echo -e "${YELLOW}[Step 4/6] Stashing uncommitted changes...${NC}"
git stash
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Stash warning (continuing)${NC}"
fi
echo -e "${GREEN}✅ Stashed${NC}"
echo ""

# Step 5: Reset to safe commit
echo -e "${YELLOW}[Step 5/6] Resetting to safe commit 650e02a...${NC}"
git reset --hard 650e02a
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error during reset${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Reset successful${NC}"
echo ""

# Step 6: Force push to origin
echo -e "${YELLOW}[Step 6/6] Pushing changes to remote...${NC}"
echo -e "${YELLOW}⚠️  This will force push and overwrite remote history${NC}"
read -p "Type 'PUSH' to confirm force push (or press Enter to skip): " pushConfirm
if [ "$pushConfirm" = "PUSH" ]; then
    git push --force
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Force push successful${NC}"
    else
        echo -e "${YELLOW}⚠️  Force push encountered issues (check manually)${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  Skipped force push (run: git push --force)${NC}"
fi
echo ""

# Final status
echo "================================================"
echo -e "${GREEN}  ✅ ROLLBACK COMPLETE${NC}"
echo "================================================"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "2. Restart application: npm restart"
echo "3. Test all core functionality"
echo "4. Monitor logs for any errors"
echo ""

# Show new commit
echo -e "${YELLOW}New commit (after rollback):${NC}"
newCommit=$(git log --oneline -1)
echo "$newCommit"
echo ""

echo -e "${CYAN}For more info, read: ROLLBACK_PROCEDURE.md${NC}"
