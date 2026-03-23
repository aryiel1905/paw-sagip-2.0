import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- mocks ----------

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();
const mockCookiesGet = vi.fn();

vi.mock("@/lib/supabaseServer", () => ({
  createServerSupabaseClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mockCookiesGet }),
}));

vi.mock("@/lib/speciesResolver", () => ({
  resolveSpeciesIdWithClient: async () => ({ speciesId: null }),
}));

// ---------- helpers ----------

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------- tests ----------

describe("POST /api/reports", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCookiesGet.mockReturnValue(undefined);
    mockGetUser.mockResolvedValue({ data: { user: null } });

    // Chain: supabase.from().insert().select().single()
    mockSingle.mockResolvedValue({ data: { id: "abc-123", custom_id: "RPT-001" }, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("returns 400 for invalid JSON", async () => {
    const { POST } = await import("@/app/api/reports/route");
    const req = new Request("http://localhost/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json{{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON");
  });

  it("returns 400 for missing report type", async () => {
    const { POST } = await import("@/app/api/reports/route");
    const res = await POST(makeRequest({ description: "A stray dog" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid report type");
  });

  it("returns 400 for invalid report type", async () => {
    const { POST } = await import("@/app/api/reports/route");
    const res = await POST(makeRequest({ type: "spam" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid report type");
  });

  it("accepts valid report types: lost, found, cruelty, adoption", async () => {
    const { POST } = await import("@/app/api/reports/route");
    for (const type of ["lost", "found", "cruelty", "adoption"]) {
      vi.resetAllMocks();
      mockCookiesGet.mockReturnValue(undefined);
      mockGetUser.mockResolvedValue({ data: { user: null } });
      mockSingle.mockResolvedValue({ data: { id: "abc", custom_id: null }, error: null });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockInsert.mockReturnValue({ select: mockSelect });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const res = await POST(makeRequest({ type }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    }
  });

  it("is case-insensitive for report type", async () => {
    const { POST } = await import("@/app/api/reports/route");
    const res = await POST(makeRequest({ type: "LOST" }));
    expect(res.status).toBe(200);
  });

  it("clamps latitude to [-90, 90] and longitude to [-180, 180]", async () => {
    const { POST } = await import("@/app/api/reports/route");
    await POST(makeRequest({ type: "found", lat: 999, lng: -999 }));
    const insertedRow = mockInsert.mock.calls[0][0][0];
    expect(insertedRow.latitude).toBe(90);
    expect(insertedRow.longitude).toBe(-180);
  });

  it("stores null for NaN coordinates", async () => {
    const { POST } = await import("@/app/api/reports/route");
    await POST(makeRequest({ type: "found", lat: NaN, lng: NaN }));
    const insertedRow = mockInsert.mock.calls[0][0][0];
    expect(insertedRow.latitude).toBeNull();
    expect(insertedRow.longitude).toBeNull();
  });

  it("normalizes petStatus variants to roaming or in_custody", async () => {
    const { POST } = await import("@/app/api/reports/route");

    await POST(makeRequest({ type: "found", petStatus: "In Custody" }));
    expect(mockInsert.mock.calls[0][0][0].pet_status).toBe("in_custody");

    vi.clearAllMocks();
    mockSingle.mockResolvedValue({ data: { id: "x" }, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    await POST(makeRequest({ type: "found", petStatus: "Roaming" }));
    expect(mockInsert.mock.calls[0][0][0].pet_status).toBe("roaming");
  });

  it("returns 500 when supabase insert fails", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });
    const { POST } = await import("@/app/api/reports/route");
    const res = await POST(makeRequest({ type: "lost" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("DB error");
  });

  it("hides reporter name and contact when isAnonymous is true", async () => {
    const { POST } = await import("@/app/api/reports/route");
    await POST(
      makeRequest({
        type: "lost",
        isAnonymous: true,
        reporterName: "Juan",
        reporterContact: "juan@example.com",
      })
    );
    const row = mockInsert.mock.calls[0][0][0];
    expect(row.reporter_name).toBeNull();
    expect(row.reporter_contact).toBeNull();
    expect(row.is_anonymous).toBe(true);
  });

  it("returns id and customId on success", async () => {
    const { POST } = await import("@/app/api/reports/route");
    const res = await POST(makeRequest({ type: "found" }));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.id).toBe("abc-123");
    expect(json.customId).toBe("RPT-001");
  });
});
