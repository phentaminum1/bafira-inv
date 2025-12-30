async function forceUnsubscribe() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;

  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    console.log("🧹 Push subscription lama dihapus");
  }
}

console.log("🔥 fcm.js loaded");

if (!("serviceWorker" in navigator)) {
  console.warn("SW tidak didukung");
}

async function initFCM() {
  try {
    await forceUnsubscribe();

    const permission = await Notification.requestPermission();
    console.log("Notification permission:", permission);
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.register(
      "/bafira-inv/firebase-messaging-sw.js"
    );

    console.log("✅ FCM Service Worker AKTIF");

    const token = await messaging.getToken({
      vapidKey: "BDF5EBnh34T5afTxCxmdQS8Tljk3ZjdIr07keapbbsXDdJ1ngJvV8Sxt2S99cmLnB0ZwAgxlo-4NguOTivolMyc",
      serviceWorkerRegistration: registration
    });

    console.log("🔥 FCM TOKEN:", token);

    if (!token) return;

    const { error } = await supabaseClient
      .from("fcm_tokens")
      .upsert({ token }, { onConflict: "token" });

    if (error) {
      console.error("❌ Supabase error:", error);
      return;
    }

    console.log("✅ FCM token tersimpan ke Supabase");
  } catch (err) {
    console.error("❌ initFCM error:", err);
  }
}
