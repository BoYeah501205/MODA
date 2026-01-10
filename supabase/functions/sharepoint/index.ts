// Supabase Edge Function for SharePoint Integration
// Synced with deployed version

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TENANT_ID = Deno.env.get("SHAREPOINT_TENANT_ID") || "";
const CLIENT_ID = Deno.env.get("SHAREPOINT_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("SHAREPOINT_CLIENT_SECRET") || "";
const SITE_ID = Deno.env.get("SHAREPOINT_SITE_ID") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

async function getAccessToken() {
  const tokenUrl = "https://login.microsoftonline.com/" + TENANT_ID + "/oauth2/v2.0/token";
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials"
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  if (!response.ok) throw new Error("Token error: " + await response.text());
  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action;
    const accessToken = await getAccessToken();
    let result = {};

    if (action === "test") {
      result = { success: true, message: "SharePoint connected", siteId: SITE_ID };
    } 
    else if (action === "list") {
      const folderPath = body.folderPath || "";
      const url = "https://graph.microsoft.com/v1.0/sites/" + SITE_ID + "/drive/root:/" + encodeURIComponent(folderPath) + ":/children";
      const res = await fetch(url, { headers: { "Authorization": "Bearer " + accessToken }});
      result = res.ok ? await res.json() : { value: [] };
    } 
    else if (action === "upload") {
      const path = encodeURIComponent(body.folderPath + "/" + body.fileName);
      const url = "https://graph.microsoft.com/v1.0/sites/" + SITE_ID + "/drive/root:/" + path + ":/content";
      const buffer = Uint8Array.from(atob(body.fileContent), function(c) { return c.charCodeAt(0); });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Authorization": "Bearer " + accessToken, "Content-Type": "application/octet-stream" },
        body: buffer
      });
      if (!res.ok) throw new Error(await res.text());
      result = await res.json();
    } 
    else if (action === "download") {
      const url = "https://graph.microsoft.com/v1.0/sites/" + SITE_ID + "/drive/items/" + body.fileId;
      const res = await fetch(url, { headers: { "Authorization": "Bearer " + accessToken }});
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      result = { downloadUrl: data["@microsoft.graph.downloadUrl"] };
    }
    else if (action === "getViewUrl") {
      // Get web URL for viewing file in browser (not download)
      const url = "https://graph.microsoft.com/v1.0/sites/" + SITE_ID + "/drive/items/" + body.fileId;
      const res = await fetch(url, { headers: { "Authorization": "Bearer " + accessToken }});
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      result = { webUrl: data.webUrl };
    } 
    else if (action === "createFolder") {
      const parentPath = body.parentPath || "";
      const base = parentPath ? "root:/" + encodeURIComponent(parentPath) + ":/children" : "root/children";
      const url = "https://graph.microsoft.com/v1.0/sites/" + SITE_ID + "/drive/" + base;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Authorization": "Bearer " + accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({ name: body.folderName, folder: {}, "@microsoft.graph.conflictBehavior": "fail" })
      });
      result = res.status === 409 ? { exists: true } : await res.json();
    } 
    else if (action === "delete") {
      const url = "https://graph.microsoft.com/v1.0/sites/" + SITE_ID + "/drive/items/" + body.fileId;
      await fetch(url, { method: "DELETE", headers: { "Authorization": "Bearer " + accessToken }});
      result = { success: true };
    }
    else if (action === "createUploadSession") {
      // Create upload session for large file chunked upload
      const path = encodeURIComponent(body.folderPath + "/" + body.fileName);
      const url = "https://graph.microsoft.com/v1.0/sites/" + SITE_ID + "/drive/root:/" + path + ":/createUploadSession";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Authorization": "Bearer " + accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "replace" } })
      });
      if (!res.ok) throw new Error(await res.text());
      result = await res.json();
    }
    else {
      throw new Error("Unknown action: " + action);
    }

    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
