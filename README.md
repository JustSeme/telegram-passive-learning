# Telegram BitBrain Bot

A NestJS-based Telegram bot for passive learning using Telegraf, TypeORM, and SQLite.

## Features

- Passive learning any topic with Telegram every day

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env.example`:

3. Create data directory:
```bash
mkdir -p data
```

4. Start the application:
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Stack

- **NestJS** - Main framework
- **Telegraf** - Telegram bot framework
- **TypeORM** - Database ORM
- **SQLite** - Database
- **ConfigModule** - Environment configuration

## Development

The project follows NestJS best practices with:
- Modular architecture
- Dependency injection
- Type safety with TypeScript
- Environment-based configuration
- Database migrations support