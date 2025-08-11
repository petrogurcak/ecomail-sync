#!/bin/bash

# Skript pro přípravu souborů pro Claude.ai projekty

echo "📚 Příprava knowledge base pro Claude.ai"
echo "======================================="

# Vytvoř složku pro export
mkdir -p claude-export

# Zkopíruj summary jako hlavní přehled
cp knowledge-base/summary.md claude-export/00-prehled-kampani.md

# Zkopíruj posledních 10 kampaní (nejnovější)
echo "📄 Kopíruji posledních 10 kampaní..."
ls -t knowledge-base/campaigns/*.md | head -10 | while read file; do
    basename_file=$(basename "$file")
    cp "$file" "claude-export/$basename_file"
done

# Vytvoř index soubor
echo "📋 Vytvářím index soubor..."
cat > claude-export/00-index.md << EOF
# 📧 Ecomail Kampaně - Knowledge Base

## 📊 Přehled
Tento repozitář obsahuje všechny historické email kampaně z Ecomailu ve formátu Markdown.

## 🎯 Účel
- **Kontext pro AI**: Claude může analyzovat historické kampaně
- **Style guide**: Zjistit jaký tone of voice používáme  
- **Trendy**: Sledovat vývoj témat a přístupů
- **Inspirace**: Najít úspěšné formulace a struktury

## 📁 Struktura
- \`00-prehled-kampani.md\` - Souhrnný report všech kampaní
- \`YYYY-MM-DD-nazev.md\` - Jednotlivé kampaně seřazené podle data

## 🏷️ Metadata v každé kampani
- **ID, Datum odeslání, Předmět** - Základní info
- **Typ, Příjemců, Odesílatel** - Technické detaily  
- **Obsah kampaně** - HTML konvertovaný na Markdown

## 💡 Jak použít s Claude
1. Nahraj tyto soubory do Claude Project Knowledge
2. Ptej se: "Na základě historických kampaní vytvoř novou..."
3. Požádej o analýzu: "Jaké jsou trendy v předmětech?"
4. Inspiruj se: "Najdi podobné kampaně k tématu XY"

---
*Automaticky generováno z Ecomail API*
EOF

echo "✅ Soubory připraveny v složce claude-export/"
echo "📤 Můžeš nahrát do Claude.ai Project Knowledge:"
ls claude-export/ | head -5
echo "... a $(ls claude-export/ | wc -l) dalších souborů"

echo ""
echo "🔗 Online přístup:"
echo "   GitHub: https://github.com/petrogurcak/ecomail-sync/tree/develop/knowledge-base"
echo "   Přehled: https://github.com/petrogurcak/ecomail-sync/blob/develop/knowledge-base/summary.md"