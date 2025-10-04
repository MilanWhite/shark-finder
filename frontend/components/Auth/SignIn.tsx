// SignInInvestor.tsx
// Email + password sign-in (Amplify v6). Includes Forgot Password (request + confirm).

import { useState } from "react";
import {
  signIn,
  resetPassword,
  confirmResetPassword,
} from "aws-amplify/auth";

type Step = "SIGN_IN" | "RESET_REQUEST" | "RESET_CONFIRM";

export default function SignIn() {
  const [step, setStep] = useState<Step>("SIGN_IN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const { isSignedIn } = await signIn({ username: email, password });
      if (isSignedIn) {
        window.location.reload();
      }
    } catch (ex: any) {
      setErr(ex?.message ?? "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetRequest(e: React.MouseEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const { nextStep } = await resetPassword({ username: email });
      if (nextStep.resetPasswordStep === "CONFIRM_RESET_PASSWORD_WITH_CODE") {
        setStep("RESET_CONFIRM");
      }
    } catch (ex: any) {
      setErr(ex?.message ?? "Reset request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetConfirm(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code.trim(),
        newPassword,
      });
      setStep("SIGN_IN");
      setPassword("");
      setCode("");
      setNewPassword("");
    } catch (ex: any) {
      setErr(ex?.message ?? "Reset confirm failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="Your Company"
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
          className="mx-auto h-10 w-auto dark:hidden"
        />
        <img
          alt="Your Company"
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
          className="mx-auto h-10 w-auto not-dark:hidden"
        />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900 dark:text-white">
          {step === "SIGN_IN" ? "Sign in to your account" : step === "RESET_REQUEST" ? "Reset password" : "Enter reset code"}
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {step === "SIGN_IN" && (
          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                  Password
                </label>
                <div className="text-sm">
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); setStep("RESET_REQUEST"); }}
                    className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>

            {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        )}

        {step === "RESET_REQUEST" && (
          <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">
            <div>
              <label htmlFor="email-reset" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                Enter your email
              </label>
              <div className="mt-2">
                <input
                  id="email-reset"
                  name="email-reset"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>

            {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResetRequest}
                disabled={loading || !email}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60"
              >
                {loading ? "Sending code..." : "Send reset code"}
              </button>
              <button
                type="button"
                onClick={() => setStep("SIGN_IN")}
                className="flex w-full justify-center rounded-md border px-3 py-1.5 text-sm/6 font-semibold"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {step === "RESET_CONFIRM" && (
          <form onSubmit={handleResetConfirm} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                Enter the 6-digit code sent to {email}
              </label>
              <div className="mt-2">
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                New password
              </label>
              <div className="mt-2">
                <input
                  id="new-password"
                  name="new-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                />
              </div>
            </div>

            {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60"
              >
                {loading ? "Updating..." : "Update password"}
              </button>
              <button
                type="button"
                onClick={() => setStep("SIGN_IN")}
                className="flex w-full justify-center rounded-md border px-3 py-1.5 text-sm/6 font-semibold"
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}

        <p className="mt-10 text-center text-sm/6 text-gray-500 dark:text-gray-400">
          Don’t have an account?{" "}
          <a href="/signup/investor" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
