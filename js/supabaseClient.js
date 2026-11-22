/**
 * N.A.N.A Supabase Client & Data Service
 * Menangani autentikasi Discord OAuth dan query tabel `users` serta `voice_sessions`.
 */
window.NANA = window.NANA || {};

(function initSupabaseService() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, DEFAULT_USER_SETTINGS } = window.NANA.CONFIG;

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

      // Prioritas utama sesuai spesifikasi: provider_id
      const discordId =
        meta.provider_id ||
        meta.sub ||
        user?.identities?.find((id) => id.provider === 'discord')?.id ||
        null;

      const displayName =
        meta.full_name ||
        meta.name ||
        meta.custom_claims?.global_name ||
        'Pengguna Discord';

      const avatarUrl = meta.avatar_url || meta.picture || '';

      return {
        discordId: discordId ? String(discordId) : null,
        displayName,
        avatarUrl,
      };
    },

    /**
     * Ambil data pengaturan user di tabel `users`.
     * Jika belum ada baris untuk `discord_id` tersebut, otomatis lakukan INSERT dengan nilai default.
     */
    async getOrCreateUserSettings(discordId) {
      const { data: existingUser, error: fetchError } = await client
        .from('users')
        .select('*')
        .eq('discord_id', discordId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Gagal memuat data pengguna: ${fetchError.message}`);
      }

      if (existingUser) {
        return { user: existingUser, isNewUser: false };
      }

      // Belum ada di tabel users -> INSERT nilai default
      const newRecord = {
        discord_id: discordId,
        ...DEFAULT_USER_SETTINGS,
      };

      const { data: insertedUser, error: insertError } = await client
        .from('users')
        .insert(newRecord)
        .select('*')
        .single();

      if (insertError) {
        throw new Error(`Gagal membuat profil pengguna baru: ${insertError.message}`);
      }

      return { user: insertedUser, isNewUser: true };
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
        .select('id, discord_id, guild_id, channel_id, joined_at, left_at')
        .eq('discord_id', discordId)
        .order('joined_at', { ascending: false });

      if (error) {
        throw new Error(`Gagal memuat histori voice channel: ${error.message}`);
      }

      return data || [];
    },
  };
})();
