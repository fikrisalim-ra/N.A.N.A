/**
 * N.A.N.A Utility Functions
 * Kumpulan fungsi bantu untuk formatting waktu, durasi, validasi, dan keamanan teks.
 */
window.NANA = window.NANA || {};

window.NANA.Utils = {
  /**
   * Format durasi dari milidetik menjadi teks mudah dibaca (contoh: "2j 15m", "45m", "< 1m").
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
   * Format ISO timestamp menjadi Tanggal lokal Indonesia (contoh: "22 Nov 2026").
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
   * Ambil inisial nama untuk fallback avatar jika Discord avatar tidak tersedia.
   */
  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  },
};
