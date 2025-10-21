import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

export const SignUpOverlay = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

      setLocation("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-solid border-black w-full min-w-[1198px] min-h-[852px] flex items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-8 w-full max-w-[797px] px-8">
        <h1 className="[font-family:'Akira_Expanded-SuperBold',Helvetica] font-bold text-black text-[72.6px] tracking-[0] leading-[normal] whitespace-nowrap">
          SIGN UP
        </h1>

        {error && (
          <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6 w-full">
          <Input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full h-[90px] bg-[#d9d9d9] rounded-[64px] border-0 px-8 text-xl"
            disabled={isLoading}
          />

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-[90px] bg-[#d9d9d9] rounded-[64px] border-0 px-8 text-xl"
            disabled={isLoading}
          />

          <Input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-[90px] bg-[#d9d9d9] rounded-[64px] border-0 px-8 text-xl"
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-[300px] h-[63px] bg-[#d9d9d9] rounded-[64px] hover:bg-[#c9c9c9] h-auto"
        >
          <span className="[font-family:'Akira_Expanded-SuperBold',Helvetica] font-bold text-black text-[36.7px] tracking-[0] leading-[normal] whitespace-nowrap">
            {isLoading ? "CREATING..." : "SUBMIT"}
          </span>
        </Button>

        <button
          type="button"
          onClick={() => setLocation("/login")}
          className="[font-family:'Akira_Expanded-SuperBold',Helvetica] font-bold text-black text-[37.8px] tracking-[0] leading-[normal] whitespace-nowrap mt-8 bg-transparent border-0 cursor-pointer"
        >
          Have an account? Log In Instead
        </button>

        <button
          type="button"
          onClick={() => setLocation("/")}
          className="[font-family:'Akira_Expanded-SuperBold',Helvetica] font-bold text-black text-[28.4px] tracking-[0] leading-[normal] whitespace-nowrap mt-4 bg-transparent border-0 cursor-pointer"
        >
          BACK
        </button>
      </form>
    </div>
  );
};
