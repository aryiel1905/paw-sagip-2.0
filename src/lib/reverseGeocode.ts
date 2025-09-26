// -----------------------------
// Backward-compatible types (ported from previous repo)
// -----------------------------
// Minimal GeoJSON Point Feature type to avoid adding deps
type GeoJSONPointFeature = {
  type: "Feature";
  properties: { display_name: string; address?: Record<string, unknown> };
  geometry: { type: "Point"; coordinates: [number, number] };
};

export type ReverseGeocodeResult = {
  full: string;
  address?: string;
  place_name?: string;
  feature: GeoJSONPointFeature | null;
  raw: unknown;
};

type Options = {
  language?: string;
  countrycodes?: string;
  regionHost?: string;
};

// -----------------------------
// Core: LocationIQ reverse geocode
// -----------------------------
async function reverseGeocodeLocationIQCore(
  lat: number,
  lng: number,
  signal?: AbortSignal,
  opts: Options = {}
): Promise<ReverseGeocodeResult> {
  const key = process.env.NEXT_PUBLIC_LOCATIONIQ_KEY;
  if (!key) {
    return {
      full: "Missing NEXT_PUBLIC_LOCATIONIQ_KEY",
      address: "Missing NEXT_PUBLIC_LOCATIONIQ_KEY",
      place_name: "Missing NEXT_PUBLIC_LOCATIONIQ_KEY",
      feature: null,
      raw: null,
    };
  }

  const {
    language = "en",
    countrycodes = "ph",
    regionHost = process.env.NEXT_PUBLIC_LOCATIONIQ_REGION ?? "us1",
  } = opts;

  const url = new URL(`https://${regionHost}.locationiq.com/v1/reverse`);
  url.searchParams.set("key", key);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  if (language) url.searchParams.set("accept-language", language);
  if (countrycodes) url.searchParams.set("countrycodes", countrycodes);

  const res = await fetch(String(url), { signal });
  if (res.status === 429) {
    return {
      full: "Rate limited — try again shortly.",
      address: "Rate limited — try again shortly.",
      place_name: "Rate limited — try again shortly.",
      feature: null,
      raw: null,
    };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LocationIQ reverse geocode failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  const addr = data?.address || {};

  const road = addr.road || "";
  const zone = addr.neighbourhood || addr.purok || addr.quarter || "";
  const barangay = addr.village || addr.suburb || "";
  const town = addr.town || addr.city || addr.municipality || "";
  // Build only up to town/city level (omit province/country for brevity)
  const trimmed =
    [road, zone, barangay, town].filter(Boolean).join(", ") ||
    "No address found";

  const feature = data
    ? {
        type: "Feature",
        properties: { display_name: trimmed, address: data.address },
        geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
      }
    : null;

  return {
    full: trimmed,
    address: trimmed,
    place_name: trimmed,
    feature,
    raw: data,
  };
}

// Public APIs (signatures compatible with previous repo)
export async function reverseGeocode(
  lng: number,
  lat: number,
  signal?: AbortSignal,
  opts?: Options
): Promise<ReverseGeocodeResult> {
  return reverseGeocodeLocationIQCore(lat, lng, signal, opts);
}

export async function reverseGeocodePH(
  lat: number,
  lng: number,
  signal?: AbortSignal,
  opts: Omit<Options, "countrycodes"> = {}
): Promise<ReverseGeocodeResult> {
  return reverseGeocodeLocationIQCore(lat, lng, signal, { countrycodes: "ph", ...opts });
}

export async function reverseGeocodeMapTiler(
  lng: number,
  lat: number,
  signal?: AbortSignal,
  opts?: Options
): Promise<ReverseGeocodeResult> {
  return reverseGeocodeLocationIQCore(lat, lng, signal, opts);
}

export default reverseGeocode;
