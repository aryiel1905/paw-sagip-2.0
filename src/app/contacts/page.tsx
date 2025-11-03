"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchContacts } from "@/data/supabaseApi";
import type { Contact } from "@/types/app";

type Grouping = "role" | "barangay" | "city" | "province";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<Grouping>("role");

  useEffect(() => {
    let abort = new AbortController();
    setLoading(true);
    fetchContacts(1000, { signal: abort.signal })
      .then((cs) => setContacts(cs))
      .finally(() => setLoading(false));
    return () => abort.abort();
  }, []);

  const grouped = useMemo(() => {
    const key: Grouping = groupBy;
    const map = new Map<string, Contact[]>();
    for (const c of contacts) {
      const raw = (c as any)[key] as string | null | undefined;
      const g = (raw ?? "Unknown").toString().trim() || "Unknown";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(c);
    }
    // Sort groups and items by name
    const entries = Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return entries.map(([label, items]) => ({
      label,
      items: items
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    }));
  }, [contacts, groupBy]);

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold ink-heading">
            Contacts
          </h1>
          <p className="ink-muted">Directory of public profiles</p>
        </div>
        <div className="flex items-center gap-2">
          {(["role", "barangay", "city", "province"] as Grouping[]).map((g) => (
            <button
              key={g}
              className={`pill px-3 py-1.5 text-sm border transition-colors ${
                groupBy === g
                  ? "bg-[var(--primary-mintgreen)] text-white border-[var(--primary-mintgreen)]"
                  : "bg-white border-[var(--border-color)] hover:bg-[var(--card-bg)]"
              }`}
              onClick={() => setGroupBy(g)}
              type="button"
            >
              Group by {g}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 text-center">
          Loading contacts...
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 text-center">
          No contacts found.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section
              key={group.label}
              className="rounded-xl border border-[var(--border-color)] bg-white"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
                <h2 className="text-lg font-semibold ink-heading">
                  {group.label}
                </h2>
                <span className="text-sm ink-subtle">{group.items.length}</span>
              </div>
              <div className="p-4">
                <ul className="columns-1 sm:columns-2 lg:columns-3 [column-gap:0.75rem]">
                  {group.items.map((c) => (
                    <li key={c.id} className="mb-3 break-inside-avoid">
                      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg,#fff)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold ink-heading leading-tight">{c.name}</p>
                            {c.role && (
                              <p className="text-xs mt-0.5 text-[var(--primary-orange)] font-medium">{c.role}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                          {c.email && (
                            <p className="truncate"><a className="text-[var(--primary-green)] hover:underline" href={`mailto:${c.email}`}>{c.email}</a></p>
                          )}
                          {c.phone && (
                            <p className="truncate"><a className="text-[var(--primary-green)] hover:underline" href={`tel:${c.phone}`}>{c.phone}</a></p>
                          )}
                          <p className="ink-subtle truncate">{[c.barangay, c.city, c.province].filter(Boolean).join(", ") || "—"}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
