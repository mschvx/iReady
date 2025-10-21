import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup as LeafletPopup, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
// Navotas bounding box (approx) — updated to match local POIs in server/data/navotas_pois.json
const NAVOTAS_BOUNDS = {
  // loosely around the navotas POIs
  minLat: 14.42,
  maxLat: 14.45,
  minLon: 120.92,
  maxLon: 120.944,
};

type BarangayCenter = {
  adm4_pcode: string;
  lat: number;
  lon: number;
};

type NavotasPOI = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  keywords?: string[];
};

// Fallback random centers (used only until we load actual areaCodes)
const fallbackBarangayCenters: BarangayCenter[] = Array.from({ length: 50 }, (_, i) => ({
  adm4_pcode: `PH170000000${(i + 1).toString().padStart(2, "0")}`,
  lat:
    NAVOTAS_BOUNDS.minLat +
    Math.random() * (NAVOTAS_BOUNDS.maxLat - NAVOTAS_BOUNDS.minLat),
  lon:
    NAVOTAS_BOUNDS.minLon +
    Math.random() * (NAVOTAS_BOUNDS.maxLon - NAVOTAS_BOUNDS.minLon),
}));

// Tighter land-only bounds inside Navotas to reduce chance of water placement.
// We base this on the POIs file ranges and keep it slightly inset from the extreme
// POI coordinates so randomly generated points land on built-up/land areas.
const NAVOTAS_LAND_BOUNDS = {
  minLat: 14.427,
  maxLat: 14.444,
  minLon: 120.923,
  maxLon: 120.94,
};

function getLatLonForCode(code: string): { lat: number; lon: number } {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const t = (h % 100000) / 100000;
  const u = ((h >>> 7) % 100000) / 100000;
  const lat = NAVOTAS_LAND_BOUNDS.minLat + t * (NAVOTAS_LAND_BOUNDS.maxLat - NAVOTAS_LAND_BOUNDS.minLat);
  const lon = NAVOTAS_LAND_BOUNDS.minLon + u * (NAVOTAS_LAND_BOUNDS.maxLon - NAVOTAS_LAND_BOUNDS.minLon);
  return { lat, lon };
}
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  username: string;
}

interface SupplyPrediction {
  adm4_pcode: string;
  [key: string]: any;
}

interface CategorySupplies {
  medical: { [key: string]: number };
  food: { [key: string]: number };
  shelter: { [key: string]: number };
  water: { [key: string]: number };
}

export const Home = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [areaCodes, setAreaCodes] = useState<string[]>([]);
  const [areaSuggestions, setAreaSuggestions] = useState<string[]>([]);
  const [poiCenters, setPoiCenters] = useState<NavotasPOI[]>([]);
  const [displayCenters, setDisplayCenters] = useState<BarangayCenter[]>([]);
  // mapRef removed: we use a small MapViewUpdater component to control view

  function MapViewUpdater({ center }: { center: { lat: number; lon: number } }) {
    const map = useMap();
    useEffect(() => {
      if (!map) return;
      try {
        map.setView([center.lat, center.lon], map.getZoom());
      } catch (err) {
        // ignore
      }
    }, [center.lat, center.lon, map]);
    return null;
  }
  // derive centers from areaCodes (first 50) or fallback; actual display centers are
  // generated from nearby POIs to ensure points fall on land (we jitter around
  // non-water POIs). displayCenters is computed in an effect below.
  const barangayCenters: BarangayCenter[] = (areaCodes && areaCodes.length > 0)
    ? areaCodes.slice(0, 50).map((c) => {
        const { lat, lon } = getLatLonForCode(c);
        return { adm4_pcode: c, lat, lon };
      })
    : fallbackBarangayCenters;
  // default map center set to Navotas area center so our 50 points are visible on load
  const defaultCenterLat = (NAVOTAS_LAND_BOUNDS.minLat + NAVOTAS_LAND_BOUNDS.maxLat) / 2;
  const defaultCenterLon = (NAVOTAS_LAND_BOUNDS.minLon + NAVOTAS_LAND_BOUNDS.maxLon) / 2;
  const [mapCenter, setMapCenter] = useState({ lat: defaultCenterLat, lon: defaultCenterLon });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; lat: number; lon: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [adm4Suggestions, setAdm4Suggestions] = useState<Array<any>>([]);
  const [supplies, setSupplies] = useState<CategorySupplies | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<string>("");

  useEffect(() => {
    checkAuth();
    // keep loading supplies predictions (previous behavior)
    loadSupplies();

    // fetch local toreceive area codes for simple search
    (async () => {
      try {
        const resp = await fetch('/api/toreceive');
        if (!resp.ok) return;
        const data = await resp.json();
        if (Array.isArray(data.codes)) setAreaCodes(data.codes);
      } catch (err) {
        // ignore
      }
    })();

    // fetch all Navotas POIs (used to place accurate markers). We'll use these
    // POIs as anchors to scatter our 50 circles on land (we filter out POIs that
    // look like water to avoid placing circles in the bay/sea).
    (async () => {
      try {
        const resp = await fetch('/api/pois?all=true');
        if (!resp.ok) return;
        const data = await resp.json();
        const pois: NavotasPOI[] = data.results || data || [];
        const waterKeywords = ['sea','bay','ocean','lake','river','channel','canal','marina','harbor','harbour','ferry','port'];
        const filtered = pois.filter(p => {
          const kw = p.keywords || [];
          return !kw.some((k: string) => waterKeywords.some(w => k.toLowerCase().includes(w)));
        });
        setPoiCenters(filtered);
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  // Compute 50 display centers anchored on land POIs or fall back to deterministic
  // pseudo-random locations derived from ADM4 codes. We jitter near POIs so
  // the points are guaranteed to be close to known land locations.
  useEffect(() => {
    const count = 50;
    const centers: BarangayCenter[] = [];
    const rng = (seed: string) => {
      // simple deterministic PRNG based on code string
      let h = 2166136261 >>> 0;
      for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
        h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
        const res = (h >>> 0) / 4294967295;
        return res;
      };
    };

    // choose a deterministic or random poi index for each code
    for (let i = 0; i < count; i++) {
      const code = (areaCodes && areaCodes.length > 0) ? areaCodes[i % areaCodes.length] : `PH-FAKE-${i + 1}`;
      let lat = 0;
      let lon = 0;

      if (poiCenters && poiCenters.length > 0) {
        // pick a poi deterministically so rerenders are stable
        const pick = (i * 7) % poiCenters.length;
        const base = poiCenters[pick];
        const prng = rng(code + String(i));
        // jitter +/- ~0.0015 degrees (~100-150m) around POI
        const jitterLat = (prng() - 0.5) * 0.003;
        const jitterLon = (prng() - 0.5) * 0.003;
        lat = base.lat + jitterLat;
        lon = base.lon + jitterLon;
      } else {
        // fallback deterministic mapping inside NAVOTAS_LAND_BOUNDS
        const { lat: gLat, lon: gLon } = getLatLonForCode(code);
        lat = gLat;
        lon = gLon;
      }

      centers.push({ adm4_pcode: code, lat, lon });
    }

    setDisplayCenters(centers);
  }, [areaCodes, poiCenters]);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (!response.ok) {
        setLocation("/login");
        return;
      }
      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      setLocation("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSupplies = async () => {
    try {
      const response = await fetch("/ToReceive.json");
      if (response.ok) {
        const data: SupplyPrediction[] = await response.json();
        console.log("Loaded supplies data:", data.length, "barangays");
        // Get first barangay's data or allow selection
        if (data.length > 0) {
          const firstBarangay = data[0];
          setSelectedBarangay(firstBarangay.adm4_pcode);
          categorizeSupplies(firstBarangay);
          // Use the adm4_pcode values from ToReceive.json as our area codes so
          // the map markers show real barangay codes instead of PH-FAKE.
          try {
            const codes = data.map((d) => d.adm4_pcode).filter(Boolean) as string[];
            if (codes.length > 0) setAreaCodes(codes);
          } catch (err) {
            // ignore malformed data
          }
        }
      } else {
        console.error("Failed to fetch supplies:", response.status);
      }
    } catch (err) {
      console.error("Failed to load supplies:", err);
    }
  };

  const categorizeSupplies = (barangayData: SupplyPrediction) => {
    const categories: CategorySupplies = {
      medical: {},
      food: {},
      shelter: {},
      water: {}
    };

    Object.keys(barangayData).forEach(key => {
      if (key.startsWith("pred_")) {
        const itemName = key.replace("pred_", "").replace(/_/g, " ");
        const value = barangayData[key];
        
        // Categorize based on item name (matching RForest_train.py logic)
        if (/para|first|antibi|bandage|alcohol|therm|blood|mask|glove|vitamin/.test(key)) {
          categories.medical[itemName] = value;
        } else if (/rice|canned|noodle|biscuit|baby|oil|sugar|salt|juice|meal/.test(key)) {
          categories.food[itemName] = value;
        } else if (/blanket|mat|tent|pillow|cloth|towel|slipper|hygiene|net|flash/.test(key)) {
          categories.shelter[itemName] = value;
        } else if (key.startsWith("pred_")) {
          categories.water[itemName] = value;
        }
      }
    });

    setSupplies(categories);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setLocation("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError("");
    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Location not found");
      }

      const data = await response.json();
      setMapCenter({ lat: data.lat, lon: data.lon });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Search failed";
      setSearchError(errorMsg);
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch POI suggestions from server
  useEffect(() => {
      if (!searchQuery.trim()) {
        // clear both area-code suggestions and POI/adm4 suggestions when search is empty
        setAreaSuggestions([]);
        setSuggestions([]);
        setAdm4Suggestions([]);
        setShowSuggestions(false);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        // fetch POI suggestions
        const resp = await fetch(`/api/pois?q=${encodeURIComponent(searchQuery)}`);
        if (resp.ok) {
          const data = await resp.json();
          setSuggestions(data.results || []);
        }
      } catch (err) {
        console.error("POI suggestion error:", err);
      }

      try {
        // fetch adm4 matches
        const adm = await fetch(`/api/adm4?q=${encodeURIComponent(searchQuery)}`);
        if (adm.ok) {
          const admData = await adm.json();
          setAdm4Suggestions(admData.results || []);
        }
      } catch (err) {
        console.error("ADM4 suggestion error:", err);
      }

      setShowSuggestions(true);
    }, 250); // debounce

    return () => clearTimeout(handle);
  }, [searchQuery]);

  const handleSelectSuggestion = (s: { id: string; name: string; lat: number; lon: number }) => {
    setMapCenter({ lat: s.lat, lon: s.lon });
    setSearchQuery(s.name);
    setShowSuggestions(false);
  };

  const handleSelectAdm4 = async (adm: any) => {
    if (!adm) return;
    // set selected barangay and supplies
    setSelectedBarangay(adm.adm4_pcode || "");
    try {
      categorizeSupplies(adm);
    } catch (err) {
      console.error("Failed to categorize supplies for adm4:", err);
    }

    // set search text to the adm4 code for clarity
    setSearchQuery(adm.adm4_pcode || "");
    setShowSuggestions(false);

    // attempt to geocode adm4 code (server will fallback to nominatim)
    try {
      const resp = await fetch(`/api/geocode?q=${encodeURIComponent(adm.adm4_pcode)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.lat && data.lon) {
          setMapCenter({ lat: data.lat, lon: data.lon });
        }
      }
    } catch (err) {
      console.error("Geocode adm4 failed:", err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white w-full min-h-screen flex items-center justify-center">
        <p className="text-2xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white relative w-full h-screen overflow-hidden">
      {/* Header */}
      <div className="absolute bg-[#110000] h-[103px] left-0 top-0 w-full z-10 flex items-center justify-between px-4">
        <div className="flex items-center">
          <h1 className="text-white text-2xl font-bold">READY</h1>
        </div>
        
        <div className="flex gap-4">
          <button className="bg-[#2563eb] px-6 py-4 rounded-full text-white font-normal hover:bg-[#1d4ed8]">
            HOME
          </button>
          <button 
            onClick={() => setLocation("/account")}
            className="bg-[#2563eb] px-6 py-4 rounded-full text-white font-normal hover:bg-[#1d4ed8]"
          >
            ACCOUNT
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-full pt-[103px]">
        {/* Map Section */}
        <div className="relative bg-[#d9d9d9] border border-solid border-black w-[940px] h-[calc(100vh-103px)] flex items-center justify-center">
          <MapContainer
            center={[mapCenter.lat, mapCenter.lon]}
            zoom={15}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', minHeight: '400px' }}
          >
            <MapViewUpdater center={mapCenter} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {displayCenters.map((b: any, idx: number) => (
              <CircleMarker
                key={b.adm4_pcode || idx}
                center={[b.lat, b.lon]}
                radius={5}
                pathOptions={{ color: '#fff', fillColor: '#2563eb', fillOpacity: 0.95, weight: 1 }}
              >
                <LeafletPopup>{b.adm4_pcode}</LeafletPopup>
                <LeafletTooltip direction="top" offset={[0, -6]} permanent className="bg-white text-xs text-black px-1 py-0 rounded shadow-sm">
                  {b.adm4_pcode}
                </LeafletTooltip>
              </CircleMarker>
            ))}
          </MapContainer>
          <button className="absolute left-2 bottom-8 bg-[#93c5fd] px-6 py-2 rounded-xl text-white text-lg hover:bg-[#7ab8f7]" style={{ zIndex: 10 }}>
            go back
          </button>
        </div>

        {/* Right Sidebar */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Barangay Search */}
          <div className="mb-6">
            <div className="relative bg-[#e6e6e6] rounded-[23px] p-4">
              <Input
                type="text"
                placeholder="Search barangay or location..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const v = e.target.value;
                  setSearchQuery(v);
                  // update suggestions from areaCodes (simple substring match)
                  const q = v.trim().toLowerCase();
                  if (!q) {
                      setAreaSuggestions([]);
                    } else {
                      const matches = areaCodes.filter((c) => c.toLowerCase().includes(q)).slice(0, 10);
                      setAreaSuggestions(matches);
                    }
                  setSearchError("");
                }}
                onKeyPress={handleKeyPress}
                disabled={isSearching}
                className="w-full h-[60px] bg-white rounded-[23px] border-0 px-6 text-xl text-center"
              />
              <button 
                onClick={handleSearch}
                disabled={isSearching}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#93c5fd] w-[72px] h-[66px] rounded-xl flex items-center justify-center text-white text-[37.5px] hover:bg-[#7ab8f7] disabled:opacity-50"
              >
                {isSearching ? "..." : "→"}
              </button>
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute mt-2 w-[calc(100%-64px)] max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-lg z-50 shadow-lg">
                {suggestions.map((s) => (
                  <div key={s.id} className="p-3 hover:bg-gray-100 cursor-pointer" onClick={() => handleSelectSuggestion(s)}>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-gray-500">{s.lat.toFixed(5)}, {s.lon.toFixed(5)}</div>
                  </div>
                ))}
                {adm4Suggestions.length > 0 && (
                  <div className="border-t border-gray-100">
                    {adm4Suggestions.map((a) => (
                      <div key={a.adm4_pcode} className="p-3 hover:bg-gray-100 cursor-pointer" onClick={() => handleSelectAdm4(a)}>
                        <div className="font-medium">{a.adm4_pcode}</div>
                        <div className="text-sm text-gray-500">Population: {a.pop_30min ?? 'N/A'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {searchError && (
              <p className="text-red-600 text-sm mt-2 px-4">{searchError}</p>
            )}
            {/* Suggestions list */}
            {areaSuggestions.length > 0 && (
              <div className="mt-2 bg-white rounded-md shadow-sm max-h-60 overflow-auto">
                {areaSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSearchQuery(s);
                      setAreaSuggestions([]);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Respondent */}
          <p className="font-normal text-[31.041px] text-black tracking-[-0.6208px] mb-4">
            MAIN RESPONDENT
          </p>
          
          <button className="border-b-[2.369px] border-[#2563eb] pb-1 mb-8 flex items-center gap-4 bg-transparent cursor-pointer">
            <span className="text-[37.9px] text-[#2563eb] tracking-[-0.758px]">
              ↗ NGO/LGU NAME
            </span>
          </button>

          {/* Legends Section */}
          <p className="font-normal text-[45.149px] text-black tracking-[-0.903px] mb-4">
            LEGENDS
          </p>
          <div className="space-y-2 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#d1d1d1] border-[0.556px] border-solid rounded-[35.562px] h-[57.435px]" />
            ))}
          </div>

          {/* Analysis Section */}
          <p className="font-normal text-[45.149px] text-black tracking-[-0.903px] mb-4">
            ANALYSIS
          </p>
          <div className="space-y-2 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#d1d1d1] border-[0.556px] border-solid rounded-[35.562px] h-[57.435px]" />
            ))}
          </div>

          {/* Needs Section */}
          <p className="font-normal text-[47.908px] text-black tracking-[-0.9582px] mb-4">
            NEEDS
          </p>
          
          {supplies ? (
            <div className="space-y-6">
              {/* Medical & Health Category */}
              <div className="mb-6">
                <h3 className="font-bold text-[32px] text-[#2563eb] mb-3">Medical & Health</h3>
                <div className="space-y-2">
                  {Object.entries(supplies.medical).map(([item, quantity]) => (
                    <div key={item} className="bg-[#e3f2fd] border-[0.588px] border-solid border-[#2563eb] rounded-[37.607px] h-[60.737px] flex items-center justify-between px-6">
                      <span className="text-[20px] capitalize">{item}</span>
                      <span className="text-[24px] font-bold text-[#2563eb]">{quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Food & Nutrition Category */}
              <div className="mb-6">
                <h3 className="font-bold text-[32px] text-[#16a34a] mb-3">Food & Nutrition</h3>
                <div className="space-y-2">
                  {Object.entries(supplies.food).map(([item, quantity]) => (
                    <div key={item} className="bg-[#f0fdf4] border-[0.588px] border-solid border-[#16a34a] rounded-[37.607px] h-[60.737px] flex items-center justify-between px-6">
                      <span className="text-[20px] capitalize">{item}</span>
                      <span className="text-[24px] font-bold text-[#16a34a]">{quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shelter & Personal Relief Category */}
              <div className="mb-6">
                <h3 className="font-bold text-[32px] text-[#ca8a04] mb-3">Shelter & Personal Relief</h3>
                <div className="space-y-2">
                  {Object.entries(supplies.shelter).map(([item, quantity]) => (
                    <div key={item} className="bg-[#fefce8] border-[0.588px] border-solid border-[#ca8a04] rounded-[37.607px] h-[60.737px] flex items-center justify-between px-6">
                      <span className="text-[20px] capitalize">{item}</span>
                      <span className="text-[24px] font-bold text-[#ca8a04]">{quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Water & Sanitation Category */}
              <div className="mb-6">
                <h3 className="font-bold text-[32px] text-[#0891b2] mb-3">Water & Sanitation</h3>
                <div className="space-y-2">
                  {Object.entries(supplies.water).map(([item, quantity]) => (
                    <div key={item} className="bg-[#ecfeff] border-[0.588px] border-solid border-[#0891b2] rounded-[37.607px] h-[60.737px] flex items-center justify-between px-6">
                      <span className="text-[20px] capitalize">{item}</span>
                      <span className="text-[24px] font-bold text-[#0891b2]">{quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <div key={i} className="bg-[#d1d1d1] border-[0.588px] border-solid rounded-[37.607px] h-[60.737px]" />
              ))}
            </div>
          )}
          {/* test*/}


        
        </div>
      </div>
    </div>
  );
};
