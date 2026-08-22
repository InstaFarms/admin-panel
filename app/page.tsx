"use client";

/**
 * Root login page ("/"): admin sign-in via phone + OTP.
 * - On load: checks existing auth cookie; if present, redirects to /admin/dashboard
 *   (actual validity is re-checked by /admin/layout.tsx).
 * - Otherwise: phone input -> Send OTP -> Verify OTP -> brief "Verified" step -> redirect.
 * Visuals/animations follow the "Admin Login" design doc (dark theme, GSAP entrance
 * and step transitions); the OTP/session logic itself is unchanged real API calls.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { JarvisWordmark, JarvisLoader } from "@/components/JarvisLogo";
import { markDashboardEntrance } from "@/lib/dashboardEntrance";
import {
  sendOTP,
  verifyOTPAndLogin,
  checkAuthCookie,
  deviceLogin,
} from "@/actions/loginActions";
import {
  PHONE_LENGTH,
  OTP_LENGTH,
  OTP_MIN_LENGTH,
} from "@/constants/auth";

const RESEND_SECONDS = 90; // 1:30

type Step = "checking" | "phone" | "otp" | "done";

export default function Home() {
  const [step, setStep] = useState<Step>("checking");
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendLeft, setResendLeft] = useState(RESEND_SECONDS);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const prevOtpLengthRef = useRef(0);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const otpWrapRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const doneCheckRef = useRef<HTMLDivElement>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const setOtpDigit = (index: number, digit: string) => {
    const digitOnly = digit.replace(/\D/g, "").slice(-1);
    setOtp((prev) => {
      const next = prev.slice(0, index) + digitOnly + prev.slice(index + 1);
      return next.slice(0, OTP_LENGTH);
    });
    setOtpError("");
    if (digitOnly) {
      const el = otpInputRefs.current[index];
      if (el) {
        import("gsap").then(({ gsap }) => {
          gsap.fromTo(el, { scale: 1.22 }, { scale: 1, duration: 0.28, ease: "back.out(2.5)" });
        });
      }
      if (index < OTP_LENGTH - 1) {
        otpInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        setOtp((prev) => prev.slice(0, index) + prev.slice(index + 1));
      } else if (index > 0) {
        otpInputRefs.current[index - 1]?.focus();
        setOtp((prev) => prev.slice(0, index - 1) + prev.slice(index));
      }
      e.preventDefault();
    } else if (e.key === "Enter") {
      handleVerifyOTP();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    setOtp(pasted);
    setOtpError("");
    const boxes = otpInputRefs.current.slice(0, pasted.length).filter((el): el is HTMLInputElement => !!el);
    if (boxes.length) {
      import("gsap").then(({ gsap }) => {
        gsap.fromTo(boxes, { scale: 1.22 }, { scale: 1, duration: 0.25, ease: "back.out(2.5)", stagger: 0.05 });
      });
    }
    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpInputRefs.current[nextIndex]?.focus();
    if (pasted.length === OTP_LENGTH) handleVerifyOTP(pasted);
  };

  // Auto-verify when user completes all 6 digits (only on transition to 6 to avoid re-firing after failure)
  useEffect(() => {
    if (
      step === "otp" &&
      otp.length === OTP_LENGTH &&
      prevOtpLengthRef.current !== OTP_LENGTH &&
      !loading
    ) {
      prevOtpLengthRef.current = OTP_LENGTH;
      handleVerifyOTP(otp);
    } else {
      prevOtpLengthRef.current = otp.length;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step, loading]);

  // On mount: verify existing cookie, and in parallel try a silent trusted-device
  // login (only ever succeeds for eligible panel roles with a remembered browser -
  // see deviceLogin()). Runs both concurrently so this doesn't cost an extra
  // network round-trip over the old cookie-only check. Step stays "checking" (no
  // phone form) until we know which way this resolves, so eligible admins never
  // see the phone step flash before being signed in.
  // /admin/layout.tsx re-checks actual cookie validity regardless.
  useEffect(() => {
    const checkSession = async () => {
      const [authResult, deviceResult] = await Promise.all([
        checkAuthCookie(),
        deviceLogin(),
      ]);

      if (authResult.hasToken) {
        router.replace("/admin/dashboard");
        return;
      }

      if (deviceResult.success) {
        const adminInfo = {
          name: deviceResult.admin?.name ?? "Admin",
          phone: deviceResult.admin?.phoneNumber ?? "",
          email: deviceResult.admin?.email ?? null,
          panelRole: deviceResult.admin?.panelRole,
        };
        localStorage.setItem("admin-user-info", JSON.stringify(adminInfo));
        markDashboardEntrance();
        router.replace("/admin/dashboard");
        return;
      }

      setStep("phone");
    };
    checkSession();
  }, [router]);

  // Focus the phone input once the checking step resolves into the phone form
  // (the entrance-animation effect below fires on mount, before this input exists).
  useEffect(() => {
    if (step === "phone") {
      phoneInputRef.current?.focus();
    }
  }, [step]);

  // Entrance animation: header settles into place, card + footer fade in, glow drifts.
  useEffect(() => {
    let cancelled = false;
    phoneInputRef.current?.focus();

    import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      const header = headerRef.current;
      const card = cardRef.current;
      const footer = footerRef.current;
      if (!header) return;

      const rect = header.getBoundingClientRect();
      const dy = window.innerHeight / 2 - (rect.top + rect.height / 2);
      gsap.set(header, { y: dy });
      if (card) gsap.set(card, { opacity: 0 });
      if (footer) gsap.set(footer, { opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.to(header, { y: 0, duration: 0.65, ease: "power3.inOut", delay: 0.5 });
      if (card) {
        tl.fromTo(
          card,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
          "<+0.2"
        );
      }
      if (footer) tl.to(footer, { opacity: 1, duration: 0.4 }, "-=0.15");

      if (glowRef.current) {
        gsap.to(glowRef.current, {
          xPercent: 7,
          yPercent: -5,
          duration: 20,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Pop the checkmark in once the "Verified" step actually mounts.
  useEffect(() => {
    if (step !== "done") return;
    import("gsap").then(({ gsap }) => {
      if (doneCheckRef.current) {
        gsap.fromTo(
          doneCheckRef.current,
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.5)" }
        );
      }
    });
  }, [step]);

  useEffect(() => {
    return () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    };
  }, []);

  // Card tilt: subtle 3D parallax that tracks the cursor across the whole page.
  useEffect(() => {
    let onMove: ((e: MouseEvent) => void) | null = null;
    let onLeave: (() => void) | null = null;
    let cancelled = false;

    import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      const card = cardRef.current;
      if (!card) return;

      gsap.set(card, { transformPerspective: 750 });
      const setRotationX = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power2.out" });
      const setRotationY = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power2.out" });

      onMove = (e: MouseEvent) => {
        const el = cardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) / window.innerWidth;
        const dy = (e.clientY - (rect.top + rect.height / 2)) / window.innerHeight;
        setRotationY(dx * 10);
        setRotationX(-dy * 10);
      };
      onLeave = () => {
        setRotationX(0);
        setRotationY(0);
      };
      window.addEventListener("mousemove", onMove);
      document.documentElement.addEventListener("mouseleave", onLeave);
    });

    return () => {
      cancelled = true;
      if (onMove) window.removeEventListener("mousemove", onMove);
      if (onLeave) document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const startResendTimer = () => {
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    setResendLeft(RESEND_SECONDS);
    resendTimerRef.current = setInterval(() => {
      setResendLeft((prev) => {
        if (prev <= 1) {
          if (resendTimerRef.current) clearInterval(resendTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /**
   * Cross-fades the step card's content: slides current step out, swaps state,
   * slides the next step in, and morphs the card's height between the two
   * steps' natural sizes instead of snapping to it.
   */
  const animateStepChange = (next: Step, after?: () => void) => {
    import("gsap").then(({ gsap }) => {
      const current = stepRef.current;
      const card = cardRef.current;
      if (!current) {
        setStep(next);
        after?.();
        return;
      }
      const oldHeight = card?.offsetHeight;
      gsap.to(current, {
        x: -28,
        opacity: 0,
        duration: 0.22,
        ease: "power2.in",
        onComplete: () => {
          setStep(next);
          requestAnimationFrame(() => {
            const el = stepRef.current;
            if (el) {
              gsap.fromTo(
                el,
                { x: 28, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.3, ease: "power2.out" }
              );
            }
            if (card && oldHeight != null) {
              const newHeight = card.offsetHeight;
              gsap.fromTo(
                card,
                { height: oldHeight },
                { height: newHeight, duration: 0.35, ease: "power2.inOut", clearProps: "height" }
              );
            }
          });
          after?.();
        },
      });
    });
  };

  const maskedPhone = () => "+91 ••••• •" + phoneNumber.slice(-4);

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length !== PHONE_LENGTH) {
      setPhoneError(`Enter a ${PHONE_LENGTH}-digit mobile number`);
      return;
    }

    setLoading(true);
    setPhoneError("");
    if (sendBtnRef.current) {
      const btn = sendBtnRef.current;
      import("gsap").then(({ gsap }) => {
        gsap.fromTo(btn, { scale: 1 }, { scale: 0.97, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" });
      });
    }
    const loadingToast = toast.loading("Sending OTP...");

    try {
      const result = await sendOTP(phoneNumber);
      toast.dismiss(loadingToast);

      if (result.success) {
        setOtp("");
        setOtpError("");
        prevOtpLengthRef.current = 0;
        animateStepChange("otp", () => {
          otpInputRefs.current[0]?.focus();
        });
        startResendTimer();
        toast.success(`OTP sent to +91 ${phoneNumber}`, { duration: 4000, icon: "✅" });
      } else {
        const isAdminError = result.isAdminError;
        const message =
          result.message ||
          (isAdminError
            ? "This phone number is not registered as an admin"
            : "Failed to send OTP");
        setPhoneError(isAdminError ? message : "");
        toast.error(message, {
          duration: isAdminError ? 6000 : 4000,
          icon: "🚫",
        });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error sending OTP:", error);
      toast.error("An unexpected error occurred. Please try again.", { duration: 4000, icon: "⚠️" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (code: string = otp) => {
    if (!code || code.length < OTP_MIN_LENGTH || loading) {
      if (!code || code.length < OTP_MIN_LENGTH) {
        toast.error("Please enter the complete OTP", { duration: 3000, icon: "🔢" });
      }
      return;
    }

    setLoading(true);
    setOtpError("");
    const loadingToast = toast.loading("Verifying OTP...");

    try {
      const result = await verifyOTPAndLogin(phoneNumber, code);
      toast.dismiss(loadingToast);

      if (result.success) {
        const adminInfo = {
          name: result.admin?.name ?? "Admin",
          phone: result.admin?.phoneNumber ?? phoneNumber,
          email: result.admin?.email ?? null,
          panelRole: result.admin?.panelRole,
        };
        localStorage.setItem("admin-user-info", JSON.stringify(adminInfo));
        // Tell the admin shell to play its post-login entrance animation once.
        markDashboardEntrance();

        // Reveal the "Verified" step - guaranteed to actually mount (setStep is
        // called directly, not from inside a gsap.then()) so the guaranteed
        // 1800ms visible window below always starts once it's really on screen.
        const revealDone = () => {
          setStep("done");
          toast.success("Login successful! Redirecting...", { duration: 2000, icon: "🎉" });
          setTimeout(async () => {
            // The /admin/:path* middleware redirects straight back to "/" if it
            // can't see the session cookie on that request. Confirm the cookie
            // is actually readable server-side first (a couple of quick retries
            // covers any propagation lag) so we don't hard-navigate into that
            // redirect and flash the login form again before it self-heals.
            for (let attempt = 0; attempt < 5; attempt++) {
              const check = await checkAuthCookie();
              if (check.hasToken) break;
              await new Promise((resolve) => setTimeout(resolve, 150));
            }
            window.location.href = "/admin/dashboard";
          }, 1800);
        };

        // Flash the OTP boxes green first, then reveal "Verified".
        const boxes = otpInputRefs.current.filter((el): el is HTMLInputElement => !!el);
        if (boxes.length) {
          import("gsap").then(({ gsap }) => {
            gsap.to(boxes, {
              borderColor: "#22a06b",
              color: "#22a06b",
              duration: 0.15,
              stagger: 0.07,
              onComplete: revealDone,
            });
          });
        } else {
          revealDone();
        }
        return;
      }

      let message = result.message ?? "Verification failed";
      if (result.isAdminError) {
        message = result.message ?? "Access Denied";
        toast.error(message, { duration: 6000, icon: "🚫" });
      } else if (result.message?.includes("Invalid OTP")) {
        message = "Incorrect code, try again";
        toast.error("Invalid OTP. Please check and try again.", { duration: 4000, icon: "❌" });
      } else if (result.message?.includes("expired")) {
        message = "OTP has expired. Please request a new one.";
        toast.error(message, { duration: 4000, icon: "⏰" });
      } else {
        toast.error(message, { duration: 4000, icon: "❌" });
      }
      setOtp("");
      prevOtpLengthRef.current = 0;
      setOtpError(message);
      import("gsap").then(({ gsap }) => {
        if (otpWrapRef.current) {
          gsap.fromTo(
            otpWrapRef.current,
            { x: -12 },
            { x: 0, duration: 0.7, ease: "elastic.out(1, 0.25)" }
          );
        }
      });
      otpInputRefs.current[0]?.focus();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error verifying OTP:", error);
      toast.error("An unexpected error occurred. Please try again.", { duration: 4000, icon: "⚠️" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendLeft > 0) return;
    setOtp("");
    setOtpError("");
    prevOtpLengthRef.current = 0;
    toast("Resending OTP...", { icon: "🔄", duration: 2000 });
    await handleSendOTP();
  };

  const handleChangeNumber = () => {
    setOtp("");
    setOtpError("");
    prevOtpLengthRef.current = 0;
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    animateStepChange("phone", () => phoneInputRef.current?.focus());
  };

  const phoneValid = phoneNumber.length === PHONE_LENGTH;
  const otpFull = otp.length === OTP_LENGTH;

  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-10 bg-[radial-gradient(1200px_700px_at_20%_10%,#1b2433_0%,#141a24_55%,#10151d_100%)]">
      <div
        ref={glowRef}
        className="pointer-events-none absolute -inset-[20%] -z-10 bg-[radial-gradient(900px_500px_at_70%_80%,rgba(37,99,235,0.14),transparent_70%)]"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-y-0 w-[180px] bg-[linear-gradient(90deg,transparent,rgba(37,99,235,0.09),transparent)] motion-safe:animate-[beamSweep_7s_ease-in-out_infinite]" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(16,21,29,0.9) 92%)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center">
        <div ref={headerRef} className="mb-8 flex flex-col items-center gap-4">
          <JarvisWordmark animate />
        </div>

        <div
          ref={cardRef}
          className="w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-8 pb-7 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
        >
          <div ref={stepRef}>
            {step === "checking" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <JarvisLoader size="sm" />
                <div className="text-sm text-[#8a94a6]">Checking session…</div>
              </div>
            )}

            {step === "phone" && (
              <>
                <div className="mb-6 text-center">
                  <div className="text-[19px] font-bold text-[#f2f5fa]">Welcome back</div>
                  <div className="mt-1 text-sm text-[#8a94a6]">Sign in with your phone number</div>
                </div>
                <label htmlFor="phone-input" className="mb-2 block text-sm font-semibold text-[#c6cdd8]">
                  Phone number
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center rounded-[10px] border border-white/10 bg-[#1d2532] px-3.5 text-[15px] font-semibold text-[#c6cdd8]">
                    +91
                  </div>
                  <input
                    id="phone-input"
                    ref={phoneInputRef}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="98765 43210"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, PHONE_LENGTH));
                      setPhoneError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                    maxLength={PHONE_LENGTH}
                    disabled={loading}
                    className={`min-w-0 flex-1 rounded-[10px] border bg-[#1d2532] px-4 py-[13px] text-base tracking-wide text-[#f2f5fa] placeholder:text-[#4b5567] focus:outline-none focus:ring-[3px] focus:ring-[#2563eb]/20 ${
                      phoneError ? "border-[#a04050]" : "border-white/10 focus:border-[#2563eb]"
                    }`}
                  />
                </div>
                <div className="mt-[7px] min-h-[18px]" aria-live="polite">
                  {phoneError && <span className="text-[13px] text-[#e5737f]">{phoneError}</span>}
                </div>
                <button
                  ref={sendBtnRef}
                  onClick={handleSendOTP}
                  disabled={loading || !phoneValid}
                  className={`mt-2.5 flex w-full items-center justify-center gap-2 rounded-[10px] py-3.5 text-[15px] font-bold transition-colors duration-150 ${
                    phoneValid && !loading
                      ? "cursor-pointer bg-[#2563eb] text-white hover:brightness-110"
                      : "cursor-default bg-[#243044] text-[#6b7689]"
                  }`}
                >
                  {loading ? "Sending…" : "Send OTP"}
                </button>
              </>
            )}

            {step === "otp" && (
              <>
                <div className="mb-6 text-center">
                  <div className="text-[19px] font-bold text-[#f2f5fa]">Enter verification code</div>
                  <div className="mt-1 text-sm text-[#8a94a6]">
                    Code sent to <span className="font-semibold text-[#c6cdd8]">{maskedPhone()}</span>
                  </div>
                </div>
                <div ref={otpWrapRef} onPaste={handleOtpPaste} className="flex justify-center gap-2.5">
                  {Array.from({ length: OTP_LENGTH }, (_, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpInputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                      value={otp[i] ?? ""}
                      onChange={(e) => setOtpDigit(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onFocus={(e) => e.target.select()}
                      disabled={loading}
                      autoFocus={i === 0}
                      className={`h-14 w-12 rounded-[10px] border bg-[#1d2532] text-center text-2xl font-bold text-[#f2f5fa] focus:outline-none focus:ring-[3px] focus:ring-[#2563eb]/20 ${
                        otpError ? "border-[#a04050]" : otp[i] ? "border-[#2563eb]" : "border-white/10 focus:border-[#2563eb]"
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-2.5 min-h-[20px] text-center" aria-live="polite">
                  {otpError && <span className="text-[13px] text-[#e5737f]">{otpError}</span>}
                </div>
                <button
                  onClick={() => handleVerifyOTP()}
                  disabled={loading || !otpFull}
                  className={`mt-2 flex w-full items-center justify-center gap-2 rounded-[10px] py-3.5 text-[15px] font-bold transition-colors duration-150 ${
                    otpFull && !loading
                      ? "cursor-pointer bg-[#2563eb] text-white hover:brightness-110"
                      : "cursor-default bg-[#243044] text-[#6b7689]"
                  }`}
                >
                  {loading ? "Verifying…" : "Verify OTP"}
                </button>
                <div className="mt-[18px] flex items-center justify-between">
                  {resendLeft === 0 ? (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleResendOTP();
                      }}
                      className="text-[13px] font-semibold text-[#4c7ef3] hover:text-[#6b93f5]"
                    >
                      Resend code
                    </a>
                  ) : (
                    <span className="text-[13px] text-[#8a94a6]">
                      Resend in {Math.floor(resendLeft / 60)}:
                      {String(resendLeft % 60).padStart(2, "0")}
                    </span>
                  )}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleChangeNumber();
                    }}
                    className="text-[13px] font-semibold text-[#4c7ef3] hover:text-[#6b93f5]"
                  >
                    Change number
                  </a>
                </div>
              </>
            )}

            {step === "done" && (
              <div className="py-3 text-center">
                <div
                  ref={doneCheckRef}
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#1f6b4a] bg-[#22a06b]/15 text-2xl text-[#22a06b]"
                >
                  ✓
                </div>
                <div className="text-[19px] font-bold text-[#f2f5fa]">Verified</div>
                <div className="mt-1.5 text-sm text-[#8a94a6]">Redirecting to dashboard…</div>
              </div>
            )}
          </div>
        </div>

        <div ref={footerRef} className="mt-[26px] flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 text-[13px] text-[#7b8496]">
            <span className="text-xs">🔒</span> Only authorized admins can access this panel
          </div>
          <div className="text-xs text-[#5b6473]">You&apos;ll stay signed in for 24 hours</div>
        </div>
      </div>
    </main>
  );
}
