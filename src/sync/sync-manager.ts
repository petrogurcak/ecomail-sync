import fs from 'fs/promises';
import path from 'path';
import { SyncState, EcomailCampaign, Result } from '../types';

export class SyncManager {
  private stateFilePath: string;
  private state: SyncState | null = null;
  private readonly maxSyncedIds = 500;

  constructor(stateDir: string = './state') {
    this.stateFilePath = path.join(stateDir, 'sync-state.json');
  }

  /**
   * Načte stav synchronizace ze souboru
   */
  async loadState(): Promise<Result<SyncState>> {
    try {
      const exists = await this.fileExists(this.stateFilePath);
      
      if (!exists) {
        console.log('📝 Vytvářím nový stav synchronizace...');
        this.state = this.createInitialState();
        await this.saveState();
        return { success: true, data: this.state };
      }

      const content = await fs.readFile(this.stateFilePath, 'utf-8');
      this.state = JSON.parse(content);
      
      console.log(`📊 Načten stav synchronizace:`);
      console.log(`  - Poslední sync: ${this.state?.lastSyncDate}`);
      console.log(`  - Celkem synchronizováno: ${this.state?.totalSyncedCount} kampaní`);
      
      return { success: true, data: this.state! };
    } catch (error) {
      const errorMessage = `Chyba při načítání stavu: ${(error as Error).message}`;
      console.error(`❌ ${errorMessage}`);
      
      console.log('🔄 Vytvářím nový stav...');
      this.state = this.createInitialState();
      await this.saveState();
      
      return { success: true, data: this.state };
    }
  }

  /**
   * Uloží aktuální stav do souboru
   */
  async saveState(): Promise<Result<void>> {
    if (!this.state) {
      return {
        success: false,
        error: new Error('Stav není inicializován')
      };
    }

    try {
      const dir = path.dirname(this.stateFilePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(
        this.stateFilePath, 
        JSON.stringify(this.state, null, 2),
        'utf-8'
      );
      
      if (process.env.DEBUG === 'true') {
        console.log('💾 Stav synchronizace uložen');
      }
      
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = `Chyba při ukládání stavu: ${(error as Error).message}`;
      console.error(`❌ ${errorMessage}`);
      return {
        success: false,
        error: new Error(errorMessage)
      };
    }
  }

  /**
   * Filtruje pouze nové kampaně, které ještě nebyly synchronizovány
   */
  filterNewCampaigns(campaigns: EcomailCampaign[]): EcomailCampaign[] {
    if (!this.state) {
      return campaigns;
    }

    const newCampaigns = campaigns.filter(campaign => 
      !this.state!.syncedCampaignIds.includes(campaign.id)
    );

    console.log(`🔍 Nalezeno ${newCampaigns.length} nových kampaní z celkových ${campaigns.length}`);
    
    return newCampaigns;
  }

  /**
   * Aktualizuje stav po úspěšné synchronizaci
   */
  async updateAfterSync(syncedCampaigns: EcomailCampaign[]): Promise<Result<void>> {
    if (!this.state) {
      return {
        success: false,
        error: new Error('Stav není inicializován')
      };
    }

    if (syncedCampaigns.length === 0) {
      this.state.lastSyncDate = new Date().toISOString();
      return await this.saveState();
    }

    const newIds = syncedCampaigns.map(c => c.id);
    
    this.state.syncedCampaignIds = [
      ...newIds,
      ...this.state.syncedCampaignIds
    ].slice(0, this.maxSyncedIds);
    
    this.state.totalSyncedCount += syncedCampaigns.length;
    this.state.lastSyncDate = new Date().toISOString();
    
    const sortedCampaigns = syncedCampaigns.sort((a, b) => {
      const dateA = new Date(a.sent_at || a.changed_at || Date.now()).getTime();
      const dateB = new Date(b.sent_at || b.changed_at || Date.now()).getTime();
      return dateB - dateA;
    });
    
    if (sortedCampaigns.length > 0) {
      this.state.lastCampaignId = sortedCampaigns[0].id;
    }

    console.log(`📈 Aktualizován stav:`);
    console.log(`  - Nově synchronizováno: ${syncedCampaigns.length} kampaní`);
    console.log(`  - Celkem synchronizováno: ${this.state.totalSyncedCount} kampaní`);

    return await this.saveState();
  }

  /**
   * Generuje souhrnný report
   */
  async generateSummaryReport(
    outputPath: string,
    syncedCampaigns: EcomailCampaign[]
  ): Promise<Result<void>> {
    if (!this.state) {
      return {
        success: false,
        error: new Error('Stav není inicializován')
      };
    }

    try {
      const report = this.createSummaryContent(syncedCampaigns);
      
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, report, 'utf-8');
      
      console.log(`📄 Souhrnný report uložen: ${outputPath}`);
      
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = `Chyba při generování reportu: ${(error as Error).message}`;
      console.error(`❌ ${errorMessage}`);
      return {
        success: false,
        error: new Error(errorMessage)
      };
    }
  }

  private createSummaryContent(syncedCampaigns: EcomailCampaign[]): string {
    const now = new Date().toISOString();
    const lastSync = this.state?.lastSyncDate || 'N/A';
    const total = this.state?.totalSyncedCount || 0;
    
    let content = `# Ecomail Sync - Souhrnný Report\n\n`;
    content += `**Vygenerováno:** ${now}\n`;
    content += `**Poslední synchronizace:** ${lastSync}\n`;
    content += `**Celkem synchronizováno:** ${total} kampaní\n\n`;
    
    if (syncedCampaigns.length > 0) {
      content += `## Nově synchronizované kampaně (${syncedCampaigns.length})\n\n`;
      
      const sorted = [...syncedCampaigns].sort((a, b) => {
        const dateA = new Date(a.sent_at || a.changed_at || Date.now()).getTime();
        const dateB = new Date(b.sent_at || b.changed_at || Date.now()).getTime();
        return dateB - dateA;
      });
      
      sorted.forEach(campaign => {
        const date = campaign.sent_at || campaign.changed_at;
        content += `- **${campaign.title}** (${campaign.id})\n`;
        content += `  - Předmět: ${campaign.subject || 'Bez předmětu'}\n`;
        content += `  - Datum: ${date}\n`;
        if (campaign.recipients) {
          content += `  - Příjemců: ${campaign.recipients}\n`;
        }
        content += '\n';
      });
    } else {
      content += `## Žádné nové kampaně\n\n`;
      content += `V této synchronizaci nebyly nalezeny žádné nové kampaně.\n`;
    }
    
    content += `\n---\n\n`;
    content += `## Statistiky\n\n`;
    content += `- **Celkový počet synchronizovaných kampaní:** ${total}\n`;
    content += `- **Počet sledovaných ID v cache:** ${this.state?.syncedCampaignIds.length || 0}\n`;
    
    if (this.state?.lastCampaignId) {
      content += `- **ID poslední kampaně:** ${this.state.lastCampaignId}\n`;
    }
    
    return content;
  }

  private createInitialState(): SyncState {
    return {
      lastSyncDate: new Date().toISOString(),
      lastCampaignId: null,
      syncedCampaignIds: [],
      totalSyncedCount: 0
    };
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Vrací aktuální stav
   */
  getState(): SyncState | null {
    return this.state;
  }

  /**
   * Vynutí plnou synchronizaci (resetuje stav)
   */
  async forceFullSync(): Promise<Result<void>> {
    console.log('🔄 Vynucena plná synchronizace - resetuji stav...');
    this.state = this.createInitialState();
    return await this.saveState();
  }
}