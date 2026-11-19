require('dotenv').config();

const path = require('path');
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT) || 3000;
const serviceTypes = new Set(['Регистрация', 'Багаж', 'Регистрация и багаж']);
const requestNumberPattern = /^[A-Z]{2}-\d{8}-\d{3}$/;

function makePoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    };
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_HOST ? { rejectUnauthorized: false } : undefined
  };
}

const pool = new Pool(makePoolConfig());

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function buildRequestNumber() {
  const date = new Date();
  const compactDate = [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('');
  const suffix = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `AP-${compactDate}-${suffix}`;
}

function validateRequest(body) {
  const passengerName = cleanText(body.passengerName, 100);
  const contactPhone = cleanText(body.contactPhone, 30);
  const flightNumber = cleanText(body.flightNumber, 10).toUpperCase();
  const serviceType = cleanText(body.serviceType, 30);
  const serviceDate = cleanText(body.serviceDate, 10);
  const comment = cleanText(body.comment, 500);
  const baggageCount = Number(body.baggageCount);

  if (passengerName.length < 2) return { error: 'Укажите имя пассажира (минимум 2 символа).' };
  if (!/^[+\d()\-\s]{7,30}$/.test(contactPhone)) return { error: 'Укажите корректный контактный телефон.' };
  if (!/^[A-Z0-9]{2,10}$/.test(flightNumber)) return { error: 'Номер рейса: 2–10 латинских букв или цифр.' };
  if (!serviceTypes.has(serviceType)) return { error: 'Выберите услугу из списка.' };
  if (!isIsoDate(serviceDate)) return { error: 'Дата должна быть в формате ГГГГ-ММ-ДД.' };
  if (!Number.isInteger(baggageCount) || baggageCount < 0 || baggageCount > 10) return { error: 'Количество мест багажа — целое число от 0 до 10.' };

  return { value: { passengerName, contactPhone, flightNumber, serviceType, serviceDate, baggageCount, comment: comment || null } };
}

app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/healthz', (_req, res) => res.type('text').send('ok'));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    res.status(500).json({ ok: false, error: 'База данных недоступна.' });
  }
});

app.post('/api/requests', async (req, res) => {
  const checked = validateRequest(req.body || {});
  if (checked.error) return res.status(400).json({ error: checked.error });

  const values = checked.value;
  const sql = `insert into app_data.requests
    (request_number, passenger_name, contact_phone, flight_number, service_type, service_date, baggage_count, comment)
    values ($1, $2, $3, $4, $5, $6, $7, $8)
    returning request_number, status, to_char(service_date, 'YYYY-MM-DD') as service_date`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const requestNumber = buildRequestNumber();
    try {
      const result = await pool.query(sql, [requestNumber, values.passengerName, values.contactPhone, values.flightNumber, values.serviceType, values.serviceDate, values.baggageCount, values.comment]);
      return res.status(201).json({
        message: 'Заявка успешно принята.',
        requestNumber: result.rows[0].request_number,
        status: result.rows[0].status,
        serviceDate: result.rows[0].service_date
      });
    } catch (error) {
      if (error.code === '23505' && attempt < 2) continue;
      console.error('Request creation failed:', error.message);
      return res.status(500).json({ error: 'Не удалось сохранить заявку. Попробуйте ещё раз.' });
    }
  }
});

app.get('/api/requests/:requestNumber', async (req, res) => {
  const requestNumber = cleanText(req.params.requestNumber, 15).toUpperCase();
  if (!requestNumberPattern.test(requestNumber)) return res.status(400).json({ error: 'Некорректный номер заявки.' });

  try {
    const result = await pool.query(
      `select request_number, flight_number, service_type,
        to_char(service_date, 'YYYY-MM-DD') as service_date,
        baggage_count, status, created_at
       from app_data.requests where request_number = $1`,
      [requestNumber]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Заявка не найдена.' });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Request lookup failed:', error.message);
    return res.status(500).json({ error: 'Не удалось выполнить поиск.' });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ error: 'Некорректный JSON.' });
  console.error('Unexpected server error:', error.message);
  return res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
});

app.listen(port, () => console.log(`Airport service portal running on port ${port}`));
