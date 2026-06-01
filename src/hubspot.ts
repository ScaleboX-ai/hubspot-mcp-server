import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CREDENTIALS_FILE = path.join(__dirname, '..', '.hubspot-credentials.json');

interface Credentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp in ms
}

export class HubSpotClient {
  private privateAppToken: string | undefined;
  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private cachedCredentials: Credentials | null = null;

  constructor() {
    this.privateAppToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    this.clientId = process.env.HUBSPOT_CLIENT_ID;
    this.clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  }

  /**
   * Check if client is authenticated (either via Private App Token or saved OAuth credentials)
   */
  public async isAuthenticated(): Promise<boolean> {
    if (this.privateAppToken) {
      return true;
    }
    
    const creds = await this.getCredentials();
    return creds !== null;
  }

  /**
   * Get dynamic authorization token (either Private App Token or fresh OAuth Access Token)
   */
  public async getAuthHeader(): Promise<string> {
    if (this.privateAppToken) {
      return `Bearer ${this.privateAppToken}`;
    }

    const credentials = await this.getCredentials();
    if (!credentials) {
      throw new Error('Not authenticated. Please run the login script first: npm run login');
    }

    // Check if token is expired or expires in the next 2 minutes
    const now = Date.now();
    if (now >= credentials.expiresAt - 120000) {
      console.error('Access token is expiring soon, refreshing...');
      const refreshed = await this.refreshAccessToken(credentials.refreshToken);
      return `Bearer ${refreshed.accessToken}`;
    }

    return `Bearer ${credentials.accessToken}`;
  }

  /**
   * Refresh OAuth access token using refresh token
   */
  private async refreshAccessToken(refreshToken: string): Promise<Credentials> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Client ID and Client Secret are required in .env to refresh OAuth tokens.');
    }

    try {
      const response = await axios.post('https://api.hubapi.com/oauth/v1/token', 
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;
      const creds: Credentials = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // HubSpot sometimes returns the same refresh token, or a new one
        expiresAt: Date.now() + data.expires_in * 1000,
      };

      this.saveCredentials(creds);
      return creds;
    } catch (error: any) {
      console.error('Error refreshing access token:', error?.response?.data || error.message);
      throw new Error('Failed to refresh HubSpot access token. Please run: npm run login');
    }
  }

  /**
   * Load credentials from file
   */
  private async getCredentials(): Promise<Credentials | null> {
    if (this.cachedCredentials) {
      return this.cachedCredentials;
    }

    try {
      if (fs.existsSync(CREDENTIALS_FILE)) {
        const content = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
        const creds = JSON.parse(content) as Credentials;
        this.cachedCredentials = creds;
        return creds;
      }
    } catch (e) {
      console.error('Error reading credentials file:', e);
    }
    return null;
  }

  /**
   * Save credentials to file
   */
  public saveCredentials(creds: Credentials): void {
    this.cachedCredentials = creds;
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), 'utf-8');
  }

  /**
   * Generic request helper
   */
  private async request(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', endpoint: string, data?: any) {
    const authHeader = await this.getAuthHeader();
    const url = `https://api.hubapi.com${endpoint}`;
    
    try {
      const response = await axios({
        method,
        url,
        data,
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error(`HubSpot API error (${method} ${endpoint}):`, error?.response?.data || error.message);
      throw error?.response?.data || error;
    }
  }

  /**
   * 1. Search CRM Objects (contacts, companies, deals, tickets)
   */
  public async searchObjects(
    objectType: string,
    query?: string,
    filters?: any[],
    properties?: string[],
    limit: number = 10
  ) {
    const body: any = {
      limit,
      properties: properties || this.getDefaultProperties(objectType),
    };

    if (query) {
      body.query = query;
    }

    if (filters && filters.length > 0) {
      body.filterGroups = [{ filters }];
    }

    // HubSpot CRM search endpoint
    return this.request('POST', `/crm/v3/objects/${objectType}/search`, body);
  }

  /**
   * 2. Get Single CRM Object details by ID
   */
  public async getObject(objectType: string, objectId: string, properties?: string[], associations?: string[]) {
    const props = properties || this.getDefaultProperties(objectType);
    let url = `/crm/v3/objects/${objectType}/${objectId}?properties=${props.join(',')}`;
    
    if (associations && associations.length > 0) {
      url += `&associations=${associations.join(',')}`;
    }
    
    return this.request('GET', url);
  }

  /**
   * 3. Create CRM Object
   */
  public async createObject(objectType: string, properties: Record<string, any>) {
    return this.request('POST', `/crm/v3/objects/${objectType}`, { properties });
  }

  /**
   * 4. Update CRM Object
   */
  public async updateObject(objectType: string, objectId: string, properties: Record<string, any>) {
    return this.request('PATCH', `/crm/v3/objects/${objectType}/${objectId}`, { properties });
  }

  /**
   * 5. List Owners (Users)
   */
  public async listOwners() {
    return this.request('GET', '/crm/v3/owners/');
  }

  /**
   * Return default properties depending on CRM object type
   */
  private getDefaultProperties(objectType: string): string[] {
    switch (objectType.toLowerCase()) {
      case 'contacts':
      case 'contact':
        return ['firstname', 'lastname', 'email', 'phone', 'company', 'hubspot_owner_id'];
      case 'companies':
      case 'company':
        return ['name', 'domain', 'phone', 'city', 'hubspot_owner_id'];
      case 'deals':
      case 'deal':
        return ['dealname', 'dealstage', 'amount', 'closedate', 'pipeline', 'hubspot_owner_id'];
      default:
        return ['name', 'createdate', 'hubspot_owner_id'];
    }
  }
}
