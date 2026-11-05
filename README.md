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
- `@prisma/client`
- `@prisma/adapter-pg`
- `pg`

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

> Add call tracking, follow-ups, and analytics here only after implementing and testing them.

## Project Structure

```text
PGfy-Sales-CRM/
│
├── Frontend/
│   └── ...
│
├── Backend/
│   │
│   ├── prisma/
│   │   └── schema.prisma
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
│   └── .env
│
├── ai-logs/
│   ├── day-1.md
│   └── day-2.md
│
└── README.md
```

## Prerequisites

Make sure you have installed:

- Node.js
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

Create a `.env` file inside the `Backend` directory.

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/pgfy_crm"
JWT_SECRET="your_secret_key"
PORT=5000
```

Replace the database username, password, and database name with your PostgreSQL configuration.

### 4. Prisma Configuration

This project uses Prisma ORM 7.10.1 with the PostgreSQL adapter.

Required packages:

```bash
npm install prisma@^7.10.1 @prisma/client@^7.10.1 @prisma/adapter-pg@^7.10.1 pg
```

Prisma schema location:

```text
Frontend/prisma/schema.prisma
```

Prisma configuration location:

```text
Backend/prisma.config.ts
```

Generate Prisma Client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate dev --name init
```

If migrations already exist, use the existing migration history rather than creating a duplicate initial migration.

### 5. Start the Backend

```bash
npm run dev
```

### 6. Frontend Setup

Open another terminal:

```bash
cd Frontend
npm install
npm run dev
```

The frontend will run at the local URL provided by Vite.

## Application Workflow

1. The user logs in using their credentials.
2. The backend validates the login credentials.
3. JWT authentication is used to authorize requests.
4. Role-based access determines which panel the user can access.
5. Admin users access the Admin Panel.
6. Sales Executives access the Sales Executive Panel.
7. Lead data is fetched from the PostgreSQL database.
8. Admin users can generate reports from the Admin Panel.

## Database

PostgreSQL is used as the primary database, and Prisma ORM is used to interact with it.

The database schema is maintained in:

```text
Backend/prisma/schema.prisma
```

## AI-Assisted Development

AI tools were used during development for guidance, implementation assistance, UI design, and debugging.

- **ChatGPT:** Assignment understanding, database design, Prisma configuration, backend implementation guidance, authentication, role-based access control, and debugging.
- **Claude:** Frontend page design and UI development assistance.

Detailed AI usage records are available in the `ai-logs` directory:

- `day-1.md` – Day 1 development activities and AI assistance.
- `day-2.md` – Day 2 development activities and AI assistance.

## Future Improvements

- Complete call tracking and call outcome history.
- Follow-up scheduling and reminders.
- Advanced sales performance analytics.
- Additional report formats and filtering options.

## Author

Developed as part of the PGfy Sales CRM & Call Tracking technical assignment.