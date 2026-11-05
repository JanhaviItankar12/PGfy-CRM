# PGfy Sales CRM & Call Tracking

A role-based Sales CRM application developed to manage leads, sales executives, lead assignments, and sales reports.

## Tech Stack

**Frontend**
- React.js
- TypeScript
- Tailwind CSS
- RTK Query

**Backend**
- Node.js
- Express.js
- TypeScript

**Database & ORM**
- PostgreSQL
- Prisma ORM 7.10.1
- @prisma/client
- @prisma/adapter-pg
- pg

**Authentication**
- JWT
- Role-Based Access Control (RBAC)

## Features

### Admin Panel
- Admin authentication.
- View and manage lead information.
- View sales executive information.
- Assign leads to sales executives.
- Fetch lead data from the database.
- Generate and download reports.

### Sales Executive Panel
- Sales executive authentication.
- View assigned leads.
- Access lead information.

### Other Implementations
- JWT-based authentication.
- Role-based access for Admin and Sales Executive.
- PostgreSQL database integration using Prisma.
- Dummy data for testing.
- Report generation in the Admin Panel.

> Additional features such as call tracking, follow-ups, and advanced analytics can be added as future improvements.

## Project Structure

```text
PGfy-Sales-CRM/
│
├── Frontend/
│   └── ...
│
├── Backend/
│   ├── prisma/
│   │   ├── schema/
│   │   │   └── schema.prisma
│   │   ├── migrations/
│   │   │   ├── migration_lock.toml
│   │   │   └── 20261103150343_init/
│   │   │       └── migration.sql
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── routes/
│   │
│   ├── prisma.config.ts
│   ├── server.ts
│   ├── package.json
│   └── .env.example
│
├── ai-logs/
│   ├── day-1.md
│   └── day-2.md
│
└── README.md
```

## Prerequisites

Make sure the following software is installed:

- Node.js (LTS version)
- npm
- PostgreSQL
- Git

## Installation and Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd PGfy-Sales-CRM
```

### 2. Backend Setup

```bash
cd Backend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside the `Backend` directory using `.env.example` as a reference.

**Backend/.env.example**

```env
DATABASE_URL="postgresql