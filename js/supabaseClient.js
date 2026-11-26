/**
 * N.A.N.A Supabase Client & Data Service
 * Menangani autentikasi Discord OAuth, consent, pengaturan user, serta query/hapus `voice_sessions`.
 */
window.NANA = window.NANA || {};

(function initSupabaseService() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, DEFAULT_USER_SETTINGS, CONSENT_VERSION } =
    window.NANA.CONFIG;

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Supabase JS SDK gagal dimuat dari CDN.');
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  window.NANA.API = {
    client,

    /**
     * Ambil sesi login aktif saat ini.
     */
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    },

    /**
     * Dengarkan perubahan state autentikasi (login, logout, refresh token).
     */
    onAuthStateChange(callback) {
      return client.auth.onAuthStateChange(callback);
    },

    /**
     * Mulai proses Login with Discord melalui Supabase OAuth.
     */
    async signInWithDiscord() {
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await client.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo,
        },
      });
      if (error) throw error;
    },

    /**
     * Logout dari Supabase Auth.
     */
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },

    /**
     * Ekstrak metadata user Discord dari session Supabase.
     */
    extractDiscordProfile(session) {
      const user = session?.user;
      const meta = user?.user_metadata || {};

      // Prioritas utama: provider_id
      const discordId =
        meta.provider_id ||
        meta.sub ||
        user?.identities?.find((id) => id.provider === 'discord')?.id ||
        null;

      const username = meta.full_name || meta.name || 'Discord User';

      const displayName =
        meta.full_name ||
        meta.name ||
        meta.custom_claims?.global_name ||
        'Discord User';

      const avatarUrl = meta.avatar_url || meta.picture || '';

      return {
        discordId: discordId ? String(discordId) : null,
        username,
        displayName,
        avatarUrl,
      };
    },

    /**
     * Ambil baris user dari tabel `users` berdasarkan `discord_id`.
     * Mengembalikan `null` jika belum ada.
     */
    async getUserSettings(discordId) {
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('discord_id', discordId)
        .maybeSingle();

      if (error) {
        throw new Error(`Gagal memuat data pengguna: ${error.message}`);
      }

      return data;
    },

    /**
     * Simpan persetujuan (consent) user via upsert ke tabel `users`.
     * Jika user baru, sertakan nilai default reminder; jika user lama yang menyetujui ulang,
     * pertahankan preferensi interval yang ada dan aktifkan kembali reminder.
     */
    async grantConsent(discordId, username, existingUser = null) {
      const nowIso = new Date().toISOString();

      const payload = {
        discord_id: discordId,
        username: username || 'Discord User',
        consent_status: true,
        consented_at: nowIso,
        consent_version: CONSENT_VERSION,
        withdrawn_at: null,
        is_active: true,
        ai_reminder_enabled:
          existingUser && typeof existingUser.ai_reminder_enabled === 'boolean'
            ? existingUser.ai_reminder_enabled
            : DEFAULT_USER_SETTINGS.ai_reminder_enabled,
        reminder_1_minutes:
          existingUser?.reminder_1_minutes ?? DEFAULT_USER_SETTINGS.reminder_1_minutes,
        reminder_2_minutes:
          existingUser?.reminder_2_minutes ?? DEFAULT_USER_SETTINGS.reminder_2_minutes,
        reminder_3_minutes:
          existingUser?.reminder_3_minutes ?? DEFAULT_USER_SETTINGS.reminder_3_minutes,
      };

      const { data, error } = await client
        .from('users')
        .upsert(payload, { onConflict: 'discord_id' })
        .select('*')
        .single();

      if (error) {
        throw new Error(`Gagal menyimpan persetujuan: ${error.message}`);
      }

      return data;
    },

    /**
     * Simpan perubahan pengaturan reminder user ke tabel `users`.
     */
    async updateUserSettings(discordId, payload) {
      const { data, error } = await client
        .from('users')
        .update({
          is_active: payload.is_active,
          ai_reminder_enabled: payload.ai_reminder_enabled,
          reminder_1_minutes: payload.reminder_1_minutes,
          reminder_2_minutes: payload.reminder_2_minutes,
          reminder_3_minutes: payload.reminder_3_minutes,
        })
        .eq('discord_id', discordId)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Gagal menyimpan pengaturan: ${error.message}`);
      }

      return data;
    },

    /**
     * Ambil histori sesi voice channel user dari tabel `voice_sessions` (terbaru di atas).
     */
    async getVoiceSessions(discordId) {
      const { data, error } = await client
        .from('voice_sessions')
        .select('id, discord_id, guild_id, guild_name, guild_icon_url, channel_id, joined_at, left_at')
        .eq('discord_id', discordId)
        .order('joined_at', { ascending: false });

      if (error) {
        throw new Error(`Gagal memuat histori voice channel: ${error.message}`);
      }

      return data || [];
    },

    /**
     * Tarik persetujuan & hapus seluruh data riwayat user:
     * 1) DELETE seluruh baris user pada `voice_sessions`
     * 2) UPDATE `users` (consent_status: false, is_active: false, withdrawn_at: now)
     */
    async withdrawConsentAndDeleteData(discordId) {
      const { error: deleteError } = await client
        .from('voice_sessions')
        .delete()
        .eq('discord_id', discordId);

      if (deleteError) {
        throw new Error(`Gagal menghapus riwayat Voice Channel: ${deleteError.message}`);
      }

      const { error: updateError } = await client
        .from('users')
        .update({
          consent_status: false,
          is_active: false,
          withdrawn_at: new Date().toISOString(),
        })
        .eq('discord_id', discordId);

      if (updateError) {
        throw new Error(`Gagal memperbarui status persetujuan: ${updateError.message}`);
      }
    },
  };
})();
