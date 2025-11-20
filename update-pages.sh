#!/bin/bash
set -e

DIST_DIR="dist"
PAGES_BRANCH="pages"
MAIN_BRANCH="main"

# Check if dist exists
if [ ! -d "$DIST_DIR" ]; then
  echo "Error: $DIST_DIR does not exist. Please build the project first."
  exit 1
fi

# Save the current branch
CURRENT_BRANCH=$(git branch --show-current)

# Create a temporary directory for operations
TMP_DIR=$(mktemp -d)
cp -r "$DIST_DIR"/* "$TMP_DIR"

# Switch to or create the pages branch
if git show-ref --quiet refs/heads/$PAGES_BRANCH; then
  git checkout $PAGES_BRANCH
else
  git checkout --orphan $PAGES_BRANCH
fi

# Clear the pages branch content (keep .git)
shopt -s extglob
rm -rf !( .git )

# Copy dist contents to the root directory
cp -r "$TMP_DIR"/* .

# Commit and push
git add .
git commit -m "Update pages $(date +'%Y-%m-%d %H:%M:%S')" || true
git push origin $PAGES_BRANCH --force

# Return to the original branch
git checkout $CURRENT_BRANCH

# Delete the temporary directory
rm -rf "$TMP_DIR"

echo "✅ Pages branch has been updated successfully. Main branch remains safe."
