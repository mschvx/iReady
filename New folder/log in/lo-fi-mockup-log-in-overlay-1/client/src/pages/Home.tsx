import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  username: string;
}

export const Home = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState({ lat: 14.6094, lon: 120.9942 });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (!response.ok) {
        setLocation("/");
        return;
      }
      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      setLocation("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setLocation("/");
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
          <iframe
            key={`${mapCenter.lat}-${mapCenter.lon}`}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lon - 0.01}%2C${mapCenter.lat - 0.01}%2C${mapCenter.lon + 0.01}%2C${mapCenter.lat + 0.01}&layer=mapnik&marker=${mapCenter.lat},${mapCenter.lon}`}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            title="Philippines Map"
          />
          
          <button className="absolute left-2 bottom-8 bg-[#93c5fd] px-6 py-2 rounded-xl text-white text-lg hover:bg-[#7ab8f7]">
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
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
            {searchError && (
              <p className="text-red-600 text-sm mt-2 px-4">{searchError}</p>
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
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="bg-[#d1d1d1] border-[0.588px] border-solid rounded-[37.607px] h-[60.737px]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
