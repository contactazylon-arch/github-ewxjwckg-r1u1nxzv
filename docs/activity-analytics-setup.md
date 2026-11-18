# BotNexus activity analytics setup

## Cloudflare Worker configuration

Set the Worker variable/secret `BOTNEXUS_ADMIN_IDS` to a comma-separated list of Discord user IDs allowed to view analytics.

Example format (replace with real Discord user IDs; do not include names):
`BOTNEXUS_ADMIN_IDS=123456789012345678,234567890123456789`

Configure it on both the isolated test Worker (`botnexus-test`) and the production Worker (`botnexus-app`) when each is ready. Prefer a secret binding if supported by the Cloudflare dashboard. The value is read only by server-side code and is never returned to the browser.

To copy a Discord user ID: enable Developer Mode in Discord, open the user's profile/context menu, and choose Copy User ID.

## Collection model

- Public page views are counted without analytics cookies, IP addresses, device fingerprints, or visitor identifiers.
- The visit metric represents page views, not unique visitors. No anonymous visitor identifier or session-duration tracking is collected.
- Authenticated interactions require a valid BotNexus Discord session. Discord IDs are SHA-256 hashed before the event key is written to KV.
- Raw analytics events expire after 30 days.
- Detailed analytics are served only by `/api/admin/analytics`, which requires an authenticated session and an ID in `BOTNEXUS_ADMIN_IDS`.
- The public service-health endpoint does not expose activity metrics.

## Events currently collected

Public page views: overview, discover, servers, studio, alerts, settings.

Authenticated interactions: page views, bot detail views, catalogue searches, invite-link clicks, official-website clicks.

## Privacy and production checklist

Before enabling this on the public production site, update the privacy notice to explain the event categories, purpose, retention period, and administrator-only access. Review the applicable French CNIL/GDPR requirements and consent/objection requirements for the final analytics design. Do not describe page views as unique visitors.
