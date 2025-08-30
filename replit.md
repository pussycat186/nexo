# Overview

This is a full-stack secure messaging application built as "Nexo v2" - an end-to-end encrypted chat platform. The application implements modern cryptographic protocols including X25519 key exchange and XChaCha20-Poly1305 encryption with HKDF key derivation. It features real-time messaging through WebSockets, persistent message storage, and a modern React-based user interface.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client is built with React and TypeScript using Vite as the build tool. The architecture follows a component-based design with:

- **UI Framework**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React Query for server state and local React state for UI
- **Routing**: Wouter for client-side routing
- **Cryptography**: Mock crypto implementation (with plans for libsodium-wrappers integration)

The frontend implements end-to-end encryption workflows, real-time messaging via WebSockets, and a responsive chat interface with authentication flows.

## Backend Architecture

The server uses Express.js with TypeScript in an ES module setup. Key architectural decisions include:

- **API Design**: RESTful HTTP endpoints for core operations with WebSocket support for real-time features
- **Authentication**: JWT-based authentication with device-specific tokens and challenge-response verification
- **Session Management**: Challenge-based device registration with Ed25519 signature verification
- **WebSocket Integration**: Real-time message delivery with connection management per conversation

## Data Storage Solutions

The application uses a hybrid storage approach:

- **Primary Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Normalized tables for users, devices, conversations, participants, and messages
- **Migration Support**: Drizzle-kit for database schema migrations
- **Development Storage**: In-memory storage implementation for testing and development
- **Cryptographic Integrity**: STH (Signed Tree Head) chain implementation for message integrity verification

Database design supports multi-device users, direct conversations, and encrypted message storage with associated metadata.

## Authentication and Authorization

The security model implements multiple layers:

- **Device-Based Authentication**: Each device generates Ed25519 keypairs for identity
- **Challenge-Response Protocol**: Secure device registration using cryptographic challenges
- **JWT Tokens**: Short-lived access tokens with refresh token rotation
- **End-to-End Encryption**: X25519 ECDH key exchange with XChaCha20-Poly1305 AEAD
- **Key Derivation**: HKDF-SHA256 for session key generation with forward secrecy

## External Dependencies

- **Database**: Neon serverless PostgreSQL for production data persistence
- **Cryptography Libraries**: 
  - PyNaCl for server-side cryptographic operations
  - libsodium-wrappers planned for client-side encryption
- **Real-time Communication**: Native WebSocket implementation for message relay
- **UI Components**: Radix UI primitives for accessible component foundation
- **Development Tools**: 
  - Replit integration for development environment
  - Vite with HMR for fast development iteration
- **Security**: JWT for authentication tokens, bcrypt-style key derivation for secure session management

The architecture prioritizes security, real-time performance, and developer experience while maintaining a clear separation between client and server responsibilities.