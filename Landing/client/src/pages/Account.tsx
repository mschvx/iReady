import React, { useMemo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface User {
  id: string;
  username: string;
}

export const Account = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const goHome = () => setLocation("/");
  const goBack = () => setLocation("/");

  // single source-of-truth for the user's name: "User"
  // read from localStorage (or your auth store). Falls back to placeholder.
  const [User, setUser] = useState<string>(() => {
    return (localStorage.getItem("username") || localStorage.getItem("displayName") || "Name Surname");
  });

  useEffect(() => {
    const stored = localStorage.getItem("username") || localStorage.getItem("displayName");
    if (stored && stored.trim().length > 0) setUser(stored);
  }, []);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((p) => p.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  const stringToColor = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
    const hue = Math.abs(h) % 360;
    return `hsl(${hue} 60% 55%)`;
  };
  const avatarDataUrl = useMemo(() => {
    const initials = getInitials(User || "U");
    const bg = stringToColor(User || "user");
    const size = 160;
    const fontSize = 64;
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
        <rect width='100%' height='100%' rx='999' fill='${bg}' />
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Helvetica, Arial, sans-serif' font-size='${fontSize}' fill='#fff' font-weight='700'>${initials}</text>
      </svg>
    `.trim();
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [User]);

  // allow editing the user's name (persists to localStorage and updates `User`)
  const handleEditName = () => {
    const newName = prompt("Enter display name", User || "");
    if (newName !== null) {
      const trimmed = newName.trim();
      if (trimmed.length > 0) {
        setUser(trimmed);
        localStorage.setItem("username", trimmed);
        localStorage.setItem("displayName", trimmed);
      }
    }
  };

  const logout = () => {
    // clear common auth keys (adjust to your auth storage)
    localStorage.removeItem("username");
    localStorage.removeItem("displayName");
    localStorage.removeItem("token");
    setUser("");
    setLocation("/");
  };

  if (false) {
    return (
      <div className="bg-white w-full min-h-screen flex items-center justify-center">
        <p className="text-2xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white w-full min-h-screen">
      {/* Header (same style as FirstPage) */}
      <header className="fixed top-0 left-0 w-full h-16 md:h-20 lg:h-24 z-[4000] bg-black shadow-none border-b-0 flex items-center">
        <div className="pl-4 md:pl-6 lg:pl-8">
          <img
            className="h-8 md:h-10 lg:h-12 w-auto block"
            alt="iReady Header"
            src="/figmaAssets/fixed.png"
          />
        </div>
      </header>

      {/* Nav (keep above content) */}
      <nav className="fixed top-0 right-0 z-[4100] flex gap-3 md:gap-4 pr-4 md:pr-8 pt-3 md:pt-4 lg:pt-6">
        <Button onClick={goHome} className="h-10 md:h-12 px-4 md:px-6 bg-blue-600 rounded-full hover:bg-blue-700 text-sm md:text-base">
          HOME
        </Button>
        <Button className="h-10 md:h-12 px-4 md:px-6 bg-blue-600 rounded-full hover:bg-blue-700 text-sm md:text-base">
          ACCOUNT
        </Button>
      </nav>

      {/* Main content */}
      <main className="pt-16 md:pt-20 lg:pt-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6 items-start">
          {/* Left column: avatar + info (centered within its column) */}
          <aside className="col-span-12 md:col-span-3 flex flex-col items-center text-center">
            <img
              src={avatarDataUrl}
              alt={User}
              className="w-36 h-36 rounded-full shadow-lg mb-4 object-cover"
            />
            {/* display name reads from stored username; editable and linked to input via localStorage */}
            <div className="text-2xl md:text-3xl font-semibold">
              <button onClick={handleEditName} className="underline-offset-2 hover:underline">
                {User || "User"}
              </button>
            </div>

            {/* logout button below the username */}
            <button
              onClick={logout}
              className="mt-3 bg-red-500 text-white px-4 py-2 rounded-full shadow-sm hover:opacity-90 text-sm"
              aria-label="Log out"
            >
              Log out
            </button>
            {/* uniform, slightly larger info text, centered */}
            <div className="text-base text-gray-600 mt-4">other info</div>
            <div className="text-base text-gray-600 mt-2">like location</div>
          </aside>

          {/* Center / right: main card */}
          <section className="col-span-12 md:col-span-9">
            <div className="bg-gray-100 rounded-2xl p-6 shadow-md text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Current Barangay Focus</h2>

              <div className="mb-2">
                <a
                  href="#"
                  className="text-blue-600 inline-flex items-center text-lg font-medium underline"
                  onClick={(e) => e.preventDefault()}
                >
                  ↗&nbsp; Baranggay Name
                </a>
              </div>

              <div className="text-base text-gray-600">location</div>
              <div className="text-base text-gray-600 mb-4">residents num</div>

              <div className="mt-4">
                <div className="bg-white rounded-2xl border-4 border-blue-300 p-6 h-64 shadow-inner">
                  <h3 className="text-2xl font-semibold mb-3">Checklist</h3>
                  <div className="text-base text-gray-600">{/* checklist items go here */}</div>
                </div>
              </div>
            </div>

            {/* bottom action (align to the right) */}
            <div className="flex justify-end mt-6">
              <button
                onClick={goBack}
                className="bg-blue-400 text-white px-6 py-2 rounded-full shadow-sm hover:opacity-95"
              >
                go back
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Account;
