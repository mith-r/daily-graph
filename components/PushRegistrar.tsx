"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

// Renders nothing. Inside the native iOS shell it asks for notification
// permission once and uploads the APNs device token; on the web it's a no-op.
export function PushRegistrar() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    async function register() {
      try {
        let status = await PushNotifications.checkPermissions();
        if (status.receive === "prompt") {
          status = await PushNotifications.requestPermissions();
        }
        if (cancelled || status.receive !== "granted") return;

        await PushNotifications.addListener("registration", (token) => {
          fetch("/api/push/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: token.value }),
          }).catch(() => {
            // Best-effort; we re-register on every app launch anyway.
          });
        });

        await PushNotifications.register();
      } catch (err) {
        console.warn("push registration failed:", err);
      }
    }

    register();

    return () => {
      cancelled = true;
      PushNotifications.removeAllListeners().catch(() => {});
    };
  }, []);

  return null;
}
