import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { HubSpotClient } from './hubspot';

const hubspot = new HubSpotClient();
let remoteClient: Client | null = null;
let transport: StreamableHTTPClientTransport | null = null;
let lastUsedToken: string | null = null;

const server = new Server(
  {
    name: 'hubspot-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Lazy initializer for remote client connection to mcp.hubspot.com.
 * Handles automatic token refreshing by re-establishing connection if token changes.
 */
async function getRemoteClient(): Promise<Client> {
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
    } catch (e) {}
    remoteClient = null;
  }

  lastUsedToken = currentToken;
  transport = new StreamableHTTPClientTransport(new URL('https://mcp.hubspot.com/'), {
    requestInit: {
      headers: {
        Authorization: currentToken,
      },
    },
  });

  const clientInstance = new Client(
    { name: 'hubspot-mcp-proxy-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await clientInstance.connect(transport);
  remoteClient = clientInstance;
  return remoteClient;
}

// Cleanup remote client connection on process exit
process.on('exit', () => {
  if (remoteClient) {
    remoteClient.close().catch(() => {});
  }
});

/**
 * Handle List Tools Request - Fetch dynamically from remote HubSpot MCP server
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    const rc = await getRemoteClient();
    return await rc.listTools();
  } catch (error: any) {
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
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const rc = await getRemoteClient();
    const { name, arguments: args } = request.params;
    return await rc.callTool({
      name,
      arguments: args,
    });
  } catch (error: any) {
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
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  console.error('HubSpot MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
