/**
 * N.A.N.A Dashboard Application Controller
 * Mengatur Landing Page, Consent Modal wajib, Dashboard 3 Tab, Chart.js, Settings, dan Privasi.
 */
(function initNanaApp() {
  const { API, Utils, Charts, CONFIG } = window.NANA;

  // State aplikasi terpusat
  const state = {
    session: null,
    profile: null,
    userSettings: null,
    pendingExistingUser: null,
    voiceSessions: [],
    activeTab: 'analytics',
    liveTimerId: null,
    loadedDiscordId: null,
    isConsentModalOpen: false,
    isWithdrawModalOpen: false,
  };

  // Referensi elemen DOM
  const els = {
    loadingView: document.getElementById('loading-view'),
    loadingText: document.getElementById('loading-text'),

    landingView: document.getElementById('landing-view'),
    loginError: document.getElementById('login-error'),
    loginButtons: document.querySelectorAll('[data-discord-login]'),
    faqItems: document.querySelectorAll('.faq-item'),
    retentionTexts: document.querySelectorAll('[data-retention-text]'),

    // Consent Modal
    consentModal: document.getElementById('consent-modal'),
    consentModalVersion: document.getElementById('consent-modal-version'),
    consentUserName: document.getElementById('consent-user-name'),
    consentUserId: document.getElementById('consent-user-id'),
    consentCheckAge: document.getElementById('consent-check-age'),
    consentCheckAgree: document.getElementById('consent-check-agree'),
    consentError: document.getElementById('consent-error'),
    btnConsentDecline: document.getElementById('btn-consent-decline'),
    btnConsentAccept: document.getElementById('btn-consent-accept'),
    consentAcceptSpinner: document.getElementById('consent-accept-spinner'),
    consentAcceptText: document.getElementById('consent-accept-text'),

    // Withdraw Confirmation Modal
    withdrawModal: document.getElementById('withdraw-modal'),
    withdrawError: document.getElementById('withdraw-error'),
    btnOpenWithdrawModal: document.getElementById('btn-open-withdraw-modal'),
    btnWithdrawCancel: document.getElementById('btn-withdraw-cancel'),
    btnWithdrawConfirm: document.getElementById('btn-withdraw-confirm'),
    withdrawConfirmSpinner: document.getElementById('withdraw-confirm-spinner'),
    withdrawConfirmText: document.getElementById('withdraw-confirm-text'),

    // Dashboard Shell & Tabs
    dashboardView: document.getElementById('dashboard-view'),
    dashboardError: document.getElementById('dashboard-error'),
    dashboardErrorText: document.getElementById('dashboard-error-text'),
    tabButtons: document.querySelectorAll('[data-tab-target]'),
    tabPanels: {
      analytics: document.getElementById('tab-panel-analytics'),
      settings: document.getElementById('tab-panel-settings'),
      privacy: document.getElementById('tab-panel-privacy'),
    },

    // Header Profile
    userAvatar: document.getElementById('user-avatar'),
    userAvatarFallback: document.getElementById('user-avatar-fallback'),
    userName: document.getElementById('user-name'),
    userDiscordId: document.getElementById('user-discord-id'),
    greetingName: document.getElementById('greeting-name'),
    liveVcIndicator: document.getElementById('live-vc-indicator'),
    btnLogout: document.getElementById('btn-logout'),

    // Tab 1: Stats, Charts, Table
    statTotalSessions: document.getElementById('stat-total-sessions'),
    statTotalDuration: document.getElementById('stat-total-duration'),
    statAvgDuration: document.getElementById('stat-avg-duration'),
    statReminderStatus: document.getElementById('stat-reminder-status'),
    statReminderMode: document.getElementById('stat-reminder-mode'),
    statReminderIconWrap: document.getElementById('stat-reminder-icon-wrap'),

    weeklyTotalBadge: document.getElementById('weekly-total-badge'),
    chartWeeklyCanvas: document.getElementById('chart-weekly-duration'),
    chartServerCanvas: document.getElementById('chart-server-distribution'),
    serverChartEmpty: document.getElementById('server-chart-empty'),
    serverChartContent: document.getElementById('server-chart-content'),
    topServersList: document.getElementById('top-servers-list'),

    btnRefreshSessions: document.getElementById('btn-refresh-sessions'),
    refreshIcon: document.getElementById('refresh-icon'),
    sessionsTableBody: document.getElementById('sessions-table-body'),
    sessionsEmpty: document.getElementById('sessions-empty'),

    // Tab 2: Settings Form
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

    // Tab 3: Privacy
    privacyConsentStatus: document.getElementById('privacy-consent-status'),
    privacyConsentVersion: document.getElementById('privacy-consent-version'),
    privacyConsentedAt: document.getElementById('privacy-consented-at'),
    privacyRetention: document.getElementById('privacy-retention'),

    toastContainer: document.getElementById('toast-container'),
  };

  /* =========================================================
     UI Helpers (View Switching, Tabs, Modals, Toast)
     ========================================================= */

  function showView(viewName) {
    els.loadingView.classList.toggle('hidden', viewName !== 'loading');
    els.landingView.classList.toggle('hidden', viewName !== 'landing');
    els.dashboardView.classList.toggle('hidden', viewName !== 'dashboard');
  }

  function setActiveTab(tabName) {
    if (!els.tabPanels[tabName]) return;
    state.activeTab = tabName;

    els.tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tabTarget === tabName;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    Object.entries(els.tabPanels).forEach(([key, panel]) => {
      panel.classList.toggle('hidden', key !== tabName);
    });

    if (tabName === 'analytics') {
      // Pastikan ukuran Chart.js menyesuaikan container saat tab dibuka
      requestAnimationFrame(() => Charts.resizeAll());
    }
  }

  function openConsentModal(profile, existingUser) {
    state.pendingExistingUser = existingUser || null;
    state.isConsentModalOpen = true;

    els.consentModalVersion.textContent = CONFIG.CONSENT_VERSION;
    els.consentUserName.textContent = profile.displayName;
    els.consentUserId.textContent = profile.discordId ? `(${profile.discordId})` : '';
    els.consentCheckAge.checked = false;
    els.consentCheckAgree.checked = false;
    els.btnConsentAccept.disabled = true;
    els.consentError.classList.add('hidden');
    els.consentError.textContent = '';

    // Blokir akses ke dashboard sepenuhnya
    els.loadingView.classList.add('hidden');
    els.dashboardView.classList.add('hidden');
    els.landingView.classList.add('hidden');
    els.consentModal.classList.remove('hidden');
  }

  function closeConsentModal() {
    state.isConsentModalOpen = false;
    els.consentModal.classList.add('hidden');
  }

  function openWithdrawModal() {
    state.isWithdrawModalOpen = true;
    els.withdrawError.classList.add('hidden');
    els.withdrawError.textContent = '';
    els.withdrawModal.classList.remove('hidden');
  }

  function closeWithdrawModal() {
    state.isWithdrawModalOpen = false;
    els.withdrawModal.classList.add('hidden');
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
    }, 4000);
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

  function setLoginButtonsLoading(isLoading) {
    els.loginButtons.forEach((btn) => {
      btn.disabled = isLoading;
      const label = btn.querySelector('[data-login-label]');
      if (label) {
        label.textContent = isLoading ? 'Mengarahkan ke Discord...' : 'Login with Discord';
      }
    });
  }

  /* =========================================================
     Render Functions
     ========================================================= */

  function syncRetentionLabels() {
    els.retentionTexts.forEach((el) => {
      el.textContent = CONFIG.DATA_RETENTION_LABEL;
    });
  }

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
    renderPrivacyInfo(settings);
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

  function renderPrivacyInfo(settings) {
    els.privacyConsentStatus.textContent = settings.consent_status ? 'Disetujui' : 'Belum Disetujui';
    els.privacyConsentVersion.textContent = settings.consent_version || CONFIG.CONSENT_VERSION;
    els.privacyConsentedAt.textContent = Utils.formatDateTime(settings.consented_at);
    els.privacyRetention.textContent = CONFIG.DATA_RETENTION_LABEL;
  }

  function renderTopServersList(servers) {
    els.topServersList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    servers.forEach((srv, idx) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between gap-3 p-2 rounded-xl bg-surface-950/60 border border-slate-800/70';

      const left = document.createElement('div');
      left.className = 'flex items-center gap-2.5 min-w-0';

      const dot = document.createElement('span');
      dot.className = 'w-2 h-2 rounded-full shrink-0';
      dot.style.backgroundColor = Charts.getServerColor(idx);

      const avatar = Utils.createServerAvatarElement(srv.name, srv.iconUrl, 'w-7 h-7 text-[10px]');

      const meta = document.createElement('div');
      meta.className = 'min-w-0';

      const nameEl = document.createElement('p');
      nameEl.className = 'text-xs font-medium text-slate-200 truncate';
      nameEl.textContent = srv.name;
      nameEl.title = srv.name;

      const subEl = document.createElement('p');
      subEl.className = 'text-[10px] text-slate-500';
      subEl.textContent = `${srv.sessionCount} sesi`;

      meta.appendChild(nameEl);
      meta.appendChild(subEl);

      left.appendChild(dot);
      left.appendChild(avatar);
      left.appendChild(meta);

      const right = document.createElement('div');
      right.className = 'text-right shrink-0';

      const durEl = document.createElement('p');
      durEl.className = 'text-xs font-mono font-medium text-slate-200';
      durEl.textContent = Utils.formatDurationMs(srv.durationMs);

      const pctEl = document.createElement('p');
      pctEl.className = 'text-[10px] font-mono text-slate-500';
      pctEl.textContent = `${srv.percentage}%`;

      right.appendChild(durEl);
      right.appendChild(pctEl);

      row.appendChild(left);
      row.appendChild(right);
      fragment.appendChild(row);
    });

    els.topServersList.appendChild(fragment);
  }

  function renderVoiceSessionsAndAnalytics(sessions, animateCharts = true) {
    const totalSessions = sessions.length;
    let totalDurationMs = 0;
    let hasActiveSession = false;

    for (const s of sessions) {
      totalDurationMs += Utils.getSessionDurationMs(s);
      if (!s.left_at) hasActiveSession = true;
    }

    // 1. Update 4 Summary Cards
    els.statTotalSessions.textContent = totalSessions.toLocaleString('id-ID');
    els.statTotalDuration.textContent = totalSessions > 0 ? Utils.formatDurationMs(totalDurationMs) : '0m';

    if (totalSessions > 0) {
      const avgMs = Math.floor(totalDurationMs / totalSessions);
      els.statAvgDuration.textContent = Utils.formatDurationMs(avgMs);
    } else {
      els.statAvgDuration.textContent = '0m';
    }

    // 2. Update Live VC Indicator di Header
    els.liveVcIndicator.classList.toggle('hidden', !hasActiveSession);

    // 3. Render Bar Chart 7 Hari Terakhir
    const weeklyBuckets = Utils.buildLast7DaysStats(sessions);
    const weeklyTotalMs = weeklyBuckets.reduce((sum, b) => sum + b.durationMs, 0);
    els.weeklyTotalBadge.textContent = `Total: ${Utils.formatDurationMs(weeklyTotalMs)}`;
    Charts.renderWeeklyBarChart(els.chartWeeklyCanvas, weeklyBuckets, animateCharts);

    // 4. Render Doughnut Chart & Top Server List
    const { servers } = Utils.buildServerStats(sessions);
    if (servers.length === 0) {
      els.serverChartEmpty.classList.remove('hidden');
      els.serverChartContent.classList.add('hidden');
    } else {
      els.serverChartEmpty.classList.add('hidden');
      els.serverChartContent.classList.remove('hidden');
      Charts.renderServerDoughnutChart(els.chartServerCanvas, servers, animateCharts);
      renderTopServersList(servers);
    }

    // 5. Render Tabel Histori Sesi
    els.sessionsTableBody.innerHTML = '';

    if (totalSessions === 0) {
      els.sessionsEmpty.classList.remove('hidden');
    } else {
      els.sessionsEmpty.classList.add('hidden');
      const fragment = document.createDocumentFragment();

      for (const s of sessions) {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/35 transition-colors';

        const isOngoing = !s.left_at;
        const durationMs = Utils.getSessionDurationMs(s);
        const serverName = Utils.getServerDisplayName(s);

        // Kolom 1: Tanggal
        const tdDate = document.createElement('td');
        tdDate.className = 'py-3.5 px-5 text-slate-200 whitespace-nowrap font-medium';
        tdDate.textContent = Utils.formatDate(s.joined_at);

        // Kolom 2: Server (Ikon bulat kecil + Nama / fallback guild_id)
        const tdServer = document.createElement('td');
        tdServer.className = 'py-3.5 px-4 whitespace-nowrap';
        const serverWrap = document.createElement('div');
        serverWrap.className = 'flex items-center gap-2.5 max-w-[200px]';

        const serverAvatar = Utils.createServerAvatarElement(
          serverName,
          s.guild_icon_url,
          'w-6 h-6 text-[10px]'
        );
        const serverText = document.createElement('span');
        serverText.className = 'text-xs sm:text-sm text-slate-200 truncate';
        serverText.textContent = serverName;
        serverText.title = serverName;

        serverWrap.appendChild(serverAvatar);
        serverWrap.appendChild(serverText);
        tdServer.appendChild(serverWrap);

        // Kolom 3: Jam Masuk
        const tdIn = document.createElement('td');
        tdIn.className = 'py-3.5 px-4 text-slate-300 font-mono text-xs whitespace-nowrap';
        tdIn.textContent = Utils.formatTime(s.joined_at);

        // Kolom 4: Jam Keluar / Badge "Sedang di VC"
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

        // Kolom 5: Durasi
        const tdDur = document.createElement('td');
        tdDur.className = `py-3.5 px-5 text-right font-mono text-xs whitespace-nowrap ${
          isOngoing ? 'text-emerald-300 font-semibold' : 'text-slate-200'
        }`;
        tdDur.textContent = Utils.formatDurationMs(durationMs);

        tr.appendChild(tdDate);
        tr.appendChild(tdServer);
        tr.appendChild(tdIn);
        tr.appendChild(tdOut);
        tr.appendChild(tdDur);
        fragment.appendChild(tr);
      }

      els.sessionsTableBody.appendChild(fragment);
    }

    // Auto-update durasi lokal jika user sedang berada di VC
    manageLiveDurationTimer(hasActiveSession);
  }

  function manageLiveDurationTimer(hasActiveSession) {
    if (state.liveTimerId) {
      clearInterval(state.liveTimerId);
      state.liveTimerId = null;
    }

    if (hasActiveSession) {
      state.liveTimerId = setInterval(() => {
        renderVoiceSessionsAndAnalytics(state.voiceSessions, false);
      }, CONFIG.LIVE_DURATION_TICK_MS);
    }
  }

  /* =========================================================
     Auth, Consent Gate & Data Loading
     ========================================================= */

  async function enterDashboardWithUser(profile, userSettings) {
    els.loadingText.textContent = 'Memuat analitik Voice Channel...';
    closeConsentModal();
    showView('loading');
    showDashboardError('');

    try {
      const sessions = await API.getVoiceSessions(profile.discordId);
      state.userSettings = userSettings;
      state.voiceSessions = sessions;
      state.loadedDiscordId = profile.discordId;

      renderUserProfile(profile);
      renderSettingsForm(userSettings);

      showView('dashboard');
      setActiveTab('analytics');
      renderVoiceSessionsAndAnalytics(sessions, true);
    } catch (err) {
      console.error('[N.A.N.A] Dashboard load error:', err);
      renderUserProfile(profile);
      renderSettingsForm(userSettings);
      showView('dashboard');
      setActiveTab('analytics');
      showDashboardError(
        `${err.message}. Pastikan RLS policy Supabase mengizinkan akses untuk pengguna terautentikasi.`
      );
    }
  }

  async function handleAuthenticatedSession(session) {
    const profile = API.extractDiscordProfile(session);
    state.session = session;
    state.profile = profile;

    if (!profile.discordId) {
      resetToLanding();
      els.loginError.textContent =
        'Discord ID (provider_id) tidak ditemukan pada sesi login. Pastikan login menggunakan akun Discord yang valid.';
      els.loginError.classList.remove('hidden');
      return;
    }

    // Hindari reload berulang untuk user yang sudah selesai dimuat
    if (state.loadedDiscordId === profile.discordId && !state.isConsentModalOpen) {
      showView('dashboard');
      return;
    }

    els.loadingText.textContent = 'Memeriksa status persetujuan akun...';
    showView('loading');

    try {
      const existingUser = await API.getUserSettings(profile.discordId);

      // CONSENT GATE WAJIB:
      // Jika user belum ada di tabel users ATAU consent_status bukan true, blokir dashboard
      if (!existingUser || existingUser.consent_status !== true) {
        openConsentModal(profile, existingUser);
        return;
      }

      await enterDashboardWithUser(profile, existingUser);
    } catch (err) {
      console.error('[N.A.N.A] Auth check error:', err);
      resetToLanding();
      els.loginError.textContent = `Gagal memeriksa data akun: ${err.message}`;
      els.loginError.classList.remove('hidden');
    }
  }

  function resetToLanding() {
    if (state.liveTimerId) {
      clearInterval(state.liveTimerId);
      state.liveTimerId = null;
    }
    Charts.destroyAll();
    closeConsentModal();
    closeWithdrawModal();

    state.session = null;
    state.profile = null;
    state.userSettings = null;
    state.pendingExistingUser = null;
    state.voiceSessions = [];
    state.loadedDiscordId = null;

    setLoginButtonsLoading(false);
    showDashboardError('');
    showFormError('');
    showView('landing');
  }

  /* =========================================================
     Event Handlers
     ========================================================= */

  async function handleLoginClick() {
    els.loginError.classList.add('hidden');
    setLoginButtonsLoading(true);

    try {
      await API.signInWithDiscord();
    } catch (err) {
      console.error('[N.A.N.A] Login error:', err);
      els.loginError.textContent = `Gagal memulai login Discord: ${err.message}`;
      els.loginError.classList.remove('hidden');
      setLoginButtonsLoading(false);
    }
  }

  async function handleLogoutClick() {
    els.btnLogout.disabled = true;
    try {
      await API.signOut();
      resetToLanding();
      showToast('Berhasil keluar dari akun.', 'info');
    } catch (err) {
      console.error('[N.A.N.A] Logout error:', err);
      showToast(`Gagal logout: ${err.message}`, 'error');
    } finally {
      els.btnLogout.disabled = false;
    }
  }

  function updateConsentAcceptState() {
    const bothChecked = els.consentCheckAge.checked && els.consentCheckAgree.checked;
    els.btnConsentAccept.disabled = !bothChecked;
  }

  async function handleConsentAccept() {
    if (!state.profile?.discordId) return;
    if (!(els.consentCheckAge.checked && els.consentCheckAgree.checked)) return;

    els.consentError.classList.add('hidden');
    els.btnConsentAccept.disabled = true;
    els.btnConsentDecline.disabled = true;
    els.consentAcceptSpinner.classList.remove('hidden');
    els.consentAcceptText.textContent = 'Menyimpan...';

    try {
      const savedUser = await API.grantConsent(
        state.profile.discordId,
        state.profile.username,
        state.pendingExistingUser
      );
      await enterDashboardWithUser(state.profile, savedUser);
      showToast('Persetujuan disimpan. Selamat datang di N.A.N.A!', 'success');
    } catch (err) {
      console.error('[N.A.N.A] Consent save error:', err);
      els.consentError.textContent = err.message;
      els.consentError.classList.remove('hidden');
      els.btnConsentAccept.disabled = false;
    } finally {
      els.btnConsentDecline.disabled = false;
      els.consentAcceptSpinner.classList.add('hidden');
      els.consentAcceptText.textContent = 'Setuju & Lanjutkan';
      updateConsentAcceptState();
    }
  }

  async function handleConsentDecline() {
    els.btnConsentDecline.disabled = true;
    els.btnConsentAccept.disabled = true;

    try {
      await API.signOut();
      resetToLanding();
      showToast('Persetujuan ditolak. Kamu telah keluar dari akun.', 'info');
    } catch (err) {
      console.error('[N.A.N.A] Consent decline error:', err);
      els.consentError.textContent = `Gagal keluar dari akun: ${err.message}`;
      els.consentError.classList.remove('hidden');
      els.btnConsentDecline.disabled = false;
      updateConsentAcceptState();
    }
  }

  async function handleSaveSettings(event) {
    event.preventDefault();
    showFormError('');

    if (!state.profile?.discordId) {
      showToast('Sesi pengguna tidak valid. Silakan login ulang.', 'error');
      return;
    }

    const validation = Utils.validateReminderInputs(
      els.inputR1.value,
      els.inputR2.value,
      els.inputR3.value
    );

    if (!validation.valid) {
      showFormError(validation.error);
      return;
    }

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
      renderVoiceSessionsAndAnalytics(sessions, true);
      showToast('Data analitik & histori diperbarui.', 'info');
    } catch (err) {
      console.error('[N.A.N.A] Refresh sessions error:', err);
      showToast(`Gagal memuat histori: ${err.message}`, 'error');
    } finally {
      els.btnRefreshSessions.disabled = false;
      els.refreshIcon.classList.remove('animate-spin');
    }
  }

  async function handleConfirmWithdraw() {
    if (!state.profile?.discordId) return;

    els.withdrawError.classList.add('hidden');
    els.btnWithdrawConfirm.disabled = true;
    els.btnWithdrawCancel.disabled = true;
    els.withdrawConfirmSpinner.classList.remove('hidden');
    els.withdrawConfirmText.textContent = 'Menghapus data...';

    try {
      await API.withdrawConsentAndDeleteData(state.profile.discordId);
      await API.signOut();
      resetToLanding();
      showToast(
        'Persetujuan berhasil ditarik dan seluruh riwayat Voice Channel kamu telah dihapus.',
        'info'
      );
    } catch (err) {
      console.error('[N.A.N.A] Withdraw error:', err);
      els.withdrawError.textContent = err.message;
      els.withdrawError.classList.remove('hidden');
    } finally {
      els.btnWithdrawConfirm.disabled = false;
      els.btnWithdrawCancel.disabled = false;
      els.withdrawConfirmSpinner.classList.add('hidden');
      els.withdrawConfirmText.textContent = 'Ya, Hapus Data & Keluar';
    }
  }

  function bindEvents() {
    // Login buttons (Navbar & Hero)
    els.loginButtons.forEach((btn) => {
      btn.addEventListener('click', handleLoginClick);
    });

    // FAQ Accordion
    els.faqItems.forEach((item) => {
      const trigger = item.querySelector('.faq-trigger');
      const content = item.querySelector('.faq-content');
      if (!trigger || !content) return;

      trigger.addEventListener('click', () => {
        const wasOpen = item.classList.contains('is-open');
        // Tutup FAQ lain agar rapi
        els.faqItems.forEach((other) => {
          other.classList.remove('is-open');
          const otherContent = other.querySelector('.faq-content');
          if (otherContent) otherContent.classList.add('hidden');
        });
        if (!wasOpen) {
          item.classList.add('is-open');
          content.classList.remove('hidden');
        }
      });
    });

    // Consent Modal checkboxes & actions (TIDAK bisa ditutup via backdrop/ESC)
    els.consentCheckAge.addEventListener('change', updateConsentAcceptState);
    els.consentCheckAgree.addEventListener('change', updateConsentAcceptState);
    els.btnConsentAccept.addEventListener('click', handleConsentAccept);
    els.btnConsentDecline.addEventListener('click', handleConsentDecline);

    // Dashboard Tabs
    els.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => setActiveTab(btn.dataset.tabTarget));
    });

    // Dashboard Actions
    els.btnLogout.addEventListener('click', handleLogoutClick);
    els.settingsForm.addEventListener('submit', handleSaveSettings);
    els.btnRefreshSessions.addEventListener('click', handleRefreshSessions);

    // Settings Form live preview
    [els.inputR1, els.inputR2, els.inputR3].forEach((input) => {
      input.addEventListener('input', () => {
        updateMinutePreviews();
        showFormError('');
      });
    });
    els.toggleIsActive.addEventListener('change', updateActiveVisualState);

    // Withdraw Confirmation Modal
    els.btnOpenWithdrawModal.addEventListener('click', openWithdrawModal);
    els.btnWithdrawCancel.addEventListener('click', closeWithdrawModal);
    els.btnWithdrawConfirm.addEventListener('click', handleConfirmWithdraw);
    els.withdrawModal.addEventListener('click', (e) => {
      if (e.target === els.withdrawModal && !els.btnWithdrawConfirm.disabled) {
        closeWithdrawModal();
      }
    });

    // Keyboard ESC handler: hanya menutup withdraw modal, TIDAK menutup consent modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (state.isConsentModalOpen) {
          e.preventDefault();
          return;
        }
        if (state.isWithdrawModalOpen && !els.btnWithdrawConfirm.disabled) {
          closeWithdrawModal();
        }
      }
    });
  }

  /* =========================================================
     Bootstrap Application
     ========================================================= */

  async function bootstrap() {
    syncRetentionLabels();
    bindEvents();

    // Cek error dari URL OAuth callback (misal user menekan Cancel di Discord)
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const authErrorDesc = urlParams.get('error_description') || hashParams.get('error_description');

    if (authErrorDesc) {
      els.loginError.textContent = `Login Discord dibatalkan atau gagal: ${authErrorDesc}`;
      els.loginError.classList.remove('hidden');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    try {
      const session = await API.getSession();
      if (session) {
        if (
          window.location.search.includes('code=') ||
          window.location.hash.includes('access_token')
        ) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        await handleAuthenticatedSession(session);
      } else {
        resetToLanding();
      }
    } catch (err) {
      console.error('[N.A.N.A] Init session error:', err);
      resetToLanding();
      els.loginError.textContent = `Gagal memeriksa sesi: ${err.message}`;
      els.loginError.classList.remove('hidden');
    }

    // Subscribe perubahan auth (OAuth redirect callback & logout di tab lain)
    API.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        if (
          window.location.search.includes('code=') ||
          window.location.hash.includes('access_token')
        ) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        await handleAuthenticatedSession(session);
      } else if (event === 'SIGNED_OUT') {
        resetToLanding();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
