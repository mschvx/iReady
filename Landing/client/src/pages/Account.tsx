import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface User {
  id: string;
  username: string;
}

export const Account = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

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
          <button 
            onClick={() => setLocation("/home")}
            className="bg-[#2563eb] px-6 py-4 rounded-full text-white font-normal hover:bg-[#1d4ed8]"
          >
            HOME
          </button>
          <button className="bg-[#2563eb] px-6 py-4 rounded-full text-white font-normal hover:bg-[#1d4ed8]">
            ACCOUNT
          </button>
        </div>
      </div>

      {/* Account Content */}
      <div className="flex items-center justify-center h-full pt-[103px]">
        <div className="flex flex-col items-center gap-8 w-full max-w-[797px] px-8">
          <h1 className="[font-family:'Akira_Expanded-SuperBold',Helvetica] font-bold text-black text-[92.6px] tracking-[0] leading-[normal] text-center">
            ACCOUNT
          </h1>
          
          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white text-5xl font-bold">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <p className="text-sm text-gray-500 hover:text-blue-600 cursor-pointer transition-colors">
              Change profile picture
            </p>
          </div>
          
          <p className="text-4xl text-black">
            Username: <span className="font-bold">{user?.username}</span>
          </p>

          <button
            onClick={handleLogout}
            className="w-[459px] h-[63px] bg-[#d9d9d9] rounded-[64px] hover:bg-[#c9c9c9] mt-8"
          >
            <span className="[font-family:'Akira_Expanded-SuperBold',Helvetica] font-bold text-black text-[46.7px] tracking-[0] leading-[normal] whitespace-nowrap">
              LOG OUT
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
