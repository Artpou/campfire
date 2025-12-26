#!/bin/bash
set -e

echo "🧹 Nettoyage des dépendances inutiles..."

# Tests
echo "❌ Suppression de l'écosystème de tests..."
cd apps/web
bun remove vitest @vitest/expect @vitest/runner @vitest/snapshot @vitest/spy @vitest/utils \
  @testing-library/dom @testing-library/react jsdom \
  @types/chai @types/deep-eql 2>/dev/null || true

# MSW
echo "❌ Suppression de MSW..."
bun remove msw 2>/dev/null || true

# Tools non utilisés
echo "❌ Suppression des outils non configurés..."
bun remove rollup-plugin-visualizer web-vitals 2>/dev/null || true

# Shadcn CLI
echo "❌ Suppression du CLI shadcn..."
bun remove shadcn 2>/dev/null || true

# TW Animate (optionnel)
# bun remove tw-animate-css 2>/dev/null || true

cd ../..

echo "✅ Nettoyage terminé!"
echo ""
echo "📊 Nouvelle taille:"
du -sh node_modules