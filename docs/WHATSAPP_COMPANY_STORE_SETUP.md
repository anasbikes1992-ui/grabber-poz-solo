# WhatsApp Setup - Company And Store Apps

## Decision

WhatsApp follows the same single-tenant rule as the rest of Grabber Business OS:

- `grabberpoz.com` uses the company WhatsApp number for inquiries, demos, sales, and client management.
- Each client/store app uses its own WhatsApp number for orders, repairs, support, delivery, and rider alerts.
- Do not point every client's Meta webhook to `grabberpoz.com` unless a future multi-tenant WhatsApp router is deliberately built.

## Company App

Meta callback:

```text
https://grabberpoz.com/api/whatsapp/webhook
```

Coolify environment:

```bash
WHATSAPP_TOKEN=<permanent Meta system user token>
WHATSAPP_PHONE_ID=<company WhatsApp phone number ID>
WHATSAPP_VERIFY_TOKEN=<strong random secret>
WHATSAPP_APP_SECRET=<Meta app secret>
WHATSAPP_API_VERSION=v26.0
COMPANY_SALES_WHATSAPP=94XXXXXXXXX
OWNER_WHATSAPP=94XXXXXXXXX
APP_URL=https://grabberpoz.com
LANDING_MODE=company
```

Company inbound replies:

- `1` - Book a live demo
- `2` - Pricing / onboarding scope
- `3` - Talk to sales
- `4` - Open demo storefront

## Store Or Client App

Example Meta callback:

```text
https://thepartystore.grabberpoz.com/api/whatsapp/webhook
```

Coolify environment:

```bash
WHATSAPP_TOKEN=<store Meta token>
WHATSAPP_PHONE_ID=<store WhatsApp phone number ID>
WHATSAPP_VERIFY_TOKEN=<store random secret>
WHATSAPP_APP_SECRET=<Meta app secret>
WHATSAPP_API_VERSION=v26.0
OWNER_WHATSAPP=94XXXXXXXXX
APP_URL=https://thepartystore.grabberpoz.com
STORE_NAME=ThePartyStore
LANDING_MODE=storefront
```

Store apps keep the customer menu for ordering, repair status, support escalation, and delivery/rider notifications.

## Meta Dashboard Checklist

1. Set the callback URL for the target app domain.
2. Paste the matching `WHATSAPP_VERIFY_TOKEN`.
3. Click **Verify and save**.
4. Subscribe at least the `messages` webhook field.
5. Send `hi` to the WhatsApp number.
6. Confirm the app replies with the correct company or store menu.
7. Confirm inbound messages appear in `/whatsapp`.
8. For company, submit a lead and confirm the sales WhatsApp receives the alert.

## Safety Rules

- Do not expose WhatsApp tokens through `NEXT_PUBLIC_*` variables.
- Do not share one `WHATSAPP_PHONE_ID` across unrelated client stores.
- Do not disable `WHATSAPP_APP_SECRET` in production.
- Do not centralize client messages into the company app while each client still has an isolated database.
