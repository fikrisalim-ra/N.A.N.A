/**
 * N.A.N.A Configuration
 * Pusat konfigurasi Supabase, versi persetujuan, masa retensi, dan nilai default aplikasi.
 */
window.NANA = window.NANA || {};

window.NANA.CONFIG = {
  SUPABASE_URL: 'https://oxzkawqhqptocwgtkuis.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_jWw7T8YvqBrsr0iTUI6Mew_A8qXLBT6',

  // Metadata kebijakan privasi & persetujuan (consent)
  CONSENT_VERSION: 'v1.0',
  DATA_RETENTION_LABEL: '1 tahun',

  // Nilai default saat user Discord pertama kali menyetujui dan masuk ke dashboard
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
