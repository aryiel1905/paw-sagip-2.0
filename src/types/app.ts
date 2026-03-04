export type AlertType = "all" | "lost" | "found" | "cruelty" | "adoption";

// Pet status tied to iREPORT field
export type PetStatus = "roaming" | "in_custody";

export type Alert = {
  id: string;
  type: Exclude<AlertType, "all">;
  title: string;
  area: string;
  status: string;
  breed?: string | null;
  sex?: string | null;
  ageSize?: string | null;
  minutes: number;
  emoji: string;
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  landmarkImageUrls?: string[];
  // iREPORT Pet Status (Roaming/In Custody)
  petStatus?: PetStatus;
};

export type AdoptionPet = {
  id: string;
  kind: "dog" | "cat" | "other";
  species?: string | null;
  speciesId?: string | null;
  isDomesticAdoptable?: boolean | null;
  name: string;
  breed?: string | null;
  sex?: string | null;
  age: string;
  note: string;
  location: string;
  emoji: string;
  imageUrl?: string | null;
  createdAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // iREPORT Pet Status mapped for adoptions (generally in_custody)
  petStatus?: PetStatus;
};

export type ReportStatus = "idle" | "submitting" | "success" | "error";

export type AlertRow = {
  id: string;
  report_type: Exclude<AlertType, "all">;
  location: string;
  created_at?: string | null;
  minutes?: number | string | null;
  photo_path?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  landmark_media_paths?: string[] | null;
  pet_name?: string | null;
  species?: string | null;
  description?: string | null;
  pet_status?: PetStatus | null;
  status?: string | null;
  source_table?: string | null;
  source_id?: string | null;
};

export type AdoptionRow = {
  id: string;
  species?: string | null;
  species_id?: string | null;
  is_domestic_adoptable?: boolean | null;
  pet_name?: string | null;
  age_size?: string | null;
  features?: string | null;
  location?: string | null;
  emoji_code?: string | null;
  status?: string | null;
  created_at?: string | null;
  photo_path?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  landmark_media_paths?: string[] | null;
  pet_status?: PetStatus | null;
};

// Shared modal item type for DetailsModal and global search
export type ModalItem =
  | { kind: "alert"; alert: Alert }
  | { kind: "adoption"; adoption: AdoptionPet }
  | null;

// Directory / Contacts
export type Contact = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  barangay?: string | null;
  city?: string | null;
  province?: string | null;
};
