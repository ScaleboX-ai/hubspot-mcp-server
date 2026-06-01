import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { exec } from 'child_process';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { HubSpotClient } from './hubspot';

dotenv.config();

const PORT = 6274;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback/debug`;

const currentDir = process.cwd();
const envPath = path.join(currentDir, '.env');
const serverPath = path.join(currentDir, 'build', 'index.js');

// PKCE temporary values
let pkceVerifier = '';
let pkceChallenge = '';

// Helper: SHA256 hashing
function sha256(buffer: string): Buffer {
  return crypto.createHash('sha256').update(buffer).digest();
}

// Helper: Base64URL encoding
function base64url(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Helper: Open URL in browser
function openBrowser(targetUrl: string) {
  const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
  exec(`${start} "${targetUrl}"`);
}

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

  if (!configPath) return;

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
      } catch (e) {}
    }

    if (!config.mcpServers) config.mcpServers = {};
    
    // Windows JSON paths need escaping
    const escapedPath = serverPath.replace(/\\/g, '\\\\');

    config.mcpServers.hubspot = {
      command: 'node',
      args: [escapedPath],
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {}
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
      } catch (e) {}
    }

    if (!config.mcpServers) config.mcpServers = {};

    // Windows JSON paths need escaping
    const escapedPath = serverPath.replace(/\\/g, '\\\\');

    config.mcpServers.hubspot = {
      command: 'node',
      args: [escapedPath],
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {}
}

// Generate premium responsive visual GUI template
function getHtmlTemplate(bodyContent: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HubSpot MCP Setup Wizard</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-color: #0b0f19;
          --panel-bg: rgba(17, 24, 39, 0.7);
          --accent-color: #ff5c35; /* HubSpot Orange */
          --accent-hover: #ff7b5a;
          --blue-accent: #0091ae; /* HubSpot Teal */
          --text-main: #f3f4f6;
          --text-muted: #9ca3af;
          --border-color: rgba(255, 255, 255, 0.08);
          --input-bg: rgba(255, 255, 255, 0.03);
          --shadow-glow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Inter', sans-serif;
          background-color: var(--bg-color);
          background-image: 
            radial-gradient(circle at 10% 20%, rgba(255, 92, 53, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(0, 145, 174, 0.08) 0%, transparent 40%);
          color: var(--text-main);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow-x: hidden;
        }

        .container {
          width: 100%;
          max-width: 600px;
          background: var(--panel-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--border-color);
          border-radius: 24px;
          padding: 40px;
          box-shadow: var(--shadow-glow);
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .header {
          text-align: center;
          margin-bottom: 35px;
        }

        .logo-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }

        .logo-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--accent-color), var(--blue-accent));
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          font-family: 'Outfit', sans-serif;
          color: #fff;
          box-shadow: 0 4px 15px rgba(255, 92, 53, 0.3);
        }

        h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #ffffff 30%, #e5e7eb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: var(--text-muted);
          font-size: 14px;
          margin-top: 8px;
        }

        /* Step Progress */
        .steps {
          display: flex;
          justify-content: space-between;
          margin-bottom: 35px;
          position: relative;
        }

        .steps::before {
          content: '';
          position: absolute;
          top: 15px;
          left: 10%;
          right: 10%;
          height: 2px;
          background: rgba(255, 255, 255, 0.05);
          z-index: 1;
        }

        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
          width: 30%;
        }

        .step-num {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #1f2937;
          border: 2px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          transition: all 0.3s ease;
        }

        .step-item.active .step-num {
          background: var(--accent-color);
          border-color: var(--accent-color);
          color: #fff;
          box-shadow: 0 0 15px rgba(255, 92, 53, 0.4);
        }

        .step-item.completed .step-num {
          background: var(--blue-accent);
          border-color: var(--blue-accent);
          color: #fff;
        }

        .step-label {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          margin-top: 8px;
          text-align: center;
        }

        .step-item.active .step-label {
          color: var(--text-main);
          font-weight: 600;
        }

        /* Form styling */
        .form-group {
          margin-bottom: 24px;
        }

        label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-main);
          margin-bottom: 8px;
        }

        input[type="text"] {
          width: 100%;
          background-color: var(--input-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 14px 16px;
          font-family: inherit;
          font-size: 14px;
          color: #fff;
          outline: none;
          transition: all 0.2s ease;
        }

        input[type="text"]:focus {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(255, 92, 53, 0.15);
          background-color: rgba(255, 255, 255, 0.05);
        }

        .btn {
          width: 100%;
          background: linear-gradient(135deg, var(--accent-color) 0%, #ff734d 100%);
          border: none;
          border-radius: 12px;
          padding: 16px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 15px rgba(255, 92, 53, 0.2);
        }

        .btn:hover {
          background: linear-gradient(135deg, var(--accent-hover) 0%, var(--accent-color) 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(255, 92, 53, 0.3);
        }

        .btn:active {
          transform: translateY(1px);
        }

        .btn-blue {
          background: linear-gradient(135deg, var(--blue-accent) 0%, #00accf 100%);
          box-shadow: 0 4px 15px rgba(0, 145, 174, 0.2);
        }

        .btn-blue:hover {
          background: linear-gradient(135deg, #00adcd 0%, var(--blue-accent) 100%);
          box-shadow: 0 6px 20px rgba(0, 145, 174, 0.3);
        }

        .note-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 16px;
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.6;
          margin-top: 25px;
        }

        .success-checkmark {
          width: 80px;
          height: 80px;
          background: rgba(0, 145, 174, 0.1);
          border: 2px solid var(--blue-accent);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          color: var(--blue-accent);
          margin: 0 auto 30px auto;
          box-shadow: 0 0 20px rgba(0, 145, 174, 0.2);
        }

        .success-text {
          text-align: center;
        }

        .success-text h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          margin-bottom: 12px;
          color: #fff;
        }

        .success-text p {
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 24px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${bodyContent}
      </div>
    </body>
    </html>
  `;
}

function startSetupWizard() {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url || '', true);

    // 1. Wizard UI Screen: Credentials input
    if (parsedUrl.pathname === '/setup') {
      const html = getHtmlTemplate(`
        <div class="header">
          <div class="logo-wrap">
            <div class="logo-icon">H</div>
            <h1>HubSpot MCP Setup</h1>
          </div>
          <p class="subtitle">Мастер автоматической настройки Cursor и Claude Desktop</p>
        </div>
        
        <div class="steps">
          <div class="step-item active">
            <div class="step-num">1</div>
            <div class="step-label">Ключи доступа</div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-label">Авторизация</div>
          </div>
          <div class="step-item">
            <div class="step-num">3</div>
            <div class="step-label">Готово</div>
          </div>
        </div>

        <form action="/save-setup" method="POST">
          <div class="form-group">
            <label for="clientId">Client ID</label>
            <input type="text" id="clientId" name="clientId" placeholder="Вставьте Client ID, присланный администратором" required autocomplete="off">
          </div>
          <div class="form-group">
            <label for="clientSecret">Client Secret</label>
            <input type="text" id="clientSecret" name="clientSecret" placeholder="Вставьте Client Secret, присланный администратором" required autocomplete="off">
          </div>
          <button type="submit" class="btn">Сохранить и продолжить →</button>
        </form>

        <div class="note-card">
          <strong>ℹ️ Где взять эти ключи?</strong><br>
          Их предоставляет администратор вашего HubSpot. Если вы настраиваете систему сами — создайте приложение в кабинете разработчика HubSpot и скопируйте ключи оттуда.
        </div>
      `);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } 
    
    // 2. Action: Save credentials to .env and configure local applications
    else if (parsedUrl.pathname === '/save-setup' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        const params = new URLSearchParams(body);
        const clientId = params.get('clientId') || '';
        const clientSecret = params.get('clientSecret') || '';

        if (!clientId || !clientSecret) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('Ключи не могут быть пустыми!');
          return;
        }

        // Save keys in .env dynamically
        const envContent = 
          `# --- HubSpot OAuth Configuration ---\n` +
          `HUBSPOT_CLIENT_ID=${clientId}\n` +
          `HUBSPOT_CLIENT_SECRET=${clientSecret}\n` +
          `HUBSPOT_REDIRECT_URI=${REDIRECT_URI}\n`;

        fs.writeFileSync(envPath, envContent, 'utf-8');

        // Dynamically update node process env variables
        process.env.HUBSPOT_CLIENT_ID = clientId;
        process.env.HUBSPOT_CLIENT_SECRET = clientSecret;
        process.env.HUBSPOT_REDIRECT_URI = REDIRECT_URI;

        // Auto-configure Claude & Cursor paths!
        configureClaude();
        configureCursor();

        // 3. Initiate HubSpot Browser Authorization Redirect
        // Generate secure PKCE dynamic values
        pkceVerifier = crypto.randomBytes(32).toString('hex'); // 64 chars
        pkceChallenge = base64url(sha256(pkceVerifier));

        const scopes = [
          'crm.objects.contacts.read',
          'crm.objects.contacts.write',
          'crm.objects.companies.read',
          'crm.objects.companies.write',
          'crm.objects.deals.read',
          'crm.objects.deals.write',
          'crm.objects.owners.read'
        ].join(' ');

        const authUrl = `https://app.hubspot.com/oauth/authorize?` + new URLSearchParams({
          client_id: clientId,
          redirect_uri: REDIRECT_URI,
          scope: scopes,
          code_challenge: pkceChallenge,
          code_challenge_method: 'S256'
        }).toString();

        // Inform user and redirect to HubSpot login page
        res.writeHead(302, { Location: authUrl });
        res.end();
      });
    } 
    
    // 4. Action: Capture OAuth code and finish installation
    else if (parsedUrl.pathname === '/oauth/callback/debug') {
      const code = parsedUrl.query.code as string;
      const error = parsedUrl.query.error as string;

      const clientId = process.env.HUBSPOT_CLIENT_ID;
      const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

      if (error) {
        const html = getHtmlTemplate(`
          <div class="success-checkmark" style="border-color: #ef4444; background: rgba(239, 68, 68, 0.1); color: #ef4444;">✗</div>
          <div class="success-text">
            <h2 style="color: #ef4444;">Ошибка авторизации!</h2>
            <p>HubSpot вернул ошибку: <strong>${error}</strong></p>
            <a href="/setup" class="btn" style="margin-top: 20px;">Попробовать заново</a>
          </div>
        `);
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      if (code && clientId && clientSecret) {
        try {
          // Exchange code for Access/Refresh Tokens
          const response = await axios.post('https://api.hubapi.com/oauth/v1/token', 
            new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: REDIRECT_URI,
              code: code,
              code_verifier: pkceVerifier
            }).toString(),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            }
          );

          const data = response.data;
          
          const client = new HubSpotClient();
          client.saveCredentials({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Date.now() + data.expires_in * 1000,
          });

          // Render absolute masterpiece visual success screen
          const html = getHtmlTemplate(`
            <div class="header">
              <div class="logo-wrap">
                <div class="logo-icon" style="background: linear-gradient(135deg, var(--blue-accent), #00e5ff);">✓</div>
                <h1>Настройка успешна!</h1>
              </div>
            </div>

            <div class="steps">
              <div class="step-item completed">
                <div class="step-num">1</div>
                <div class="step-label">Ключи доступа</div>
              </div>
              <div class="step-item completed">
                <div class="step-num">2</div>
                <div class="step-label">Авторизация</div>
              </div>
              <div class="step-item active">
                <div class="step-num">3</div>
                <div class="step-label">Готово</div>
              </div>
            </div>

            <div class="success-checkmark">✓</div>
            
            <div class="success-text">
              <h2>MCP Сервер успешно настроен!</h2>
              <p>Ваши личные ключи HubSpot сохранены локально на этом компьютере. Программы Claude Desktop и Cursor настроены в фоновом режиме.</p>
              
              <div style="background: rgba(0, 145, 174, 0.05); border: 1px solid rgba(0, 145, 174, 0.15); border-radius: 12px; padding: 20px; text-align: left; margin-bottom: 30px;">
                <h4 style="color: var(--blue-accent); font-family: 'Outfit'; margin-bottom: 10px;">🚀 Что делать дальше?</h4>
                <ol style="margin-left: 20px; font-size: 13px; color: var(--text-muted); line-height: 1.6;">
                  <li>Полностью <strong>перезапустите</strong> программы Cursor или Claude Desktop.</li>
                  <li>В чате Claude Desktop появится значок розетки (или серая иконка молоточка в поле ввода).</li>
                  <li>В Cursor сервер добавится автоматически на глобальном уровне! Вы увидите его в настройках.</li>
                  <li>Просто начните новый чат с ИИ и спросите: <strong>"Найди мои сделки в HubSpot"</strong>!</li>
                </ol>
              </div>

              <p style="font-size: 12px; color: var(--text-muted);">Вы можете безопасно закрыть эту вкладку браузера.</p>
            </div>
          `);

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);

          console.log('\n======================================================');
          console.log('🎉 УСПЕШНО: HubSpot MCP Сервер настроен через GUI!');
          console.log('Конфигурации Claude Desktop и Cursor обновлены.');
          console.log('Ключи сохранены в .env и .hubspot-credentials.json.');
          console.log('======================================================\n');

          // Gracefully close server after 2 seconds
          setTimeout(() => {
            server.close();
            process.exit(0);
          }, 2000);

        } catch (tokenError: any) {
          const errMsg = tokenError?.response?.data || tokenError.message;
          const html = getHtmlTemplate(`
            <div class="success-checkmark" style="border-color: #ef4444; background: rgba(239, 68, 68, 0.1); color: #ef4444;">✗</div>
            <div class="success-text">
              <h2 style="color: #ef4444;">Ошибка обмена токенов!</h2>
              <p>Не удалось получить токены доступа от HubSpot:</p>
              <pre style="text-align: left; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; font-family: monospace; font-size: 11px; overflow-x: auto; max-width: 100%; color: #f3f4f6; margin-bottom: 20px;">${JSON.stringify(errMsg, null, 2)}</pre>
              <a href="/setup" class="btn">Попробовать заново</a>
            </div>
          `);
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
          console.error('❌ Ошибка при обмене кода авторизации:', errMsg);
        }
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Setup Wizard Web Server started on http://localhost:${PORT}`);
    console.log(`======================================================\n`);
    console.log(`👉 Сейчас мы автоматически откроем мастер настройки в браузере.`);
    console.log(`Если браузер не открылся, перейдите по ссылке вручную:`);
    console.log(`\nhttp://localhost:${PORT}/setup\n`);

    openBrowser(`http://localhost:${PORT}/setup`);
  });
}

// Start Setup Wizard immediately
startSetupWizard();
