# Instagram Send Fix - Analysis

## Problem
The `crmChatRouter.sendMessage` procedure ALWAYS uses Z-API (WhatsApp) to send messages,
regardless of the lead's source. When a lead is from Instagram (source="instagram"),
the message should be sent via Meta's Instagram Send API instead.

## How it works
- Instagram leads have `source = "instagram"` and `phone = IGSID` (Instagram-scoped ID like "1421842203207113")
- The `metaMessagingService.ts` already has the correct `sendText()` function that uses:
  - Endpoint: `https://graph.facebook.com/v21.0/me/messages?access_token=TOKEN`
  - Body: `{ recipient: { id: IGSID }, message: { text }, messaging_type: "RESPONSE" }`
- The AI attendant (`ai-attendant.ts`) already correctly routes to `metaMessaging.sendText()` when channel is 'meta'
- BUT the manual send from CRM (`crmChatRouter.sendMessage`) does NOT check the source

## Fix needed
In `crmChatRouter.sendMessage` (and sendImage, sendVideo, sendDocument, sendVehicle):
1. Check `lead.source` — if it's "instagram" or "messenger" or "facebook", use `metaMessaging.sendText()`
2. The `lead.phone` field already contains the IGSID for Instagram leads
3. Import `metaMessagingService` in crmRouter.ts

## Meta API confirmation
- POST to `/me/messages` with `recipient.id = IGSID` and `message.text = "..."` 
- Uses the same `pageAccessToken` stored in crm_integrations (type="facebook")
- The token stored (IGAAWI9ZAz...) is an Instagram token - should work for Instagram DMs
- NOTE: The endpoint uses `graph.facebook.com` (NOT graph.instagram.com) for sending

## Important: messaging_type
- Must be "RESPONSE" (within 24h of last user message)
- After 24h, need "MESSAGE_TAG" with a valid tag, or use "UPDATE" (limited)
