const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'mockup_antarmuka_sistem.html');
let content = fs.readFileSync(filePath, 'utf8');

// Replace script section
const oldScript = `    function simulateStudentSubmit() {
      document.getElementById('student-form-state').classList.add('hidden');
      document.getElementById('student-tracker-state').classList.remove('hidden');
    }`;

const newScript = `    const API_BASE = window.location.protocol.startsWith('http') ? '' : 'http://localhost:3000';
    let isApiConnected = false;

    async function checkApiConnection() {
      try {
        const res = await fetch(\`\${API_BASE}/api/health\`);
        if (res.ok) {
          isApiConnected = true;
          console.log('[API] Terhubung ke Backend REST API!');
          loadNocData();
        }
      } catch (e) {
        console.log('[API] Mode prototipe offline/standalone.');
      }
    }

    async function loadNocData() {
      try {
        const res = await fetch(\`\${API_BASE}/api/tickets\`);
        const json = await res.json();
        if (json.success && json.data) {
          renderNocTickets(json.data);
        }
      } catch (err) {
        console.warn('Gagal memuat tiket dari API:', err);
      }
    }

    function renderNocTickets(tickets) {
      const container = document.getElementById('noc-tickets-container');
      if (!container || !tickets.length) return;
      container.innerHTML = '';
      tickets.forEach(t => {
        const isCritical = t.prioritas === 'P1-CRITICAL';
        const card = document.createElement('div');
        card.className = \`p-3 rounded-xl border \${isCritical ? 'border-amber-200 bg-amber-50/60 hover:bg-amber-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'} transition cursor-pointer\`;
        card.innerHTML = \`
          <div class="flex justify-between items-start">
            <span class="text-[11px] font-mono font-bold \${isCritical ? 'text-amber-900' : 'text-slate-700'}">#\${t.no_tiket}</span>
            <span class="px-1.5 py-0.5 rounded \${isCritical ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'} text-[9px] font-bold">\${t.prioritas}</span>
          </div>
          <p class="text-xs font-bold text-slate-800 mt-1">\${t.nama_pelapor || 'Mahasiswa'} (NIM \${t.user_id})</p>
          <p class="text-[11px] text-slate-500">\${t.nama_ruangan || t.id_ruangan} • \${t.gejala_gangguan}</p>
        \`;
        container.appendChild(card);
      });
    }

    async function simulateStudentSubmit() {
      const nim = document.getElementById('stu-nim')?.value || '230401089';
      const name = document.getElementById('stu-name')?.value || 'Budi Pratama';
      const room = document.getElementById('stu-room')?.value || 'Lab Komputer 3';
      const symptom = document.getElementById('stu-symptom')?.value || 'Koneksi Terputus saat Submit Tugas di LMS';

      let ticketNo = '#TKT-WIFI-202611-0042';

      if (isApiConnected) {
        try {
          const payload = {
            userId: nim,
            namaPelapor: name,
            idRuangan: 'GD-B-LT2-LAB03',
            mataKuliah: 'Jaringan Komputer Lanjut',
            dosenPengampu: 'Dr. Eng. Wahyu Pratama, M.Kom.',
            gejalaGangguan: symptom,
            isEmergencyDeadline: true
          };
          const res = await fetch(\`\${API_BASE}/api/tickets\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          if (json.success && json.data) {
            ticketNo = '#' + json.data.no_tiket;
            simulateToast(json.message);
            loadNocData();
          }
        } catch (e) {
          console.warn('Gagal POST tiket:', e);
        }
      }

      const idEl = document.getElementById('stu-tracker-ticket-id');
      if (idEl) idEl.innerText = ticketNo;

      const locEl = document.getElementById('stu-tracker-location');
      if (locEl) locEl.innerText = \`Lokasi: Gedung B - \${room}\`;

      document.getElementById('student-form-state').classList.add('hidden');
      document.getElementById('student-tracker-state').classList.remove('hidden');
    }`;

// Normalize to \r\n
const normalizedOld = oldScript.replace(/\r?\n/g, '\r\n');
const normalizedNew = newScript.replace(/\r?\n/g, '\r\n');

if (content.includes(normalizedOld)) {
    content = content.replace(normalizedOld, normalizedNew);
    // Also add auto checkApiConnection
    content = content.replace(
        '</script>'.replace(/\r?\n/g, '\r\n'),
        '    window.addEventListener("DOMContentLoaded", checkApiConnection);\r\n  </script>'
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully updated mockup_antarmuka_sistem.html with API integration!');
} else {
    console.log('Could not find oldScript in content');
}

