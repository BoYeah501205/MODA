// Supabase Edge Function for SharePoint Integration
// Handles authentication and file operations with Microsoft Graph API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TENANT_ID = Deno.env.get('SHAREPOINT_TENANT_ID') || '';
const CLIENT_ID = Deno.env.get('SHAREPOINT_CLIENT_ID') || '';
const CLIENT_SECRET = Deno.env.get('SHAREPOINT_CLIENT_SECRET') || '';
const SITE_ID = Deno.env.get('SHAREPOINT_SITE_ID') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Get access token from Microsoft
async function getAccessToken(): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// List files in a folder
async function listFiles(accessToken: string, folderPath: string) {
  const encodedPath = encodeURIComponent(folderPath);
  const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/drive/root:/${encodedPath}:/children`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { value: [] }; // Folder doesn't exist yet
    }
    const error = await response.text();
    throw new Error(`Failed to list files: ${error}`);
  }

  return await response.json();
}

// Upload a file
async function uploadFile(accessToken: string, folderPath: string, fileName: string, fileContent: ArrayBuffer) {
  // For files > 4MB, use upload session. For smaller files, use simple upload.
  const fileSizeMB = fileContent.byteLength / (1024 * 1024);
  
  if (fileSizeMB > 4) {
    return await uploadLargeFile(accessToken, folderPath, fileName, fileContent);
  }
  
  const encodedPath = encodeURIComponent(`${folderPath}/${fileName}`);
  const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/drive/root:/${encodedPath}:/content`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream'
    },
    body: fileContent
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload file: ${error}`);
  }

  return await response.json();
}

// Upload large file using upload session
async function uploadLargeFile(accessToken: string, folderPath: string, fileName: string, fileContent: ArrayBuffer) {
  const encodedPath = encodeURIComponent(`${folderPath}/${fileName}`);
  const sessionUrl = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/drive/root:/${encodedPath}:/createUploadSession`;
  
  // Create upload session
  const sessionResponse = await fetch(sessionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item: { "@microsoft.graph.conflictBehavior": "replace" }
    })
  });

  if (!sessionResponse.ok) {
    const error = await sessionResponse.text();
    throw new Error(`Failed to create upload session: ${error}`);
  }

  const session = await sessionResponse.json();
  const uploadUrl = session.uploadUrl;
  
  // Upload in chunks (10MB chunks)
  const chunkSize = 10 * 1024 * 1024;
  const totalSize = fileContent.byteLength;
  let offset = 0;
  let result;

  while (offset < totalSize) {
    const end = Math.min(offset + chunkSize, totalSize);
    const chunk = fileContent.slice(offset, end);
    
    const chunkResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': chunk.byteLength.toString(),
        'Content-Range': `bytes ${offset}-${end - 1}/${totalSize}`
      },
      body: chunk
    });

    if (!chunkResponse.ok && chunkResponse.status !== 202) {
      const error = await chunkResponse.text();
      throw new Error(`Failed to upload chunk: ${error}`);
    }

    result = await chunkResponse.json();
    offset = end;
  }

  return result;
}

// Download a file
async function downloadFile(accessToken: string, fileId: string) {
  const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/drive/items/${fileId}/content`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to download file: ${error}`);
  }

  return response;
}

// Get download URL for a file
async function getDownloadUrl(accessToken: string, fileId: string) {
  const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/drive/items/${fileId}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get file info: ${error}`);
  }

  const data = await response.json();
  return data['@microsoft.graph.downloadUrl'];
}

// Create a folder
async function createFolder(accessToken: string, parentPath: string, folderName: string) {
  const encodedPath = parentPath ? encodeURIComponent(parentPath) : '';
  const url = parentPath 
    ? `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/drive/root:/${encodedPath}:/children`
    : `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/drive/root/children`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "fail"
    })
  });

  if (!response.ok) {
    if (response.status === 409) {
      // Folder already exists, that's fine
      return { exists: true };
    }
    const error = await response.text();
    throw new Error(`Failed to create folder: ${error}`);
  }

  return await response.json();
}

// Delete a file
async function deleteFile(accessToken: string, fileId: string) {
  const url = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/drive/items/${fileId}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.text();
    throw new Error(`Failed to delete file: ${error}`);
  }

  return { success: true };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    
    // Get access token
    const accessToken = await getAccessToken();
    
    let result;
    
    switch (action) {
      case 'list':
        result = await listFiles(accessToken, params.folderPath || '');
        break;
        
      case 'upload':
        // File content should be base64 encoded
        const fileBuffer = Uint8Array.from(atob(params.fileContent), c => c.charCodeAt(0)).buffer;
        result = await uploadFile(accessToken, params.folderPath, params.fileName, fileBuffer);
        break;
        
      case 'download':
        const downloadUrl = await getDownloadUrl(accessToken, params.fileId);
        result = { downloadUrl };
        break;
        
      case 'createFolder':
        result = await createFolder(accessToken, params.parentPath || '', params.folderName);
        break;
        
      case 'delete':
        result = await deleteFile(accessToken, params.fileId);
        break;
        
      case 'test':
        // Test connection
        result = { 
          success: true, 
          message: 'SharePoint connection successful',
          siteId: SITE_ID 
        };
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('SharePoint function error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
