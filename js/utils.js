/**
 * N.A.N.A Utility Functions
 * Fungsi bantu untuk formatting waktu, durasi, agregasi analitik, validasi, dan elemen avatar server.
 */
window.NANA = window.NANA || {};

window.NANA.Utils = {
  /**
   * Format durasi dari milidetik menjadi teks mudah dibaca (contoh: "2j 15m", "45m", "30d").
   */
  formatDurationMs(ms) {
    if (!Number.isFinite(ms) || ms < 0) return '0m';

    const totalMinutes = Math.floor(ms / 60000);
    if (totalMinutes < 1) {
      const seconds = Math.floor(ms / 1000);
      return seconds > 0 ? `${seconds}d` : '0m';
    }

    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}h`);
    if (hours > 0) parts.push(`${hours}j`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

    return parts.join(' ');
  },

  /**
   * Format angka menit menjadi teks ringkas (contoh: 95 -> "1j 35m", 45 -> "45m").
   */
  formatMinutesShort(minutes) {
    const val = Math.round(Number(minutes) || 0);
    if (val <= 0) return '0m';
    const hours = Math.floor(val / 60);
    const rem = val % 60;
    if (hours === 0) return `${rem}m`;
    if (rem === 0) return `${hours}j`;
    return `${hours}j ${rem}m`;
  },

  /**
   * Format angka menit untuk preview input reminder (contoh: 60 -> "1 jam", 90 -> "1 jam 30 mnt").
   */
  formatMinutesPreview(minutes) {
    const val = Number(minutes);
    if (!Number.isFinite(val) || val <= 0) return '—';

    const hours = Math.floor(val / 60);
    const rem = val % 60;

    if (hours === 0) return `${rem} mnt`;
    if (rem === 0) return `${hours} jam`;
    return `${hours} jam ${rem} mnt`;
  },

  /**
   * Format ISO timestamp menjadi Tanggal lokal Indonesia (contoh: "26 Nov 2026").
   */
  formatDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  },

  /**
   * Format ISO timestamp menjadi Tanggal & Waktu lengkap (contoh: "26 Nov 2026, 19:30").
   */
  formatDateTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '-';

    const datePart = date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const timePart = date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${datePart}, ${timePart}`;
  },

  /**
   * Format ISO timestamp menjadi Jam lokal (contoh: "21:30").
   */
  formatTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  },

  /**
   * Hitung durasi sesi dalam milidetik.
   * Jika left_at null (masih di VC), hitung dari joined_at sampai waktu sekarang.
   */
  getSessionDurationMs(session) {
    if (!session || !session.joined_at) return 0;
    const start = new Date(session.joined_at).getTime();
    const end = session.left_at ? new Date(session.left_at).getTime() : Date.now();
    if (Number.isNaN(start) || Number.isNaN(end)) return 0;
    return Math.max(0, end - start);
  },

  /**
   * Validasi nilai input Reminder 1, 2, dan 3.
   * Mengembalikan { valid: boolean, error?: string, values?: { r1, r2, r3 } }
   */
  validateReminderInputs(rawR1, rawR2, rawR3) {
    const r1 = Number(rawR1);
    const r2 = Number(rawR2);
    const r3 = Number(rawR3);

    if (
      rawR1 === '' || rawR2 === '' || rawR3 === '' ||
      !Number.isInteger(r1) || !Number.isInteger(r2) || !Number.isInteger(r3)
    ) {
      return {
        valid: false,
        error: 'Semua interval reminder harus diisi dengan bilangan bulat (menit).',
      };
    }

    if (r1 <= 0 || r2 <= 0 || r3 <= 0) {
      return {
        valid: false,
        error: 'Nilai interval reminder tidak boleh kurang dari atau sama dengan 0 menit.',
      };
    }

    if (!(r1 < r2 && r2 < r3)) {
      return {
        valid: false,
        error: 'Interval harus berurutan dari kecil ke besar (Reminder 1 < Reminder 2 < Reminder 3).',
      };
    }

    return {
      valid: true,
      values: { r1, r2, r3 },
    };
  },

  /**
   * Ambil inisial nama untuk fallback avatar.
   */
  getInitials(name) {
    if (!name) return '?';
    const cleaned = String(name).trim();
    if (!cleaned) return '?';
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  },

  /**
   * Nama tampilan server: gunakan guild_name, fallback ke guild_id jika null/kosong.
   */
  getServerDisplayName(session) {
    if (session?.guild_name && String(session.guild_name).trim()) {
      return String(session.guild_name).trim();
    }
    if (session?.guild_id) {
      return String(session.guild_id);
    }
    return 'Server Tidak Diketahui';
  },

  /**
   * Warna deterministik untuk avatar inisial bulat server saat guild_icon_url kosong.
   */
  getAvatarColorClass(seed) {
    const palette = [
      'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'bg-sky-500/20 text-sky-300 border-sky-500/30',
      'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'bg-violet-500/20 text-violet-300 border-violet-500/30',
      'bg-rose-500/20 text-rose-300 border-rose-500/30',
    ];
    const str = String(seed || 'server');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return palette[Math.abs(hash) % palette.length];
  },

  /**
   * Buat elemen DOM ikon server bulat (guild_icon_url atau fallback avatar inisial bulat).
   */
  createServerAvatarElement(name, iconUrl, sizeClass = 'w-7 h-7 text-[10px]') {
    const wrapper = document.createElement('div');
    wrapper.className = `${sizeClass} rounded-full shrink-0 overflow-hidden flex items-center justify-center border ${this.getAvatarColorClass(name)} font-bold select-none`;

    const initials = this.getInitials(name);

    if (iconUrl && String(iconUrl).trim()) {
      const img = document.createElement('img');
      img.src = iconUrl;
      img.alt = name;
      img.className = 'w-full h-full object-cover';
      img.loading = 'lazy';
      img.onerror = () => {
        wrapper.textContent = initials;
      };
      wrapper.appendChild(img);
    } else {
      wrapper.textContent = initials;
    }

    return wrapper;
  },

  /**
   * Kunci tanggal lokal YYYY-MM-DD untuk pengelompokan harian.
   */
  getLocalDateKey(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * Hitung total durasi VC per hari selama 7 hari terakhir (dalam menit).
   */
  buildLast7DaysStats(sessions) {
    const buckets = [];
    const bucketMap = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = this.getLocalDateKey(d);
      const label =
        i === 0
          ? 'Hari ini'
          : d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
      const entry = { key, label, durationMs: 0, minutes: 0 };
      buckets.push(entry);
      bucketMap.set(key, entry);
    }

    for (const s of sessions || []) {
      if (!s.joined_at) continue;
      const joinedDate = new Date(s.joined_at);
      if (Number.isNaN(joinedDate.getTime())) continue;
      const key = this.getLocalDateKey(joinedDate);
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.durationMs += this.getSessionDurationMs(s);
      }
    }

    for (const b of buckets) {
      b.minutes = Math.round((b.durationMs / 60000) * 10) / 10;
    }

    return buckets;
  },

  /**
   * Agregasi total durasi berdasarkan Server (guild_id), urut dari yang terbesar.
   */
  buildServerStats(sessions) {
    const serverMap = new Map();
    let grandTotalMs = 0;

    for (const s of sessions || []) {
      const durationMs = this.getSessionDurationMs(s);
      grandTotalMs += durationMs;

      const guildKey = s.guild_id ? String(s.guild_id) : '__unknown__';
      const displayName = this.getServerDisplayName(s);

      if (!serverMap.has(guildKey)) {
        serverMap.set(guildKey, {
          guildId: guildKey,
          name: displayName,
          iconUrl: s.guild_icon_url || null,
          durationMs: 0,
          sessionCount: 0,
        });
      }

      const item = serverMap.get(guildKey);
      item.durationMs += durationMs;
      item.sessionCount += 1;

      // Perbarui nama & ikon jika sebelumnya masih fallback/null dan data baru lebih lengkap
      if (s.guild_name && String(s.guild_name).trim() && item.name === item.guildId) {
        item.name = String(s.guild_name).trim();
      }
      if (!item.iconUrl && s.guild_icon_url) {
        item.iconUrl = s.guild_icon_url;
      }
    }

    const list = Array.from(serverMap.values())
      .sort((a, b) => b.durationMs - a.durationMs)
      .map((item) => ({
        ...item,
        minutes: Math.round((item.durationMs / 60000) * 10) / 10,
        percentage: grandTotalMs > 0 ? Math.round((item.durationMs / grandTotalMs) * 100) : 0,
      }));

    return {
      servers: list,
      grandTotalMs,
    };
  },
};
