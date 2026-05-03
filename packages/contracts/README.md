# Contracts

Shared request, response, and websocket payload types for mobile, server, and web.

Rules:
- Keep this package transport-focused.
- Persistence schema lives in `@screenshot-sync/db-schema`.
- It is acceptable for transport types to derive from shared schema package types when it reduces duplication without importing app internals.
