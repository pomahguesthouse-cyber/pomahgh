# WhatsApp Chatbot Hardening - Env Matrix and Smoke Test

## 1) Required Secrets (must exist in Supabase Edge Functions)

Set these secrets at project level so all related functions can read them.

- CHATBOT_TOOLS_INTERNAL_SECRET
  - Used by: chatbot, chatbot-tools, whatsapp-webhook
  - Purpose: internal auth for tool execution endpoint
- WHATSAPP_WEBHOOK_TOKEN
  - Used by: whatsapp-webhook
  - Purpose: validate inbound webhook caller
- WHATSAPP_INTERNAL_SECRET
  - Used by: whatsapp-webhook, admin-chatbot
  - Purpose: internal auth for WhatsApp manager routing to admin-chatbot

## 2) Function Dependency Matrix

- chatbot
  - Requires: LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CHATBOT_TOOLS_INTERNAL_SECRET
- chatbot-tools
  - Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CHATBOT_TOOLS_INTERNAL_SECRET
- whatsapp-webhook
  - Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FONNTE_API_KEY, WHATSAPP_WEBHOOK_TOKEN, CHATBOT_TOOLS_INTERNAL_SECRET, WHATSAPP_INTERNAL_SECRET
- admin-chatbot
  - Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LOVABLE_API_KEY, WHATSAPP_INTERNAL_SECRET

## 3) Set Secrets (CLI)

Example command (PowerShell):

```bash
supabase secrets set \
  CHATBOT_TOOLS_INTERNAL_SECRET="replace-with-long-random-secret" \
  WHATSAPP_WEBHOOK_TOKEN="replace-with-webhook-token" \
  WHATSAPP_INTERNAL_SECRET="replace-with-internal-secret"
```

If deploying via dashboard, set the same keys in Edge Functions secrets for the same project.

## 4) Pre-smoke Sanity Check

- Confirm function config:
  - admin-chatbot verify_jwt = true
  - chatbot-tools verify_jwt = true
- Confirm deploy already includes latest patch for:
  - chatbot server-side tool orchestration
  - chatbot-tools auth gate
  - whatsapp-webhook token check and internal headers

## 5) Smoke Test Checklist (Staging)

Run in this order to minimize debugging time.

### A. Guest Web Chat

Goal: frontend no longer calls chatbot-tools directly and conversation still works.

- Open web chat widget/page.
- Send greeting message.
  - Expected: response returns normally.
- Ask availability question with specific dates.
  - Expected: response includes availability detail.
- Create booking draft request with complete guest data.
  - Expected: booking draft flow completes; response includes booking details/code.
- Verify network calls from browser.
  - Expected: browser only calls chatbot; no direct call to chatbot-tools.

Pass criteria:

- No 4xx/5xx on chatbot call.
- Response quality remains correct.
- Booking draft still created when requested.

### B. Guest WhatsApp

Goal: inbound webhook auth works and guest AI flow remains healthy.

- Send WhatsApp message from a non-manager number.
- First message in new session.
  - Expected: bot asks guest name.
- Send name reply.
  - Expected: bot confirms and continues normal assistance.
- Ask availability question.
  - Expected: normal AI response with tool-backed data.

Pass criteria:

- No unauthorized errors for valid webhook source.
- Session lifecycle still correct (awaiting_name -> active guest flow).

### C. Manager WhatsApp

Goal: manager routing to admin-chatbot still works with new internal secret checks.

- Ensure number is in whatsapp_manager_numbers.
- Send manager command/question via WhatsApp.
  - Expected: routed to admin mode and answered by admin-chatbot.
- Try role-specific request (for example pricing/stats depending role).
  - Expected: behavior respects manager role limits.

Pass criteria:

- Manager receives response.
- No internal secret/auth failures in logs.

### D. Booking Draft Flow (Cross-channel)

Goal: booking tool execution is stable after server-side refactor.

- From web chat, ask to create booking draft and provide mandatory fields.
- From WhatsApp guest flow, trigger booking tool path.

Expected:

- Tool executes server-side.
- Final assistant response returned.
- Booking metadata appears in conversation logs as before.

Pass criteria:

- No direct chatbot-tools call from frontend.
- Booking created successfully and references are present.

## 6) Negative Security Checks (quick)

### E. Block public chatbot-tools execution

- Call chatbot-tools endpoint without JWT and without X-Internal-Secret.
- Expected: 403 Unauthorized tool execution.

### F. Block spoofed manager access

- Call admin-chatbot with X-WhatsApp-Source and X-WhatsApp-Phone but without valid X-Internal-Secret.
- Expected: 403 Invalid internal WhatsApp secret.

### G. Block webhook without token

- Call whatsapp-webhook without token header/query.
- Expected: 401 unauthorized.

## 7) Rollback Trigger Conditions

Rollback if any of these happen in staging:

- Guest web chat cannot complete normal non-tool response.
- Booking draft tool path fails consistently.
- Manager WhatsApp routing breaks for registered manager numbers.
- Spike of 401/403 on valid traffic after deploy.

## 8) Observability Focus During Validation

Monitor logs for these strings:

- CHATBOT_TOOLS_INTERNAL_SECRET is not configured
- Invalid internal WhatsApp secret
- Unauthorized webhook request: invalid token
- Unauthorized tool execution

If any appears on valid traffic, treat as configuration mismatch first (not code regression).
