import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { HubSpotClient } from './hubspot';

const client = new HubSpotClient();

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

// Define schema validation for tools
const SearchDealsSchema = z.object({
  query: z.string().optional(),
  dealstage: z.string().optional(),
  minAmount: z.number().optional(),
  limit: z.number().optional().default(10),
});

const GetDealSchema = z.object({
  dealId: z.string(),
});

const CreateDealSchema = z.object({
  dealname: z.string(),
  dealstage: z.string(),
  amount: z.union([z.number(), z.string()]).optional(),
  closedate: z.string().optional(),
  hubspot_owner_id: z.string().optional(),
});

const UpdateDealSchema = z.object({
  dealId: z.string(),
  dealname: z.string().optional(),
  dealstage: z.string().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  closedate: z.string().optional(),
  hubspot_owner_id: z.string().optional(),
});

const SearchContactsSchema = z.object({
  query: z.string().optional(),
  email: z.string().optional(),
  limit: z.number().optional().default(10),
});

const GetContactSchema = z.object({
  contactId: z.string(),
});

/**
 * Register available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'hubspot_search_deals',
        description: 'Поиск сделок в HubSpot по текстовому запросу, этапу сделки (dealstage) или минимальной сумме.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Текстовый запрос для поиска по названию сделки' },
            dealstage: { type: 'string', description: 'Этап сделки (например, appointmentscheduled, closedwon, closedlost)' },
            minAmount: { type: 'number', description: 'Минимальная сумма сделки' },
            limit: { type: 'number', description: 'Максимальное количество результатов (по умолчанию 10)' },
          },
        },
      },
      {
        name: 'hubspot_get_deal',
        description: 'Получить полную информацию о конкретной сделке в HubSpot по её ID.',
        inputSchema: {
          type: 'object',
          properties: {
            dealId: { type: 'string', description: 'Уникальный ID сделки в HubSpot' },
          },
          required: ['dealId'],
        },
      },
      {
        name: 'hubspot_create_deal',
        description: 'Создать новую сделку в HubSpot.',
        inputSchema: {
          type: 'object',
          properties: {
            dealname: { type: 'string', description: 'Название сделки' },
            dealstage: { type: 'string', description: 'Этап сделки (например, appointmentscheduled, qualifiedtobuy, presentationscheduled, decisionmakerboughtin, contractsent, closedwon, closedlost)' },
            amount: { type: 'number', description: 'Сумма сделки' },
            closedate: { type: 'string', description: 'Ожидаемая дата закрытия сделки (в формате YYYY-MM-DD или ISO)' },
            hubspot_owner_id: { type: 'string', description: 'ID владельца (пользователя HubSpot), ответственного за сделку' },
          },
          required: ['dealname', 'dealstage'],
        },
      },
      {
        name: 'hubspot_update_deal',
        description: 'Обновить параметры существующей сделки в HubSpot.',
        inputSchema: {
          type: 'object',
          properties: {
            dealId: { type: 'string', description: 'ID обновляемой сделки' },
            dealname: { type: 'string', description: 'Новое название сделки (опционально)' },
            dealstage: { type: 'string', description: 'Новый этап сделки (опционально)' },
            amount: { type: 'number', description: 'Новая сумма сделки (опционально)' },
            closedate: { type: 'string', description: 'Новая дата закрытия (опционально)' },
            hubspot_owner_id: { type: 'string', description: 'Новый ID ответственного (опционально)' },
          },
          required: ['dealId'],
        },
      },
      {
        name: 'hubspot_search_contacts',
        description: 'Поиск контактов (клиентов) в HubSpot по имени, фамилии, компании или email.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Текстовый запрос для поиска по имени, фамилии или телефону' },
            email: { type: 'string', description: 'Поиск строго по email адресу' },
            limit: { type: 'number', description: 'Максимальное количество результатов' },
          },
        },
      },
      {
        name: 'hubspot_get_contact',
        description: 'Получить полную информацию о контакте в HubSpot по его ID.',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'ID контакта в HubSpot' },
          },
          required: ['contactId'],
        },
      },
      {
        name: 'hubspot_list_owners',
        description: 'Получить список всех владельцев (пользователей) в HubSpot для назначения ответственных.',
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
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const isAuth = await client.isAuthenticated();
    if (!isAuth) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Ошибка: MCP-сервер не авторизован в HubSpot.\n\nПожалуйста, запустите в терминале папке проекта команду:\n`npm run login`\nУ вас откроется браузер, где нужно будет авторизовать доступ.',
          },
        ],
        isError: true,
      };
    }

    const { name, arguments: args } = request.params;

    switch (name) {
      case 'hubspot_search_deals': {
        const parsed = SearchDealsSchema.parse(args);
        const filters: any[] = [];
        
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
        const properties: Record<string, any> = {
          dealname: parsed.dealname,
          dealstage: parsed.dealstage,
        };

        if (parsed.amount !== undefined) properties.amount = String(parsed.amount);
        if (parsed.closedate) properties.closedate = parsed.closedate;
        if (parsed.hubspot_owner_id) properties.hubspot_owner_id = parsed.hubspot_owner_id;

        const result = await client.createObject('deals', properties);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Сделка успешно создана!\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case 'hubspot_update_deal': {
        const parsed = UpdateDealSchema.parse(args);
        const properties: Record<string, any> = {};

        if (parsed.dealname !== undefined) properties.dealname = parsed.dealname;
        if (parsed.dealstage !== undefined) properties.dealstage = parsed.dealstage;
        if (parsed.amount !== undefined) properties.amount = parsed.amount === null ? null : String(parsed.amount);
        if (parsed.closedate !== undefined) properties.closedate = parsed.closedate;
        if (parsed.hubspot_owner_id !== undefined) properties.hubspot_owner_id = parsed.hubspot_owner_id;

        const result = await client.updateObject('deals', parsed.dealId, properties);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Сделка ${parsed.dealId} успешно обновлена!\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case 'hubspot_search_contacts': {
        const parsed = SearchContactsSchema.parse(args);
        const filters: any[] = [];
        
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
        throw new Error(`Неизвестный инструмент: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Ошибка при выполнении: ${JSON.stringify(error?.response?.data || error.message || error, null, 2)}`,
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('HubSpot MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
