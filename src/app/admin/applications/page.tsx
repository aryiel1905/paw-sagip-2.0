import { createServerSupabaseClient } from "@/lib/supabaseServer";
import ApplicationsClient, { type ApplicationItem } from "./ApplicationsClient";

export const dynamic = "force-dynamic";

async function loadData() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("adoption_applications")
    .select(
      "id, created_at, status, applicant_name, first_name, last_name, email, phone, adopt_what, home_type, pet_id, home_photo_paths, adoption_pets:pet_id ( pet_name, species )"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  type Row = {
    id: string;
    created_at: string;
    status: string;
    applicant_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    adopt_what: string | null;
    home_type: string | null;
    pet_id: string | null;
    home_photo_paths: string[] | null;
    adoption_pets?:
      | { pet_name?: string | null; species?: string | null }[]
      | null;
  };
  const items: ApplicationItem[] = (data || []).map((row: Row) => {
    const ap = Array.isArray(row.adoption_pets)
      ? row.adoption_pets[0] ?? null
      : null;
    return {
      id: row.id,
      created_at: row.created_at,
      status: row.status,
      applicant_name: row.applicant_name,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone,
      adopt_what: row.adopt_what,
      home_type: row.home_type,
      pet_id: row.pet_id,
      pet_name: ap?.pet_name ?? null,
      pet_species: ap?.species ?? null,
      home_photo_paths: Array.isArray(row.home_photo_paths)
        ? row.home_photo_paths
        : [],
    };
  });
  return items;
}

export default async function AdminApplicationsPage() {
  const items = await loadData();
  return (
    <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="surface rounded-2xl p-6 shadow-soft">
        <h1 className="text-2xl font-extrabold tracking-tight ink-heading">
          Admin · Adoption Applications
        </h1>
        <ApplicationsClient items={items} />
      </div>
    </section>
  );
}
