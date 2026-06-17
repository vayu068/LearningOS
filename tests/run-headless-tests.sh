#!/bin/bash
# Run headless E2E tests against the mock server
# Usage: ./run-headless-tests.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== LearningOS Headless E2E Test Runner ==="
echo ""

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install
fi

# Ensure Playwright browsers are installed
echo "Ensuring Playwright browsers are installed..."
npx playwright install chromium 2>/dev/null || true

# Create output directory
mkdir -p headless-results

echo ""
echo "Running headless E2E tests..."
echo ""

# Run tests with the headless config and capture output
npx playwright test --config=playwright-headless.config.ts 2>&1 | tee headless-results/test-output.txt

EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "=== Test run complete ==="
echo "Results saved to: headless-results/"
echo "  - test-output.txt (console output)"
echo "  - results.json (structured results)"
echo "  - html-report/ (HTML report)"
echo ""

exit $EXIT_CODE
