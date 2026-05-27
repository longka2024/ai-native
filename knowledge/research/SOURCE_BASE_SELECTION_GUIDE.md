# Source Base Selection Guide

Use this guide before starting a new product.

## Default Decision

Do not combine source bases casually. Choose one host base first, then adapt specific modules from other bases through clear interfaces.

## When To Start With ShipAny

Prefer `shipany` when the project is:

- AI SaaS
- overseas-facing
- landing/pricing/content heavy
- needs a full admin/RBAC structure
- needs AI task tracking
- likely to deploy on Vercel/Cloudflare/Docker
- needs affiliate, analytics, customer-service extensions

Strong areas:

- app shell
- landing blocks
- admin area
- RBAC
- AI task model
- Stripe/PayPal/Creem
- deployment patterns

Weak/needs supplement:

- China payment providers are not first-pass visible
- China mobile/WeChat flow needs adaptation
- operator UI may need Chinese simplification

## When To Start With TinyShip

Prefer `tinyship` when the project is:

- China/payment heavy
- needs Alipay/WeChat Pay earlier
- needs phone/SMS flow
- needs OSS/COS storage
- benefits from multiple app variants
- needs a simpler module library layout

Strong areas:

- auth library
- payment providers: Stripe, PayPal, Alipay, WeChat, Creem
- Chinese payment guide
- storage providers: S3, OSS, COS
- SMS/email
- admin order/user/subscription table references

Weak/needs supplement:

- full AI SaaS app shell may be less focused than ShipAny
- admin/RBAC depth should be compared with ShipAny
- AI task recovery needs personal-image-report lessons

## When To Use Personal Image Report As Reference

Use the personal image report project as the reference for:

- manual payment review
- paid entitlement after human confirmation
- AI generation cost protection
- partial report failure detection
- single-page retry and repackaging
- admin original image thumbnails
- mobile image save flow
- report PDF/ZIP delivery

This project should not be the general SaaS base. It is a business-case reference and module source.

## Selection Matrix

| Project Type | Host base | Supplement modules |
| --- | --- | --- |
| Overseas AI SaaS | ShipAny | tinyship payment only if needed; personal-image-report AI recovery if image/report tasks exist |
| China AI paid tool | TinyShip or ShipAny after payment review | tinyship payment/SMS/storage; personal-image-report manual review and AI recovery |
| Report/image-generation product | ShipAny for SaaS shell or TinyShip for China payments | personal-image-report report delivery and retry modules |
| Simple landing + payment MVP | ShipAny | tinyship Alipay/WeChat if China payment required |
| WeChat/mobile-first product | TinyShip pending mini-program base | personal-image-report mobile flow lessons |
| Admin-heavy internal tool | ShipAny | tinyship table patterns if simpler |

## First 30 Minutes Of A New Project

1. Choose host base.
2. Record why in `docs/PROJECT_CONTEXT_INDEX.md`.
3. List reused modules.
4. List business-specific modules.
5. Define order/payment states.
6. Define admin operator tasks.
7. Add project harness docs.

## Rule

If a module is likely to be used by three projects, mark it as an extraction candidate immediately.

