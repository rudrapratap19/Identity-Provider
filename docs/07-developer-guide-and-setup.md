# Document 07: Developer Guide and Setup

## 1. Local Prerequisites

Before starting development on the Identity Provider, ensure your local development machine has the following tools installed:

* **Node.js:** v20.0.0 or higher
* **npm:** v9.0.0 or higher
* **Docker Desktop:** Installed and running (provides PostgreSQL & Redis)
* **TypeScript:** Installed globally or via package dependencies (`npx tsc`)

---

## 2. Quick-Start Installation & Setup

### Step 1: Clone & Workspace Location
The project is initialized in your local directory:
```bash
D:\backend\identity-provider
```

### Step 2: Install Dependencies
Install all production and dev dependencies:
```bash
npm.cmd install
```

### Step 3: Environment Configuration (`.env`)
Ensure a `.env` file exists at the project root with the following key-value pairs:

```env
PORT=3000
NODE_ENV=development

# Database Connection (Docker Postgres)
DATABASE_URL="postgresql://admin:password123@localhost:5432/identity_provider?schema=public"

# Redis Connection (Docker Redis)
REDIS_URL="redis://localhost:6379"

# Cryptography & Secrets
JWT_SECRET="super-secret-development-key-change-in-production"
JWT_EXPIRES_IN="1h"
REFRESH_TOKEN_EXPIRES_IN="7d"
```

---

## 3. Infrastructure Management (Docker)

Start the local database and caching infrastructure using Docker Compose:

```bash
# Start PostgreSQL and Redis in detached mode
docker-compose up -d

# Check status of running containers
docker-compose ps

# Stop containers without removing volume data
docker-compose stop

# Tear down containers and networks
docker-compose down
```

---

## 4. Database Setup & Prisma Migrations

Initialize and synchronize the PostgreSQL database schema:

```bash
# Generate Prisma Client types
npx.cmd prisma generate

# Create and apply migration to local PostgreSQL database
npx.cmd prisma migrate dev --name init

# Open Prisma Studio (GUI database viewer)
npx.cmd prisma studio
```

---

## 5. Running the Application

### Development Mode (with Hot-Reload)
Runs the server using `tsx` to automatically reload on TypeScript file changes:
```bash
npm.cmd run dev
```

### Production Build & Execution
Compile TypeScript to JavaScript inside `dist/` and run the server:
```bash
# Build TypeScript
npx.cmd tsc

# Start production compiled server
node dist/index.js
```

---

## 6. Directory Layout & Architecture Overview

```
D:\backend\identity-provider/
├── docs/                      # Complete system documentation (01 to 09)
├── node_modules/              # Installed npm packages
├── prisma/
│   ├── migrations/            # SQL migration history
│   └── schema.prisma          # Prisma 7 database schema definition
├── src/
│   ├── config/                # Database & Redis client initialization
│   ├── controllers/           # Express endpoint request handlers
│   ├── middleware/            # Auth, validation, and error middlewares
│   ├── routes/                # Endpoint router definitions
│   ├── services/              # Business logic (crypto, tokens, auth codes)
│   ├── utils/                 # Logger and cryptographic helpers
│   └── index.ts               # Express application entry point
├── .env                       # Environment variables
├── docker-compose.yml         # Container configuration for Postgres & Redis
├── package.json               # Dependencies and scripts
└── tsconfig.json              # TypeScript configuration
```
