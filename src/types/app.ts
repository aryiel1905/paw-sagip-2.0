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
  kind: "dog" | "cat";
  name: string;
  age: string;
  note: string;
  location: string;
  emoji: string;
};

export type ReportStatus = "idle" | "submitting" | "success" | "error";

export type AlertRow = {
  id: string;
  title: string;
  area: string;
  type: Exclude<AlertType, "all">;
  created_at?: string | null;
  minutes?: number | string | null;
  photo_path?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  landmark_media_paths?: string[] | null;
};

export type AdoptionRow = {
  id: string;
  kind: "dog" | "cat";
  name: string;
  age: string | null;
  note: string | null;
  location: string | null;
  emoji_code: string | null;
};
