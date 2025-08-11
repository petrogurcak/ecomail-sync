import TurndownService from 'turndown';
import fs from 'fs/promises';
import path from 'path';
import { EcomailCampaign, CampaignMetadata, Result } from '../types';

export class CampaignToMarkdownConverter {
  private turndown: TurndownService;
  private outputDir: string;

  constructor(outputDir: string = './knowledge-base/campaigns') {
    this.outputDir = outputDir;
    
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      strongDelimiter: '**',
      emDelimiter: '_'
    });

    this.setupTurndownRules();
  }

  private setupTurndownRules(): void {
    this.turndown.addRule('removeStyles', {
      filter: ['style', 'script'],
      replacement: () => ''
    });

    this.turndown.addRule('preserveLinks', {
      filter: 'a',
      replacement: (content, node) => {
        const element = node as any;
        const href = element.getAttribute('href');
        if (!href) return content;
        return `[${content}](${href})`;
      }
    });

    this.turndown.addRule('preserveImages', {
      filter: 'img',
      replacement: (_content, node) => {
        const element = node as any;
        const alt = element.getAttribute('alt') || 'image';
        const src = element.getAttribute('src');
        if (!src) return '';
        return `![${alt}](${src})`;
      }
    });
  }

  /**
   * Konvertuje kampaň na markdown a uloží do souboru
   */
  async convertAndSave(campaign: EcomailCampaign): Promise<Result<string>> {
    try {
      const markdown = this.convertToMarkdown(campaign);
      const filename = this.generateFilename(campaign);
      const filepath = path.join(this.outputDir, filename);
      
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.writeFile(filepath, markdown, 'utf-8');
      
      if (process.env.DEBUG === 'true') {
        console.log(`  ✅ Uloženo: ${filename}`);
      }
      
      return { success: true, data: filepath };
    } catch (error) {
      const errorMessage = `Chyba při konverzi kampaně ${campaign.id}: ${(error as Error).message}`;
      console.error(`❌ ${errorMessage}`);
      return {
        success: false,
        error: new Error(errorMessage)
      };
    }
  }

  /**
   * Konvertuje více kampaní najednou
   */
  async convertMultiple(campaigns: EcomailCampaign[]): Promise<Result<string[]>> {
    console.log(`📝 Konvertuji ${campaigns.length} kampaní na markdown...`);
    
    const results: string[] = [];
    const errors: string[] = [];
    
    for (const campaign of campaigns) {
      const result = await this.convertAndSave(campaign);
      if (result.success) {
        results.push(result.data);
      } else {
        errors.push(`${campaign.id}: ${result.error.message}`);
      }
    }
    
    if (errors.length > 0) {
      console.warn(`⚠️ Chyby při konverzi ${errors.length} kampaní`);
      errors.forEach(err => console.warn(`  - ${err}`));
    }
    
    console.log(`✅ Úspěšně konvertováno ${results.length} kampaní`);
    
    return { success: true, data: results };
  }

  /**
   * Konvertuje kampaň na markdown string
   */
  private convertToMarkdown(campaign: EcomailCampaign): string {
    const metadata = this.extractMetadata(campaign);
    let content = this.createHeader(metadata);
    
    content += '\n## Obsah kampaně\n\n';
    
    if (campaign.html) {
      const cleanedHtml = this.cleanHtml(campaign.html);
      const markdownContent = this.turndown.turndown(cleanedHtml);
      content += this.formatContent(markdownContent);
    } else if (campaign.plaintext) {
      content += this.formatPlaintext(campaign.plaintext);
    } else {
      content += '_Kampaň neobsahuje žádný obsah._\n';
    }
    
    content += '\n## Metadata\n\n';
    content += this.createMetadataSection(metadata);
    
    return content;
  }

  /**
   * Extrahuje metadata z kampaně
   */
  private extractMetadata(campaign: EcomailCampaign): CampaignMetadata {
    return {
      id: campaign.id,
      name: campaign.name,
      subject: campaign.subject,
      preheader: campaign.preheader,
      sentAt: campaign.sent_at,
      type: campaign.type || 'newsletter',
      recipientsCount: campaign.recipients_count,
      tags: campaign.tags || [],
      segment: campaign.segment
    };
  }

  /**
   * Vytvoří hlavičku markdown dokumentu
   */
  private createHeader(metadata: CampaignMetadata): string {
    let header = `# ${metadata.name}\n\n`;
    header += `**ID:** ${metadata.id}  \n`;
    
    if (metadata.sentAt) {
      const date = new Date(metadata.sentAt);
      header += `**Datum odeslání:** ${date.toLocaleDateString('cs-CZ')} ${date.toLocaleTimeString('cs-CZ')}  \n`;
    }
    
    header += `**Předmět:** ${metadata.subject}  \n`;
    
    if (metadata.preheader) {
      header += `**Preheader:** ${metadata.preheader}  \n`;
    }
    
    header += '\n';
    return header;
  }

  /**
   * Vytvoří sekci s metadaty
   */
  private createMetadataSection(metadata: CampaignMetadata): string {
    let section = '';
    
    section += `- **Typ:** ${metadata.type}\n`;
    
    if (metadata.recipientsCount) {
      section += `- **Příjemců:** ${metadata.recipientsCount.toLocaleString('cs-CZ')}\n`;
    }
    
    if (metadata.tags && metadata.tags.length > 0) {
      section += `- **Tagy:** ${metadata.tags.join(', ')}\n`;
    }
    
    if (metadata.segment) {
      section += `- **Segment:** ${metadata.segment}\n`;
    }
    
    return section;
  }

  /**
   * Čistí HTML před konverzí
   */
  private cleanHtml(html: string): string {
    let cleaned = html;
    
    cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, '');
    cleaned = cleaned.replace(/<meta[^>]*>/gi, '');
    cleaned = cleaned.replace(/<link[^>]*>/gi, '');
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    
    cleaned = cleaned.replace(/style="[^"]*"/gi, '');
    cleaned = cleaned.replace(/class="[^"]*"/gi, '');
    cleaned = cleaned.replace(/id="[^"]*"/gi, '');
    
    cleaned = cleaned.replace(/&nbsp;/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    return cleaned;
  }

  /**
   * Formátuje markdown obsah
   */
  private formatContent(markdown: string): string {
    let formatted = markdown;
    
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    formatted = formatted.replace(/^\s+|\s+$/g, '');
    formatted = formatted.replace(/\[(\s*)\]/g, '');
    formatted = formatted.replace(/\s+\n/g, '\n');
    
    return formatted;
  }

  /**
   * Formátuje plaintext na markdown
   */
  private formatPlaintext(plaintext: string): string {
    let formatted = plaintext;
    
    formatted = formatted.replace(/^(.+)$/gm, (match) => {
      if (match.trim() === '') return '';
      return match;
    });
    
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    return formatted;
  }

  /**
   * Generuje název souboru pro kampaň
   */
  private generateFilename(campaign: EcomailCampaign): string {
    const date = new Date(campaign.sent_at || campaign.created_at);
    const dateStr = date.toISOString().split('T')[0];
    
    let slug = campaign.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    
    if (!slug) {
      slug = campaign.id;
    }
    
    return `${dateStr}-${slug}.md`;
  }
}