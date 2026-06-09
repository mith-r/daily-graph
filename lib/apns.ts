import "server-only";
import http2 from "node:http2";
import { importPKCS8, SignJWT } from "jose";

// Token-based APNs auth (the .p8 key). Required env:
//   APNS_TEAM_ID     — Apple Developer team id
//   APNS_KEY_ID      — id of the APNs auth key
//   APNS_PRIVATE_KEY — contents of the .p8 file (literal "\n" sequences ok)
//   APNS_TOPIC       — bundle id; defaults to com.thedailygraphs.app
//   APNS_ENV         — "production" (default) or "sandbox"

const APNS_HOSTS = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
} as const;

export function apnsConfigured(): boolean {
  return Boolean(
    process.env.APNS_TEAM_ID &&
      process.env.APNS_KEY_ID &&
      process.env.APNS_PRIVATE_KEY
  );
}

async function makeProviderToken(): Promise<string> {
  const teamId = process.env.APNS_TEAM_ID!;
  const keyId = process.env.APNS_KEY_ID!;
  const pem = process.env.APNS_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const key = await importPKCS8(pem, "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(key);
}

export type ApnsSendResult = {
  sent: number;
  failed: number;
  // Tokens APNs reported as dead (unregistered/bad) — purge these.
  staleTokens: string[];
};

export async function sendApnsAlert(
  tokens: string[],
  alert: { title: string; body: string }
): Promise<ApnsSendResult> {
  if (tokens.length === 0) return { sent: 0, failed: 0, staleTokens: [] };

  const host =
    APNS_HOSTS[process.env.APNS_ENV === "sandbox" ? "sandbox" : "production"];
  const topic = process.env.APNS_TOPIC ?? "com.thedailygraphs.app";
  const providerToken = await makeProviderToken();
  const payload = JSON.stringify({ aps: { alert, sound: "default" } });

  const client = http2.connect(host);
  try {
    const results = await Promise.allSettled(
      tokens.map(
        (token) =>
          new Promise<{ token: string; status: number; reason?: string }>(
            (resolve, reject) => {
              const req = client.request({
                ":method": "POST",
                ":path": `/3/device/${token}`,
                authorization: `bearer ${providerToken}`,
                "apns-topic": topic,
                "apns-push-type": "alert",
                "apns-priority": "10",
                "content-type": "application/json",
              });
              let status = 0;
              let body = "";
              req.on("response", (headers) => {
                status = Number(headers[":status"] ?? 0);
              });
              req.setEncoding("utf8");
              req.on("data", (chunk) => (body += chunk));
              req.on("end", () => {
                let reason: string | undefined;
                try {
                  reason = (JSON.parse(body) as { reason?: string }).reason;
                } catch {
                  // Successful sends have an empty body.
                }
                resolve({ token, status, reason });
              });
              req.on("error", reject);
              req.end(payload);
            }
          )
      )
    );

    let sent = 0;
    let failed = 0;
    const staleTokens: string[] = [];
    for (const r of results) {
      if (r.status === "rejected") {
        failed++;
        continue;
      }
      if (r.value.status === 200) {
        sent++;
      } else {
        failed++;
        if (
          r.value.status === 410 ||
          r.value.reason === "BadDeviceToken" ||
          r.value.reason === "Unregistered"
        ) {
          staleTokens.push(r.value.token);
        }
      }
    }
    return { sent, failed, staleTokens };
  } finally {
    client.close();
  }
}
