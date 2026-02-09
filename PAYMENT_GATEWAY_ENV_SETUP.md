# Payment Gateway Environment Variables Setup

## Required Environment Variables

Add these to your Supabase Dashboard → Project Settings → Secrets:

### Core Duitku Configuration

```bash
# Duitku Merchant Credentials
DUITKU_MERCHANT_CODE=your_merchant_code_here
DUITKU_API_KEY=your_api_key_here

# Environment: sandbox or production
DUITKU_ENV=sandbox

# Callback Secret (generate a strong random string)
DUITKU_CALLBACK_SECRET=your_random_secret_key_here_min_32_chars
```

### Supabase Configuration (Auto-provided)

```bash
# These are automatically available in Supabase Edge Functions
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## How to Get Duitku Credentials

### 1. Register at Duitku
- Go to https://duitku.com
- Register for a merchant account
- Complete KYC verification

### 2. Get Sandbox Credentials
- Login to Duitku Dashboard
- Go to "Integration" or "API" section
- Copy Merchant Code and API Key
- For sandbox, use the test credentials provided

### 3. Get Production Credentials
- After completing integration testing
- Request production access from Duitku
- Use production credentials for live transactions

### 4. Generate Callback Secret

Generate a strong random string (min 32 characters):

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Or use any secure random generator
```

## Setting Up in Supabase

### Step 1: Access Secrets
1. Go to https://app.supabase.com
2. Select your project
3. Go to "Project Settings" → "Secrets"
4. Click "New Secret"

### Step 2: Add Each Secret
Add secrets one by one:
- Name: `DUITKU_MERCHANT_CODE`
- Value: your merchant code

Repeat for:
- `DUITKU_API_KEY`
- `DUITKU_ENV` (sandbox or production)
- `DUITKU_CALLBACK_SECRET`

### Step 3: Deploy Functions
After adding secrets, deploy your edge functions:

```bash
# Deploy all payment functions
npx supabase functions deploy duitku-create-transaction
npx supabase functions deploy duitku-callback
npx supabase functions deploy duitku-check-status
npx supabase functions deploy duitku-payment-methods
npx supabase functions deploy duitku-refund
npx supabase functions deploy payment-expiry-checker
```

## Security Best Practices

### 1. Never Commit Secrets
- Keep secrets in Supabase Dashboard only
- Never commit to git repository
- Use .env files for local development only

### 2. Rotate Secrets Regularly
- Rotate API keys every 3-6 months
- Update callback secret if compromised
- Monitor for suspicious activity

### 3. Use Different Keys for Different Environments
- Sandbox: Use test credentials
- Production: Use live credentials only after testing

### 4. Monitor Secret Usage
- Check Supabase logs regularly
- Set up alerts for failed authentication
- Review payment security logs

## Testing Your Setup

### Test 1: Verify Secrets are Set
```sql
-- Run in Supabase SQL Editor
SELECT * FROM vault.secrets WHERE name LIKE 'DUITKU%';
```

### Test 2: Test Create Transaction
```bash
curl -X POST https://your-project.supabase.co/functions/v1/duitku-create-transaction \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "test-booking-id",
    "payment_method": "BC"
  }'
```

### Test 3: Test Callback (Local)
Use ngrok or similar to test callbacks locally:
```bash
ngrok http 54321
# Update callback URL in Duitku dashboard
```

## Troubleshooting

### Error: "Invalid signature"
- Verify DUITKU_API_KEY is correct
- Check if using correct environment (sandbox/production)
- Ensure merchant code matches

### Error: "Callback secret mismatch"
- Verify DUITKU_CALLBACK_SECRET is set
- Check URL includes ?secret= parameter
- Ensure secret matches exactly

### Error: "Environment not set"
- Check DUITKU_ENV is set to "sandbox" or "production"
- Default is "sandbox" if not specified

## Migration Checklist

When moving from sandbox to production:

- [ ] Get production credentials from Duitku
- [ ] Update DUITKU_ENV to "production"
- [ ] Update DUITKU_MERCHANT_CODE to production code
- [ ] Update DUITKU_API_KEY to production key
- [ ] Test with small amount first
- [ ] Monitor payment security logs
- [ ] Set up alerts for failed payments
- [ ] Configure WhatsApp notifications for live payments

## Support

For Duitku API issues:
- Email: support@duitku.com
- Documentation: https://docs.duitku.com

For Supabase Edge Functions:
- Documentation: https://supabase.com/docs/guides/functions
