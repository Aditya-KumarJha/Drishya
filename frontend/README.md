# Drishya Frontend

React + Vite client for Drishya. It contains the public website, auth screens, dashboard, status pages, pricing, AI chat, logs, incidents, alerts, settings, and admin UI.

## Screenshots

![Demo 1](/demo/demo-1.png)
![Demo 2](/demo/demo-2.png)
![Demo 3](/demo/demo-3.png)
![Demo 4](/demo/demo-4.png)

## Tech Stack

- React 19
- Vite
- React Router
- Redux Toolkit
- Axios with cookie credentials
- Socket.IO client
- Tailwind CSS utility styling
- Lucide icons
- uPlot charts
- React Toastify
- Razorpay checkout script loaded at runtime

## Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Environment:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_AUTH_API_URL=http://localhost:3000
VITE_SITE_URL=http://localhost:5173
```

Build:

```bash
npm run build
```

## Project Structure

```text
frontend/
|-- public/
|   |-- demo/                 # README/demo screenshots
|   |-- favicon.svg
|   |-- robots.txt
|   `-- site.webmanifest
|-- src/
|   |-- components/
|   |   |-- charts/           # uPlot chart wrapper
|   |   `-- seo/              # SEO/meta helpers
|   |-- pages/
|   |   |-- admin/            # Admin route and admin dashboard
|   |   |-- auth/             # Sign in, sign up, OTP, recovery, protected route
|   |   |-- dashboard/        # Main authenticated dashboard
|   |   `-- home/             # Landing page sections
|   |-- services/
|   |   |-- axiosInstance.js  # API clients, refresh-token handling
|   |   |-- monitorApi.js     # Monitor CRUD
|   |   |-- logApi.js         # Raw logs and analytics
|   |   |-- reportApi.js      # SLA, incident export, email report
|   |   |-- chatApi.js        # AI chat conversations
|   |   |-- billingApi.js     # Billing summary and Razorpay verify
|   |   `-- socket.js         # Socket.IO connection
|   |-- store/
|   |   |-- authSlice.js
|   |   |-- dashboardSlice.js
|   |   `-- dashboardSelectors.js
|   |-- App.jsx               # Routes
|   |-- main.jsx              # React mount
|   `-- index.css             # Global styles
|-- package.json
`-- vite.config.js
```

## Main Screens

- Home: SEO landing page, feature sections, pricing CTA, public marketing content
- Auth: email/password OTP, OAuth callbacks, recover password
- Overview: profile card, credits, monitor stats, log coverage
- Monitors: create/edit/delete/pause monitors
- Incidents: incident-focused AI summary, timeline, postmortem, PDF/CSV/email report
- Logs: raw check logs, latency context, CSV export, log interpretation
- Alerts: alert history from the backend
- AI Chat: monitor-aware AI chat, saved conversations, search, delete, editable title, Pinecone memory option
- Status Pages: public monitor/project status links and SLA reports
- Pricing: INR credit packs with Razorpay checkout
- Settings: backend route summary, project creation, monitor configuration view

## Monitor Form Fields

- Project: optional project bucket used for grouping and project status pages.
- Group: simple label such as `Default`, `Core APIs`, or `Marketing`.
- URL: absolute `http` or `https` endpoint. Backend rejects localhost/private IPs to reduce SSRF risk.
- Method: HTTP verb. Use `GET` for normal pages, `POST/PUT/PATCH/DELETE` for API checks that require those verbs, and `HEAD` for lightweight header checks.
- Interval: how often the scheduler checks the monitor when cron is empty.
- Timeout ms: how long a check can wait before it is marked failed.
- Expected status: comma-separated status codes that count as success, such as `200`, `200,204`, or `201`.
- Alert recipients: extra team emails for incident alerts. The owner email is also included by backend.
- Response keyword: optional text that must be present in the response body.
- HTTP check: performs the main web/API request.
- SSL check: verifies HTTPS certificate validity/expiry.
- DNS check: verifies DNS resolution.
- Regions: labels for check regions. Current worker runs primary checks; labels are stored for regional expansion.
- Cron expression: optional five-field cron schedule. If set, it overrides interval scheduling.
- Headers JSON: request headers as JSON, for example `{"Authorization":"Bearer token"}`.
- Request body: raw body for POST/PUT/PATCH API checks.
- Active monitor: active monitors are checked and billed; paused monitors are not.
- Public status page: allows the monitor to be visible through public read-only status endpoints.

## Deployment

For Vercel:

```env
VITE_API_BASE_URL=https://your-render-api.onrender.com
VITE_AUTH_API_URL=https://your-render-api.onrender.com
VITE_SITE_URL=https://your-vercel-app.vercel.app
```

The backend must allow the Vercel origin through CORS and use production cookie settings.

