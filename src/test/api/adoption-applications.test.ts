import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- mocks ----------

const mockInsert = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabaseServer", () => ({
  createServerSupabaseClient: () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  }),
}));

// ---------- helpers ----------

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/adoption-applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  petId: "pet-uuid-123",
  termsAccepted: true,
  firstName: "Maria",
  lastName: "Santos",
  phone: "09171234567",
  email: "maria@example.com",
};

// ---------- tests ----------

describe("POST /api/adoption-applications", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("returns 400 for invalid JSON", async () => {
    const { POST } = await import("@/app/api/adoption-applications/route");
    const req = new Request("http://localhost/api/adoption-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON");
  });

  it("returns 400 when petId is missing", async () => {
    const { POST } = await import("@/app/api/adoption-applications/route");
    const res = await POST(makeRequest({ termsAccepted: true, phone: "09171234567" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing required fields");
  });

  it("returns 400 when termsAccepted is false", async () => {
    const { POST } = await import("@/app/api/adoption-applications/route");
    const res = await POST(makeRequest({ petId: "pet-123", termsAccepted: false, phone: "09171234567" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing required fields");
  });

  it("returns 400 when no contact info provided", async () => {
    const { POST } = await import("@/app/api/adoption-applications/route");
    const res = await POST(makeRequest({ petId: "pet-123", termsAccepted: true }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Provide phone or email");
  });

  it("succeeds with valid payload", async () => {
    const { POST } = await import("@/app/api/adoption-applications/route");
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("inserts correct applicant_id when user is authenticated", async () => {
    const { POST } = await import("@/app/api/adoption-applications/route");
    await POST(makeRequest(validPayload));
    const insertedRow = mockInsert.mock.calls[0][0][0];
    expect(insertedRow.applicant_id).toBe("user-123");
  });

  it("inserts null applicant_id when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { POST } = await import("@/app/api/adoption-applications/route");
    await POST(makeRequest(validPayload));
    const insertedRow = mockInsert.mock.calls[0][0][0];
    expect(insertedRow.applicant_id).toBeNull();
  });

  it("combines firstName and lastName into applicant_name", async () => {
    const { POST } = await import("@/app/api/adoption-applications/route");
    await POST(makeRequest(validPayload));
    const insertedRow = mockInsert.mock.calls[0][0][0];
    expect(insertedRow.applicant_name).toBe("Maria Santos");
  });

  it("sets status to pending on insert", async () => {
    const { POST } = await import("@/app/api/adoption-applications/route");
    await POST(makeRequest(validPayload));
    const insertedRow = mockInsert.mock.calls[0][0][0];
    expect(insertedRow.status).toBe("pending");
  });

  it("normalizes birthDate to YYYY-MM-DD format", async () => {
    const { POST } = await import("@/app/api/adoption-applications/route");
    await POST(makeRequest({ ...validPayload, birthDate: "1995-06-15" }));
    const insertedRow = mockInsert.mock.calls[0][0][0];
    expect(insertedRow.birth_date).toBe("1995-06-15");
  });

  it("returns 500 when supabase insert fails", async () => {
    mockInsert.mockResolvedValue({ error: { message: "Unique constraint violation" } });
    const { POST } = await import("@/app/api/adoption-applications/route");
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Unique constraint violation");
  });

  it("sets terms_accepted to true when provided", async () => {
    const { POST } = await import("@/app/api/adoption-applications/route");
    await POST(makeRequest(validPayload));
    const insertedRow = mockInsert.mock.calls[0][0][0];
    expect(insertedRow.terms_accepted).toBe(true);
  });

  it("stores homePhotoPaths as array", async () => {
    const { POST } = await import("@/app/api/adoption-applications/route");
    await POST(makeRequest({ ...validPayload, homePhotoPaths: ["photos/a.jpg", "photos/b.jpg"] }));
    const insertedRow = mockInsert.mock.calls[0][0][0];
    expect(insertedRow.home_photo_paths).toEqual(["photos/a.jpg", "photos/b.jpg"]);
  });
});
