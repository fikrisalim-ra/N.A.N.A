/**
 * N.A.N.A Analytics Charts Module (Chart.js v4)
 * Merender grafik Bar (7 hari terakhir) dan Doughnut (distribusi per Server).
 */
window.NANA = window.NANA || {};

(function initChartsModule() {
  const { Utils } = window.NANA;

  let weeklyChartInstance = null;
  let serverChartInstance = null;

  const SERVER_COLORS = [
    '#5865F2', // Discord Blurple
    '#10B981', // Emerald
    '#38BDF8', // Sky
    '#F59E0B', // Amber
    '#A855F7', // Purple
    '#F43F5E', // Rose
    '#14B8A6', // Teal
    '#64748B', // Slate
  ];

  window.NANA.Charts = {
    getServerColor(index) {
      return SERVER_COLORS[index % SERVER_COLORS.length];
    },

    /**
     * Render atau perbarui Bar Chart durasi VC 7 hari terakhir.
     */
    renderWeeklyBarChart(canvasEl, weeklyBuckets, animate = true) {
      if (!canvasEl || typeof window.Chart === 'undefined') return;

      const labels = weeklyBuckets.map((b) => b.label);
      const dataMinutes = weeklyBuckets.map((b) => b.minutes);

      if (weeklyChartInstance) {
        weeklyChartInstance.data.labels = labels;
        weeklyChartInstance.data.datasets[0].data = dataMinutes;
        weeklyChartInstance.update(animate ? undefined : 'none');
        return;
      }

      const ctx = canvasEl.getContext('2d');
      weeklyChartInstance = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Durasi VC',
              data: dataMinutes,
              backgroundColor: 'rgba(88, 101, 242, 0.78)',
              hoverBackgroundColor: '#5865F2',
              borderColor: '#818CF8',
              borderWidth: 1,
              borderRadius: 8,
              borderSkipped: false,
              maxBarThickness: 38,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: animate ? { duration: 450 } : false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0F172A',
              titleColor: '#F8FAFC',
              bodyColor: '#CBD5E1',
              borderColor: '#334155',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 10,
              displayColors: false,
              callbacks: {
                label(context) {
                  const mins = context.parsed.y || 0;
                  return `Durasi: ${Utils.formatMinutesShort(mins)} (${Math.round(mins)} menit)`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                color: '#94A3B8',
                font: { family: '"Plus Jakarta Sans", sans-serif', size: 11 },
              },
            },
            y: {
              beginAtZero: true,
              suggestedMax: 60,
              grid: { color: 'rgba(148, 163, 184, 0.1)' },
              border: { display: false },
              ticks: {
                color: '#94A3B8',
                font: { family: '"JetBrains Mono", monospace', size: 11 },
                callback(value) {
                  return Utils.formatMinutesShort(value);
                },
              },
            },
          },
        },
      });
    },

    /**
     * Render atau perbarui Doughnut Chart distribusi durasi per Server.
     */
    renderServerDoughnutChart(canvasEl, servers, animate = true) {
      if (!canvasEl || typeof window.Chart === 'undefined') return;

      // Gabungkan server ke-6 dst ke dalam "Lainnya" agar chart tetap rapi
      const MAX_SLICES = 5;
      let chartItems = servers.slice(0, MAX_SLICES);
      if (servers.length > MAX_SLICES) {
        const othersMs = servers
          .slice(MAX_SLICES)
          .reduce((acc, item) => acc + item.durationMs, 0);
        chartItems.push({
          name: 'Server Lainnya',
          minutes: Math.round((othersMs / 60000) * 10) / 10,
          durationMs: othersMs,
        });
      }

      const labels = chartItems.map((item) => item.name);
      const dataMinutes = chartItems.map((item) => Math.max(item.minutes, 0.1));
      const bgColors = chartItems.map((_, idx) => this.getServerColor(idx));

      if (serverChartInstance) {
        serverChartInstance.data.labels = labels;
        serverChartInstance.data.datasets[0].data = dataMinutes;
        serverChartInstance.data.datasets[0].backgroundColor = bgColors;
        serverChartInstance.update(animate ? undefined : 'none');
        return;
      }

      const ctx = canvasEl.getContext('2d');
      serverChartInstance = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: dataMinutes,
              backgroundColor: bgColors,
              borderColor: '#111827',
              borderWidth: 2,
              hoverOffset: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '66%',
          animation: animate ? { duration: 450 } : false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0F172A',
              titleColor: '#F8FAFC',
              bodyColor: '#CBD5E1',
              borderColor: '#334155',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 10,
              callbacks: {
                label(context) {
                  const rawItem = chartItems[context.dataIndex];
                  const labelText = rawItem
                    ? Utils.formatDurationMs(rawItem.durationMs)
                    : Utils.formatMinutesShort(context.parsed);
                  return ` ${context.label}: ${labelText}`;
                },
              },
            },
          },
        },
      });
    },

    resizeAll() {
      if (weeklyChartInstance) weeklyChartInstance.resize();
      if (serverChartInstance) serverChartInstance.resize();
    },

    destroyAll() {
      if (weeklyChartInstance) {
        weeklyChartInstance.destroy();
        weeklyChartInstance = null;
      }
      if (serverChartInstance) {
        serverChartInstance.destroy();
        serverChartInstance = null;
      }
    },
  };
})();
