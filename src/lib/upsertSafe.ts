import { supabase } from './supabase';

/**
 * Safe upsert that works around PostgREST schema-cache quirks that sometimes
 * cause "no unique or exclusion constraint matching the ON CONFLICT specification"
 * even when the unique constraint exists in the database.
 *
 * Instead of relying on ON CONFLICT, we explicitly:
 *   1. SELECT the existing row matching the conflict key(s)
 *   2. UPDATE if found, INSERT if not
 *
 * This is a tiny race window vs. true upsert, but it's safe for per-user
 * settings rows that are only written by the row's owner.
 */
export async function upsertSafe<T extends Record<string, unknown>>(
  table: string,
  payload: T,
  conflictKeys: string[],
): Promise<{ error: { message: string } | null }> {
  try {
    // Build the equality filter from the conflict keys
    let selectQuery = supabase.from(table).select(conflictKeys[0]);
    for (const key of conflictKeys) {
      const val = payload[key];
      if (val === undefined || val === null) {
        return {
          error: {
            message: `upsertSafe: missing value for conflict key "${key}"`,
          },
        };
      }
      // narrow to string|number|boolean for .eq()
      selectQuery = selectQuery.eq(key, val as string | number | boolean);
    }

    const existing = await selectQuery.maybeSingle();
    if (existing.error && existing.error.code !== 'PGRST116') {
      return { error: { message: existing.error.message } };
    }

    if (existing.data) {
      // Row exists -> UPDATE
      let updateQuery = supabase.from(table).update(payload);
      for (const key of conflictKeys) {
        updateQuery = updateQuery.eq(key, payload[key] as string | number | boolean);
      }
      const { error } = await updateQuery;
      if (error) return { error: { message: error.message } };
      return { error: null };
    }

    // Row does not exist -> INSERT
    const { error } = await supabase.from(table).insert(payload);
    if (error) return { error: { message: error.message } };
    return { error: null };
  } catch (err) {
    return { error: { message: (err as Error).message ?? 'Unknown upsert error' } };
  }
}
