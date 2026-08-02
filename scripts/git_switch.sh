#!/bin/bash

# Define your profiles (Edit these as needed)
PERSONAL_NAME="Ramazan Kizilkaya"
PERSONAL_EMAIL="kizilkayaramazan@gmail.com"
PERSONAL_GH_USER="ramazankizilkaya"
# Base64 encoded password/token (decoded at runtime)
PERSONAL_GH_PWD_B64="Z2hwXzFLV1JsN3ZkMHNCY1JpbmFxY2UzS3pBWDFIdERkdDRUcXZ3Uw=="

# Replace with your actual company credentials
COMPANY_NAME="Ramazan Kizilkaya"
COMPANY_EMAIL="ramazan.kizilkaya@pointr.tech"
COMPANY_GH_USER="ramazan-pointr" # EDIT THIS to your company GitHub username if different
COMPANY_GH_PWD_B64="Z2hwX2tpVEtJQmpuNW90QmZTUWt5ZlowQmFUelFsWEo3cDNBQTgwWA=="

# Decode passwords at runtime
PERSONAL_GH_PWD=$(echo "$PERSONAL_GH_PWD_B64" | base64 -d)
COMPANY_GH_PWD=$(echo "$COMPANY_GH_PWD_B64" | base64 -d)

CURRENT_NAME=$(git config user.name)
CURRENT_EMAIL=$(git config user.email)
CURRENT_URL=$(git remote get-url origin 2>/dev/null || echo "No remote origin set")

echo "=== Git Account Status ==="
echo "Name:   $CURRENT_NAME"
echo "Email:  $CURRENT_EMAIL"
# Hide the password/token in the output for security
SANITIZED_URL=$(echo "$CURRENT_URL" | sed -E 's/:\/\/([^:]+):([^@]+)@/:\/\/xxxx:xxxx@/')
echo "Remote: $SANITIZED_URL"
echo "=========================="

# Check what the current profile is and prompt to switch to the other
if [ "$CURRENT_EMAIL" = "$PERSONAL_EMAIL" ]; then
  read -p "Currently on Personal. Switch to Company? (y/n): " choice
  if [[ "$choice" =~ ^[Yy]$ ]]; then
    git config --local user.name "$COMPANY_NAME"
    git config --local user.email "$COMPANY_EMAIL"
    git remote set-url origin "https://${COMPANY_GH_USER}:${COMPANY_GH_PWD}@github.com/ramazankizilkaya/excel-to-graph.git"
    echo "✅ Switched to Company."
  else
    echo "No changes made."
  fi
elif [ "$CURRENT_EMAIL" = "$COMPANY_EMAIL" ]; then
  read -p "Currently on Company. Switch to Personal? (y/n): " choice
  if [[ "$choice" =~ ^[Yy]$ ]]; then
    git config --local user.name "$PERSONAL_NAME"
    git config --local user.email "$PERSONAL_EMAIL"
    git remote set-url origin "https://${PERSONAL_GH_USER}:${PERSONAL_GH_PWD}@github.com/ramazankizilkaya/excel-to-graph.git"
    echo "✅ Switched to Personal."
  else
    echo "No changes made."
  fi
else
  echo "Currently on an unknown profile."
  read -p "Switch to Personal (p) or Company (c)? (p/c): " choice
  if [ "$choice" = "p" ]; then
    git config --local user.name "$PERSONAL_NAME"
    git config --local user.email "$PERSONAL_EMAIL"
    git remote set-url origin "https://${PERSONAL_GH_USER}:${PERSONAL_GH_PWD}@github.com/ramazankizilkaya/excel-to-graph.git"
    echo "✅ Switched to Personal."
  elif [ "$choice" = "c" ]; then
    git config --local user.name "$COMPANY_NAME"
    git config --local user.email "$COMPANY_EMAIL"
    git remote set-url origin "https://${COMPANY_GH_USER}:${COMPANY_GH_PWD}@github.com/ramazankizilkaya/excel-to-graph.git"
    echo "✅ Switched to Company."
  else
    echo "No changes made."
  fi
fi

echo ""
echo "New settings:"
echo "Name:   $(git config user.name)"
echo "Email:  $(git config user.email)"
NEW_URL=$(git remote get-url origin 2>/dev/null || echo 'No remote origin set')
SANITIZED_NEW_URL=$(echo "$NEW_URL" | sed -E 's/:\/\/([^:]+):([^@]+)@/:\/\/xxxx:xxxx@/')
echo "Remote: $SANITIZED_NEW_URL"
