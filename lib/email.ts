import "server-only";

export type OtpPurpose = "verify-email" | "reset-password";

const SUBJECTS: Record<OtpPurpose, string> = {
  "verify-email": "Your Daily Graphs verification code",
  "reset-password": "Your Daily Graphs password reset code",
};

const INTROS: Record<OtpPurpose, string> = {
  "verify-email": "Enter this code to verify your email address:",
  "reset-password": "Enter this code to reset your password:",
};

// Sends a 6-digit code via Resend's REST API (one endpoint — not worth an SDK
// dependency). With no RESEND_API_KEY (local dev), the code is logged to the
// server console instead so the flows work with zero email setup. Throws on
// hard failure so issueOtp can surface a "send failed" error.
export async function sendOtpEmail(opts: {
  to: string;
  code: string;
  purpose: OtpPurpose;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      [
        "",
        "========================================",
        `[email] DEV MODE — no RESEND_API_KEY set`,
        `[email] To:      ${opts.to}`,
        `[email] Subject: ${SUBJECTS[opts.purpose]}`,
        `[email] Code:    ${opts.code}`,
        "========================================",
        "",
      ].join("\n")
    );
    return;
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error(
      "EMAIL_FROM is not set. Set it to a Resend-verified sender, e.g. `Daily Graphs <no-reply@yourdomain.com>`."
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: SUBJECTS[opts.purpose],
      text: `${INTROS[opts.purpose]}\n\n${opts.code}\n\nThis code expires in 10 minutes. If you didn't request it, you can ignore this email.`,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }
}
