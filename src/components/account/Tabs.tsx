"use client";

type Tab = { key: string; label: string };

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
};

export default function Tabs({ tabs, active, onChange }: Props) {
  const cols = Math.max(1, tabs.length);
  return (
    <nav
      className="surface rounded-full p-1  gap-1 w-full max-w-none overflow-x-auto"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 2fr))` }}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap text-center ${
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
