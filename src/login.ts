import * as http from 'http';
import * as url from 'url';
import * as crypto from 'crypto';
import { exec } from 'child_process';
import axios from 'axios';
import { HubSpotClient } from './hubspot';
import * as dotenv from 'dotenv';

dotenv.config();

const PORT = 6274;
const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI || `http://localhost:${PORT}/oauth/callback/debug`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Ошибка: В файле .env не указаны HUBSPOT_CLIENT_ID или HUBSPOT_CLIENT_SECRET!');
  console.error('Пожалуйста, скопируйте .env.example в файл .env и настройте ваши ключи из MCP Auth App.\n');
  process.exit(1);
}

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

async function startOAuthFlow() {
  // Generate PKCE code verifier and code challenge
  const codeVerifier = crypto.randomBytes(32).toString('hex'); // 64 chars
  const codeChallenge = base64url(sha256(codeVerifier));

  // Build the authorization URL
  // Scopes are critical CRM endpoints
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
    client_id: CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    scope: scopes,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  }).toString();

  // Create temporary HTTP Server to listen for redirect
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url || '', true);
    
    if (parsedUrl.pathname === '/oauth/callback/debug') {
      const code = parsedUrl.query.code as string;
      const error = parsedUrl.query.error as string;

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px; background-color: #f7f9fa;">
              <h2 style="color: #ff3366;">Ошибка авторизации!</h2>
              <p>HubSpot вернул ошибку: <strong>${error}</strong></p>
              <p>Проверьте консоль терминала для подробностей.</p>
            </body>
          </html>
        `);
        console.error(`\n❌ HubSpot вернул ошибку: ${error}`);
        process.exit(1);
      }

      if (code) {
        try {
          // Exchange Authorization Code for Tokens (using PKCE code_verifier)
          const response = await axios.post('https://api.hubapi.com/oauth/v1/token', 
            new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: CLIENT_ID!,
              client_secret: CLIENT_SECRET!,
              redirect_uri: REDIRECT_URI,
              code: code,
              code_verifier: codeVerifier
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

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px; background-color: #f7f9fa; color: #33475b;">
                <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <div style="font-size: 50px; color: #00b074; margin-bottom: 20px;">✓</div>
                  <h2 style="color: #00b074; margin-bottom: 10px;">Авторизация успешна!</h2>
                  <p style="font-size: 16px; color: #516f90;">Ключи авторизации для HubSpot сохранены на вашем компьютере.</p>
                  <p style="font-size: 14px; color: #879ebd; margin-top: 20px;">Теперь вы можете закрыть эту вкладку браузера и начать пользоваться чатом в Cursor!</p>
                </div>
              </body>
            </html>
          `);

          console.log('\n=========================================');
          console.log('🎉 УСПЕШНО: Авторизация HubSpot пройдена!');
          console.log('Токены успешно сохранены в файл .hubspot-credentials.json');
          console.log('=========================================\n');

          // Give browser a moment to render the page, then close the server and exit
          setTimeout(() => {
            server.close();
            process.exit(0);
          }, 1000);

        } catch (tokenError: any) {
          const errMsg = tokenError?.response?.data || tokenError.message;
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px; background-color: #f7f9fa;">
                <h2 style="color: #ff3366;">Ошибка при получении токена!</h2>
                <pre style="text-align: left; background: #eef1f2; padding: 15px; border-radius: 4px; display: inline-block;">${JSON.stringify(errMsg, null, 2)}</pre>
              </body>
            </html>
          `);
          console.error('\n❌ Ошибка при обмене кода авторизации на токены:', errMsg);
          process.exit(1);
        }
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`🚀 Временный веб-сервер запущен на http://localhost:${PORT}`);
    console.log(`Ждем перенаправления от HubSpot...`);
    console.log(`=============================================================\n`);
    console.log(`👉 Сейчас мы автоматически откроем браузер для авторизации.`);
    console.log(`Если браузер не открылся, перейдите по ссылке вручную:`);
    console.log(`\n${authUrl}\n`);
    
    // Open standard browser
    openBrowser(authUrl);
  });
}

startOAuthFlow();
