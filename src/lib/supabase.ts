// src/lib/supabase.ts
// Supabase client stub — install the package first:
//   npm install @supabase/supabase-js
// Then add to your .env:
//   VITE_SUPABASE_URL=https://your-project.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key

let supabase: any = null;

try {
  // Dynamically imported so build doesn't fail if package isn't installed yet
  const { createClient } = require('@supabase/supabase-js');
  const url = (typeof window !== 'undefined' ? (window as any).__SUPABASE_URL__ : '') 
    || '';
  const key = (typeof window !== 'undefined' ? (window as any).__SUPABASE_KEY__ : '') 
    || '';
  if (url && key) supabase = createClient(url, key);
} catch {
  console.warn('[Supabase] Package not installed. Run: npm install @supabase/supabase-js');
}

// Stub that silently no-ops when Supabase isn't configured yet.
// KPI hook will show zeros until real Supabase is connected.
const createStub = () => ({
  from: () => ({
    select: () => ({ eq: () => ({ gte: () => ({ data: [], error: null, count: 0 }) }), data: [], error: null, count: 0 }),
    insert: () => ({ data: null, error: null }),
    update: () => ({ data: null, error: null }),
    delete: () => ({ data: null, error: null }),
  }),
  channel: () => ({
    on: function() { return this; },
    subscribe: () => {},
  }),
  removeChannel: () => {},
});

export { supabase };
export const getSupabase = () => supabase ?? createStub();