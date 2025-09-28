export type AlertType = "all" | "lost" | "found" | "cruelty" | "adoption";

export type Alert = {
  id: string;
  type: Exclude<AlertType, "all">;
  title: string;
  area: string;
  minutes: number;
  emoji: string;
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  landmarkImageUrls?: string[];
};

export type AdoptionPet = {
  id: string;
  kind: "dog" | "cat" | "other";
  name: string;
  age: string;
  note: string;
  location: string;
  emoji: string;
  imageUrl?: string | null;
  createdAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
};

export type AdoptionRow = {
  id: string;
  species?: string | null;
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
};
