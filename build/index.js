"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const zod_1 = require("zod");
const hubspot_1 = require("./hubspot");
const client = new hubspot_1.HubSpotClient();
const server = new index_js_1.Server({
    name: 'hubspot-mcp-server',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Define schema validation for tools
const SearchDealsSchema = zod_1.z.object({
    query: zod_1.z.string().optional(),
    dealstage: zod_1.z.string().optional(),
    minAmount: zod_1.z.number().optional(),
    limit: zod_1.z.number().optional().default(10),
});
const GetDealSchema = zod_1.z.object({
    dealId: zod_1.z.string(),
});
const CreateDealSchema = zod_1.z.object({
    dealname: zod_1.z.string(),
    dealstage: zod_1.z.string(),
    amount: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    closedate: zod_1.z.string().optional(),
    hubspot_owner_id: zod_1.z.string().optional(),
});
const UpdateDealSchema = zod_1.z.object({
    dealId: zod_1.z.string(),
    dealname: zod_1.z.string().optional(),
    dealstage: zod_1.z.string().optional(),
    amount: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    closedate: zod_1.z.string().optional(),
    hubspot_owner_id: zod_1.z.string().optional(),
});
const SearchContactsSchema = zod_1.z.object({
    query: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    limit: zod_1.z.number().optional().default(10),
});
const GetContactSchema = zod_1.z.object({
    contactId: zod_1.z.string(),
});
/**
 * Register available tools
 */
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'hubspot_search_deals',
                description: 'Search for deals in HubSpot by text query, dealstage, or minimum amount.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Text query to search by deal name' },
                        dealstage: { type: 'string', description: 'Deal stage (e.g. appointmentscheduled, closedwon, closedlost)' },
                        minAmount: { type: 'number', description: 'Minimum deal amount' },
                        limit: { type: 'number', description: 'Maximum number of results to return (default 10)' },
                    },
                },
            },
            {
                name: 'hubspot_get_deal',
                description: 'Get full details of a specific HubSpot deal by ID.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        dealId: { type: 'string', description: 'Unique HubSpot Deal ID' },
                    },
                    required: ['dealId'],
                },
            },
            {
                name: 'hubspot_create_deal',
                description: 'Create a new deal in HubSpot.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        dealname: { type: 'string', description: 'Deal Name' },
                        dealstage: { type: 'string', description: 'Deal stage (e.g. appointmentscheduled, qualifiedtobuy, presentationscheduled, decisionmakerboughtin, contractsent, closedwon, closedlost)' },
                        amount: { type: 'number', description: 'Deal Amount' },
                        closedate: { type: 'string', description: 'Expected Close Date (format YYYY-MM-DD or ISO)' },
                        hubspot_owner_id: { type: 'string', description: 'Owner ID (HubSpot User ID) responsible for the deal' },
                    },
                    required: ['dealname', 'dealstage'],
                },
            },
            {
                name: 'hubspot_update_deal',
                description: 'Update properties of an existing HubSpot deal.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        dealId: { type: 'string', description: 'ID of the deal to update' },
                        dealname: { type: 'string', description: 'New deal name (optional)' },
                        dealstage: { type: 'string', description: 'New deal stage (optional)' },
                        amount: { type: 'number', description: 'New deal amount (optional)' },
                        closedate: { type: 'string', description: 'New close date (optional)' },
                        hubspot_owner_id: { type: 'string', description: 'New owner ID (optional)' },
                    },
                    required: ['dealId'],
                },
            },
            {
                name: 'hubspot_search_contacts',
                description: 'Search for contacts in HubSpot by name, email, phone, or company.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Text query to search by name or phone' },
                        email: { type: 'string', description: 'Filter strictly by email address' },
                        limit: { type: 'number', description: 'Maximum number of results to return' },
                    },
                },
            },
            {
                name: 'hubspot_get_contact',
                description: 'Get full details of a specific contact by ID.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contactId: { type: 'string', description: 'HubSpot Contact ID' },
                    },
                    required: ['contactId'],
                },
            },
            {
                name: 'hubspot_list_owners',
                description: 'Get a list of all HubSpot owners (users) to assign records.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
        ],
    };
});
/**
 * Handle tool executions
 */
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    try {
        const isAuth = await client.isAuthenticated();
        if (!isAuth) {
            return {
                content: [
                    {
                        type: 'text',
                        text: '❌ Error: HubSpot MCP Server is not authenticated.\n\nPlease run the Setup Wizard in your project directory to authorize access:\n* On Windows: Double-click setup.bat\n* On macOS/Linux: Run "bash setup.sh"',
                    },
                ],
                isError: true,
            };
        }
        const { name, arguments: args } = request.params;
        switch (name) {
            case 'hubspot_search_deals': {
                const parsed = SearchDealsSchema.parse(args);
                const filters = [];
                if (parsed.dealstage) {
                    filters.push({
                        propertyName: 'dealstage',
                        operator: 'EQ',
                        value: parsed.dealstage,
                    });
                }
                if (parsed.minAmount) {
                    filters.push({
                        propertyName: 'amount',
                        operator: 'GTE',
                        value: String(parsed.minAmount),
                    });
                }
                const result = await client.searchObjects('deals', parsed.query, filters, undefined, parsed.limit);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            case 'hubspot_get_deal': {
                const parsed = GetDealSchema.parse(args);
                const result = await client.getObject('deals', parsed.dealId, undefined, ['contacts', 'companies']);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            case 'hubspot_create_deal': {
                const parsed = CreateDealSchema.parse(args);
                const properties = {
                    dealname: parsed.dealname,
                    dealstage: parsed.dealstage,
                };
                if (parsed.amount !== undefined)
                    properties.amount = String(parsed.amount);
                if (parsed.closedate)
                    properties.closedate = parsed.closedate;
                if (parsed.hubspot_owner_id)
                    properties.hubspot_owner_id = parsed.hubspot_owner_id;
                const result = await client.createObject('deals', properties);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `✅ Deal created successfully!\n\n${JSON.stringify(result, null, 2)}`,
                        },
                    ],
                };
            }
            case 'hubspot_update_deal': {
                const parsed = UpdateDealSchema.parse(args);
                const properties = {};
                if (parsed.dealname !== undefined)
                    properties.dealname = parsed.dealname;
                if (parsed.dealstage !== undefined)
                    properties.dealstage = parsed.dealstage;
                if (parsed.amount !== undefined)
                    properties.amount = parsed.amount === null ? null : String(parsed.amount);
                if (parsed.closedate !== undefined)
                    properties.closedate = parsed.closedate;
                if (parsed.hubspot_owner_id !== undefined)
                    properties.hubspot_owner_id = parsed.hubspot_owner_id;
                const result = await client.updateObject('deals', parsed.dealId, properties);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `✅ Deal ${parsed.dealId} updated successfully!\n\n${JSON.stringify(result, null, 2)}`,
                        },
                    ],
                };
            }
            case 'hubspot_search_contacts': {
                const parsed = SearchContactsSchema.parse(args);
                const filters = [];
                if (parsed.email) {
                    filters.push({
                        propertyName: 'email',
                        operator: 'EQ',
                        value: parsed.email,
                    });
                }
                const result = await client.searchObjects('contacts', parsed.query, filters, undefined, parsed.limit);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            case 'hubspot_get_contact': {
                const parsed = GetContactSchema.parse(args);
                const result = await client.getObject('contacts', parsed.contactId, undefined, ['deals']);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            case 'hubspot_list_owners': {
                const result = await client.listOwners();
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `❌ Execution error: ${JSON.stringify(error?.response?.data || error.message || error, null, 2)}`,
                },
            ],
            isError: true,
        };
    }
});
/**
 * Start the Stdio Server
 */
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('HubSpot MCP Server running on stdio');
}
main().catch((error) => {
    console.error('Fatal error running server:', error);
    process.exit(1);
});
