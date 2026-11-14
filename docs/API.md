# API reference

This inventory is derived from the route handlers currently present in the source. Request and response schemas should be confirmed against the implementation before integration.

## Endpoints

- `GET /sse-ratings`
- `POST /register`
- `POST /login`
- `GET /meals`
- `GET /user/:email`
- `POST /book`
- `POST /pay`
- `POST /check-verified`
- `POST /verify`
- `GET /pending-verifications`
- `POST /cancel`
- `POST /rate`
- `GET /meal/:name`
- `GET /producer/stats`

## Conventions

- The local server uses the port configured by `PORT` where supported.
- JSON endpoints should send `Content-Type: application/json`; upload endpoints use `multipart/form-data`.
- Treat identifiers, location data, account data, and uploaded files as sensitive.
- Authentication and authorization requirements are implementation-specific; verify them before exposing an endpoint publicly.
