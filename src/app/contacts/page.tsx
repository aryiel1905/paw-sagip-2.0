"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchContacts } from "@/data/supabaseApi";
import type { Contact } from "@/types/app";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const abort = new AbortController();
    let mounted = true;
    setLoading(true);
    const start =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const MIN_SPINNER_MS = 300; // ensure skeleton is visible on quick responses
    fetchContacts(1000, { signal: abort.signal })
      .then((cs) => {
        if (!mounted) return;
        setContacts(cs);
      })
      .finally(() => {
        if (!mounted) return;
        const end =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        const elapsed = end - start;
        const remaining = Math.max(0, MIN_SPINNER_MS - elapsed);
        window.setTimeout(() => {
          if (mounted) setLoading(false);
        }, remaining);
      });
    return () => {
      mounted = false;
      abort.abort();
    };
  }, []);

  const admins = useMemo(() => {
    const list = contacts.filter(
      (c) =>
        (c.role || "").toLowerCase().trim() === "admin" &&
        !!(c.barangay || "").trim(),
    );

    return list.slice().sort((a, b) => {
      const aKey = [a.city || "", a.barangay || "", a.name || ""].join("|");
      const bKey = [b.city || "", b.barangay || "", b.name || ""].join("|");
      return aKey.localeCompare(bKey);
    });
  }, [contacts]);

  const SkeletonList = ({ count = 10 }: { count?: number }) => (
    <section className="w-full">
      <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-white">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
          <h2 className="text-lg font-semibold ink-heading">Contacts</h2>
          <span className="text-sm ink-subtle">-</span>
        </div>
        <div className="p-4">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: count }).map((_, i) => (
              <li key={`s-${i}`} className="mb-0">
                <div className="animate-pulse rounded-lg border border-[var(--border-color)] bg-white p-4">
                  <div className="mb-2 h-4 w-32 rounded bg-gray-200" />
                  <div className="mb-2 h-3 w-24 rounded bg-gray-200" />
                  <div className="mb-1 h-3 w-40 rounded bg-gray-200" />
                  <div className="mb-1 h-3 w-28 rounded bg-gray-200" />
                  <div className="h-3 w-36 rounded bg-gray-200" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
      {loading ? (
        <SkeletonList />
      ) : admins.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 text-center">
          No contacts found.
        </div>
      ) : (
        <section className="w-full">
          <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-white">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold ink-heading md:text-3xl">
                    Contacts
                  </h1>
                  <p className="ink-muted">Admin Contacts</p>
                </div>
                <div />
              </div>
            </div>
            <div className="p-4">
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {admins.map((c) => {
                  const locationLabel =
                    [c.barangay, c.city, c.province].filter(Boolean).join(", ") ||
                    "-";

                  return (
                    <li key={c.id} className="mb-0">
                      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg,#fff)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold leading-tight ink-heading">
                              {c.name}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                          {c.email && (
                            <p className="truncate">
                              <a
                                className="text-[var(--primary-green)] hover:underline"
                                href={`mailto:${c.email}`}
                              >
                                {c.email}
                              </a>
                            </p>
                          )}
                          {c.phone && (
                            <p className="truncate">
                              <a
                                className="text-[var(--primary-green)] hover:underline"
                                href={`tel:${c.phone}`}
                              >
                                {c.phone}
                              </a>
                            </p>
                          )}
                          <p className="truncate font-medium text-[var(--primary-orange)]">
                            {locationLabel}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
