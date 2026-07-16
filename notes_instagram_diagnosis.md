# Instagram Integration Diagnosis

## Problem
Real Instagram DMs from kafkamultimarcas account are NOT appearing in the CRM.
Only 3 test leads (IG_SENDER_TEST_001/002/003) from 730 days ago exist.

## Key Findings

### Database Config
- **Tenant 1** (slug: `kafka-multimarcas`, name: "Kafka Multimarcas") has the Facebook integration:
  - ID: 1170001, type: "facebook", active: true
  - appId: 899961169822612
  - appSecret: ***set***
  - pageAccessToken: starts with "IGAAWI9ZAzNhTVBZAFpyODdkZA0tUV..."
  - verifyToken: "kafka_ig_verify_2026"
  - pageId: 1557963362633013
  - **dmEnabled: true** (this is correct)
  - commentTriggerWords: undefined (uses defaults)

- **Tenant 90001** (slug: `loja-teste-pedro`) does NOT have a facebook integration.

### Webhook URLs Available
1. `/api/webhooks/facebook` — handles both `object=page` and `object=instagram`
2. `/api/webhooks/instagram` — dedicated Instagram handler
3. `/api/webhooks/meta/leadgen` — also handles Instagram DMs
4. `/api/webhooks/meta/verify` — verification endpoint

### Recent Logs (Jul 15-16, 2026)
- Jul 15 20:23: Instagram webhook verified successfully (2 times)
- Jul 15 21:26: Instagram webhook POST received, but FAILED with DB insert error (missing profilePicUrl/socialUsername columns at that time)
- Jul 16 19:36: Facebook webhook processed 3 Instagram entries successfully (test leads IG_SENDER_TEST_001/002/003)

### The Real Issue
The webhook IS receiving data and processing it correctly for test events.
The problem is that **Meta is NOT sending the real Instagram DMs to our webhook**.

This means the issue is on the **Meta Developer Portal** side:
1. The webhook URL configured in Meta may be wrong/outdated
2. The Instagram Business Account may not be properly connected to the Facebook Page
3. The App may not have the required permissions (instagram_manage_messages)
4. The webhook subscription may not include "messages" field for Instagram

### What the User Needs to Check in Meta Developer Portal

1. **App Dashboard** (https://developers.facebook.com/apps/899961169822612/):
   - Go to Instagram > Webhooks
   - Verify the Callback URL is: `https://kafkarank.com/api/webhooks/facebook` (or `/api/webhooks/instagram`)
   - Verify the Verify Token is: `kafka_ig_verify_2026`
   - Ensure "messages" field is subscribed

2. **Instagram Account Connection**:
   - The Instagram Professional Account (kafkamultimarcas) must be connected to the Facebook Page (ID: 1557963362633013)
   - Go to Instagram Settings > Linked Accounts > Facebook

3. **App Permissions**:
   - The app needs: `instagram_manage_messages`, `pages_messaging`, `pages_manage_metadata`
   - These must be approved (not just in development mode)

4. **Page Access Token**:
   - The token (starting with IGAAWI9ZAz...) must have instagram_manage_messages permission
   - It should be a long-lived token (or system user token) that doesn't expire

5. **App Mode**:
   - If the app is in "Development" mode, only test users/admins can send messages that trigger webhooks
   - For production, the app must be in "Live" mode with approved permissions
