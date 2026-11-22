/**
 * N.A.N.A Configuration
 * Pusat konfigurasi Supabase dan nilai default aplikasi.
 * Ubah file ini jika nanti menambahkan endpoint n8n atau config baru.
 */
window.NANA = window.NANA || {};

window.NANA.CONFIG = {
  SUPABASE_URL: 'https://oxzkawqhqptocwgtkuis.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_jWw7T8YvqBrsr0iTUI6Mew_A8qXLBT6',

  // Nilai default saat user Discord pertama kali masuk ke dashboard
  DEFAULT_USER_SETTINGS: {
    is_active: true,
    ai_reminder_enabled: false,
    reminder_1_minutes: 60,
    reminder_2_minutes: 180,
    reminder_3_minutes: 300,
  },

  // Interval pembaruan tampilan durasi sesi aktif (dalam milidetik)
  LIVE_DURATION_TICK_MS: 30000,
};
