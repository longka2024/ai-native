# SaaS Source Base Registry

This registry tracks reusable SaaS source-code bases and what each base should be evaluated for.

## Current Bases

### shipany

- Repository: `https://github.com/shipanyai/shipany-template-two.git`
- Local target path: `E:\Codex\shipany-template-two`
- Role: SaaS template base for commercial AI/product sites.
- Status: cloned and first-pass audited.
- Stack: Next 16, React 19, Better Auth, Drizzle, multiple database providers, RBAC, Stripe/PayPal/Creem, AI extensions, storage extensions, admin area, Vercel/Cloudflare deploy paths.
- Evaluate for:
  - app shell
  - landing/pricing structure
  - authentication
  - payment/subscription
  - database/schema style
  - deployment pattern
  - admin/dashboard potential

First-pass module map:

| Module | Path | Rating | Reuse decision |
| --- | --- | --- | --- |
| App shell / landing | `src/themes/default`, `content`, `src/app/[locale]` | A | Strong candidate for AI SaaS marketing/front-office base. |
| Auth/account | `src/core/auth`, `src/app/api/auth/[...all]` | A | Strong Better Auth candidate. Compare against tinyship auth before choosing per project. |
| RBAC/admin permissions | `src/core/rbac`, `scripts/init-rbac.ts`, `scripts/assign-role.ts` | A | Strong candidate for reusable admin permission layer. Includes granular admin permissions. |
| Admin dashboard | `src/app/[locale]/(admin)/admin` | A | Strong candidate for full admin base: users, payments, subscriptions, credits, roles, permissions, settings, AI tasks. |
| Payment | `src/extensions/payment`, `src/app/api/payment` | A- | Strong for Stripe/PayPal/Creem. Lacks first-pass visible Alipay/WeChat providers, so China payments may lean tinyship. |
| AI task | `src/extensions/ai`, `src/app/api/ai`, `src/shared/models/ai_task.ts` | A- | Strong candidate for generic AI task module and admin AI task tracking. |
| Storage | `src/extensions/storage`, `src/app/api/storage/upload-image` | B+ | Good for S3/R2-style storage; compare with tinyship COS/OSS/S3 for China deployment. |
| Database models | `src/shared/models`, `src/core/db` | A- | Strong schema reference: user, order, subscription, credit, ai_task, apikey, chat. |
| Email | `src/extensions/email` | B+ | Candidate for notification module. |
| Analytics/customer service/affiliate/ads | `src/extensions/*` | B+ | Valuable growth/ops modules for future commercial sites. |
| Deployment | `vercel.json`, `wrangler.toml.example`, `Dockerfile`, scripts | A- | Useful deployment reference for Vercel, Cloudflare, Docker. |

Initial recommendation:

- Use `shipany` as the stronger full AI SaaS application shell and admin/RBAC reference.
- Use `tinyship` as the stronger China-payment candidate because it already contains Alipay/WeChat providers and Chinese payment documentation.
- For future AI web products, start by comparing `shipany` shell/admin/RBAC with `tinyship` payment/auth before choosing the main base.
- Do not mix both blindly. Pick one host base, then adapt specific modules from the other through clear interfaces.

### tinyship

- Repository: `https://github.com/longka2024/tinyship.git`
- Local target path: `E:\Codex\tinyship`
- Role: purchased SaaS system with richer existing product features.
- Stack: pnpm monorepo, Turbo, Node >= 22, Next/Nuxt/TanStack app variants, Drizzle, Better Auth, Stripe/PayPal/Alipay/WeChat payment providers.
- Evaluate for:
  - user system
  - payment integration
  - admin dashboard
  - order management
  - account settings
  - basic SaaS workflows
  - reusable backend/frontend patterns

First-pass module map:

| Module | Path | Rating | Reuse decision |
| --- | --- | --- | --- |
| Auth/account | `libs/auth` | A | Strong candidate for reusable account module. Better Auth, email/password, phone login, social login, WeChat plugin, admin roles. |
| Permissions | `libs/permissions` | B | Candidate for role/permission reuse after interface audit. |
| Payment | `libs/payment` | A | Strong candidate for reusable payment module. Has Stripe, PayPal, Alipay, WeChat, Creem provider structure. |
| Payment guide | `docs/PAYMENT_INTEGRATION_GUIDE_CN.md` | A | Keep as payment onboarding reference for company staff and integration planning. |
| Admin dashboard | `apps/next-app/app/[lang]/admin` | A- | Strong reference for admin users/orders/subscriptions/credits tables. Needs operator-friendly Chinese adaptation. |
| Storage | `libs/storage` | A- | Candidate for reusable asset module. Has S3, Ali OSS, Tencent COS providers. |
| Email | `libs/email` | B+ | Candidate for notification module after checking template flow. |
| SMS | `libs/sms` | B+ | Candidate for China phone verification/notification module. |
| AI | `libs/ai` | B | Candidate for shared AI provider wrapper, but image-report production rules remain business-specific. |
| Credits | `libs/credits` | B | Useful for token/credit products; evaluate before AI SaaS projects. |

Initial recommendation:

- Use `tinyship` first for account, payment, admin, storage, SMS/email, and credits.
- Keep personal image report's manual payment review and AI-job recovery logic as reference modules until formal payment is live.
- Do not migrate a business project into `tinyship` blindly; extract/adapt the module interfaces needed by the product.

## Evaluation Checklist For New Bases

When a new source base is purchased or cloned, record:

- Repository URL
- Local path
- License/commercial-use notes
- Tech stack
- Auth model
- Payment support
- Admin support
- Database/storage
- Deployment method
- Code quality
- Customization difficulty
- Best reusable modules
- Parts to avoid
- Fit for Chinese/mobile/WeChat scenarios

## Module Fit Matrix

| Capability | Preferred base | Notes |
| --- | --- | --- |
| User login/register | TBD after code audit | Prefer base-native implementation |
| Password reset | TBD after code audit | Avoid custom one-off reset logic where possible |
| Stripe/PayPal | TBD after code audit | Likely SaaS base responsibility |
| Alipay/WeChat Pay | TBD after code audit | May need China-specific adapter |
| Manual payment review | personal-image-report reference | Useful fallback before official channels |
| Admin order management | tinyship or custom extracted module | Needs operator-friendly Chinese UI |
| AI job queue | personal-image-report reference | Must prevent token waste |
| File upload/assets | TBD after code audit | Needs thumbnail/original separation |
| PDF/ZIP packaging | personal-image-report reference | Useful for report-style products |
| Mobile image save UX | personal-image-report reference | Important for WeChat users |

Updated first-pass decisions:

| Capability | Preferred base | Notes |
| --- | --- | --- |
| User login/register | tinyship `libs/auth` | Rating A. Better Auth with multiple login methods. |
| Password reset | tinyship `libs/auth` | Prefer adapting base flow. |
| Admin role/permissions | tinyship `libs/auth` + `libs/permissions` | Needs operator-friendly Chinese UI. |
| Stripe/PayPal | tinyship `libs/payment` | Rating A. Provider structure already present. |
| Alipay/WeChat Pay | tinyship `libs/payment` | Rating A candidate; still requires official account/material setup. |
| Manual payment review | personal-image-report reference | Transitional fallback and China ops workflow. |
| Admin users/orders/subscriptions | tinyship `apps/next-app/app/[lang]/admin` | Strong reference, adapt for each business. |
| AI job queue/retry | personal-image-report reference | Needs extraction into `modules/ai-task`. |
| File upload/assets | tinyship `libs/storage` + personal-image-report thumbnail/package lessons | Combine provider storage with production UX lessons. |
| PDF/ZIP packaging | personal-image-report reference | Useful for report-style products. |
| SMS | tinyship `libs/sms` | Candidate for phone verification and notifications. |
| Email | tinyship `libs/email` | Candidate for account/payment notifications. |

Second-pass cross-base preference:

| Capability | Current preferred source | Why |
| --- | --- | --- |
| AI SaaS app shell | shipany | More complete AI SaaS front-office/admin/deploy structure. |
| Landing/pricing/content | shipany | Dedicated theme/content blocks and pricing sections. |
| RBAC/admin permissions | shipany | Rich permission seed scripts and granular admin permission model. |
| Admin dashboard | shipany first, tinyship second | shipany appears broader; tinyship has useful tables and may be simpler. |
| China payment providers | tinyship | Alipay/WeChat providers and Chinese guide are explicit. |
| Stripe/PayPal | compare per project | Both have implementations. Choose by host app compatibility. |
| Storage for China | tinyship | OSS/COS providers fit China better. |
| Storage for overseas/Cloudflare | shipany | R2/S3 path fits Cloudflare/Vercel style apps. |
| AI task tracking | shipany + personal-image-report lessons | Shipany has model/table/admin; personal image report has real recovery lessons. |
| Manual payment fallback | personal-image-report | Proven operator workflow. |
| Report/PDF/ZIP delivery | personal-image-report | Domain-proven delivery flow. |

## Rule

Do not decide a reusable module by preference alone. Inspect the base code and choose the module with the best fit, simplest interface, and lowest long-term maintenance cost.
