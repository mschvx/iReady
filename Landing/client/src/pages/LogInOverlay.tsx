// ...existing code...
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

export const LogInOverlay = ({ onClose }: { onClose?: () => void }): JSX.Element => {
  const [, setLocation] = useLocation();
  const close = () => {
    if (onClose) onClose();
    else setLocation("/");
  };

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Username and password are required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      setLocation("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // fixed full-screen overlay with translucent blurred backdrop so homepage shows through
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      {/* blurred translucent backdrop: clicking it closes the overlay */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        onClick={close}
      />

      {/* centered panel; stop clicks from reaching backdrop */}
      <div
        className="relative w-full max-w-md bg-white/95 backdrop-saturate-150 border border-black/10 rounded-2xl p-8 mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6 w-full text-center">
          <h1 className="[font-family:'Akira_Expanded-SuperBold',Helvetica] font-bold text-black text-[56px] leading-none">
            LOG IN
          </h1>

          {error && (
            <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4 w-full">
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-[72px] bg-[#d9d9d9] rounded-[64px] border-0 px-6 text-lg text-center"
              disabled={isLoading}
            />

            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-[72px] bg-[#d9d9d9] rounded-[64px] border-0 px-6 text-lg text-center"
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-[260px] bg-[#d9d9d9] rounded-[64px] hover:bg-[#c9c9c9] h-auto"
          >
            <span className="[font-family:'Akira_Expanded-SuperBold',Helvetica] font-bold text-black text-[24px]">
              {isLoading ? "LOADING..." : "SUBMIT"}
            </span>
          </Button>

          <div className="flex flex-col items-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => setLocation("/signup")}
              className="[font-family:'Akira_Expanded-SuperBold',Helvetica] font-bold text-black text-[18px] bg-transparent border-0 cursor-pointer"
            >
              New? Sign Up
            </button>

            <button
              type="button"
              onClick={close}
              className="[font-family:'Akira_Expanded-SuperBold',Helvetica] font-bold text-black text-[16px] bg-transparent border-0 cursor-pointer"
            >
              BACK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
// ...existing code...