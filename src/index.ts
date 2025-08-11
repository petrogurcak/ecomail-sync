#!/usr/bin/env node

import dotenv from 'dotenv';
import { EcomailClient } from './services/ecomail-client';
import { SyncManager } from './sync/sync-manager';
import { CampaignToMarkdownConverter } from './converters/campaign-to-markdown';

dotenv.config();

async function main() {
  console.log('🚀 Ecomail Sync Tool');
  console.log('====================\n');

  const apiKey = process.env.ECOMAIL_API_KEY;
  if (!apiKey) {
    console.error('❌ Chyba: ECOMAIL_API_KEY není nastaven v .env souboru');
    process.exit(1);
  }

  const forceFullSync = process.argv.includes('--force') || 
                        process.env.FORCE_FULL_SYNC === 'true';
  
  const debug = process.env.DEBUG === 'true';
  const apiUrl = process.env.ECOMAIL_API_URL || 'https://api2.ecomailapp.cz';
  
  try {
    const client = new EcomailClient(apiKey, apiUrl, debug);
    const syncManager = new SyncManager('./state');
    const converter = new CampaignToMarkdownConverter('./knowledge-base/campaigns');

    const stateResult = await syncManager.loadState();
    if (!stateResult.success) {
      throw stateResult.error;
    }

    if (forceFullSync) {
      await syncManager.forceFullSync();
    }

    const state = syncManager.getState();
    let campaignsResult;

    if (!state || state.totalSyncedCount === 0 || forceFullSync) {
      console.log('📥 Provádím první synchronizaci (posledních 50 kampaní)...\n');
      campaignsResult = await client.getAllCampaigns('sent', 50);
    } else {
      const lastSyncDate = new Date(state.lastSyncDate);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const sinceDate = lastSyncDate < hourAgo ? lastSyncDate : hourAgo;
      
      console.log(`📥 Hledám nové kampaně od ${sinceDate.toISOString()}...\n`);
      campaignsResult = await client.getCampaignsSince(sinceDate, 100);
    }

    if (!campaignsResult.success) {
      throw campaignsResult.error;
    }

    const allCampaigns = campaignsResult.data;
    const newCampaigns = syncManager.filterNewCampaigns(allCampaigns);

    if (newCampaigns.length === 0) {
      console.log('✨ Žádné nové kampaně k synchronizaci');
      
      const summaryResult = await syncManager.generateSummaryReport(
        './knowledge-base/summary.md',
        []
      );
      
      if (!summaryResult.success) {
        console.warn('⚠️ Nepodařilo se vygenerovat souhrnný report');
      }
      
      await syncManager.updateAfterSync([]);
      console.log('\n✅ Synchronizace dokončena');
      process.exit(0);
    }

    console.log(`\n📝 Synchronizuji ${newCampaigns.length} nových kampaní...\n`);

    const enrichedCampaigns = [];
    for (const campaign of newCampaigns) {
      console.log(`  📧 ${campaign.title} (${campaign.id})`);
      
      const detailResult = await client.getCampaignDetail(campaign.id);
      if (detailResult.success) {
        enrichedCampaigns.push(detailResult.data);
      } else {
        console.warn(`    ⚠️ Nepodařilo se načíst detail, používám základní data`);
        enrichedCampaigns.push(campaign);
      }
      
      await delay(200);
    }

    const convertResult = await converter.convertMultiple(enrichedCampaigns);
    if (!convertResult.success) {
      throw new Error('Chyba při konverzi kampaní');
    }

    const updateResult = await syncManager.updateAfterSync(enrichedCampaigns);
    if (!updateResult.success) {
      throw updateResult.error;
    }

    const summaryResult = await syncManager.generateSummaryReport(
      './knowledge-base/summary.md',
      enrichedCampaigns
    );
    
    if (!summaryResult.success) {
      console.warn('⚠️ Nepodařilo se vygenerovat souhrnný report');
    }

    console.log('\n✅ Synchronizace dokončena úspěšně!');
    console.log(`   Synchronizováno: ${enrichedCampaigns.length} kampaní`);
    console.log(`   Markdown soubory: ./knowledge-base/campaigns/`);
    console.log(`   Souhrnný report: ./knowledge-base/summary.md`);

  } catch (error) {
    console.error('\n❌ Kritická chyba:', (error as Error).message);
    if (debug) {
      console.error(error);
    }
    process.exit(1);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(error => {
  console.error('❌ Neočekávaná chyba:', error);
  process.exit(1);
});