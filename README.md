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

## Quick Start

1. Install dependencies:
```bash
pnpm install  # or npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your settings
```

3. Start the development server:
```bash
pnpm run dev  # or npm run dev
```

4. Open http://localhost:5000 in your browser

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