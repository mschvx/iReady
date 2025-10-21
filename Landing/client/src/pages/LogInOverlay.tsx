import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

export const LogInOverlay = ({
  onClose,
  onOpenSignUp,
}: {
  onClose?: () => void;
  onOpenSignUp?: () => void;
}): JSX.Element => {
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
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      {/* simple translucent backdrop (no backdrop-blur) */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={close}
      />

      {/* centered panel; stop clicks from reaching backdrop */}
      <div
        className="relative w-full max-w-md bg-white border border-black/5 rounded-2xl p-6 mx-auto shadow-2xl ring-1 ring-black/5 transform-gpu transition-transform duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full text-center">
          <h1 className="[font-family:'Akira_Expanded-SuperBold',Helvetica] font-bold text-black text-[44px] leading-none mb-2">
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
              className="w-full h-[56px] bg-[#f3f4f6] rounded-[40px] border-0 px-4 text-sm text-center"
              disabled={isLoading}
            />

            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-[56px] bg-[#f3f4f6] rounded-[40px] border-0 px-4 text-sm text-center"
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-[220px] bg-[#d9d9d9]/95 rounded-[40px] py-3 hover:bg-[#c9c9c9]/95 shadow-lg"
            /* subtle lift on hover */
            onMouseEnter={(e) => (e.currentTarget.parentElement!.parentElement!.classList.add("translate-y-0.5"))}
            onMouseLeave={(e) => (e.currentTarget.parentElement!.parentElement!.classList.remove("translate-y-0.5"))}
          >
            <span className="[font-family:'Akira_Expanded-SuperBold',Helvetica] font-bold text-black text-[20px] tracking-tight">
              {isLoading ? "LOADING..." : "SUBMIT"}
            </span>
          </Button>

          <div className="flex flex-col items-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                if (onOpenSignUp) {
                  onOpenSignUp();
                } else {
                  setLocation("/signup");
                }
              }}
              className="[font-family:'Akira_Expanded-SuperBold',Helvetica] font-bold text-black text-[16px] bg-transparent border-0 cursor-pointer"
            >
              New? Sign Up
            </button>

            <button
              type="button"
              onClick={close}
              className="[font-family:'Akira_Expanded-SuperBold',Helvetica] font-bold text-black text-[14px] bg-transparent border-0 cursor-pointer"
            >
              BACK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};