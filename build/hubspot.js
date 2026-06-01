"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HubSpotClient = void 0;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const CREDENTIALS_FILE = path.join(__dirname, '..', '.hubspot-credentials.json');
class HubSpotClient {
    privateAppToken;
    clientId;
    clientSecret;
    cachedCredentials = null;
    constructor() {
        this.privateAppToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
        this.clientId = process.env.HUBSPOT_CLIENT_ID;
        this.clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    }
    /**
     * Check if client is authenticated (either via Private App Token or saved OAuth credentials)
     */
    async isAuthenticated() {
        if (this.privateAppToken) {
            return true;
        }
        const creds = await this.getCredentials();
        return creds !== null;
    }
    /**
     * Get dynamic authorization token (either Private App Token or fresh OAuth Access Token)
     */
    async getAuthHeader() {
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
    async refreshAccessToken(refreshToken) {
        if (!this.clientId || !this.clientSecret) {
            throw new Error('Client ID and Client Secret are required in .env to refresh OAuth tokens.');
        }
        try {
            const response = await axios_1.default.post('https://api.hubapi.com/oauth/v1/token', new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: refreshToken,
            }).toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const data = response.data;
            const creds = {
                accessToken: data.access_token,
                refreshToken: data.refresh_token || refreshToken, // HubSpot sometimes returns the same refresh token, or a new one
                expiresAt: Date.now() + data.expires_in * 1000,
            };
            this.saveCredentials(creds);
            return creds;
        }
        catch (error) {
            console.error('Error refreshing access token:', error?.response?.data || error.message);
            throw new Error('Failed to refresh HubSpot access token. Please run: npm run login');
        }
    }
    /**
     * Load credentials from file
     */
    async getCredentials() {
        if (this.cachedCredentials) {
            return this.cachedCredentials;
        }
        try {
            if (fs.existsSync(CREDENTIALS_FILE)) {
                const content = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
                const creds = JSON.parse(content);
                this.cachedCredentials = creds;
                return creds;
            }
        }
        catch (e) {
            console.error('Error reading credentials file:', e);
        }
        return null;
    }
    /**
     * Save credentials to file
     */
    saveCredentials(creds) {
        this.cachedCredentials = creds;
        fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), 'utf-8');
    }
    /**
     * Generic request helper
     */
    async request(method, endpoint, data) {
        const authHeader = await this.getAuthHeader();
        const url = `https://api.hubapi.com${endpoint}`;
        try {
            const response = await (0, axios_1.default)({
                method,
                url,
                data,
                headers: {
                    Authorization: authHeader,
                    'Content-Type': 'application/json',
                },
            });
            return response.data;
        }
        catch (error) {
            console.error(`HubSpot API error (${method} ${endpoint}):`, error?.response?.data || error.message);
            throw error?.response?.data || error;
        }
    }
    /**
     * 1. Search CRM Objects (contacts, companies, deals, tickets)
     */
    async searchObjects(objectType, query, filters, properties, limit = 10) {
        const body = {
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
    async getObject(objectType, objectId, properties, associations) {
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
    async createObject(objectType, properties) {
        return this.request('POST', `/crm/v3/objects/${objectType}`, { properties });
    }
    /**
     * 4. Update CRM Object
     */
    async updateObject(objectType, objectId, properties) {
        return this.request('PATCH', `/crm/v3/objects/${objectType}/${objectId}`, { properties });
    }
    /**
     * 5. List Owners (Users)
     */
    async listOwners() {
        return this.request('GET', '/crm/v3/owners/');
    }
    /**
     * Return default properties depending on CRM object type
     */
    getDefaultProperties(objectType) {
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
exports.HubSpotClient = HubSpotClient;
