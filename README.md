# 🚀 HubSpot MCP Server (Windows / macOS / Linux)

[English Version](#english-version) | [Русская версия](#русская-версия)

---

## English Version

This Model Context Protocol (MCP) server enables secure, natural language interaction with your **HubSpot CRM** data through local AI assistants. Users can query, create, or update CRM records (such as contacts, companies, and deals) directly using their preferred AI environments, including **Cursor, Windsurf IDE, VS Code (Cline extension), or Claude Desktop**.

Designed to be **completely frictionless and cross-platform**, this setup eliminates the need for manual dependency installations, configuration file editing, or console command executions. The automated Setup Wizard handles the entire configuration process seamlessly.

### 💻 User Setup Guide (2 Easy Steps!)

#### Step 1. Unzip the Project Archive
1. Download the archive containing the server folder and extract it to any directory on your computer (e.g., `C:\hubspot-mcp-server\` on Windows or your Home folder on macOS).

#### Step 2. Run the Setup Wizard

*   **🖥️ On Windows:**
    1. Double-click the **`setup.bat`** file inside the folder.
    2. A console window will pop up briefly to verify Node.js (installing it silently in the background if missing) and automatically launch the **Setup Wizard in your web browser**.
    3. In the browser setup form, paste the **Client ID** and **Client Secret** provided by your administrator.
    4. Click **"Save & Continue"**. This automatically registers the server globally in Claude Desktop, Cursor, Windsurf, and VS Code (Cline).
    5. You will be redirected to the HubSpot login page. Sign in under your **personal HubSpot credentials** and click the orange **"Authorize" (Connect app)** button.
    6. Once you see the **"Setup Complete!"** success screen displaying the configured applications, you can close the browser tab.

*   **🍎 On macOS (Mac):**
    1. Open your **Terminal** application.
    2. Navigate to the project folder and run:
       ```bash
       bash setup.sh
       ```
    3. The script will verify Node.js (installing it via Homebrew if needed) and launch the **Setup Wizard in your web browser**.
    4. Paste the **Client ID** and **Client Secret** provided by your administrator and click **"Save & Continue"**.
    5. Log in under your **personal HubSpot account** in the browser redirect and click **"Authorize"**.
    6. Once you see the **"Setup Complete!"** success page, the installation is finished!

#### Step 3. Restart and Chat!

*   **In Claude Desktop:** Completely restart Claude. A new **plug/MCP icon** will appear in the bottom right of the chat bar. Click it to verify `hubspot` is active.
*   **In Cursor:** Completely restart Cursor. The HubSpot server is added globally automatically! Verify it in Settings (`Ctrl + Shift + J` or `Cmd + Shift + J` on Mac) > **Features > MCP**.
*   **In Windsurf IDE:** Completely restart Windsurf. The server is configured globally in Cascade! Look for the **MCP icon** in the Cascade panel sidebar.
*   **In VS Code (Cline):** Completely restart VS Code. Cline will automatically detect and load the HubSpot server tools.

**Example prompts to ask your AI:**
*   *"Find deals associated with company Acme Corp"*
*   *"Show my last 5 created contacts in HubSpot"*
*   *"Create a new deal named 'Software License' with amount 25000"*

---

## Русская версия

Этот сервер протокола контекста моделей (Model Context Protocol - MCP) обеспечивает безопасное взаимодействие с вашими данными **HubSpot CRM** на естественном языке. Пользователи могут выполнять поиск, чтение, создание и обновление записей CRM (контактов, компаний, сделок) напрямую через локальных ИИ-ассистентов в таких средах, как **Cursor, Windsurf IDE, VS Code (расширение Cline) или Claude Desktop**.

Созданный как **полностью кроссплатформенное** и бесшовное решение, данный сервер исключает необходимость ручной установки зависимостей, редактирования конфигурационных файлов или выполнения консольных команд. Автоматический мастер настройки (Setup Wizard) выполняет всю конфигурацию самостоятельно.

### 💻 Руководство пользователя по установке (Всего 2 шага!)

#### Шаг 1. Распакуйте архив
Скачайте архив с программой и распакуйте его в любую удобную папку на компьютере (например, `C:\hubspot-mcp-server\` на Windows или в домашнюю папку на Mac).

#### Step 2. Запустите авто-настройку

*   **🖥️ На Windows:**
    1. Найдите файл **`setup.bat`** внутри папки и запустите его двойным щелчком мыши.
    2. Скрипт сам проверит наличие Node.js (установит в фоновом режиме в случае отсутствия), **автоматически найдет и настроит Claude Desktop, Cursor, Windsurf и VS Code (Cline)**, после чего откроет мастер настройки в браузере.
    3. Вставьте **Client ID** и **Client Secret**, полученные от администратора.
    4. Нажмите **«Save & Continue»**.
    5. Войдите под своим **личным аккаунтом HubSpot** и нажмите кнопку **«Подключить приложение»** (Authorize).
    6. Как только появится экран успеха с зеленой галочкой, закройте браузер.

*   **🍎 На macOS (Mac):**
    1. Откройте Терминал и перейдите в папку с проектом.
    2. Запустите команду:
       ```bash
       bash setup.sh
       ```
    3. Скрипт проверит наличие Node.js (при необходимости выполнит установку), **автоматически настроит все поддерживаемые программы** и откроет мастер настройки в браузере.
    4. Вставьте **Client ID** и **Client Secret**, полученные от администратора, и нажмите **«Save & Continue»**.
    5. Войдите под своим **личным аккаунтом HubSpot** и нажмите кнопку **«Подключить приложение»** (Authorize).
    6. Готово!

#### Шаг 3. Перезапустите программы и пользуйтесь!

*   **В Claude Desktop:** Перезапустите Claude. В чате появится **иконка розетки/вилки (MCP)**.
*   **В Cursor:** Перезапустите Cursor. Сервер подключится автоматически на глобальном уровне! Проверьте в Cursor Settings > **Features > MCP**.
*   **В Windsurf IDE:** Перезапустите Windsurf. Сервер подключится автоматически в боковой панели Cascade (иконка MCP).
*   **В VS Code (Cline):** Перезапустите VS Code. Cline автоматически подгрузит инструменты HubSpot.

---

## 🛠️ Developer Setup & Admin Configuration (Bilingual)

### 1. Register App in HubSpot / Регистрация в HubSpot
1. In HubSpot, go to **Settings** > **Integrations** > **Developer Apps** (or **MCP Auth Apps**).
   * *В HubSpot перейдите в Настройки > Интеграции > Developer Apps (или MCP Auth Apps).*
2. Click **Create app** (or **Create MCP auth app**).
   * *Нажмите Создать приложение.*
3. Set the Redirect URL to:
   * *Укажите Redirect URL:*
     `http://localhost:6274/oauth/callback/debug`
4. Copy the **Client ID** and **Client Secret**. Provide these to your users!
   * *Скопируйте Client ID и Client Secret и передайте их пользователям.*

### 2. Compile Server / Сборка сервера
Before packing the folder into a ZIP archive for your team, make sure to compile the TypeScript code:
* *Перед тем как запаковать папку в ZIP для команды, обязательно скомпилируйте TypeScript код:*
```bash
npm install
npm run build
```
*(You can exclude the `node_modules` folder from the final ZIP to keep it lightweight (~1MB) — the setup scripts will automatically download dependencies for users).*
*(Вы можете исключить папку `node_modules` из итогового ZIP-архива, чтобы сделать его легким (около 1 МБ) — скрипты установки скачают всё сами).*
