/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Key,
} from "lucide-react";
import {
  getIdToken,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/firebase/firebase.config";
import { LoginLoadingOverlay } from "@/features/auth/components/login/LoginLoadingOverlay";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function TemporaryLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Clear errors on Escape
      if (e.key === "Escape") {
        setError(null);
        setEmailError(null);
        setPasswordError(null);
        setSuccessMessage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError(null);
    setError(null);
    setSuccessMessage(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordError(null);
    setError(null);
    setSuccessMessage(null);
  };

  // Form validation function
  const validateForm = (): boolean => {
    let isValid = true;
    // Reset field errors
    setEmailError(null);
    setPasswordError(null);

    // Email validation
    if (!email.trim()) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    }

    // Password validation
    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validate form before proceeding
    if (!validateForm()) {
      return;
    }
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const idToken = await getIdToken(userCredential.user);

      // Make the API call to create the session
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }
      // Set success message
      setSuccessMessage("Login successful! Redirecting...");
      router.refresh();
      router.push("/");
    } catch (error: any) {
      console.error("Login failed", error);

      // Handle specific Firebase auth errors
      if (error.code === "auth/wrong-password") {
        setPasswordError("Invalid password. Please try again.");
      } else if (error.code === "auth/user-not-found") {
        setEmailError("No account found with this email.");
      } else if (error.code === "auth/invalid-email") {
        setEmailError("Please enter a valid email address.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many failed login attempts. Please try again later.");
      } else if (error.code === "auth/invalid-credential") {
        setError("Invalid email or password. Please try again.");
      } else {
        setError("An error occurred during sign in. Please try again.");
      }
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setEmailError("Please enter your email to reset your password.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("Password reset email sent. Please check your inbox.");
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        setEmailError("No account found with this email.");
      } else if (error.code === "auth/invalid-email") {
        setEmailError("Please enter a valid email address.");
      } else {
        setError("Failed to send password reset email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="w-full">
      {/* Show loading overlay when authenticating */}
      {isLoading && <LoginLoadingOverlay />}

      {/* Main Content Container */}
      <div className="w-full px-2 py-4">
        {/* Login Form */}
        <div className="relative w-full max-w-md mx-auto z-10 animate-fade-in-up">
          <form
            onSubmit={handleSubmit}
            className="relative z-10 w-full bg-[#FEFEFA]/90 backdrop-blur-md border border-[#DED8CF]/50 rounded-[2.5rem_1.5rem_3.5rem_2rem] px-8 py-10 flex flex-col gap-5 shadow-float"
          >
            {/* Header / Logo */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3 transition-transform duration-500 hover:rotate-12">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-8 h-8"
                >
                  <path d="M4 4l8 16 8-16M8 4l4 8 4-8" />
                </svg>
              </div>
              <h2 className="text-3xl font-extrabold font-serif text-foreground leading-none">
                VERIS
              </h2>
              <p className="text-xs font-medium text-muted-foreground mt-2 max-w-[260px] leading-relaxed">
                Welcome Admin! Enter your credentials to sign in and access your dashboard.
              </p>
            </div>

            {/* Email Field */}
            <div className="w-full space-y-2">
              <label
                htmlFor="email"
                className="block font-bold text-xs text-foreground/80 pl-1"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  className={`w-full h-12 pl-11 pr-4 border ${emailError
                      ? "border-destructive focus-visible:ring-destructive/30"
                      : "border-border focus-visible:ring-primary/30"
                    } rounded-full bg-white/50 focus:bg-white text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-300 autofill:shadow-[inset_0_0_0px_1000px_rgb(255,255,255)]`}
                  disabled={isLoading}
                  placeholder="name@example.com"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                  autoComplete="email"
                />
              </div>
              {emailError && (
                <p
                  id="email-error"
                  className="text-destructive text-xs mt-1 pl-3"
                  role="alert"
                >
                  {emailError}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="w-full space-y-2">
              <div className="flex justify-between items-center px-1">
                <label
                  htmlFor="password"
                  className="block font-bold text-xs text-foreground/80"
                >
                  Password
                </label>
                <a
                  onClick={handlePasswordReset}
                  className="font-bold text-xs text-secondary hover:underline cursor-pointer transition-colors"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  className={`w-full h-12 pl-11 pr-12 border ${passwordError
                      ? "border-destructive focus-visible:ring-destructive/30"
                      : "border-border focus-visible:ring-primary/30"
                    } rounded-full bg-white/50 focus:bg-white text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-300 autofill:shadow-[inset_0_0_0px_1000px_rgb(255,255,255)]`}
                  disabled={isLoading}
                  placeholder="Enter your password"
                  aria-invalid={!!passwordError}
                  aria-describedby={
                    passwordError ? "password-error" : undefined
                  }
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1 focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p
                  id="password-error"
                  className="text-destructive text-xs mt-1 pl-3"
                  role="alert"
                >
                  {passwordError}
                </p>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="w-full animate-fade-in-up">
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive rounded-2xl py-3">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Success Message Display */}
            {successMessage && (
              <div className="w-full animate-fade-in-up">
                <Alert className="bg-green-50 border-green-200 text-green-800 rounded-2xl py-3">
                  <CheckCircle2 className="h-4 w-4 text-green-700" />
                  <AlertDescription className="text-xs font-semibold">{successMessage}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Remember Me */}
            <div className="flex items-center justify-between w-full px-1">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                  disabled={isLoading}
                />
                <label
                  htmlFor="remember"
                  className="flex items-center cursor-pointer select-none"
                >
                  <div className={`w-5 h-5 mr-2 relative rounded-full border-2 border-primary shrink-0 flex items-center justify-center transition-all duration-300 ${rememberMe ? 'bg-primary' : 'bg-white'}`}>
                    {rememberMe && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M5 12L10 17L19 8"
                          stroke="var(--primary-foreground)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="font-semibold text-xs text-foreground/80">
                    Keep me signed in
                  </span>
                </label>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="w-full h-12 mt-2 bg-primary text-primary-foreground font-bold text-sm rounded-full hover:bg-primary/95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-soft hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
              disabled={isLoading}
              aria-busy={isLoading}
              aria-live="polite"
            >
              <span>
                {isLoading ? "Signing in..." : "Sign in"}
              </span>
            </button>

            {/* Footer */}
            <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
              Powered by <span className="font-semibold">VERIS</span>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
