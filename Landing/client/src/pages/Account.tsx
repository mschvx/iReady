import React, { useMemo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface AppUser {
  id: string;
  username: string;
}

export const Account = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const goHome = () => setLocation("/home");
  const goBack = () => setLocation("/home");

  // single source-of-truth for the user's name: `username`
  // read from localStorage (or your auth store). Falls back to placeholder.
  const [username, setUsername] = useState<string>(() => {
    return (localStorage.getItem("username") || localStorage.getItem("displayName") || "Name Surname");
  });

  // organization/profile editable fields (persisted to localStorage)
  const [summary, setSummary] = useState<string>(() => localStorage.getItem("summary") || "");
  const [history, setHistory] = useState<string>(() => localStorage.getItem("history") || "");
  const [social, setSocial] = useState<string>(() => localStorage.getItem("contact_social") || "");
  const [email, setEmail] = useState<string>(() => localStorage.getItem("contact_email") || "");
  const [phone, setPhone] = useState<string>(() => localStorage.getItem("contact_phone") || "");

  // edit modal state: uses an overlay (similar to login/signup)
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editSummary, setEditSummary] = useState<string>("");
  const [editHistory, setEditHistory] = useState<string>("");
  // multiple social entries support
  const [editSocialList, setEditSocialList] = useState<string[]>([]);
  const [editEmail, setEditEmail] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("username") || localStorage.getItem("displayName");
    if (stored && stored.trim().length > 0) setUsername(stored);
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
    const initials = getInitials(username || "U");
    const bg = stringToColor(username || "user");
    const size = 160;
    const fontSize = 64;
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
        <rect width='100%' height='100%' rx='999' fill='${bg}' />
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Helvetica, Arial, sans-serif' font-size='${fontSize}' fill='#fff' font-weight='700'>${initials}</text>
      </svg>
    `.trim();
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [username]);

  // allow editing the user's name (persists to localStorage and updates `User`)
  const handleEditName = () => {
    const newName = prompt("Enter display name", username || "");
    if (newName !== null) {
      const trimmed = newName.trim();
      if (trimmed.length > 0) {
        setUsername(trimmed);
        localStorage.setItem("username", trimmed);
        localStorage.setItem("displayName", trimmed);
      }
    }
  };

  // open modal and populate edit fields (supports multiple socials)
  const startEdit = () => {
    setEditSummary(summary);
    setEditHistory(history);
    setEditEmail(email);
    setEditPhone(phone);
    // try JSON array first, fall back to comma-separated display
    const raw = localStorage.getItem("contact_socials");
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        setEditSocialList(Array.isArray(arr) ? arr : []);
      } catch {
        setEditSocialList(social ? social.split(",").map((s) => s.trim()) : []);
      }
    } else {
      setEditSocialList(social ? social.split(",").map((s) => s.trim()) : []);
    }
    setShowEditModal(true);
  };

  const saveDetails = () => {
    setSummary(editSummary);
    localStorage.setItem("summary", editSummary);
    setHistory(editHistory);
    localStorage.setItem("history", editHistory);
    // persist socials as JSON array for multiple entries
    const cleaned = editSocialList.map((s) => s.trim()).filter(Boolean);
    localStorage.setItem("contact_socials", JSON.stringify(cleaned));
    // also keep a display string for backwards compatibility
    const displaySocial = cleaned.join(", ");
    setSocial(displaySocial);
    localStorage.setItem("contact_social", displaySocial);

    setEmail(editEmail);
    localStorage.setItem("contact_email", editEmail);
    setPhone(editPhone);
    localStorage.setItem("contact_phone", editPhone);
    setShowEditModal(false);
  };

  const cancelEdit = () => {
    setShowEditModal(false);
  };

  const logout = () => {
    // clear common auth keys (adjust to your auth storage)
    localStorage.removeItem("username");
    localStorage.removeItem("displayName");
    localStorage.removeItem("token");
    setUsername("");
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
      {/* make page area scrollable and let the grid resize columns responsively:
                      - left column can grow (minmax) up to ~42% of width
                                - right column takes remaining space
                                        */}
      <main className="pt-16 md:pt-20 lg:pt-24 px-6">
        {/* centered two-column group: narrower max-width so it visually centers, and vertically centered */}
        <div className="max-w-7xl mx-auto h-[calc(100vh-6rem)] overflow-auto flex items-center justify-center">
          <div className="grid gap-2 place-items-center min-h-full w-full max-w-7xl
                          grid-cols-1
                          md:[grid-template-columns:minmax(240px,360px)_minmax(0,3fr)]">
            {/* Left column: slightly wider profile card but still smaller than the main card */}
            <aside className="col-span-1 flex justify-center">
              {/* left card (smaller padding so group stays centered) */}
              <div className="w-full bg-gray-100 rounded-2xl p-14 shadow-md text-center overflow-auto">
                <img
                  src={avatarDataUrl}
                  alt={username}
                  className="w-40 h-40 rounded-full shadow-lg mb-4 object-cover mx-auto"
                />
                <div
                  className="text-2xl md:text-3xl font-semibold text-center break-words break-all whitespace-normal max-w-full"
                  title={username}
                >
                  {username}
                </div>

                {/* Red logout button placed directly below the username */}
                <button
                  onClick={logout}
                  className="mt-3 bg-red-500 text-white px-4 py-2 rounded-full shadow-sm hover:opacity-90 text-sm"
                  aria-label="Log out"
                >
                  Log out
                </button>

                {/* Editable organization/profile fields inside the same card */}
                <div className="w-full text-left mt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">Summary</div>
                    <button onClick={startEdit} className="text-xs text-blue-600 hover:underline">Edit</button>
                  </div>
                  <div className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{summary || <span className="text-gray-400">(not set)</span>}</div>

                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-700">History</div>
                    <div className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{history || <span className="text-gray-400">(not set)</span>}</div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-700">Contact Information</div>
                    <div className="text-sm text-gray-600 mt-1">Social: {social || <span className="text-gray-400">(not set)</span>}</div>
                    <div className="text-sm text-gray-600">Email: {email || <span className="text-gray-400">(not set)</span>}</div>
                    <div className="text-sm text-gray-600">Phone: {phone || <span className="text-gray-400">(not set)</span>}</div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Center / right: main card (content centered inside card) */}
            <section className="col-span-1 w-full bg-gray-100 rounded-2xl p-6 shadow-md text-center justify-self-center">
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
        </div>
      </main>

      {/* Edit modal overlay (lightweight, similar to login/signup style) */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-[3200] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-6 mx-auto shadow-2xl z-10" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">Edit Profile</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Summary of organization</label>
                <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-2 text-sm" rows={3} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">History of helped barangays</label>
                <textarea value={editHistory} onChange={(e) => setEditHistory(e.target.value)} className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-2 text-sm" rows={3} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Social media (add multiple)</label>
                <div className="space-y-2 mt-2">
                  {editSocialList.map((s, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input value={s} onChange={(e) => {
                        const copy = [...editSocialList]; copy[idx] = e.target.value; setEditSocialList(copy);
                      }} className="flex-1 rounded-md border-gray-200 shadow-sm p-2 text-sm" placeholder="handle or URL" />
                      <button type="button" onClick={() => {
                        const copy = [...editSocialList]; copy.splice(idx,1); setEditSocialList(copy);
                      }} className="px-2 rounded-md bg-red-100 text-red-600 text-sm">Remove</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setEditSocialList((s) => [...s, ""])} className="text-sm text-blue-600 hover:underline">+ Add social</button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-2 text-sm" placeholder="email@example.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-2 text-sm" placeholder="0917-xxx-xxxx" />
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setShowEditModal(false)} className="px-3 py-1 rounded-md bg-gray-200 text-sm">Cancel</button>
                <button onClick={saveDetails} className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
