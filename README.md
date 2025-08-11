# 📧 Ecomail Sync Tool

Nástroj pro automatickou synchronizaci email kampaní z Ecomailu do markdown souborů pro Claude knowledge base.

## 🎯 Funkcionalita

- **Automatická synchronizace** - Denní synchronizace přes GitHub Actions
- **Inkrementální updates** - Stahuje pouze nové kampaně
- **Markdown konverze** - Převádí HTML kampaně na čitelný markdown
- **State management** - Pamatuje si stav synchronizace
- **Commit integrace** - Automaticky commituje změny do repozitáře

## 🏗️ Struktura projektu

```
ecomail-sync/
├── .github/workflows/sync-ecomail.yml  # GitHub Actions workflow
├── src/
│   ├── index.ts                        # Entry point
│   ├── services/ecomail-client.ts      # Ecomail API client
│   ├── converters/campaign-to-markdown.ts # HTML → Markdown konverze
│   ├── sync/sync-manager.ts            # Sync logika a state
│   └── types/index.ts                  # TypeScript typy
├── knowledge-base/                     # Output složka
│   ├── campaigns/                      # Markdown soubory kampaní
│   └── summary.md                      # Souhrnný report
├── state/sync-state.json              # Stav synchronizace
└── .env                               # API konfigurace
```

## 🚀 Rychlý start

### 1. Klonování a instalace

\`\`\`bash
git clone <repository-url>
cd ecomail-sync
npm install
\`\`\`

### 2. Konfigurace

Zkopírujte \`.env.example\` na \`.env\` a nastavte:

\`\`\`bash
cp .env.example .env
\`\`\`

Upravte \`.env\`:
\`\`\`env
ECOMAIL_API_KEY=your_api_key_here
DEBUG=false
\`\`\`

### 3. První spuštění

\`\`\`bash
# Build TypeScript
npm run build

# Spustit synchronizaci
npm run sync

# Nebo s debug informacemi
DEBUG=true npm run sync
\`\`\`

## 📖 API klíč z Ecomailu

1. Přihlaste se do [Ecomail](https://app.ecomail.cz)
2. Jděte do **Nastavení** → **API**
3. Zkopírujte váš API klíč
4. Vložte ho do \`.env\` souboru

## 🔧 Příkazy

\`\`\`bash
npm run build      # Kompilace TypeScript
npm run sync       # Spuštění synchronizace
npm run dev        # Watch mode pro vývoj
npm run typecheck  # Kontrola TypeScript typů
\`\`\`

### Parametry synchronizace

\`\`\`bash
# Vynutit plnou synchronizaci (ignorovat stav)
npm run sync -- --force

# S debug informacemi
DEBUG=true npm run sync

# Kombinace obou
DEBUG=true npm run sync -- --force
\`\`\`

## 🤖 GitHub Actions

### Automatická synchronizace

Workflow se spouští:
- **Denně ve 2:00 UTC** (3:00/4:00 CET)
- **Manuálně** přes GitHub Actions UI

### Secrets konfigurace

V GitHub repozitáři nastavte:
- \`ECOMAIL_API_KEY\` - váš Ecomail API klíč

### Manuální spuštění

1. Jděte na **Actions** tab
2. Vyberte workflow "📧 Sync Ecomail Campaigns"
3. Klikněte **Run workflow**
4. Volitelně zapněte:
   - **Force full sync** - plná synchronizace
   - **Debug mode** - detailní logy

## 📄 Výstupy

### Markdown soubory kampaní

Ukládají se do \`knowledge-base/campaigns/\` ve formátu:
\`\`\`
YYYY-MM-DD-nazev-kampane.md
\`\`\`

Struktura markdown souboru:
\`\`\`markdown
# Název kampaně

**ID:** campaign_123
**Datum odeslání:** 15. 12. 2024 10:30
**Předmět:** Vánoční akce - 50% sleva
**Preheader:** Jen do konce roku...

## Obsah kampaně

[Konvertovaný HTML obsah]

## Metadata

- **Typ:** newsletter
- **Příjemců:** 1,250
- **Tagy:** vanoce, akce
\`\`\`

### Souhrnný report

\`knowledge-base/summary.md\` obsahuje:
- Datum poslední synchronizace
- Statistiky celkové synchronizace
- Seznam nově synchronizovaných kampaní

### Stav synchronizace

\`state/sync-state.json\` obsahuje:
\`\`\`json
{
  "lastSyncDate": "2024-12-15T10:30:00.000Z",
  "lastCampaignId": "campaign_123",
  "syncedCampaignIds": ["campaign_123", "campaign_122"],
  "totalSyncedCount": 145
}
\`\`\`

## 🐛 Troubleshooting

### Časté problémy

**❌ "ECOMAIL_API_KEY není nastaven"**
- Zkontrolujte \`.env\` soubor
- API klíč musí být platný Ecomail API klíč

**❌ "Nepodařilo se připojit k Ecomail API"**
- Zkontrolujte internetové připojení
- API klíč může být neplatný
- Ecomail API může být dočasně nedostupný

**❌ "Rate limit exceeded"**
- Počkejte chvilku před dalším pokusem
- Nástroj automaticky respektuje rate limity

**❌ GitHub Actions selhávají**
- Zkontrolujte, že \`ECOMAIL_API_KEY\` je nastaven v Secrets
- Možná jsou problémy s přístupovými právy

### Debug režim

Zapněte detailní logování:
\`\`\`bash
DEBUG=true npm run sync
\`\`\`

### Reset stavu

Smazání stavu vynutí plnou synchronizaci:
\`\`\`bash
rm state/sync-state.json
npm run sync
\`\`\`

## 🔒 Bezpečnost

- **API klíč** je uložen v \`.env\` (neprobíhá do Gitu)
- GitHub Actions používá **Secrets**
- Žádné citlivé údaje v logovacích zprávách

## 📈 Limity

- **Max 100 kampaní** per synchronizace
- **500 posledních ID** v cache stavu
- **1000 requests/hour** Ecomail API limit
- **30 minut** timeout pro GitHub Actions

## 🛠️ Vývoj

### Spuštění ve watch režimu
\`\`\`bash
npm run dev
\`\`\`

### Struktura kódu
- \`EcomailClient\` - API komunikace s retry a rate limiting
- \`SyncManager\` - State management a inkrementální logika
- \`CampaignToMarkdownConverter\` - HTML → Markdown konverze

### Přidání nových funkcí
1. Vytvořte novou branch z \`develop\`
2. Implementujte změny
3. Otestujte lokálně
4. Vytvořte Pull Request do \`develop\`

## 📝 Changelog

### v1.0.0
- ✅ První verze MVP
- ✅ Ecomail API integrace
- ✅ Markdown konverze
- ✅ GitHub Actions workflow
- ✅ Inkrementální synchronizace

---

**Vytvořeno s ❤️ pomocí Claude Code**