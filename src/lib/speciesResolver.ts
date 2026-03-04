import type { SupabaseClient } from "@supabase/supabase-js";

function normalize(value?: string | null): string {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildSpeciesCandidates(raw?: string | null): string[] {
  const base = normalize(raw);
  if (!base) return [];
  const set = new Set<string>();
  set.add(base);

  // Support legacy "others;value" payloads.
  const semicolonValue = normalize(base.split(";")[1] || "");
  if (semicolonValue) set.add(semicolonValue);

  // Handle "a;b;c" safely by trying each part too.
  for (const part of base.split(";")) {
    const n = normalize(part);
    if (n) set.add(n);
  }

  return Array.from(set);
}

export async function resolveSpeciesIdWithClient(
  supabase: SupabaseClient,
  rawSpecies?: string | null
): Promise<{ speciesId: string | null; normalized: string | null; reason?: string }> {
  const candidates = buildSpeciesCandidates(rawSpecies);
  if (candidates.length === 0) {
    return { speciesId: null, normalized: null, reason: "empty" };
  }

  const candidateSet = new Set(candidates);

  const { data: canonical } = await supabase
    .from("animal_species")
    .select("id, normalized_name")
    .in("normalized_name", candidates);

  if (Array.isArray(canonical) && canonical.length > 0) {
    const byNorm = new Map<string, string>();
    for (const row of canonical as any[]) {
      const norm = normalize((row as any).normalized_name);
      const id = String((row as any).id || "");
      if (norm && id) byNorm.set(norm, id);
    }
    for (const c of candidates) {
      const id = byNorm.get(c);
      if (id) return { speciesId: id, normalized: c };
    }
  }

  const { data: aliases } = await supabase
    .from("animal_species_aliases")
    .select("species_id, alias_normalized")
    .in("alias_normalized", candidates);

  if (Array.isArray(aliases) && aliases.length > 0) {
    const byAlias = new Map<string, string>();
    for (const row of aliases as any[]) {
      const norm = normalize((row as any).alias_normalized);
      const id = String((row as any).species_id || "");
      if (norm && id) byAlias.set(norm, id);
    }
    for (const c of candidates) {
      const id = byAlias.get(c);
      if (id) return { speciesId: id, normalized: c };
    }
  }

  // Preserve context for admin queue / diagnostics.
  const primary = candidates.find((c) => candidateSet.has(c)) || null;
  return { speciesId: null, normalized: primary, reason: "unmapped" };
}

