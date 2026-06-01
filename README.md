# 🚀 HubSpot MCP Server (Windows / macOS / Linux)

[English Version](#english-version) | [Русская версия](#русская-версия)

---

## English Version

This server allows your managers and sales representatives to securely connect **HubSpot CRM** to their **Cursor** or **Claude Desktop** applications using natural language. They can search contacts, view deal details, and create or update deals through their local AI assistants.

We designed this setup to be **completely frictionless and cross-platform**. Non-technical users do **not** need to install dependencies manually, edit complex JSON files, or write console commands. The installer does all the heavy lifting automatically!

### 💻 Onboarding Guide for Team Members (2 Easy Steps!)

#### Step 1. Unzip the Project Archive
1. Download the archive containing the server folder and extract it to any directory on your computer (e.g., `C:\hubspot-mcp-server\` on Windows or your Home folder on a Mac).

#### Step 2. Run the Setup Wizard

*   **🖥️ On Windows:**
    1. Double-click the **`setup.bat`** file inside the folder.
    2. A console window will pop up briefly, check for Node.js (installing it silently in the background if it's missing), and automatically launch the **Setup Wizard in your web browser**.
    3. In the browser setup form, paste the **Client ID** and **Client Secret** provided by your administrator.
    4. Click **"Save & Continue"**. This automatically registers the server globally in your Claude Desktop and Cursor.
    5. You will be redirected to the HubSpot login page. Sign in under your **personal HubSpot user credentials** and click the orange **"Authorize" (Connect app)** button.
    6. Once you see the **"Setup Complete!"** success screen with a green checkmark, you can close the browser tab.

*   **🍎 On macOS (Mac):**
    1. Open your **Terminal** application.
    2. Navigate to the project folder and run:
       ```bash
       bash setup.sh
       ```
    3. The script will verify Node.js (installing it via Homebrew if needed) and launch the **Setup Wizard in your web browser**.
    4. Paste the **Client ID** and **Client Secret** provided by your administrator and click **"Save & Continue"**.
    5. Log in under your **personal HubSpot account** in the browser redirect and click **"Authorize"**.
    6. Once you see the **"Setup Complete!"** success page, you are done!

#### Step 3. Restart and Chat!

*   **In Claude Desktop:** Completely restart Claude. A new **plug/MCP icon** will appear in the bottom right of the chat bar. Click it to verify `hubspot` is active.
*   **In Cursor:** Completely restart Cursor. The HubSpot server is added globally automatically! Verify it in Settings (`Ctrl + Shift + J` or `Cmd + Shift + J` on Mac) > **Features > MCP**.

**Example prompts to ask your AI:**
*   *"Find deals associated with company Acme Corp"*
*   *"Show my last 5 created contacts in HubSpot"*
*   *"Create a new deal named 'Software License' with amount 25000"*

---

## Русская версия

Этот сервер позволяет вашим менеджерам по продажам (сейлзам) подключаться к **HubSpot** прямо через **Cursor** или **Claude Desktop** с помощью искусственного интеллекта. Они смогут искать контакты, смотреть детали, создавать и обновлять сделки простым человеческим языком.

Мы сделали этот продукт **абсолютно кроссплатформенным** и полностью автоматическим. Сейлзам больше **не нужно писать сложные команды, вручную настраивать JSON-файлы или искать скрытые папки**. Скрипт сделает всё за них!

### 💻 Инструкция для менеджеров (Всего 2 шага!)

#### Шаг 1. Распакуйте архив
Скачайте архив с программой и распакуйте его в любую удобную папку на компьютере (например, `C:\hubspot-mcp-server\` на Windows или в домашнюю папку на Mac).

#### Шаг 2. Запустите авто-настройку

*   **🖥️ На Windows:**
    1. Найдите файл **`setup.bat`** внутри папки и запустите его двойным щелчком мыши.
    2. Скрипт сам проверит Node.js (если его нет — установит в фоновом режиме), **автоматически найдет и настроит Claude Desktop и Cursor**, после чего откроет мастер настройки в браузере.
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
    3. Скрипт проверит наличие Node.js (если его нет — установит), **автоматически настроит Claude Desktop и Cursor** и откроет мастер настройки в браузере.
    4. Вставьте **Client ID** и **Client Secret**, полученные от администратора, и нажмите **«Save & Continue»**.
    5. Войдите под своим **личным аккаунтом HubSpot** и нажмите кнопку **«Подключить приложение»** (Authorize).
    6. Готово!

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
4. Copy the **Client ID** and **Client Secret**. Give these to your sales reps!
   * *Скопируйте Client ID и Client Secret и передайте их сотрудникам.*

### 2. Compile Server / Сборка сервера
Before packing the folder into a ZIP archive for your team, make sure to compile the TypeScript code:
* *Перед тем как запаковать папку в ZIP для команды, обязательно скомпилируйте TypeScript код:*
```bash
npm install
npm run build
```
*(You can exclude the `node_modules` folder from the final ZIP to keep it lightweight (~1MB) — the setup scripts will automatically download dependencies for users).*
*(Вы можете исключить папку `node_modules` из итогового ZIP-архива, чтобы сделать его легким (около 1 МБ) — скрипты установки скачают всё сами).*
