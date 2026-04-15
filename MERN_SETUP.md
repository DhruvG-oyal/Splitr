# Splitr — MERN Stack Setup

This project has been converted to a full-stack MERN application with AI integration.

## Architecture

```
client/   → React 18 + Vite (frontend)
server/   → Node.js + Express + MongoDB (backend)
```

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18, Vite, React Router v6, Tailwind CSS v4 |
| UI         | Radix UI, shadcn/ui components, Recharts        |
| Forms      | React Hook Form + Zod validation                |
| Backend    | Node.js, Express.js                             |
| Database   | MongoDB + Mongoose                              |
| Auth       | JWT + bcryptjs                                  |
| AI         | Google Gemini 1.5 Flash                         |
| Email      | Resend                                          |
| Scheduler  | node-cron (payment reminders + spending insights)|

## Features

- **Auth** — Register/login with JWT, protected routes
- **Dashboard** — Balance overview, monthly spending chart, group list
- **Expenses** — Create individual or group expenses with equal/percentage/exact splits
- **Groups** — Create groups, view pair-wise balances, manage members
- **Settlements** — Record payments between users (1-to-1 and group)
- **Contacts** — View all people and groups you've shared expenses with
- **AI Insights** — On-demand spending analysis via Google Gemini (`/insights`)
- **Background Jobs** — Daily payment reminders + monthly AI spending insights via email

## Setup

### 1. Server

```bash
cd server
cp .env.example .env   # fill in your values
npm install
npm run dev            # starts on http://localhost:5000
```

Required env vars:
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — any random secret string
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com)
- `RESEND_API_KEY` — from [Resend](https://resend.com) (for emails)
- `CLIENT_URL` — `http://localhost:5173`

### 2. Client

```bash
cd client
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api
npm install --legacy-peer-deps
npm run dev            # starts on http://localhost:5173
```

## API Endpoints

| Method | Path                              | Description                    |
|--------|-----------------------------------|--------------------------------|
| POST   | /api/auth/register                | Register new user              |
| POST   | /api/auth/login                   | Login, returns JWT             |
| GET    | /api/auth/me                      | Get current user               |
| GET    | /api/users/search?q=              | Search users by name/email     |
| POST   | /api/expenses                     | Create expense                 |
| GET    | /api/expenses/between/:userId     | Get expenses with a person     |
| DELETE | /api/expenses/:id                 | Delete expense                 |
| POST   | /api/groups                       | Create group                   |
| GET    | /api/groups/:id                   | Get group details + balances   |
| POST   | /api/settlements                  | Record settlement              |
| GET    | /api/settlements/data/:type/:id   | Get settlement data            |
| GET    | /api/dashboard/balances           | 1-to-1 balance summary         |
| GET    | /api/dashboard/groups             | User's groups with balances    |
| GET    | /api/dashboard/total-spent        | Year-to-date spending          |
| GET    | /api/dashboard/monthly-spending   | Monthly breakdown              |
| GET    | /api/contacts                     | All contacts (people + groups) |
| GET    | /api/ai/insights                  | AI spending analysis (Gemini)  |
