import { useEffect } from "react";
import api from "@/api/client";
import { useAuthStore } from "@/store/auth";

async function getVapidKey(): Promise<string> {
  const res = await api.get<{ public_key: string }>("/notifications/vapid-public-key");
  return res.data.public_key;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function registerSubscription(sw: ServiceWorkerRegistration, vapidKey: string) {
  const existing = await sw.pushManager.getSubscription();
  if (existing) return existing;

  return sw.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
  });
}

async function sendSubscriptionToServer(sub: PushSubscription) {
  const json = sub.toJSON();
  await api.post("/notifications/subscribe", {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
  });
}

export function usePushNotifications() {
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const vapidKey = await getVapidKey();

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const sub = await registerSubscription(reg, vapidKey);
        await sendSubscriptionToServer(sub);
      } catch {
        // push не поддерживается или пользователь отказал — молча игнорируем
      }
    })();
  }, [token]);
}
