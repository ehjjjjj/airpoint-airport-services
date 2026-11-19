# AirPoint — онлайн-запись на сервис аэропорта

Учебный веб-проект по теме №6: **«Моделирование работы аэропорта»**. Сайт принимает предварительную заявку пассажира на регистрацию и/или обслуживание багажа, сохраняет её в PostgreSQL Supabase и позволяет найти заявку по номеру без раскрытия контактных данных.

Архитектура: `браузер → Express / Node.js → pg → PostgreSQL Supabase`.

## Требования

- Node.js 20 или новее;
- проект Supabase с PostgreSQL;
- GitHub и аккаунт Render — для публикации.

## Локальный запуск

1. Установите зависимости:

   ```bash
   npm install
   ```

2. В Supabase создайте проект. В панели проекта откройте **SQL Editor**, вставьте содержимое [`database.sql`](database.sql) и нажмите **Run**.

3. Скопируйте `.env.example` в `.env` и заполните подключение. Рекомендуемый вариант — одна строка `DATABASE_URL` из Supabase: **Connect → Session pooler**. Не добавляйте `.env` в Git.

   ```env
   DATABASE_URL=postgresql://...
   PORT=3000
   ```

   Альтернатива: оставьте `DATABASE_URL` пустым и укажите `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

4. Запустите сервер:

   ```bash
   npm start
   ```

5. Откройте `http://localhost:3000`. Проверки доступны по адресам:

   ```bash
   curl http://localhost:3000/healthz
   curl http://localhost:3000/api/health
   ```

   Первый запрос должен вернуть `ok`, второй — `{ "ok": true }` при доступной базе.

## API

| Метод | Адрес | Назначение |
| --- | --- | --- |
| GET | `/` | выдаёт сайт |
| GET | `/healthz` | простая проверка приложения |
| GET | `/api/health` | проверка PostgreSQL через `SELECT 1` |
| POST | `/api/requests` | создаёт заявку, возвращает HTTP 201 |
| GET | `/api/requests/:requestNumber` | возвращает данные заявки без телефона |

## Тестовый сценарий

1. Заполните форму: имя, телефон, рейс, услуга, дата и количество мест багажа.
2. Браузер отправит `POST /api/requests`; Express проверит данные и выполнит параметризованный `INSERT` в Supabase.
3. Сервер вернёт HTTP 201 и номер формата `AP-YYYYMMDD-123`.
4. Вставьте номер в форму поиска. Сайт вызовет `GET /api/requests/:requestNumber` и покажет статус, рейс, услугу, дату и число мест багажа. Телефон в ответ не включается.
5. В Supabase откройте **Table Editor → app_data → requests**: появится новая строка. При необходимости переключитесь на схему `app_data` в списке схем.

## Публикация на GitHub

```bash
git init
git add .
git commit -m "Create airport service portal"
git branch -M main
git remote add origin https://github.com/USERNAME/airport-service-portal.git
git push -u origin main
```

## Публикация на Render

1. Отправьте проект в GitHub командами выше.
2. В Render выберите **New → Blueprint** и укажите репозиторий. Файл `render.yaml` задаст Node.js Web Service, `npm ci` и `npm run start`.
3. В настройках сервиса откройте **Environment** и добавьте `DATABASE_URL` — тот же URL Supabase, который используется локально.
4. Запустите Deploy. Render самостоятельно передаст `PORT`; сервер использует `process.env.PORT || 3000`.
5. После публикации проверьте `https://ВАШ-ДОМЕН/healthz` и `https://ВАШ-ДОМЕН/api/health`, затем создайте и найдите тестовую заявку через сайт.

## Файлы

```text
airport-service-portal/
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── .env.example
├── .gitignore
├── database.sql
├── package.json
├── render.yaml
├── README.md
└── server.js
```
