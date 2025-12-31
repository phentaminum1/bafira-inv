console.log("🔥 fcm.js loaded");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then(async reg => {
      console.log("✅ FCM Service Worker terdaftar");

      // 🔥 TUNGGU SAMPAI AKTIF
      await navigator.serviceWorker.ready;
      console.log("🟢 Service Worker aktif");

      const permission = await Notification.requestPermission();
      console.log("Notification permission:", permission);
      if (permission !== "granted") return;

      const token = await messaging.getToken({
        vapidKey: "BDF5EBnh34T5afTxCxmdQS8Tljk3ZjdIr07keapbbsXDdJ1ngJvV8Sxt2S99cmLnB0ZwAgxlo-4NguOTivolMyc",
        serviceWorkerRegistration: reg
      });

      console.log("🔥 FCM TOKEN:", token);

      await supabaseClient
        .from("fcm_tokens")
        .upsert({ token }, { onConflict: "token" });

      console.log("✅ Token tersimpan ke Supabase");
    })
    .catch(err => console.error("❌ FCM error:", err));
}
