/**
 * N.A.N.A Dashboard Application Controller
 * Mengatur tampilan, state aplikasi, form pengaturan, statistik, dan histori VC.
 */
(function initNanaApp() {
  const { API, Utils, CONFIG } = window.NANA;

  // State aplikasi terpusat agar mudah dikembangkan di iterasi berikutnya
  const state = {
    session: null,
    profile: null,
    userSettings: null,
    voiceSessions: [],
    liveTimerId: null,
    isDashboardLoadedForUserId: null,
  };

  // Referensi elemen DOM
  const els = {
    loadingView: document.getElementById('loading-view'),
    loadingText: document.getElementById('loading-text'),
    loginView: document.getElementById('login-view'),
    loginError: document.getElementById('login-error'),
    btnLoginDiscord: document.getElementById('btn-login-discord'),
    btnLoginText: document.getElementById('btn-login-text'),

    dashboardView: document.getElementById('dashboard-view'),
    dashboardError: document.getElementById('dashboard-error'),
    dashboardErrorText: document.getElementById('dashboard-error-text'),

    userAvatar: document.getElementById('user-avatar'),
    userAvatarFallback: document.getElementById('user-avatar-fallback'),
    userName: document.getElementById('user-name'),
    userDiscordId: document.getElementById('user-discord-id'),
    greetingName: document.getElementById('greeting-name'),
    liveVcIndicator: document.getElementById('live-vc-indicator'),
    btnLogout: document.getElementById('btn-logout'),

    statTotalSessions: document.getElementById('stat-total-sessions'),
    statTotalDuration: document.getElementById('stat-total-duration'),
    statAvgDuration: document.getElementById('stat-avg-duration'),
    statReminderStatus: document.getElementById('stat-reminder-status'),
    statReminderMode: document.getElementById('stat-reminder-mode'),
    statReminderIconWrap: document.getElementById('stat-reminder-icon-wrap'),

    settingsForm: document.getElementById('settings-form'),
    toggleIsActive: document.getElementById('toggle-is-active'),
    toggleAiReminder: document.getElementById('toggle-ai-reminder'),
    intervalsWrapper: document.getElementById('intervals-wrapper'),
    inputR1: document.getElementById('input-reminder-1'),
    inputR2: document.getElementById('input-reminder-2'),
    inputR3: document.getElementById('input-reminder-3'),
    previewR1: document.getElementById('preview-r1'),
    previewR2: document.getElementById('preview-r2'),
    previewR3: document.getElementById('preview-r3'),
    formValidationError: document.getElementById('form-validation-error'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    btnSaveSpinner: document.getElementById('btn-save-spinner'),
    btnSaveText: document.getElementById('btn-save-text'),

    btnRefreshSessions: document.getElementById('btn-refresh-sessions'),
    refreshIcon: document.getElementById('refresh-icon'),
    sessionsTableBody: document.getElementById('sessions-table-body'),
    sessionsEmpty: document.getElementById('sessions-empty'),

    toastContainer: document.getElementById('toast-container'),
  };

  /* =========================================================
     UI Helpers (View Switching & Toast Notification)
     ========================================================= */

  function showView(viewName) {
    els.loadingView.classList.toggle('hidden', viewName !== 'loading');
    els.loginView.classList.toggle('hidden', viewName !== 'login');
    els.dashboardView.classList.toggle('hidden', viewName !== 'dashboard');
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    const isError = type === 'error';

    const colorClass = isSuccess
      ? 'bg-surface-900 border-emerald-500/40 text-emerald-200'
      : isError
      ? 'bg-surface-900 border-rose-500/40 text-rose-200'
      : 'bg-surface-900 border-indigo-500/40 text-indigo-200';

    const dotClass = isSuccess
      ? 'bg-emerald-400'
      : isError
      ? 'bg-rose-400'
      : 'bg-indigo-400';

    toast.className = `toast-item flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl shadow-black/40 text-xs sm:text-sm ${colorClass}`;

    const dot = document.createElement('span');
    dot.className = `w-2 h-2 rounded-full shrink-0 ${dotClass}`;

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(dot);
    toast.appendChild(text);
    els.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 220);
    }, 3600);
  }

  function showDashboardError(message) {
    if (!message) {
      els.dashboardError.classList.add('hidden');
      els.dashboardErrorText.textContent = '';
      return;
    }
    els.dashboardErrorText.textContent = message;
    els.dashboardError.classList.remove('hidden');
  }

  function showFormError(message) {
    if (!message) {
      els.formValidationError.classList.add('hidden');
      els.formValidationError.textContent = '';
      return;
    }
    els.formValidationError.textContent = message;
    els.formValidationError.classList.remove('hidden');
  }

  /* =========================================================
     Render Functions
     ========================================================= */

  function renderUserProfile(profile) {
    els.userName.textContent = profile.displayName;
    els.greetingName.textContent = profile.displayName;
    els.userDiscordId.textContent = `ID: ${profile.discordId || '-'}`;

    if (profile.avatarUrl) {
      els.userAvatar.src = profile.avatarUrl;
      els.userAvatar.classList.remove('hidden');
      els.userAvatarFallback.classList.add('hidden');
      els.userAvatar.onerror = () => {
        els.userAvatar.classList.add('hidden');
        els.userAvatarFallback.textContent = Utils.getInitials(profile.displayName);
        els.userAvatarFallback.classList.remove('hidden');
      };
    } else {
      els.userAvatar.classList.add('hidden');
      els.userAvatarFallback.textContent = Utils.getInitials(profile.displayName);
      els.userAvatarFallback.classList.remove('hidden');
    }
  }

  function updateMinutePreviews() {
    els.previewR1.textContent = Utils.formatMinutesPreview(els.inputR1.value);
    els.previewR2.textContent = Utils.formatMinutesPreview(els.inputR2.value);
    els.previewR3.textContent = Utils.formatMinutesPreview(els.inputR3.value);
  }

  function updateActiveVisualState() {
    const active = els.toggleIsActive.checked;
    els.intervalsWrapper.classList.toggle('opacity-60', !active);
  }

  function renderSettingsForm(settings) {
    els.toggleIsActive.checked = Boolean(settings.is_active);
    els.toggleAiReminder.checked = Boolean(settings.ai_reminder_enabled);
    els.inputR1.value = settings.reminder_1_minutes ?? CONFIG.DEFAULT_USER_SETTINGS.reminder_1_minutes;
    els.inputR2.value = settings.reminder_2_minutes ?? CONFIG.DEFAULT_USER_SETTINGS.reminder_2_minutes;
    els.inputR3.value = settings.reminder_3_minutes ?? CONFIG.DEFAULT_USER_SETTINGS.reminder_3_minutes;

    updateMinutePreviews();
    updateActiveVisualState();
    renderReminderStatusCard(settings);
  }

  function renderReminderStatusCard(settings) {
    const isActive = Boolean(settings.is_active);
    const isAi = Boolean(settings.ai_reminder_enabled);

    els.statReminderStatus.textContent = isActive ? 'Aktif' : 'Nonaktif';
    els.statReminderStatus.className = `mt-2 text-2xl sm:text-3xl font-bold tracking-tight ${
      isActive ? 'text-emerald-400' : 'text-slate-400'
    }`;

    els.statReminderMode.textContent = isActive
      ? isAi
        ? 'Mode: Pesan AI'
        : 'Mode: Pesan Standar'
      : 'Pengingat sedang dijeda';

    els.statReminderIconWrap.className = `w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
      isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'
    }`;
  }

  function renderVoiceSessionsAndStats(sessions) {
    const totalSessions = sessions.length;
    let totalDurationMs = 0;
    let hasActiveSession = false;

    for (const s of sessions) {
      totalDurationMs += Utils.getSessionDurationMs(s);
      if (!s.left_at) hasActiveSession = true;
    }

    // Update Summary Cards
    els.statTotalSessions.textContent = totalSessions.toLocaleString('id-ID');
    els.statTotalDuration.textContent = totalSessions > 0 ? Utils.formatDurationMs(totalDurationMs) : '0m';

    if (totalSessions > 0) {
      const avgMs = Math.floor(totalDurationMs / totalSessions);
      els.statAvgDuration.textContent = `Rata-rata: ${Utils.formatDurationMs(avgMs)} / sesi`;
    } else {
      els.statAvgDuration.textContent = 'Rata-rata: 0m / sesi';
    }

    // Update Live VC Banner
    els.liveVcIndicator.classList.toggle('hidden', !hasActiveSession);

    // Render Table Rows
    els.sessionsTableBody.innerHTML = '';

    if (totalSessions === 0) {
      els.sessionsEmpty.classList.remove('hidden');
      return;
    }

    els.sessionsEmpty.classList.add('hidden');
    const fragment = document.createDocumentFragment();

    for (const s of sessions) {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-800/35 transition-colors';

      const isOngoing = !s.left_at;
      const durationMs = Utils.getSessionDurationMs(s);

      // Kolom 1: Tanggal
      const tdDate = document.createElement('td');
      tdDate.className = 'py-3.5 px-5 text-slate-200 whitespace-nowrap font-medium';
      tdDate.textContent = Utils.formatDate(s.joined_at);

      // Kolom 2: Jam Masuk
      const tdIn = document.createElement('td');
      tdIn.className = 'py-3.5 px-4 text-slate-300 font-mono text-xs whitespace-nowrap';
      tdIn.textContent = Utils.formatTime(s.joined_at);

      // Kolom 3: Jam Keluar / Badge "Sedang di VC"
      const tdOut = document.createElement('td');
      tdOut.className = 'py-3.5 px-4 whitespace-nowrap';

      if (isOngoing) {
        const badge = document.createElement('span');
        badge.className =
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';

        const dot = document.createElement('span');
        dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse';

        const label = document.createElement('span');
        label.textContent = 'Sedang di VC';

        badge.appendChild(dot);
        badge.appendChild(label);
        tdOut.appendChild(badge);
      } else {
        tdOut.classList.add('text-slate-300', 'font-mono', 'text-xs');
        tdOut.textContent = Utils.formatTime(s.left_at);
      }

      // Kolom 4: Durasi
      const tdDur = document.createElement('td');
      tdDur.className = `py-3.5 px-5 text-right font-mono text-xs whitespace-nowrap ${
        isOngoing ? 'text-emerald-300 font-semibold' : 'text-slate-200'
      }`;
      tdDur.textContent = Utils.formatDurationMs(durationMs);

      tr.appendChild(tdDate);
      tr.appendChild(tdIn);
      tr.appendChild(tdOut);
      tr.appendChild(tdDur);
      fragment.appendChild(tr);
    }

    els.sessionsTableBody.appendChild(fragment);

    // Atur auto-update durasi lokal jika ada sesi yang sedang berjalan
    manageLiveDurationTimer(hasActiveSession);
  }

  function manageLiveDurationTimer(hasActiveSession) {
    if (state.liveTimerId) {
      clearInterval(state.liveTimerId);
      state.liveTimerId = null;
    }

    if (hasActiveSession) {
      state.liveTimerId = setInterval(() => {
        renderVoiceSessionsAndStats(state.voiceSessions);
      }, CONFIG.LIVE_DURATION_TICK_MS);
    }
  }

  /* =========================================================
     Data Loading & Auth Flow
     ========================================================= */

  async function loadDashboardData(session) {
    const profile = API.extractDiscordProfile(session);
    state.session = session;
    state.profile = profile;

    if (!profile.discordId) {
      showView('dashboard');
      renderUserProfile(profile);
      showDashboardError(
        'Discord ID (provider_id) tidak ditemukan pada sesi login. Pastikan login menggunakan akun Discord yang valid.'
      );
      return;
    }

    // Hindari reload berulang jika user yang sama sudah dimuat
    if (state.isDashboardLoadedForUserId === profile.discordId) {
      showView('dashboard');
      return;
    }

    els.loadingText.textContent = 'Menyiapkan dashboard N.A.N.A...';
    showView('loading');
    showDashboardError('');

    try {
      renderUserProfile(profile);

      // Jalankan query pengaturan user dan histori VC secara paralel
      const [userResult, sessions] = await Promise.all([
        API.getOrCreateUserSettings(profile.discordId),
        API.getVoiceSessions(profile.discordId),
      ]);

      state.userSettings = userResult.user;
      state.voiceSessions = sessions;
      state.isDashboardLoadedForUserId = profile.discordId;

      renderSettingsForm(state.userSettings);
      renderVoiceSessionsAndStats(state.voiceSessions);

      showView('dashboard');

      if (userResult.isNewUser) {
        showToast('Selamat datang! Pengaturan default N.A.N.A berhasil dibuat.', 'info');
      }
    } catch (err) {
      console.error('[N.A.N.A] Dashboard load error:', err);
      showView('dashboard');
      showDashboardError(
        `${err.message}. Pastikan tabel & RLS policy di Supabase sudah mengizinkan akses untuk pengguna terautentikasi.`
      );
    }
  }

  function resetToLogin() {
    if (state.liveTimerId) {
      clearInterval(state.liveTimerId);
      state.liveTimerId = null;
    }
    state.session = null;
    state.profile = null;
    state.userSettings = null;
    state.voiceSessions = [];
    state.isDashboardLoadedForUserId = null;
    showDashboardError('');
    showFormError('');
    showView('login');
  }

  /* =========================================================
     Event Handlers
     ========================================================= */

  async function handleLoginClick() {
    els.loginError.classList.add('hidden');
    els.btnLoginDiscord.disabled = true;
    els.btnLoginText.textContent = 'Mengarahkan ke Discord...';

    try {
      await API.signInWithDiscord();
    } catch (err) {
      console.error('[N.A.N.A] Login error:', err);
      els.loginError.textContent = `Gagal memulai login Discord: ${err.message}`;
      els.loginError.classList.remove('hidden');
      els.btnLoginDiscord.disabled = false;
      els.btnLoginText.textContent = 'Login with Discord';
    }
  }

  async function handleLogoutClick() {
    els.btnLogout.disabled = true;
    try {
      await API.signOut();
      resetToLogin();
      showToast('Berhasil keluar dari akun.', 'info');
    } catch (err) {
      console.error('[N.A.N.A] Logout error:', err);
      showToast(`Gagal logout: ${err.message}`, 'error');
    } finally {
      els.btnLogout.disabled = false;
    }
  }

  async function handleSaveSettings(event) {
    event.preventDefault();
    showFormError('');

    if (!state.profile?.discordId) {
      showToast('Sesi pengguna tidak valid. Silakan login ulang.', 'error');
      return;
    }

    // Validasi input angka reminder
    const validation = Utils.validateReminderInputs(
      els.inputR1.value,
      els.inputR2.value,
      els.inputR3.value
    );

    if (!validation.valid) {
      showFormError(validation.error);
      return;
    }

    // Loading state pada tombol simpan
    els.btnSaveSettings.disabled = true;
    els.btnSaveSpinner.classList.remove('hidden');
    els.btnSaveText.textContent = 'Menyimpan...';

    try {
      const updated = await API.updateUserSettings(state.profile.discordId, {
        is_active: els.toggleIsActive.checked,
        ai_reminder_enabled: els.toggleAiReminder.checked,
        reminder_1_minutes: validation.values.r1,
        reminder_2_minutes: validation.values.r2,
        reminder_3_minutes: validation.values.r3,
      });

      state.userSettings = updated;
      renderSettingsForm(updated);
      showToast('Pengaturan reminder berhasil disimpan!', 'success');
    } catch (err) {
      console.error('[N.A.N.A] Save settings error:', err);
      showFormError(err.message);
      showToast('Gagal menyimpan pengaturan.', 'error');
    } finally {
      els.btnSaveSettings.disabled = false;
      els.btnSaveSpinner.classList.add('hidden');
      els.btnSaveText.textContent = 'Simpan Pengaturan';
    }
  }

  async function handleRefreshSessions() {
    if (!state.profile?.discordId) return;

    els.btnRefreshSessions.disabled = true;
    els.refreshIcon.classList.add('animate-spin');

    try {
      const sessions = await API.getVoiceSessions(state.profile.discordId);
      state.voiceSessions = sessions;
      renderVoiceSessionsAndStats(sessions);
      showToast('Histori Voice Channel diperbarui.', 'info');
    } catch (err) {
      console.error('[N.A.N.A] Refresh sessions error:', err);
      showToast(`Gagal memuat histori: ${err.message}`, 'error');
    } finally {
      els.btnRefreshSessions.disabled = false;
      els.refreshIcon.classList.remove('animate-spin');
    }
  }

  function bindEvents() {
    els.btnLoginDiscord.addEventListener('click', handleLoginClick);
    els.btnLogout.addEventListener('click', handleLogoutClick);
    els.settingsForm.addEventListener('submit', handleSaveSettings);
    els.btnRefreshSessions.addEventListener('click', handleRefreshSessions);

    // Live preview konversi menit -> jam saat user mengetik
    [els.inputR1, els.inputR2, els.inputR3].forEach((input) => {
      input.addEventListener('input', () => {
        updateMinutePreviews();
        showFormError('');
      });
    });

    els.toggleIsActive.addEventListener('change', updateActiveVisualState);
  }

  /* =========================================================
     Bootstrap Application
     ========================================================= */

  async function bootstrap() {
    bindEvents();

    // Cek error dari URL OAuth callback jika ada (misal user menekan Cancel di Discord)
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const authErrorDesc = urlParams.get('error_description') || hashParams.get('error_description');

    if (authErrorDesc) {
      els.loginError.textContent = `Login Discord dibatalkan atau gagal: ${authErrorDesc}`;
      els.loginError.classList.remove('hidden');
      // Bersihkan query/hash error dari address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    try {
      const session = await API.getSession();
      if (session) {
        // Bersihkan parameter OAuth callback (?code= atau #access_token=) agar URL tetap rapi
        if (
          window.location.search.includes('code=') ||
          window.location.hash.includes('access_token')
        ) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        await loadDashboardData(session);
      } else {
        resetToLogin();
      }
    } catch (err) {
      console.error('[N.A.N.A] Init session error:', err);
      resetToLogin();
      els.loginError.textContent = `Gagal memeriksa sesi: ${err.message}`;
      els.loginError.classList.remove('hidden');
    }

    // Subscribe perubahan auth (penting untuk OAuth redirect callback & logout di tab lain)
    API.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Bersihkan token hash dari URL agar address bar rapi
        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        await loadDashboardData(session);
      } else if (event === 'SIGNED_OUT') {
        resetToLogin();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
