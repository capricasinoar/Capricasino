# CAPRI CASINO — Game Aggregation Partnership Proposal

> **Private Crypto Gaming Platform**
> Confidential — for the addressed provider only.
> Prepared for: `[Provider name]` · `[2025]`

Placeholders in `[brackets]` are to be completed before sending.

---

## Cover

- **Operator:** CAPRI CASINO
- **Model:** Private · Invitation-only
- **Seeking:** Game aggregation (API)
- **Website:** `[yourdomain.com]`
- **Tagline:** Private Crypto Gaming Platform

---

## Executive Summary

A private operator that owns its full stack — and needs your content.

We are **not a public casino** and we are **not looking for a platform**. We have built the operator technology ourselves. What we want from you is one thing, done well: a premium game catalogue via a single seamless-wallet API.

- **Invitation only** — accounts are created and funded by the operator for a curated, selected user base. No open public sign-up.
- **Proprietary tech** — frontend, backend, wallet, user system, admin, bonus and VIP engines are all in-house. No white-label dependency.
- **API integration** — our seamless-wallet integration layer is already built and tested. We plug your aggregator in behind a clean, versioned contract.

> **Full disclosure.** This document contains no invented metrics, users, revenue, licences or commercial agreements. Where information is pending it is shown as a clearly marked placeholder. **Licensing status & jurisdiction:** `[to be confirmed]`.

---

## Our Platform

Everything is ours — except the games. The entire operator stack is developed and operated in-house. We are deliberately **not** pursuing a white-label solution.

**Built & operated in-house:** Frontend (player web) · Backend (API core) · Wallet (ledger) · User system (auth) · Admin (backoffice) · Bonus engine (wagering) · VIP / rewards · Audit trail (reporting)

**Foundation in place · on roadmap:** Referral / affiliate · Risk & anti-fraud rules

**What we integrate from you:** Slots · Live Casino · Crash · Instant Games

**What we do NOT need:** Platform · Frontend · Wallet · CRM · Backoffice · White Label

A lean integration for you: no platform migration, no shared UI, no wallet reconciliation on your side. Just content behind a seamless wallet.

---

## Architecture

One socket for your aggregator. Balance and player custody live entirely on our side. The aggregator receives signed debit / credit calls during play — the standard seamless-wallet model.

```
  01  Player            Browser · authenticated session       HTTPS · WS
        ↓
  02  Frontend          Next.js · React · real-time UI         SSR / SPA
        ↓
  03  Backend           API core · sessions · game launch      REST · JWT
        ↓
  04  Wallet            Double-entry ledger · authoritative     ACID
        ↓
  05  Game Aggregator API   ← YOU PLUG IN HERE
        launch · debit · credit · rollback
        ↓
  06  Providers         Certified studios & RNG (your infra)
```

**Integration targets:** Pragmatic Play · Evolution · Play'n GO · Spribe · Hacksaw Gaming · BGaming · + your full catalogue.
*Provider studios listed as integration targets — no existing agreement is implied.*

---

## Technology

A modern stack built for high-volume integrations. Type-safe end to end, containerised and cloud-portable. A modular core designed to scale horizontally and to extract services as volume grows.

- **Language & runtime:** Node.js, TypeScript
- **Frontend:** Next.js, React, WebSockets
- **Backend:** REST API, JWT, modular core
- **Data:** PostgreSQL, Redis
- **Delivery:** Docker, cloud-portable, edge CDN
- **Real-time:** WebSockets, event bus

> Infrastructure is container-based and portable across major clouds (AWS / GCP) and managed platforms; current hosting and CDN/WAF layer: `[to be confirmed]`.

---

## Wallet

A proprietary, auditable wallet. Player custody is ours. Every movement is a double-entry accounting record — balance is a consequence of the ledger, never an editable number.

- **USD balances** — integer minor units, never floating point.
- **Double-entry ledger** — append-only, every entry sums to zero.
- **Auditable transactions** — full, immutable history.
- **Unique transaction IDs** — per economic operation.
- **Rollback support** — reversing entries, originals never deleted.
- **Idempotency** — safe retries, no double debit or credit.

| Ledger example — one €10 bet | Debit | Credit |
|---|---|---|
| `player:cash` | 10.00 | |
| `house:wagering` | | 10.00 |

*Balance is recomputable from the ledger at any point — verifiable, not asserted.*

---

## Security

Economic integrity by design. Nothing that touches balance bypasses the wallet, and every provider call is signed and verified before any logic runs.

- **Authentication** — short-lived JWT with rotating refresh + reuse detection; 2FA (TOTP) for administrators.
- **Callback signing** — HMAC-signed provider callbacks, verified in constant time before any wallet logic executes.
- **Rate limiting** — per-IP and per-account throttling on authentication.
- **Encrypted at rest** — sensitive secrets encrypted (AES-GCM); injected at runtime, never committed.
- **HTTPS & headers** — TLS everywhere, strict security headers (CSP, HSTS), production secret guard on boot.
- **Logs & audit** — immutable audit trail on every sensitive action; structured logs and metrics.

Also: Backups · Monitoring · Audit trail · Metrics.

---

## API Readiness

The integration layer is already built. We implemented the full seamless-wallet protocol and hardened it against a simulated provider — including a "chaos mode" that fires duplicates, timeouts and out-of-order events. Integrating your API means writing one adapter to our stable contract.

| Operation | Direction | Status |
|---|---|---|
| Launch game | operator → provider | Implemented |
| Get balance | provider → operator | Implemented |
| Debit (bet) | provider → operator | Implemented |
| Credit (win) | provider → operator | Implemented |
| Rollback | provider → operator | Implemented |
| Session tokens | operator | Implemented |
| Signed callbacks / webhooks | bidirectional | Implemented |
| Idempotency & retries | operator | Implemented |
| Transaction validation | operator | Implemented |
| Provider adapter (your API) | operator | On integration |

Our provider layer is abstracted behind a single port. Swapping the simulated provider for your live aggregator is an adapter change — the wallet, catalogue and player experience do not change.

---

## Scalability

From 100 to 100,000 players — same architecture. The application tier is stateless; state lives in PostgreSQL and Redis. Growth is served by adding replicas behind a load balancer, not by re-architecting. *(Structural design target, not a traffic claim.)*

- **100** — pilot
- **1,000** — beta
- **10,000** — launch
- **100,000** — scale

Supported by: stateless tier (horizontal scaling) · PostgreSQL read replicas + Redis · module boundaries for service extraction under load.

---

## What We're Looking For

A content partnership — nothing more, nothing less.

**We want:** game aggregation via a single API · Slots · Live Casino · Crash · Instant games.

**We do not need:** full platform · frontend · wallet · CRM · backoffice · player management · payments / PSP · white label.

This makes us a low-overhead partner: a single technical integration, one commercial contract, one reconciliation surface.

---

## Commercial Model

Flexible terms, long-term intent. We are open to the standard structures of the industry.

- **Revenue Share (GGR %)** — a percentage of gross gaming revenue on your content.
- **API / Integration Fee** — a defined fee structure for access and integration.
- **Hybrid** — a blend of revenue share with a fee or floor.
- **Minimum Guarantees** — open to discussing as the relationship establishes.

> Specific rates, revenue-share percentages and minimums are `[to be negotiated]`. No commercial terms are asserted in this document.

---

## Roadmap

- **Phase 01 — MVP (proprietary platform):** *Done.* Full operator stack built & deployed.
- **Phase 02 — Provider integration:** *Current.* The purpose of this proposal.
- **Phase 03 — Beta:** *Next.* Closed beta with a curated, invited group.
- **Phase 04 — Launch:** full private launch to the selected user base.
- **Phase 05 — Marketing & LATAM expansion.**
- **Phase 06 — Global expansion.**

> Timeline reflects current build status. Dates and licensing milestones per market are `[to be confirmed]`.

---

## Contact

- **Company:** `[Legal entity name]`
- **Website:** `[yourdomain.com]`
- **Email:** `[partnerships@yourdomain.com]`
- **Telegram:** `[@handle]`
- **WhatsApp:** `[+00 000 000 000]`
- **LinkedIn:** `[/company/…]`

---

*CAPRI CASINO — Private Crypto Gaming Platform. Confidential — for the addressed provider only.*
