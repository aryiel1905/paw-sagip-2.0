"use client";

type Tab = { key: string; label: string };

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
};

export default function Tabs({ tabs, active, onChange }: Props) {
  return (
    <nav className="surface rounded-full p-1 flex gap-1 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            active === t.key ? "active-tab" : "ink-heading hover:bg-slate-100"
          }`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

