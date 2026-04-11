# Production-Ready Express Backend

This is a production-ready Node.js backend built with Express, PostgreSQL, and Prisma. It follows a clean architecture with a focus on security and scalability.

## Features

* User authentication (register, login)
* Protected routes with JWT
* Centralized error handling
* Input validation with Zod
* Password hashing with bcrypt
* Security headers with Helmet
* CORS and rate limiting
* Logging with Morgan

## Tech Stack

* **Backend:** Node.js, Express
* **Database:** PostgreSQL
* **ORM:** Prisma

## Getting Started

### Prerequisites

* Node.js
* PostgreSQL

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   ```
2. Navigate to the `server` directory:
   ```bash
   cd server
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the `server` directory and add the following environment variables:
   ```
   PORT=3000
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
   JWT_SECRET=your-super-secret-key
   ```
   Replace the placeholder values with your actual database credentials and a secure JWT secret.

5. Run the database migrations:
   ```bash
   npx prisma migrate dev
   ```

### Running the Application

To run the application in development mode (with auto-reload):

```bash
npm run dev
```

The server will be available at `http://localhost:3000`.


# install prisma client 
npm install @prisma/client
npm install prisma --save-dev