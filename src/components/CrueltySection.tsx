export function CrueltySection() {
  return (
    <section
      id="cruelty"
      className="mx-auto mt-12 max-w-7xl px-4 pb-24 sm:px-6 lg:px-8 scroll-mt-20"
    >
      <div className="surface rounded-2xl p-6 shadow-soft">
        <h2
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: "var(--primary-orange)" }}
        >
          Report Animal Cruelty
        </h2>
        <p className="ink-muted">
          Provide details. You can submit anonymously.
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <label className="block" htmlFor="cruelty-media">
              <span className="text-sm">Upload Photo/Video</span>
              <input
                className="mt-1 w-full rounded-xl px-3 py-2"
                id="cruelty-media"
                style={{ border: "1px solid var(--border-color)" }}
                type="file"
              />
            </label>
            <label className="block" htmlFor="cruelty-description">
              <span className="text-sm">Description</span>
              <textarea
                className="mt-1 w-full rounded-xl px-3 py-2"
                id="cruelty-description"
                placeholder="What happened? When/where?"
                rows={4}
                style={{ border: "1px solid var(--border-color)" }}
              />
            </label>
            <label className="block" htmlFor="cruelty-location">
              <span className="text-sm">Location</span>
              <input
                className="mt-1 w-full rounded-xl px-3 py-2"
                id="cruelty-location"
                placeholder="Pin or type an address"
                style={{ border: "1px solid var(--border-color)" }}
                type="text"
              />
            </label>
            <label
              className="mt-2 inline-flex items-center gap-2"
              htmlFor="submit-anonymous"
            >
              <input
                className="h-4 w-4"
                id="submit-anonymous"
                type="checkbox"
              />
              <span className="text-sm">Submit anonymously</span>
            </label>
          </div>
          <div>
            <div
              className="rounded-xl p-4"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <p className="font-semibold ink-heading">Safety & Welfare</p>
              <ul
                className="ink-muted mt-2 space-y-1 pl-5"
                style={{ listStyle: "disc" }}
              >
                <li>Do not intervene if unsafe.</li>
                <li>Share exact location details.</li>
                <li>Upload clear evidence if possible.</li>
              </ul>
            </div>
            <button
              className="btn btn-primary mt-3 w-full px-5 py-3"
              type="button"
            >
              Submit Report
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
