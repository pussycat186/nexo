# Nexo v2 - Secure Messaging Platform

A production-ready end-to-end encrypted (E2EE) messaging application with advanced cryptographic protocols and real-time delivery.

## Features

- **Ed25519 Passwordless Authentication**: Challenge-response authentication using Ed25519 digital signatures
- **X25519 + XChaCha20-Poly1305 Encryption**: Modern AEAD encryption with perfect forward secrecy
- **WebSocket Real-time Delivery**: ACK mechanism with idempotency protection for reliable message delivery
- **STH Chain Audit Trail**: Signed Tree Head for cryptographic message integrity verification
- **Read Receipts & TTL**: Configurable message settings with automatic expiration
- **Dual Database Support**: SQLite by default, PostgreSQL optional for production

## Project Layout

```
├── client/               # React TypeScript frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── lib/        # Crypto and WebSocket libraries
│   │   └── pages/      # Application pages
├── server/              # Express.js backend
│   ├── routes.ts       # API endpoints
│   ├── crypto.ts       # Server-side cryptography
│   └── storage.ts      # Database abstraction
├── shared/             # Shared types and schemas
└── data/              # SQLite database (auto-created)
```

## Quickstart

[![CI](https://github.com/your-org/nexo/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/nexo/actions/workflows/ci.yml)

### Local Development

```bash
# Install dependencies and set up environment
pnpm i && pnpm approve-builds --yes && pnpm setup:env

# Start development server
pnpm dev

# Run tests
pnpm test && pnpm e2e
```

Open http://localhost:5000 in your browser

### Docker Usage

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or with Docker directly
docker build -t nexo .
docker run -p 5000:5000 --env-file .env nexo
```

### CI/CD

The project includes GitHub Actions CI that:
- Runs type checking and unit tests
- Executes Playwright E2E tests
- Builds the production bundle
- All tests must pass before merge

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_ISSUER` | JWT issuer identifier | `nexo` |
| `DATABASE_URL` | PostgreSQL connection string | SQLite if unset |

When `DATABASE_URL` is not set, the application automatically uses SQLite at `./data/nexo.db`.

## Production Deployment

```bash
pnpm run build
NODE_ENV=production pnpm start
```

## License

MIT License - see LICENSE file for details