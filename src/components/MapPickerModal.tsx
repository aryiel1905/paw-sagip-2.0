"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { MapPin } from "lucide-react";
import { reverseGeocodePH } from "@/lib/reverseGeocode";

type MapPickerModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number, address?: string) => void;
};

export default function MapPickerModal({
  open,
  onClose,
  onSelect,
}: MapPickerModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<"maplibre" | "stub">("stub");
  const maplibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const geolocateCtrlRef = useRef<
    import("maplibre-gl").GeolocateControl | null
  >(null);
  const meMarkerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const pinMarkerRef = useRef<import("maplibre-gl").Marker | null>(null);

  const [xy, setXy] = useState<{ x: number; y: number } | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [centerLoading, setCenterLoading] = useState(false);
  // Track if we've auto-centered the camera for this modal open
  const autoCenteredRef = useRef(false);

  // Philippines rough bounds (lng, lat) for stub fallback
  const PH_BOUNDS = useMemo(
    () => ({ west: 116, east: 127, south: 4, north: 21 }),
    []
  );

  const projectToLatLng = useCallback(
    (xPct: number, yPct: number) => {
      const lng =
        PH_BOUNDS.west + (PH_BOUNDS.east - PH_BOUNDS.west) * (xPct / 100);
      const lat =
        PH_BOUNDS.north - (PH_BOUNDS.north - PH_BOUNDS.south) * (yPct / 100);
      return { lat, lng };
    },
    [PH_BOUNDS]
  );

  // Reverse geocode using the repo's helper first (LocationIQ-based),
  // then fall back to free providers if key is missing.
  const lookupAddress = useCallback(async (lat: number, lng: number) => {
    setAddressLoading(true);
    try {
      // Preferred: use reverseGeocodePH from previous repository (LocationIQ)
      try {
        const res = await reverseGeocodePH(lat, lng);
        if (
          res?.full &&
          !/Missing NEXT_PUBLIC_LOCATIONIQ_KEY/i.test(res.full)
        ) {
          setAddress(res.full);
          return;
        }
      } catch {}

      const compose = (
        addr:
          | {
              house_number?: string;
              road?: string;
              neighbourhood?: string;
              suburb?: string;
              quarter?: string;
              city?: string;
              town?: string;
              village?: string;
              municipality?: string;
              county?: string;
            }
          | null
          | undefined
      ): string => {
        if (!addr) return "";
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.county;
        // Only up to town/city level
        const parts = [
          [addr.house_number, addr.road].filter(Boolean).join(" "),
          addr.neighbourhood || addr.suburb || addr.quarter,
          city,
        ].filter(Boolean);
        return parts.join(", ");
      };

      // 1) Nominatim (OSM) — free and often very detailed
      try {
        const url = new URL("https://nominatim.openstreetmap.org/reverse");
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("lat", String(lat));
        url.searchParams.set("lon", String(lng));
        url.searchParams.set("zoom", "19");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("accept-language", "en");
        const nomEmail = (process.env.NEXT_PUBLIC_NOMINATIM_EMAIL || "").trim();
        if (nomEmail) url.searchParams.set("email", nomEmail);
        const res = await fetch(url.toString(), {
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          const fromAddr = compose(data?.address);
          const display = fromAddr || data?.display_name || "";
          if (display) {
            setAddress(display);
            return;
          }
        }
      } catch {}

      // 2) Photon (Komoot) — free OSM-based reverse geocoder
      try {
        const res = await fetch(
          `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=en`
        );
        if (res.ok) {
          const data = await res.json();
          const p = data?.features?.[0]?.properties || {};
          const city =
            p.city || p.town || p.village || p.municipality || p.county;
          // Only up to town/city level
          const parts = [
            p.housenumber && p.street
              ? `${p.housenumber} ${p.street}`
              : p.street,
            p.district || p.suburb,
            city,
          ].filter(Boolean);
          const name = parts.join(", ") || p.name || "";
          if (name) {
            setAddress(name);
            return;
          }
        }
      } catch {}

      // 3) BigDataCloud free client — decent locality-level precision
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        if (res.ok) {
          const data = await res.json();
          // Only up to town/city level
          const parts = [
            data.localityInfo?.administrative?.find(
              (x: { order: number; name: string }) => x.order === 6
            )?.name || data.locality,
            data.city || data.locality || data.principalSubdivisionLocality,
          ].filter(Boolean);
          const name = parts.join(", ");
          if (name) {
            setAddress(name);
            return;
          }
        }
      } catch {}

      // 4) MapTiler as a last resort if a key exists
      try {
        const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
        if (key) {
          const res = await fetch(
            `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${key}&limit=1&language=en`
          );
          if (res.ok) {
            const data = await res.json();
            const first = data?.features?.[0];
            const name = first?.place_name || first?.properties?.name || "";
            if (name) {
              setAddress(name);
              return;
            }
          }
        }
      } catch {}

      setAddress("—");
    } finally {
      setAddressLoading(false);
    }
  }, []);

  // Attempt to dynamically import maplibre-gl if available
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod: typeof import("maplibre-gl") = await import("maplibre-gl");
        if (!mounted) return;
        maplibreRef.current = mod;
        setMode(maplibreRef.current ? "maplibre" : "stub");
      } catch {
        if (!mounted) return;
        setMode("stub");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Build a style: MapTiler streets if key provided, else OSM raster
  function getStreetStyle(): string | import("maplibre-gl").StyleSpecification {
    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (key) {
      return `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`;
    }
    return {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
      },
      layers: [{ id: "osm", type: "raster", source: "osm" }],
    } as import("maplibre-gl").StyleSpecification;
  }

  const placePinOnMap = useCallback(
    (lng: number, lat: number) => {
      const ML = maplibreRef.current;
      if (!ML || !mapRef.current) return;
      pinMarkerRef.current?.remove();
      pinMarkerRef.current = new ML.Marker()
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
      setPin({ lat, lng });
      lookupAddress(lat, lng);
    },
    [lookupAddress]
  );

  // Inject simple CSS for a pulsing location marker (once per page)
  const ensurePulseCSS = () => {
    if (typeof document === "undefined") return;
    if (document.getElementById("maplibre-pulse-css")) return;
    const style = document.createElement("style");
    style.id = "maplibre-pulse-css";
    style.textContent = `
      @keyframes pulseRing { 0% { transform: translate(-50%, -50%) scale(0.33); opacity: .8; } 80% { transform: translate(-50%, -50%) scale(1); opacity: 0; } 100% { opacity: 0; } }
      .pulse-ring { position: absolute; left:50%; top:50%; width:28px; height:28px; border-radius:50%; background: rgba(37,99,235,.35); animation: pulseRing 1.5s ease-out infinite; }
      .pulse-dot { position:absolute; left:50%; top:50%; width:12px; height:12px; margin-left:-6px; margin-top:-6px; border-radius:50%; background:#2563eb; box-shadow: 0 0 0 2px #fff; }
      @keyframes ps-spin { to { transform: rotate(360deg); } }
      .ps-spinner { width:28px; height:28px; border-radius:50%; border:3px solid rgba(0,0,0,.2); border-top-color: var(--primary-mintgreen, #2a9d8f); animation: ps-spin 1s linear infinite; }
    `;
    document.head.appendChild(style);
  };

  const drawMyMarker = useCallback((lng: number, lat: number) => {
    const ML = maplibreRef.current;
    if (!ML || !mapRef.current) return;
    ensurePulseCSS();
    if (!meMarkerRef.current) {
      const el = document.createElement("div");
      el.style.position = "relative";
      el.style.width = "28px";
      el.style.height = "28px";
      const ring = document.createElement("div");
      ring.className = "pulse-ring";
      const dot = document.createElement("div");
      dot.className = "pulse-dot";
      el.appendChild(ring);
      el.appendChild(dot);
      meMarkerRef.current = new ML.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
    } else {
      meMarkerRef.current.setLngLat([lng, lat]);
    }
  }, []);

  // Initialize MapLibre map if available
  useEffect(() => {
    const ML = maplibreRef.current;
    if (mode !== "maplibre" || !ML || !containerRef.current || !open) return;

    const map = new ML.Map({
      container: containerRef.current,
      style: getStreetStyle(),
      center: [121, 14.6],
      zoom: 9,
      maxZoom: 19,
      dragRotate: false,
    });
    mapRef.current = map;
    try {
      map.addControl(new ML.NavigationControl({ showCompass: false }));
      geolocateCtrlRef.current = new ML.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      });
      map.addControl(geolocateCtrlRef.current);
      try {
        geolocateCtrlRef.current.on?.(
          "geolocate",
          (pos: GeolocationPosition) => {
            const lat = pos?.coords?.latitude;
            const lng = pos?.coords?.longitude;
            if (typeof lat === "number" && typeof lng === "number") {
              drawMyMarker(lng, lat);
            }
          }
        );
      } catch {}
      // After the style loads, programmatically trigger the geolocate control
      map.once("load", () => {
        try {
          geolocateCtrlRef.current?.trigger?.();
        } catch {}
      });
    } catch {}

    map.on("click", (e: import("maplibre-gl").MapMouseEvent) => {
      placePinOnMap(e.lngLat.lng, e.lngLat.lat);
    });

    // If a pin already exists (e.g. from geolocation), render marker without mutating state
    if (pin) {
      try {
        pinMarkerRef.current?.remove();
        pinMarkerRef.current = new ML.Marker()
          .setLngLat([pin.lng, pin.lat])
          .addTo(map);
      } catch {}
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      pinMarkerRef.current = null;
      meMarkerRef.current = null;
      geolocateCtrlRef.current = null;
    };
  }, [mode, open, placePinOnMap, drawMyMarker]);

  // Reset auto-center flag whenever modal open state changes
  useEffect(() => {
    if (!open) {
      autoCenteredRef.current = false;
    } else {
      // On open, allow a fresh auto-center once map + pin are ready
      autoCenteredRef.current = false;
    }
  }, [open]);

  // Once map is ready and a pin exists, center the camera to the pin exactly once per open
  useEffect(() => {
    if (!open || mode !== "maplibre") return;
    const map = mapRef.current;
    if (!map || !pin) return;
    if (autoCenteredRef.current) return;

    const centerToPin = () => {
      try {
        map.easeTo({
          center: [pin.lng, pin.lat],
          zoom: Math.max(map.getZoom() ?? 0, 16),
        });
        // Ensure my marker is drawn if we already know my location
        if (me && !meMarkerRef.current) {
          drawMyMarker(me.lng, me.lat);
        }
      } catch {}
      autoCenteredRef.current = true;
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isLoaded = (map as any).isStyleLoaded?.() ?? true;
      if (!isLoaded) {
        map.once("load", centerToPin);
        const t = setTimeout(centerToPin, 800); // fallback just in case
        return () => clearTimeout(t);
      }
    } catch {}

    centerToPin();
  }, [open, mode, pin, me, drawMyMarker]);

  // Use my current location (works for both stub and maplibre modes)
  const getMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const here = { lat: coords.latitude, lng: coords.longitude };
        setMe(here);
        setPin(here);
        setXy(null);
        setAddress("");
        if (mode === "maplibre" && mapRef.current) {
          placePinOnMap(here.lng, here.lat);
          mapRef.current.easeTo({
            center: [here.lng, here.lat],
            zoom: Math.max(mapRef.current.getZoom() ?? 0, 16),
          });
          drawMyMarker(here.lng, here.lat);
        }
        setCenterLoading(false);
      },
      () => {
        setCenterLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  }, [mode, placePinOnMap, drawMyMarker]);

  // Stub click handler as a fallback
  const onStubClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode === "maplibre") return; // ignore when real map is active
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setXy({ x, y });
    const ll = projectToLatLng(x, y);
    setPin(ll);
    lookupAddress(ll.lat, ll.lng);
  };

  useEffect(() => {
    if (!open) {
      setXy(null);
      setPin(null);
      setAddress("");
      // Clean up map when closed
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
        pinMarkerRef.current = null;
      }
    }
  }, [open]);

  // Auto-run geolocate immediately when the modal opens; also try the control when available
  useEffect(() => {
    if (!open) return;
    setCenterLoading(true);
    // Immediate center using browser API
    getMyLocation();
    // Then also trigger the MapLibre control once it's ready
    const t = setTimeout(() => {
      try {
        if (geolocateCtrlRef.current && mapRef.current) {
          geolocateCtrlRef.current.trigger?.();
        }
      } catch {}
    }, 150);
    // Safety timeout to hide loader if geolocation stalls
    const t2 = setTimeout(() => setCenterLoading(false), 5000);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [getMyLocation, open]);

  // Match DetailsModal: lock body scroll and freeze position while open
  useLayoutEffect(() => {
    if (!open) return;
    const y = typeof window !== "undefined" ? window.scrollY : 0;
    const body = document.body;
    body.classList.add("modal-open");
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";
    return () => {
      body.classList.remove("modal-open");
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      if (typeof window !== "undefined") window.scrollTo(0, y);
    };
  }, [open]);

  if (!open) return null;

  const node = (
    <div
      className="fixed inset-0 z-[60] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl shadow-soft surface overflow-hidden max-h-[95vh] flex flex-col">
        <div
          className="flex items-center justify-between border-b p-4"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Pin Location
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pill px-3 py-1"
            style={{ border: "1px solid var(--border-color)" }}
          >
            Close
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div
            ref={containerRef}
            onClick={onStubClick}
            className="relative h-[40vh] min-h-[200px] sm:h-[50vh] md:h-96 w-full cursor-crosshair overflow-hidden rounded-xl"
            style={{ background: `linear-gradient(180deg, #e2e8f0, #f8fafc)` }}
          >
            {/* Grid overlay always visible; real map renders underneath via maplibre */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <svg width="100%" height="100%">
                <defs>
                  <pattern
                    id="grid"
                    width="40"
                    height="40"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 40 0 L 0 0 0 40"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1"
                      opacity="0.25"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
            {centerLoading && (
              <div className="absolute inset-0 grid place-items-center bg-white/60">
                <div className="flex flex-col items-center gap-3">
                  <div className="ps-spinner" />
                  <div
                    className="rounded-xl px-3 py-1.5 text-white text-sm shadow-soft"
                    style={{ background: "var(--primary-mintgreen)" }}
                  >
                    Centering to your location…
                  </div>
                </div>
              </div>
            )}
            {/* Stub pin preview */}
            {mode === "stub" && xy && (
              <div
                className="absolute -translate-x-1/2 -translate-y-full"
                style={{ left: `${xy.x}%`, top: `${xy.y}%` }}
              >
                <div
                  className="mx-auto h-0 w-0 border-l-8 border-r-8 border-t-[12px]"
                  style={{
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                    borderTopColor: "var(--primary-mintgreen)",
                  }}
                />
                <div
                  className="mx-auto h-5 w-5 rounded-full"
                  style={{ backgroundColor: "var(--primary-mintgreen)" }}
                />
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-3 text-sm sm:flex-row sm:items-start sm:justify-between">
            <div className="opacity-70 min-w-0">
              {pin ? (
                <>Selected: {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</>
              ) : (
                <>Tap on the map to drop a pin.</>
              )}
              {me && (
                <span className="ml-2">
                  • You: {me.lat.toFixed(5)}, {me.lng.toFixed(5)}
                </span>
              )}
              <div className="mt-1">
                <b>Address:</b>{" "}
                {addressLoading ? "Looking up…" : address || "—"}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                className="pill px-3 py-2 text-sm"
                style={{ border: "1px solid var(--border-color)" }}
                onClick={getMyLocation}
              >
                Use My Location
              </button>
              <button
                type="button"
                disabled={!pin}
                className="btn btn-accent px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={() =>
                  pin && onSelect(pin.lat, pin.lng, address || undefined)
                }
              >
                Confirm Pin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  if (typeof document !== "undefined") {
    return createPortal(node, document.body);
  }
  return node;
}
