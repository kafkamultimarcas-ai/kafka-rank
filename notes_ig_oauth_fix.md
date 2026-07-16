# Instagram Business Login OAuth - Key Findings

## Source: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login

## Critical Parameters for Token Exchange:
- `client_id` = Instagram App ID (NOT Facebook App ID, NOT Page ID)
  - Found at: App Dashboard > Instagram > API setup with Instagram login > 3. Set up Instagram business login > Business login settings > Instagram App ID
  - In our case: `1557963362633013` (confirmed from portal screenshot)
  
- `client_secret` = Instagram App Secret (NOT Facebook App Secret)
  - Found at: same settings page > Instagram app secret
  - This is the "Chave secreta do app do Instagram" shown in the portal

- `redirect_uri` = MUST be EXACTLY the same as used in the authorize URL
  - Must match what's registered in: Business login settings > OAuth redirect URIs
  - The portal might add trailing slash!
  - CHECK: Does the registered URI have a trailing slash?

- `code` = The authorization code from redirect
  - Strip the `#_` from the end
  - Valid for 1 hour, single use

## IMPORTANT DISCOVERY:
The `redirect_uri` registered in the Meta portal MIGHT have a trailing slash added automatically.
The authorize URL uses: `https://kafkarank.com/api/webhooks/instagram`
If the portal registered it as: `https://kafkarank.com/api/webhooks/instagram/` (with trailing slash)
Then the token exchange MUST also use the trailing slash version.

## Also: The `client_secret` must be the INSTAGRAM App Secret, not the Facebook App Secret.
These are DIFFERENT values. The Instagram App Secret is shown in the Business Login settings page.

## Known Bug (from community threads):
Many developers report this error even with identical URIs. Some found that:
1. Creating a NEW app works but existing apps don't
2. The issue might be related to how the code is URL-decoded
3. Some special characters in the code (like `_`) might need proper handling

## Our Config in DB:
- pageId: 1557963362633013 (this IS the Instagram App ID)
- appSecret: stored in config (need to verify this is the INSTAGRAM secret, not Facebook)
- The portal shows "Chave secreta do app do Instagram" with dots (hidden)

## Fix Strategy:
1. Verify the redirect_uri registered in portal matches EXACTLY (check trailing slash)
2. Verify appSecret in DB is the Instagram App Secret (not Facebook App Secret)
3. Try with trailing slash: `https://kafkarank.com/api/webhooks/instagram/`
4. Log the exact parameters being sent for debugging
