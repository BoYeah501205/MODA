import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModuleImportRow {
  serial_number: string;
  build_sequence?: number;
  blm_id?: string;
  unit_type?: string;
  hitch_unit?: string;
  rear_unit?: string;
  hitch_room?: string;
  rear_room?: string;
  hitch_room_type?: string;
  rear_room_type?: string;
}

interface ImportAnalysis {
  new_modules: ModuleImportRow[];
  updates: Array<{
    existing: any;
    new_data: ModuleImportRow;
    changes: Record<string, { old: any; new: any }>;
  }>;
  duplicates_in_csv: Array<{ serial_number: string; count: number }>;
  errors: Array<{ row: number; error: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { action, project_id, modules, force_overwrite } = await req.json();

    if (!project_id) {
      throw new Error('project_id is required');
    }

    if (action === 'analyze') {
      const analysis = await analyzeImport(supabaseClient, project_id, modules);
      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'execute') {
      const result = await executeImport(
        supabaseClient,
        project_id,
        modules,
        force_overwrite || false
      );
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action. Use "analyze" or "execute"');
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeImport(
  supabase: any,
  projectId: string,
  modules: ModuleImportRow[]
): Promise<ImportAnalysis> {
  const analysis: ImportAnalysis = {
    new_modules: [],
    updates: [],
    duplicates_in_csv: [],
    errors: [],
  };

  // Check for duplicates within CSV
  const serialCounts = new Map<string, number>();
  modules.forEach((mod) => {
    const count = serialCounts.get(mod.serial_number) || 0;
    serialCounts.set(mod.serial_number, count + 1);
  });

  serialCounts.forEach((count, serial) => {
    if (count > 1) {
      analysis.duplicates_in_csv.push({ serial_number: serial, count });
    }
  });

  // Fetch existing modules for this project
  const { data: existingModules, error } = await supabase
    .from('modules')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to fetch existing modules: ${error.message}`);
  }

  const existingBySerial = new Map(
    existingModules.map((m: any) => [m.serial_number, m])
  );

  // Analyze each module
  modules.forEach((newMod, index) => {
    // Validate required fields
    if (!newMod.serial_number || newMod.serial_number.trim() === '') {
      analysis.errors.push({
        row: index + 2, // +2 for header row and 0-index
        error: 'Missing serial_number',
      });
      return;
    }

    const existing = existingBySerial.get(newMod.serial_number);

    if (!existing) {
      // New module
      analysis.new_modules.push(newMod);
    } else {
      // Potential update - check what would change
      const changes: Record<string, { old: any; new: any }> = {};

      const fields = [
        'build_sequence',
        'blm_id',
        'unit_type',
        'hitch_unit',
        'rear_unit',
        'hitch_room',
        'rear_room',
        'hitch_room_type',
        'rear_room_type',
      ];

      fields.forEach((field) => {
        const oldVal = existing[field];
        const newVal = newMod[field as keyof ModuleImportRow];

        // Only consider it a change if:
        // 1. New value is provided (not null/undefined/empty)
        // 2. New value is different from old value
        if (
          newVal !== null &&
          newVal !== undefined &&
          newVal !== '' &&
          oldVal !== newVal
        ) {
          changes[field] = { old: oldVal, new: newVal };
        }
      });

      if (Object.keys(changes).length > 0) {
        analysis.updates.push({
          existing,
          new_data: newMod,
          changes,
        });
      }
    }
  });

  return analysis;
}

async function executeImport(
  supabase: any,
  projectId: string,
  modules: ModuleImportRow[],
  forceOverwrite: boolean
): Promise<{ inserted: number; updated: number; errors: any[] }> {
  const result = {
    inserted: 0,
    updated: 0,
    errors: [] as any[],
  };

  // Fetch existing modules
  const { data: existingModules, error: fetchError } = await supabase
    .from('modules')
    .select('*')
    .eq('project_id', projectId);

  if (fetchError) {
    throw new Error(`Failed to fetch existing modules: ${fetchError.message}`);
  }

  const existingBySerial = new Map(
    existingModules.map((m: any) => [m.serial_number, m])
  );

  for (const mod of modules) {
    if (!mod.serial_number || mod.serial_number.trim() === '') {
      result.errors.push({ serial_number: mod.serial_number, error: 'Missing serial_number' });
      continue;
    }

    const existing = existingBySerial.get(mod.serial_number);

    if (!existing) {
      // Insert new module
      const { error: insertError } = await supabase.from('modules').insert({
        project_id: projectId,
        serial_number: mod.serial_number,
        build_sequence: mod.build_sequence || 0,
        blm_id: mod.blm_id || null,
        unit_type: mod.unit_type || null,
        hitch_unit: mod.hitch_unit || null,
        rear_unit: mod.rear_unit || null,
        hitch_room: mod.hitch_room || null,
        rear_room: mod.rear_room || null,
        hitch_room_type: mod.hitch_room_type || null,
        rear_room_type: mod.rear_room_type || null,
      });

      if (insertError) {
        result.errors.push({ serial_number: mod.serial_number, error: insertError.message });
      } else {
        result.inserted++;
      }
    } else {
      // Update existing module
      const updateData: any = {};

      const fields = [
        'build_sequence',
        'blm_id',
        'unit_type',
        'hitch_unit',
        'rear_unit',
        'hitch_room',
        'rear_room',
        'hitch_room_type',
        'rear_room_type',
      ];

      fields.forEach((field) => {
        const newVal = mod[field as keyof ModuleImportRow];
        const oldVal = existing[field];

        if (forceOverwrite) {
          // Force overwrite: update if new value is provided
          if (newVal !== null && newVal !== undefined && newVal !== '') {
            updateData[field] = newVal;
          }
        } else {
          // Smart merge: only update if old value is empty/null
          if (
            (oldVal === null || oldVal === undefined || oldVal === '') &&
            newVal !== null &&
            newVal !== undefined &&
            newVal !== ''
          ) {
            updateData[field] = newVal;
          }
        }
      });

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('modules')
          .update(updateData)
          .eq('id', existing.id);

        if (updateError) {
          result.errors.push({ serial_number: mod.serial_number, error: updateError.message });
        } else {
          result.updated++;
        }
      }
    }
  }

  return result;
}
