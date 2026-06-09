# Smart Monitoring Web Platform - Frontend

React + Vite frontend for the Smart Monitoring Web Platform. It provides the public landing page, authentication flows, user dashboard, admin view, real-time monitor updates, charts, alerts, incidents, and AI insight screens.

## Tech Stack

- React 19
- Vite
- React Router
- Redux Toolkit
- Axios
- Socket.IO client
- Tailwind CSS
- uPlot charts
- Lucide React and React Icons

## Project Structure

```text
frontend/
|-- public/                 # Static files and deployment redirects
|-- src/
|   |-- assets/             # Images and visual assets
|   |-- components/         # Shared UI components
|   |-- pages/              # Home, auth, dashboard, and admin pages
|   |-- services/           # API and socket clients
|   |-- store/              # Redux slices, selectors, and store setup
|   |-- App.jsx             # Route definitions
|   |-- index.css           # Global styles
|   `-- main.jsx            # React entry point
|-- package.json
`-- vite.config.js
```

## Getting Started

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Update the API URLs if your backend is not running on the default local port:

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_AUTH_API_URL=http://localhost:4000
```

Start the development server:

```bash
npm run dev
```

The Vite app usually runs at `http://localhost:5173`.

## Available Scripts

```bash
npm run dev       # Start local dev server
npm run build     # Create production build
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint
```

## Backend Dependency

The frontend expects the backend API to be available and configured for CORS with the frontend origin. For local development, start the backend from `../backend` and make sure `CORS_ORIGIN` or `FRONTEND_URL` includes `http://localhost:5173`.

## Deployment

This app can be deployed to static hosting providers such as Vercel, Netlify, or Render Static Sites. Set the same `VITE_*` environment variables in the hosting dashboard before building.
