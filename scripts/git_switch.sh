#!/bin/bash
#
# Switches this repository between the personal and the company GitHub account.
#
# It changes three things:
#   1. the local git user.name / user.email (who the commits are attributed to)
#   2. the active GitHub CLI account (who git authenticates as when pushing)
#   3. the remote URL, kept free of any embedded password or token
#
# No credentials are stored in this file. Authentication is handled by the
# GitHub CLI. If an account is missing, run: gh auth login

set -euo pipefail

# --- Profiles (edit these as needed) ----------------------------------------
PERSONAL_NAME="Ramazan Kizilkaya"
PERSONAL_EMAIL="kizilkayaramazan@gmail.com"
PERSONAL_GH_USER="ramazankizilkaya"

COMPANY_NAME="Ramazan Kizilkaya"
COMPANY_EMAIL="ramazan.kizilkaya@pointr.tech"
COMPANY_GH_USER="ramazankizilkaya-pointr"

# The GitHub repository this working copy belongs to, as owner/repo.
REPO_SLUG="ramazankizilkaya/perfume-comparer"
# ----------------------------------------------------------------------------

REMOTE_URL="https://github.com/${REPO_SLUG}.git"

if ! command -v gh >/dev/null 2>&1; then
  echo "❌ The GitHub CLI (gh) is not installed, so accounts cannot be switched."
  echo "   Install it with: brew install gh"
  exit 1
fi

# Prints the GitHub account git currently authenticates as, or a placeholder.
active_gh_user() {
  gh auth status --active 2>/dev/null | sed -n 's/.*account \([^ ]*\).*/\1/p' | head -1 || true
}

# Switches the GitHub CLI to the given account and makes git reuse that login.
apply_profile() {
  local label="$1" name="$2" email="$3" gh_user="$4"

  git config --local user.name "$name"
  git config --local user.email "$email"
  git remote set-url origin "$REMOTE_URL"

  if gh auth switch --hostname github.com --user "$gh_user" >/dev/null 2>&1; then
    gh auth setup-git --hostname github.com >/dev/null 2>&1 || true
    echo "✅ Switched to ${label} (${gh_user})."
  else
    echo "⚠️  Switched the commit identity to ${label}, but the GitHub CLI has no"
    echo "    login for '${gh_user}'. Log in once, then run this script again:"
    echo "    gh auth login --hostname github.com"
  fi
}

CURRENT_NAME=$(git config user.name || echo "not set")
CURRENT_EMAIL=$(git config user.email || echo "not set")
CURRENT_URL=$(git remote get-url origin 2>/dev/null || echo "no remote origin set")
CURRENT_GH_USER=$(active_gh_user)

echo "=== Git Account Status ==="
echo "Name:      $CURRENT_NAME"
echo "Email:     $CURRENT_EMAIL"
# Never print an embedded password or token, in case an old URL still has one.
echo "Remote:    $(echo "$CURRENT_URL" | sed -E 's#://[^/@]+@#://xxxx@#')"
echo "GitHub CLI: ${CURRENT_GH_USER:-not logged in}"
echo "=========================="

if [ "$CURRENT_EMAIL" = "$PERSONAL_EMAIL" ]; then
  read -r -p "Currently on Personal. Switch to Company? (y/n): " choice
  if [[ "$choice" =~ ^[Yy]$ ]]; then
    apply_profile "Company" "$COMPANY_NAME" "$COMPANY_EMAIL" "$COMPANY_GH_USER"
  else
    echo "No changes made."
  fi
elif [ "$CURRENT_EMAIL" = "$COMPANY_EMAIL" ]; then
  read -r -p "Currently on Company. Switch to Personal? (y/n): " choice
  if [[ "$choice" =~ ^[Yy]$ ]]; then
    apply_profile "Personal" "$PERSONAL_NAME" "$PERSONAL_EMAIL" "$PERSONAL_GH_USER"
  else
    echo "No changes made."
  fi
else
  echo "Currently on an unknown profile."
  read -r -p "Switch to Personal (p) or Company (c)? (p/c): " choice
  case "$choice" in
    p) apply_profile "Personal" "$PERSONAL_NAME" "$PERSONAL_EMAIL" "$PERSONAL_GH_USER" ;;
    c) apply_profile "Company" "$COMPANY_NAME" "$COMPANY_EMAIL" "$COMPANY_GH_USER" ;;
    *) echo "No changes made." ;;
  esac
fi

echo ""
echo "New settings:"
echo "Name:      $(git config user.name)"
echo "Email:     $(git config user.email)"
NEW_URL=$(git remote get-url origin 2>/dev/null || echo "no remote origin set")
echo "Remote:    $(echo "$NEW_URL" | sed -E 's#://[^/@]+@#://xxxx@#')"
echo "GitHub CLI: $(active_gh_user)"
