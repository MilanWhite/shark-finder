// SignUpInvestor.tsx (works for Investor OR Firm; pass role prop)
// Preconditions:
// 1) Amplify.configure({... Auth: { Cognito: { userPoolId, userPoolClientId }}}) is already called.
// 2) Your Post confirmation Lambda reads event.request.clientMetadata.role and allowlists ["Investor","Firm"].

import { useState } from "react";
import { signUp, confirmSignUp, resendSignUpCode, signIn } from "aws-amplify/auth";

type Role = "Investor" | "Firm";
export default function SignUpInvestor({ role = "Investor" as Role }) {
  const [step, setStep] = useState<"SIGN_UP" | "CONFIRM">("SIGN_UP");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const { nextStep } = await signUp({
        username: email,
        password,                               // email+password account
        options: {
          userAttributes: { email },            // required when email is the username
          clientMetadata: { role },             // <-- sent to Lambda PostConfirmation
        },
      });
      // For email verification, Cognito expects confirm
      if (nextStep.signUpStep === "CONFIRM_SIGN_UP") setStep("CONFIRM");
      else setStep("CONFIRM");
    } catch (ex: any) {
      setErr(ex?.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      // OTP emailed by Cognito; confirm account
await confirmSignUp({
  username: email,
  confirmationCode: code.trim(),
  options: { clientMetadata: { role } }, // "Investor" by default, or "Firm" if passed
});

      // Optional: auto sign-in after successful confirmation
      await signIn({ username: email, password });
      window.location.reload();

      // Navigate as you wish (uncomment if you use a router)
      // window.location.href = "/app";
    } catch (ex: any) {
      setErr(ex?.message ?? "Confirmation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setErr(null); setLoading(true);
    try {
      await resendSignUpCode({ username: email }); // resend OTP to email
    } catch (ex: any) {
      setErr(ex?.message ?? "Resend failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-30 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          alt="Your Company"
          src="../../src/assets/SharkFinderLogoSmall.png"
          className="mx-auto h-10 w-auto dark:hidden"
        />
        <img
          alt="Your Company"
          src="../../src/assets/SharkFinderLogoSmall.png"
          className="mx-auto h-10 w-auto not-dark:hidden"
        />
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900 dark:text-white">
          {step === "SIGN_UP" ? `Create your ${role} account` : "Confirm your email"}
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {step === "SIGN_UP" ? (
          <form onSubmit={handleSignUp} className="space-y-6">
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
              <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                Password
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
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
                {loading ? "Creating..." : "Create account"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">
                Enter the 6-digit code sent to {email}
              </label>
              <div className="mt-2 flex gap-2">
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
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="rounded-md px-3 py-1.5 text-sm font-semibold outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 dark:hover:bg-white/10"
                >
                  Resend
                </button>
              </div>
            </div>

            {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
              >
                {loading ? "Confirming..." : "Confirm email"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-2 text-right text-center text-sm/6 text-gray-500 dark:text-gray-400">
          <a href="/" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            Go Back
          </a>
        </p>
      </div>
    </div>
  );
}
