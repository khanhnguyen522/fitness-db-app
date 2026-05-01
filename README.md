# FitOps — Gym Management Web Interface

A full-stack web application built on top of an Oracle database for managing a boutique fitness studio.

## Tech Stack

- **Database:** Oracle Database
- **Backend:** Node.js + Express
- **Frontend:** React + Vite
- **Driver:** oracledb (thin mode)

## Features

- **Dashboard** — Live gym stats and monthly revenue breakdown by membership tier
- **Members** — Add, edit, delete members with automatic invoice generation
- **Classes** — Browse all classes with type, difficulty, trainer, and room info
- **Schedules** — Weekly timetable with date-based availability checker
- **Bookings** — Track attendance with status management
- **Invoices** — Monthly billing with payment status tracking
- **Trainers** — Manage trainer profiles and specialties

## Setup

### Prerequisites
- Node.js
- Oracle Database

### 1. Clone the repo
```bash
git clone https://github.com/[username]/fitness-db-app.git
cd fitness-db-app
```

### 2. Backend
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder with your database credentials then start the server:
```bash
node server.js
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

## Database

9 tables normalized to 3NF. Includes triggers for auto-calculating invoice amounts and updating payment status on payment insertion.
