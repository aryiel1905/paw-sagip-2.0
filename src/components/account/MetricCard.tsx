"use client";

type Props = {
  title: string;
  count: number | string;
  summary?: string;
  tone?: "amber" | "green" | "blue" | "slate";
};

export default function MetricCard({ title, count, summary, tone = "slate" }: Props) {
  const toneCls =
    tone === "amber"
      ? "bg-amber-100 text-amber-700"
      : tone === "green"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "blue"
      ? "bg-sky-100 text-sky-700"
      : "bg-slate-100 text-slate-700";
  return (
    <section className="surface rounded-2xl shadow-soft p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="ink-heading font-semibold">{title}</div>
          {summary ? <div className="text-sm ink-muted mt-1">{summary}</div> : null}
        </div>
        <div className={`pill px-3 py-1 text-sm font-semibold ${toneCls}`}>{count}</div>
      </div>
    </section>
  );
}

