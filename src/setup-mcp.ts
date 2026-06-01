import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

dotenv.config();

const currentDir = process.cwd();
const envPath = path.join(currentDir, '.env');
const serverPath = path.join(currentDir, 'build', 'index.js');

const askQuestion = (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans.trim());
  }));
};

console.log('\n======================================================');
console.log('🛸 Авто-настройка HubSpot MCP для Claude и Cursor');
console.log('======================================================\n');

/**
 * Configure Claude Desktop config file
 */
function configureClaude() {
  let configPath = '';
  const homedir = os.homedir();

  if (process.platform === 'win32') {
    if (process.env.APPDATA) {
      configPath = path.join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json');
    }
  } else if (process.platform === 'darwin') {
    configPath = path.join(homedir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }

  if (!configPath) {
    console.log('⚠️ Не удалось определить путь для Claude Desktop на этой ОС.');
    return;
  }

  try {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    let config: any = {};
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        config = JSON.parse(content);
      } catch (e) {
        console.log('⚠️ Файл конфигурации Claude Desktop поврежден, пересоздаем...');
      }
    }

    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    config.mcpServers.hubspot = {
      command: 'node',
      args: [serverPath],
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`✓ Конфигурация Claude Desktop успешно обновлена!\n  Путь: ${configPath}`);
  } catch (err: any) {
    console.error('❌ Ошибка при настройке Claude Desktop:', err.message);
  }
}

/**
 * Configure Cursor config file (mcp.json)
 */
function configureCursor() {
  const homedir = os.homedir();
  const configPath = path.join(homedir, '.cursor', 'mcp.json');

  try {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    let config: any = {};
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        config = JSON.parse(content);
      } catch (e) {
        console.log('⚠️ Файл конфигурации Cursor поврежден, пересоздаем...');
      }
    }

    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    config.mcpServers.hubspot = {
      command: 'node',
      args: [serverPath],
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`✓ Конфигурация Cursor успешно обновлена!\n  Путь: ${configPath}`);
  } catch (err: any) {
    console.error('❌ Ошибка при настройке Cursor:', err.message);
  }
}

async function main() {
  let clientId = process.env.HUBSPOT_CLIENT_ID;
  let clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

  // 1. Проверяем, есть ли ключи в .env. Если нет - просим ввести
  if (!clientId || !clientSecret) {
    console.log('👋 Привет! Это первая настройка интеграции HubSpot.');
    console.log('Пожалуйста, введите ключи приложения, полученные от администратора.\n');

    if (!clientId) {
      clientId = await askQuestion('👉 Введите Client ID: ');
      while (!clientId) {
        clientId = await askQuestion('⚠️ Client ID не может быть пустым. Введите Client ID: ');
      }
    }

    if (!clientSecret) {
      clientSecret = await askQuestion('👉 Введите Client Secret: ');
      while (!clientSecret) {
        clientSecret = await askQuestion('⚠️ Client Secret не может быть пустым. Введите Client Secret: ');
      }
    }

    // Сохраняем введенные ключи в .env файл
    const envContent = 
      `# --- HubSpot OAuth Configuration ---\n` +
      `HUBSPOT_CLIENT_ID=${clientId}\n` +
      `HUBSPOT_CLIENT_SECRET=${clientSecret}\n` +
      `HUBSPOT_REDIRECT_URI=http://localhost:6274/oauth/callback/debug\n`;

    fs.writeFileSync(envPath, envContent, 'utf-8');
    
    // Обновляем в текущей сессии
    process.env.HUBSPOT_CLIENT_ID = clientId;
    process.env.HUBSPOT_CLIENT_SECRET = clientSecret;
    process.env.HUBSPOT_REDIRECT_URI = 'http://localhost:6274/oauth/callback/debug';

    console.log('\n✓ Ключи авторизации успешно сохранены в файл .env!');
    console.log('------------------------------------------------------\n');
  }

  // 2. Настраиваем конфигурационные файлы для Claude Desktop и Cursor
  configureClaude();
  console.log('');
  configureCursor();

  // 3. Запуск логина в браузере
  console.log('\n======================================================');
  console.log('👉 Шаг 3: Запуск входа в HubSpot в вашем браузере...');
  console.log('======================================================\n');

  try {
    require('./login');
  } catch (err: any) {
    console.error('❌ Ошибка при запуске логина:', err.message);
  }
}

main().catch((err) => {
  console.error('Критическая ошибка авто-настройки:', err);
  process.exit(1);
});
