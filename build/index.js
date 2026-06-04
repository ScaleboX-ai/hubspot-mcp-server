"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const index_js_2 = require("@modelcontextprotocol/sdk/client/index.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const hubspot_1 = require("./hubspot");
const hubspot = new hubspot_1.HubSpotClient();
let remoteClient = null;
let transport = null;
let lastUsedToken = null;
const server = new index_js_1.Server({
    name: 'hubspot-mcp-server',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
/**
 * Lazy initializer for remote client connection to mcp.hubspot.com.
 * Handles automatic token refreshing by re-establishing connection if token changes.
 */
async function getRemoteClient() {
    const isAuth = await hubspot.isAuthenticated();
    if (!isAuth) {
        throw new Error('NOT_AUTHENTICATED');
    }
    const currentToken = await hubspot.getAuthHeader();
    // If connection exists and token hasn't changed, reuse the connection
    if (remoteClient && lastUsedToken === currentToken) {
        return remoteClient;
    }
    // If token changed (due to refresh), close existing connection and recreate
    if (remoteClient) {
        console.error('Re-establishing remote HubSpot connection due to token refresh...');
        try {
            await remoteClient.close();
        }
        catch (e) { }
        remoteClient = null;
    }
    lastUsedToken = currentToken;
    transport = new streamableHttp_js_1.StreamableHTTPClientTransport(new URL('https://mcp.hubspot.com/'), {
        requestInit: {
            headers: {
                Authorization: currentToken,
            },
        },
    });
    const clientInstance = new index_js_2.Client({ name: 'hubspot-mcp-proxy-client', version: '1.0.0' }, { capabilities: {} });
    await clientInstance.connect(transport);
    remoteClient = clientInstance;
    return remoteClient;
}
// Cleanup remote client connection on process exit
process.on('exit', () => {
    if (remoteClient) {
        remoteClient.close().catch(() => { });
    }
});
/**
 * Handle List Tools Request - Fetch dynamically from remote HubSpot MCP server
 */
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    try {
        const rc = await getRemoteClient();
        return await rc.listTools();
    }
    catch (error) {
        if (error.message === 'NOT_AUTHENTICATED') {
            return {
                tools: [],
                _meta: {
                    error: 'HubSpot MCP Server is not authenticated. Please run the Setup Wizard first.'
                }
            };
        }
        console.error('Error listing tools from remote HubSpot server:', error);
        throw error;
    }
});
/**
 * Handle Call Tool Request - Proxy the tool execution to remote HubSpot MCP server
 */
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    try {
        const rc = await getRemoteClient();
        const { name, arguments: args } = request.params;
        return await rc.callTool({
            name,
            arguments: args,
        });
    }
    catch (error) {
        if (error.message === 'NOT_AUTHENTICATED') {
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
        console.error(`Error executing remote tool ${request.params.name}:`, error);
        return {
            content: [
                {
                    type: 'text',
                    text: `❌ Proxy execution error: ${error.message || JSON.stringify(error)}`,
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
    const stdioTransport = new stdio_js_1.StdioServerTransport();
    await server.connect(stdioTransport);
    console.error('HubSpot MCP Server running on stdio');
}
main().catch((error) => {
    console.error('Fatal error running server:', error);
    process.exit(1);
});
