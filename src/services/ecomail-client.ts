import axios, { AxiosInstance, AxiosError } from 'axios';
import { EcomailCampaign, EcomailApiResponse, Result } from '../types';

export class EcomailClient {
  private client: AxiosInstance;
  private debug: boolean;

  constructor(apiKey: string, baseURL: string = 'https://api2.ecomailapp.cz', debug: boolean = false) {
    this.debug = debug;
    
    this.client = axios.create({
      baseURL,
      headers: {
        'key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use((config) => {
      if (this.debug) {
        console.log(`🔵 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        if (this.debug) {
          console.log(`🟢 API Response: ${response.status} ${response.statusText}`);
        }
        return response;
      },
      (error) => {
        if (this.debug) {
          console.error(`🔴 API Error: ${error.response?.status} ${error.response?.statusText}`);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Získá seznam kampaní z Ecomailu
   * @param page Číslo stránky (začíná od 1)
   * @param limit Počet kampaní na stránku (max 100)
   * @param status Filtr podle statusu (sent, draft, scheduled)
   */
  async getCampaigns(
    page: number = 1, 
    limit: number = 50,
    status: string = 'sent'
  ): Promise<Result<EcomailApiResponse<EcomailCampaign[]>>> {
    try {
      const response = await this.client.get('/campaigns', {
        params: {
          page,
          limit,
          status
        }
      });

      if (this.debug) {
        console.log('📋 API Response data:', JSON.stringify(response.data, null, 2));
      }

      // Ecomail API vrací přímo array kampaní
      let campaigns: EcomailCampaign[] = [];
      
      if (Array.isArray(response.data)) {
        campaigns = response.data.map(campaign => ({
          ...campaign,
          id: String(campaign.id) // Zajistíme že ID je string
        }));
      } else {
        console.warn('⚠️ Neočekávaný formát API response:', typeof response.data);
        campaigns = [];
      }

      return {
        success: true,
        data: {
          data: campaigns,
          total: response.data.total || campaigns.length,
          page: response.data.page || page,
          limit: response.data.limit || limit
        }
      };
    } catch (error) {
      return this.handleError(error as AxiosError, 'získání seznamu kampaní');
    }
  }

  /**
   * Získá detail konkrétní kampaně
   * @param campaignId ID kampaně
   */
  async getCampaignDetail(campaignId: string): Promise<Result<EcomailCampaign>> {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}`);
      
      if (this.debug) {
        console.log(`📧 Campaign detail for ${campaignId}:`, JSON.stringify(response.data, null, 2));
      }

      // Přizpůsobení formátu response
      let campaign: EcomailCampaign;
      if (response.data && response.data.data) {
        campaign = response.data.data;
      } else {
        campaign = response.data;
      }

      // Pokud má archive_url, přidej HTML s odkazem
      if (campaign.archive_url && !campaign.html) {
        campaign.html = `<div><h3>📧 Obsah kampaně</h3><p>Kompletní obsah této kampaně je dostupný na:</p><p><a href="${campaign.archive_url}" target="_blank">${campaign.archive_url}</a></p><p><em>Poznámka: Archivní zobrazení původního emailu odeslaného ${campaign.sent_at || 'neznámého data'}.</em></p></div>`;
      }
      
      return {
        success: true,
        data: campaign
      };
    } catch (error) {
      return this.handleError(error as AxiosError, `získání detailu kampaně ${campaignId}`);
    }
  }

  /**
   * Získá všechny kampaně postupným stránkováním
   * @param status Filtr podle statusu
   * @param maxCampaigns Maximální počet kampaní k načtení
   */
  async getAllCampaigns(
    status: string = 'sent',
    maxCampaigns: number = 100
  ): Promise<Result<EcomailCampaign[]>> {
    const allCampaigns: EcomailCampaign[] = [];
    let page = 1;
    const limit = 50;
    
    console.log(`📥 Načítám kampaně se statusem '${status}'...`);

    while (allCampaigns.length < maxCampaigns) {
      const result = await this.getCampaigns(page, limit, status);
      
      if (!result.success) {
        if (allCampaigns.length > 0) {
          console.log(`⚠️ Načteno ${allCampaigns.length} kampaní před chybou`);
          return { success: true, data: allCampaigns };
        }
        return result;
      }

      const campaigns = result.data.data;
      
      if (campaigns.length === 0) {
        break;
      }

      // Filtrujeme pouze odeslané kampaně (status 3)
      const sentCampaigns = campaigns.filter(campaign => campaign.status === 3);
      allCampaigns.push(...sentCampaigns);
      
      if (this.debug) {
        console.log(`  Stránka ${page}: načteno ${campaigns.length} kampaní`);
      }

      if (campaigns.length < limit) {
        break;
      }

      page++;
      
      await this.delay(200);
    }

    const finalCampaigns = allCampaigns.slice(0, maxCampaigns);
    console.log(`✅ Celkem načteno ${finalCampaigns.length} kampaní`);
    
    return {
      success: true,
      data: finalCampaigns
    };
  }

  /**
   * Získá kampaně novější než zadané datum
   * @param sinceDate Datum od kterého hledat novější kampaně
   * @param maxCampaigns Maximální počet kampaní
   */
  async getCampaignsSince(
    sinceDate: Date,
    maxCampaigns: number = 100
  ): Promise<Result<EcomailCampaign[]>> {
    const result = await this.getAllCampaigns('sent', maxCampaigns);
    
    if (!result.success) {
      return result;
    }

    const filteredCampaigns = result.data.filter(campaign => {
      // Filtrujeme pouze odeslané kampaně (status 3) s datem odeslání
      if (campaign.status !== 3 || !campaign.sent_at) {
        return false;
      }
      const campaignDate = new Date(campaign.sent_at);
      return campaignDate > sinceDate;
    });

    console.log(`📊 Nalezeno ${filteredCampaigns.length} nových kampaní od ${sinceDate.toISOString()}`);
    
    return {
      success: true,
      data: filteredCampaigns
    };
  }

  private handleError(error: AxiosError, context: string): Result<any> {
    let errorMessage = `Chyba při ${context}: `;
    
    if (error.response) {
      switch (error.response.status) {
        case 401:
          errorMessage += 'Neplatný API klíč';
          break;
        case 429:
          errorMessage += 'Překročen limit požadavků (rate limit)';
          break;
        case 404:
          errorMessage += 'Nenalezeno';
          break;
        case 500:
          errorMessage += 'Chyba serveru Ecomail';
          break;
        default:
          errorMessage += `HTTP ${error.response.status} - ${error.response.statusText}`;
      }
      
      if (error.response.data && typeof error.response.data === 'object') {
        const data = error.response.data as any;
        if (data.message) {
          errorMessage += ` - ${data.message}`;
        }
      }
    } else if (error.request) {
      errorMessage += 'Nepodařilo se připojit k Ecomail API';
    } else {
      errorMessage += error.message;
    }

    console.error(`❌ ${errorMessage}`);
    
    return {
      success: false,
      error: new Error(errorMessage)
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}