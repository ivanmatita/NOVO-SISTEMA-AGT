
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

const fixStoragePolicies = async () => {
    console.log("!!! Applying Storage RLS Policies !!!");
    
    // Applying storage RLS
    const query = `
      -- 1. Ensure RLS is enabled for storage objects
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

      -- 2. Drop existing policies for cartas-media
      DROP POLICY IF EXISTS "allow_authenticated_upload" ON storage.objects;
      DROP POLICY IF EXISTS "allow_authenticated_select" ON storage.objects;

      -- 3. Create new robust policies
      CREATE POLICY "allow_authenticated_upload"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'cartas-media');

      CREATE POLICY "allow_authenticated_select"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'cartas-media');
      
      -- For update/delete, we should also probably add policies if we want to allow modification
      CREATE POLICY "allow_authenticated_update"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'cartas-media');
    `;
    
    const { error } = await supabase.rpc('query_exec', { query });
    if (error) {
        console.error("Error creating storage policies:", error);
    } else {
        console.log("Storage policies applied successfully.");
    }
}

fixStoragePolicies();
