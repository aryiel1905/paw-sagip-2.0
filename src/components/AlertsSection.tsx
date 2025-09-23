import { AlertType, Alert } from "@/types/app";

type AlertsSectionProps = {
  filters: AlertType[];
  activeFilter: AlertType;
  onFilterChange: (filter: AlertType) => void;
  filteredAlerts: Alert[];
};

export function AlertsSection({
  filters,
  activeFilter,
  onFilterChange,
  filteredAlerts,
}: AlertsSectionProps) {
  return (
    <section
      id="alerts"
      className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-23"
    >
      <div className="surface rounded-2xl p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="px-1 text-2xl font-extrabold tracking-tight ink-heading">
            Alerts
          </h2>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1 sm:mt-0 w-full sm:w-auto">
            {filters.map((filter) => (
              <button
                key={filter}
                className={`pill px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm ${
                  activeFilter === filter ? "bg-[#2a9d8f] text-white" : ""
                }`}
                onClick={() => onFilterChange(filter)}
                style={{ border: "1px solid var(--border-color)" }}
                type="button"
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAlerts.length === 0 ? (
            <article className="surface rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="ink-muted">No alerts yet. Check back soon.</p>
              </div>
            </article>
          ) : (
            filteredAlerts.map((alert) => (
              <article key={alert.id} className="surface rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {alert.imageUrl ? (
                      <img
                        src={alert.imageUrl}
                        alt="alert photo"
                        className="h-10 w-10 rounded-xl object-cover"
                      />
                    ) : (
                      <div
                        className="grid h-10 w-10 place-content-center rounded-xl text-xl"
                        style={{
                          background:
                            "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                        }}
                      >
                        {alert.emoji}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold ink-heading">
                        {alert.title}
                      </h3>
                      <p className="ink-muted text-sm">
                        {alert.area} - {alert.minutes} mins ago
                      </p>
                    </div>
                  </div>
                  <button
                    className="pill px-3 py-1 text-xs"
                    style={{ border: "1px solid var(--border-color)" }}
                    type="button"
                  >
                    Share
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
