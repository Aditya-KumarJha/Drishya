# Drishya Backend

Express backend for Drishya monitoring. It provides authentication, monitor scheduling, raw logs, incidents, alerts, reports, billing, profile upload, AI chat, Socket.IO, and worker processes.

## Tech Stack

- Node.js + Express 5
- MongoDB + Mongoose
- Redis + BullMQ
- RabbitMQ
- Socket.IO
- Resend
- Groq
- Pinecone
- Razorpay
- ImageKit
- Passport Google/GitHub OAuth
- JWT access/refresh cookies

## Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

`npm run dev` starts the API and all local workers from `server.js`.

## Environment

```env
NODE_ENV=development
PORT=3000
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

MONGO_URI=mongodb://localhost:27017/drishya-auth

REDIS_URL=
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
BULLMQ_SKIP_VERSION_CHECK=true

RABBITMQ_URL=amqp://localhost:5672
QUEUE_PREFIX=DRISHYA

RESEND_API_KEY=
EMAIL_FROM=Drishya <no-reply@example.com>
ALERT_FAILURE_THRESHOLD=1
ALERT_OVERRIDE_EMAIL=

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
COOKIE_SAME_SITE=lax
COOKIE_SECURE=false

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

RZP_KEY_ID=
RZP_KEY_SECRET=

IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_PROFILE_FOLDER=/drishya/profiles

CHECK_CREDIT_COST=1
```

## Structure

```text
backend/
|-- server.js                       # Boot, DB connect, workers, graceful shutdown
|-- src/app.js                      # Express app, CORS, route mounts
|-- src/config/
|   |-- redis.js                    # ioredis connection
|   |-- bullmq.js                   # BullMQ option helper
|   `-- validateEnv.js              # startup env checks
|-- src/modules/
|   |-- auth/                       # users, OTP, OAuth, profile, ImageKit
|   |-- monitor/                    # monitor schema, validation, scheduler, queue
|   |-- logs/                       # raw logs and analytics
|   |-- incident/                   # incident create/resolve and AI trigger
|   |-- alert/                      # alert queue and alert records
|   |-- notification/               # RabbitMQ event email listener
|   |-- ai/                         # structured incident insight
|   |-- chat/                       # AI chat, saved conversations, Pinecone memory
|   |-- billing/                    # credits, Razorpay order/verify, usage charging
|   |-- report/                     # SLA, timeline, PDF/CSV/email report
|   |-- status/                     # public status endpoints
|   |-- project/                    # monitor projects/groups
|   |-- dashboard/                  # dashboard summaries
|   `-- admin/                      # admin endpoints
|-- src/queues/                     # alert queue connection
|-- src/sockets/                    # Socket.IO room/event helpers
`-- src/workers/                    # monitor, alert, AI workers
```

## API Map

| Path | Purpose |
| --- | --- |
| `/auth` | Register, OTP, login, refresh, OAuth, profile |
| `/monitors` | Create/list/update/delete monitors |
| `/projects` | Project/group metadata |
| `/logs` | Raw check logs and analytics |
| `/dashboard` | Summary and incident data |
| `/incidents` | Incident records |
| `/alerts` | Alert history |
| `/reports` | Uptime reports, incident timeline, postmortem, CSV/PDF/email |
| `/status` | Public monitor/project status |
| `/billing` | Credits, plans, Razorpay order/verify |
| `/chat` | AI chat conversations |
| `/ai` | AI insight reads |
| `/admin` | Admin-only views |

## Monitoring Flow

1. `POST /monitors` validates input and creates a monitor.
2. `monitor.service.js` queues an immediate first check.
3. `monitor.scheduler.js` scans active monitors every 5 seconds and queues due checks.
4. Redis locks prevent duplicate queueing across multiple backend instances.
5. `monitor.worker.js` runs HTTP, SSL, and DNS checks.
6. Logs are saved in MongoDB.
7. Successful checks reset failure counters.
8. Failed checks increment Redis failure counters.
9. Once `ALERT_FAILURE_THRESHOLD` is reached, an incident is created.
10. Incident creation triggers AI processing, alert queueing, RabbitMQ events, Socket.IO, and email notification.

## Billing Flow

1. New users receive default credits.
2. Active monitor checks deduct credits once per monitor per hour.
3. Paused or deleted monitors are not charged.
4. If credits are exhausted, active monitors are paused.
5. Frontend requests `/billing/orders`.
6. Razorpay collects payment.
7. Frontend posts payment signature to `/billing/verify`.
8. Backend verifies HMAC using `RZP_KEY_SECRET`.
9. Credits are added only after successful verification.

## Alert Flow

Alerts are incident-based. A single failed raw log does not necessarily mean an alert unless the failure threshold is reached. For demos, set:

```env
ALERT_FAILURE_THRESHOLD=1
```

Recipients are:

1. Monitor `notificationEmails`
2. Owner email
3. Or `ALERT_OVERRIDE_EMAIL` if configured

## Commands

```bash
npm run dev      # nodemon server.js
npm start        # node server.js
npm run build    # no compile step
```

## Production Notes

- Use strong JWT secrets.
- Set `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none` for Vercel + Render cross-site auth.
- Keep `COOKIE_DOMAIN` empty unless both apps share a parent domain.
- Use Redis `noeviction` where possible.
- Set `BULLMQ_SKIP_VERSION_CHECK=true` if hosted Redis warning spam is noisy.
- Configure Render health checks against `/`.
- Keep workers in the same process only for simple deployments; for heavy production traffic, split API and workers into separate Render services.

