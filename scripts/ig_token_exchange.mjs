import mysql from 'mysql2/promise';

const CODE = "AQJ13G94niUUoe-bF8J1VS3zwtVLM_AWmkwTRufzcXqHGfssdOWvjwkpTz8vOoW9pRUcUXvsZLxbMgc9nW4U0RPAUnSWFF0-F3KuiTMg48M4r80uLSDhkwPS-HDc_021TIfGQ_lmCpiWugZnNUxc17jncwaJj3DlLCGgTI25kXbCEO3OkrdKH8odb6tZziT_0vv5YVQGh2dhqGzXQfG8cCEdkaNIu47XSl02IU4x7GIZg";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute("SELECT config FROM crm_integrations WHERE tenantId = 1 AND type = 'facebook'");
  if (rows.length === 0) {
    console.log("No facebook integration found");
    await conn.end();
    return;
  }
  const config = JSON.parse(rows[0].config);
  console.log("pageId:", config.pageId);
  console.log("appSecret exists:", !!config.appSecret);
  
  const clientId = "1557963362633013";
  const clientSecret = config.appSecret;
  const redirectUri = "https://kafkarank.com/api/webhooks/instagram";
  
  if (!clientSecret) {
    console.log("ERROR: appSecret is missing from config. Cannot exchange code.");
    await conn.end();
    return;
  }
  
  console.log("\n--- Step 1: Exchanging code for short-lived token ---");
  const tokenUrl = "https://api.instagram.com/oauth/access_token";
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code: CODE,
  });
  
  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await resp.json();
  console.log("Short-lived token response:", JSON.stringify(data, null, 2));
  
  if (data.error_message || data.error) {
    console.log("ERROR exchanging code:", data.error_message || data.error);
    await conn.end();
    return;
  }
  
  if (data.access_token) {
    console.log("\n--- Step 2: Exchanging for long-lived token ---");
    const longUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${data.access_token}`;
    const resp2 = await fetch(longUrl);
    const data2 = await resp2.json();
    console.log("Long-lived token response:", JSON.stringify(data2, null, 2));
    
    if (data2.access_token) {
      config.pageAccessToken = data2.access_token;
      if (data.user_id) config.igUserId = String(data.user_id);
      await conn.execute(
        "UPDATE crm_integrations SET config = ? WHERE tenantId = 1 AND type = 'facebook'",
        [JSON.stringify(config)]
      );
      console.log("\nSUCCESS! Long-lived token saved to database!");
      console.log("IG User ID:", data.user_id);
      console.log("Token expires in:", data2.expires_in, "seconds (~60 days)");
    } else {
      console.log("ERROR getting long-lived token:", JSON.stringify(data2));
    }
  }
  
  await conn.end();
}

main().catch(console.error);
