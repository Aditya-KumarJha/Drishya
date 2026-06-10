# Smart Monitoring Web Platform

A full-stack website monitoring platform for tracking uptime, latency, incidents, alerts, and AI-assisted reliability insights. The project is split into a React/Vite frontend and a Node.js/Express backend.

## Features

- User authentication with email/password, OTP flows, Google OAuth, and GitHub OAuth
- Website monitor CRUD with custom intervals and HTTP methods
- Background checks through BullMQ and Redis
- Incident detection after repeated failures
- AI insight generation with Groq and optional Pinecone memory
- Email notifications through Resend and RabbitMQ-backed notification workers
- Dashboard analytics for uptime, latency, logs, incidents, alerts, and trends
- Admin views for platform-level monitoring
- Real-time updates through Socket.IO

## Repository Layout

```text
.
|-- backend/       # Express API, workers, queues, auth, monitoring, AI, alerts
|-- frontend/      # React + Vite client application
|-- .gitignore     # Root ignore rules
|-- LICENSE
`-- README.md
```

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB
- Redis
- RabbitMQ
- Resend API key for email delivery
- Groq API key for AI insights
- Optional Pinecone API key and index for insight memory

## Local Setup

Install backend dependencies:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Install frontend dependencies in a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

Render + Vercel deployment notes:

- Backend `CORS_ORIGIN` must include the deployed Vercel URL.
- Backend production cookie auth should use `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true`.
- Frontend `VITE_API_BASE_URL`, `VITE_AUTH_API_URL`, and `VITE_SITE_URL` should point at the deployed Render API and Vercel frontend URLs.

## Environment Files

Each app has its own example environment file:

- `backend/.env.example`
- `frontend/.env.example`

Do not commit real `.env` files. The root `.gitignore` keeps local secrets out of version control while allowing the example files to remain tracked.

## Useful Commands

Backend:

```bash
cd backend
npm run dev
npm start
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run preview
npm run lint
```

## Documentation

- Frontend details: `frontend/README.md`
- Backend details: `backend/README.md`
- Backend architecture notes: `backend/ARCHITECTURE.md`

## License

This project is licensed under the ISC License. See `LICENSE` for details.
