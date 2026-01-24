// Extended Drawing Analysis Edge Function
// Supports: Wall IDs, MEP Fixtures, Version Change Detection
// Deploy: supabase functions deploy analyze-drawing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to convert Uint8Array to base64 without stack overflow
function uint8ArrayToBase64(bytes) {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

// Prompts for different extraction types
const PROMPTS = {
  walls: `Analyze this structural/architectural drawing and extract ALL wall information.

For each wall found, identify:
- wall_id: The wall tag/ID (e.g., "W1", "MW14.5", "EW-01")
- wall_type: Interior, Exterior, Shear, Partition, or other
- wall_height: Height dimension if shown
- wall_thickness: Thickness/width if shown
- stud_spacing: Stud spacing (e.g., "16" O.C.")
- stud_gauge: Steel gauge if shown (e.g., "20 GA")
- grid_location: Grid reference if visible
- orientation: N-S, E-W, or angle

Return a JSON object:
{
  "walls": [
    {
      "wall_id": "W1",
      "wall_type": "Interior",
      "wall_height": "9'-0\\"",
      "wall_thickness": "6\\"",
      "stud_spacing": "16\\" O.C.",
      "stud_gauge": "20 GA",
      "grid_location": "A-B/1-2",
      "orientation": "N-S",
      "confidence": 95
    }
  ],
  "total_walls": 5,
  "confidence": 90
}

Return ONLY the JSON object.`,

  mep_fixtures: `Analyze this MEP (Mechanical/Electrical/Plumbing) drawing and extract ALL fixtures.

For each fixture found, identify:
- fixture_tag: The symbol tag (e.g., "P-1", "E-101", "M-01")
- fixture_type: Specific type (Outlet, Switch, Sink, Toilet, HVAC Register, etc.)
- fixture_category: Electrical, Plumbing, Mechanical, or Fire Protection
- description: Full description if in legend
- quantity: Count of this fixture type on the sheet
- grid_location: Grid reference if visible
- room_name: Room name if identifiable

Return a JSON object:
{
  "fixtures": [
    {
      "fixture_tag": "E-101",
      "fixture_type": "Duplex Outlet",
      "fixture_category": "Electrical",
      "description": "120V Duplex Receptacle",
      "quantity": 8,
      "grid_location": "B-C/2-3",
      "room_name": "Living Room",
      "confidence": 90
    }
  ],
  "total_fixtures": 25,
  "fixture_summary": {
    "Electrical": 15,
    "Plumbing": 8,
    "Mechanical": 2
  },
  "confidence": 85
}

Return ONLY the JSON object.`,

  version_compare: `Compare these two versions of the same drawing sheet and identify ALL changes.

For each change found, identify:
- change_type: Added, Removed, Modified, or Relocated
- change_category: Structural, MEP, Dimensional, Annotation, or Other
- change_severity: Minor (cosmetic), Moderate (affects construction), Major (structural impact), Critical (safety)
- description: Clear description of what changed
- affected_elements: List of affected walls, fixtures, dimensions, etc.
- grid_location: Where on the drawing
- cloud_revision: Revision cloud ID if present

Return a JSON object:
{
  "changes": [
    {
      "change_type": "Modified",
      "change_category": "Structural",
      "change_severity": "Major",
      "description": "Wall W3 height increased from 9'-0\\" to 10'-6\\"",
      "affected_elements": ["W3"],
      "grid_location": "C/2-3",
      "cloud_revision": "REV-1",
      "confidence": 95
    }
  ],
  "total_changes": 3,
  "summary": {
    "Added": 1,
    "Modified": 2,
    "Removed": 0
  },
  "severity_summary": {
    "Minor": 1,
    "Major": 2
  },
  "confidence": 90
}

Return ONLY the JSON object.`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      sheetId,
      extractionType,  // 'walls', 'mep_fixtures', 'version_compare'
      pdfDownloadUrl,
      compareWithVersionId  // For version comparison
    } = await req.json();

    if (!sheetId && !extractionType) {
      throw new Error('sheetId and extractionType are required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('OCR_Reader') || '',
    });

    console.log('[AnalyzeDrawing] Type: ' + extractionType + ', Sheet: ' + sheetId);

    // Get sheet info
    const { data: sheet, error: sheetError } = await supabaseClient
      .from('drawing_sheets')
      .select('*, drawings(*)')
      .eq('id', sheetId)
      .single();

    if (sheetError || !sheet) {
      throw new Error('Sheet not found: ' + (sheetError?.message || 'unknown'));
    }

    // Download PDF page
    let pdfBytes;
    if (pdfDownloadUrl) {
      const response = await fetch(pdfDownloadUrl);
      if (!response.ok) throw new Error('Failed to download: ' + response.status);
      pdfBytes = new Uint8Array(await response.arrayBuffer());
    } else {
      // Need to get from parent drawing
      throw new Error('pdfDownloadUrl required for analysis');
    }

    const base64Pdf = uint8ArrayToBase64(pdfBytes);
    const prompt = PROMPTS[extractionType];

    if (!prompt) {
      throw new Error('Unknown extraction type: ' + extractionType);
    }

    // Call Claude Vision
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Pdf,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('[AnalyzeDrawing] Response: ' + responseText.substring(0, 500));

    // Parse response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const extracted = JSON.parse(jsonMatch[0]);
    let insertedCount = 0;

    // Store results based on extraction type
    if (extractionType === 'walls' && extracted.walls) {
      for (const wall of extracted.walls) {
        const { error } = await supabaseClient
          .from('sheet_walls')
          .insert({
            sheet_id: sheetId,
            project_id: sheet.project_id,
            wall_id: wall.wall_id,
            wall_type: wall.wall_type,
            wall_height: wall.wall_height,
            wall_thickness: wall.wall_thickness,
            stud_spacing: wall.stud_spacing,
            stud_gauge: wall.stud_gauge,
            grid_location: wall.grid_location,
            orientation: wall.orientation,
            confidence: wall.confidence,
          });
        if (!error) insertedCount++;
      }
    } else if (extractionType === 'mep_fixtures' && extracted.fixtures) {
      for (const fixture of extracted.fixtures) {
        const { error } = await supabaseClient
          .from('sheet_mep_fixtures')
          .insert({
            sheet_id: sheetId,
            project_id: sheet.project_id,
            fixture_tag: fixture.fixture_tag,
            fixture_type: fixture.fixture_type,
            fixture_category: fixture.fixture_category,
            description: fixture.description,
            quantity: fixture.quantity || 1,
            grid_location: fixture.grid_location,
            room_name: fixture.room_name,
            confidence: fixture.confidence,
          });
        if (!error) insertedCount++;
      }
    } else if (extractionType === 'version_compare' && extracted.changes) {
      for (const change of extracted.changes) {
        const { error } = await supabaseClient
          .from('drawing_version_changes')
          .insert({
            drawing_id: sheet.drawing_id,
            project_id: sheet.project_id,
            new_version_id: compareWithVersionId,
            change_type: change.change_type,
            change_category: change.change_category,
            change_severity: change.change_severity,
            sheet_number: sheet.sheet_number,
            sheet_name: sheet.sheet_name,
            description: change.description,
            affected_elements: change.affected_elements,
            grid_location: change.grid_location,
            cloud_revision: change.cloud_revision,
            confidence: change.confidence,
          });
        if (!error) insertedCount++;
      }
    }

    console.log('[AnalyzeDrawing] Inserted ' + insertedCount + ' records');

    return new Response(
      JSON.stringify({
        success: true,
        extraction_type: extractionType,
        sheet_id: sheetId,
        extracted: extracted,
        inserted_count: insertedCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[AnalyzeDrawing] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
