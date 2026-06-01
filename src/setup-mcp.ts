import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config();

const currentDir = process.cwd();
const serverPath = path.join(currentDir, 'build', 'index.js');

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

// 1. Run configuration for all available apps
configureClaude();
console.log('');
configureCursor();

// 2. Launch the OAuth browser login flow
console.log('\n======================================================');
console.log('👉 Шаг 3: Запуск входа в HubSpot в вашем браузере...');
console.log('======================================================\n');

try {
  require('./login');
} catch (err: any) {
  console.error('❌ Ошибка при запуске логина:', err.message);
}
