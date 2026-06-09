# Smart Monitoring Web Platform - Backend

Node.js backend for website uptime monitoring, incident detection, real-time dashboard data, AI-assisted reliability insights, authentication, and notification delivery.

## Tech Stack

- Node.js and Express 5
- MongoDB with Mongoose
- Redis with BullMQ for monitor and alert jobs
- RabbitMQ for notification message processing
- Socket.IO for real-time updates
- JWT, HTTP-only cookies, Passport, Google OAuth, and GitHub OAuth
- Groq for AI insight generation
- Pinecone for optional AI insight memory
- Resend for email notifications
- Zod and express-validator for validation

## Project Structure

```text
backend/
|-- server.js
|-- package.json
|-- ARCHITECTURE.md
`-- src/
    |-- app.js
    |-- config/
    |-- modules/
    |   |-- admin/
    |   |-- ai/
    |   |-- alert/
    |   |-- auth/
    |   |-- dashboard/
    |   |-- incident/
    |   |-- logs/
    |   |-- monitor/
    |   `-- notification/
    |-- queues/
    |-- sockets/
    |-- utils/
    `-- workers/
```

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Start the API in development:

```bash
npm run dev
```

Start the API in production mode:

```bash
npm start
```

The server defaults to `http://localhost:4000`.

## Required Services

- MongoDB for application data
- Redis for BullMQ queues
- RabbitMQ for notification queue processing
- Resend for outbound email
- Groq for AI insight generation
- Pinecone if you want AI insight memory and retrieval

## Environment Variables

Use `backend/.env.example` as the source of truth. Important variables include:

```env
NODE_ENV=development
PORT=4000
BACKEND_URL=http://localhost:4000
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

MONGO_URI=mongodb://localhost:27017/drishya-auth

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_PREFETCH=10
RABBITMQ_MAX_RETRIES=5
RABBITMQ_RETRY_BASE_DELAY_MS=5000
QUEUE_PREFIX=DRISHYA

RESEND_API_KEY=
EMAIL_FROM=no-reply@example.com
BRAND_NAME=Drishya
BRAND_SUPPORT_EMAIL=support@example.com

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
PINECONE_API_KEY=
PINECONE_INDEX_NAME=drishya
PINECONE_TEXT_FIELD=chunk_text
PINECONE_NAMESPACE_PREFIX=monitor-user
```

## API Overview

The backend mounts routes directly from the API root:

| Area | Base path | Purpose |
| --- | --- | --- |
| Auth | `/auth` | Register, login, OTP verification, refresh token, OAuth, current user, logout |
| Monitors | `/monitors` | Create, list, update, and delete user monitors |
| Logs | `/logs` | Monitor check logs and analytics |
| Dashboard | `/dashboard` | Dashboard summary, analytics, incidents, and AI data |
| Incidents | `/incidents` | Incident records and status data |
| Alerts | `/alerts` | Alert records and alert actions |
| AI | `/ai` | Monitor insights |
| Admin | `/admin` | Admin-only platform data |

Health check:

```bash
curl http://localhost:4000/
```

Expected response:

```json
{
  "status": "ok",
  "message": "Smart Monitoring API is running",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

## Auth Flow

The auth module supports:

- Email/password registration
- Register OTP verification
- Login OTP verification
- Forgot-password OTP verification
- JWT access and refresh tokens
- HTTP-only cookie sessions
- Google OAuth
- GitHub OAuth
- Role checks for admin endpoints

Common endpoints:

```text
POST /auth/register
POST /auth/verify-register-otp
POST /auth/login
POST /auth/verify-login-otp
POST /auth/forgot-password
POST /auth/verify-forgot-password-otp
POST /auth/reset-password
POST /auth/refresh
GET  /auth/me
POST /auth/logout
GET  /auth/google
GET  /auth/github
```

## Monitoring Flow

1. A user creates a monitor through `/monitors`.
2. `monitor.scheduler.js` scans active monitors.
3. Due checks are pushed into BullMQ.
4. `monitor.worker.js` performs the HTTP check.
5. Results are saved as logs.
6. The incident processor opens or resolves incidents based on failures.
7. AI and alert workers process insights and notifications when needed.

## AI Insights

The AI module builds a metrics snapshot from recent logs, active incident state, latency trend, failure rate, and optional Pinecone memory. It requests a structured JSON insight from Groq and validates it with the local schema before saving it.

If Groq is not configured or generation fails, the backend falls back to a deterministic local insight so the dashboard can still show useful guidance.

## Notifications

The notification module uses RabbitMQ for durable delivery and retry handling. Email delivery is handled through Resend. Failed RabbitMQ messages are retried with delay and then moved to a dead-letter queue after the configured retry limit.

## Useful Commands

```bash
npm run dev      # Start with nodemon
npm start        # Start with node
npm run build    # No build step required
```

## Deployment Notes

For production:

- Set `NODE_ENV=production`.
- Use managed MongoDB, Redis, and RabbitMQ services.
- Set secure JWT secrets.
- Configure `COOKIE_SECURE=true` when serving over HTTPS.
- Set `COOKIE_SAME_SITE` according to your frontend/backend hosting setup.
- Set `CORS_ORIGIN` to the deployed frontend URL.
- Configure provider keys for Resend, Groq, OAuth, and Pinecone as needed.

## License

ISC. See the root `LICENSE` file.
