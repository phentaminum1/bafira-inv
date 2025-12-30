/***************************
 * KONFIGURASI SUPABASE
 ***************************/
const SUPABASE_URL = "https://mqcldxsfpfwbwwuopvqd.supabase.co";
const SUPABASE_KEY = "sb_publishable_IL4PW6jnGgT2NrpFVWofqQ_y3MKnU_Y";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/***************************
 * PWA + NOTIFICATION
 ***************************/

async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

requestNotificationPermission();

/***************************
 * UTIL
 ***************************/
function generateUUID() {
  return crypto.randomUUID();
}

/***************************
 * STATE
 ***************************/
let keranjang = [];
let keranjangMasuk = [];

/***************************
 * ROUTER (SPA)
 ***************************/
function go(menu) {
  const app = document.getElementById("app");
  app.innerHTML = "⏳ Memuat...";

  switch (menu) {
    case "barang": showBarang(); break;
    case "baku": showStok("BahanBaku"); break;
    case "penunjang": showStok("BahanPenunjang"); break;
    case "masuk": showStokMasuk(); break;
    case "pakai": showPakaiStok(); break;
    case "minimum": showNotifikasiStok(); break;
    case "riwayat": showRiwayatProduksi(); break;
    default: app.innerHTML = "<p>Menu tidak ditemukan</p>";
  }
}

/***************************
 * VIEW STOK
 ***************************/
async function showStok(kategori) {
  const app = document.getElementById("app");
  app.innerHTML = "⏳ Memuat data...";

  const { data, error } = await supabaseClient
    .from("barang")
    .select("nama,satuan,stok,stok_min")
    .eq("kategori", kategori)
    .order("nama");

  if (error) {
    app.innerHTML = "❌ " + error.message;
    return;
  }

  let html = `
    <div class="card">
      <h2>Stok ${kategori}</h2>
      <table>
        <tr>
          <th>Nama</th>
          <th>Satuan</th>
          <th>Stok</th>
        </tr>
  `;

  data.forEach(b => {
    const danger = b.stok < b.stok_min ? "tr-danger" : "";

    html += `
      <tr class="${danger}">
        <td>${b.nama}</td>
        <td>${b.satuan}</td>
        <td>${b.stok}</td>
      </tr>
    `;
  });

  html += `
      </table>
      <small style="color:#B23A2E">
        🔴 Baris merah = stok di bawah minimum
      </small>
    </div>
  `;

  app.innerHTML = html;
}

/***************************
 * STOK MASUK (MULTI)
 ***************************/
async function showStokMasuk() {
  keranjangMasuk = [];

  const { data } = await supabaseClient
    .from("barang")
    .select("id,nama")
    .order("nama");

  document.getElementById("app").innerHTML = `
    <div class="card">
      <h2>Stok Masuk</h2>

      <select id="barangMasuk">
        ${data.map(b => `<option value="${b.id}">${b.nama}</option>`).join("")}
      </select>

      <input type="number" id="jumlahMasuk" placeholder="Jumlah">
      <button onclick="tambahMasuk()">Tambah</button>

      <div id="listMasuk"></div>

      <input id="keteranganMasuk" placeholder="Contoh: Pembelian supplier">
      <button onclick="submitStokMasukBanyak()">Simpan Semua</button>
    </div>
  `;
}

function tambahMasuk() {
  keranjangMasuk.push({
    id: barangMasuk.value,
    nama: barangMasuk.selectedOptions[0].text,
    jumlah: Number(jumlahMasuk.value)
  });

  listMasuk.innerHTML =
    "<ul>" + keranjangMasuk.map(i => `<li>${i.nama} — ${i.jumlah}</li>`).join("") + "</ul>";
}

async function submitStokMasukBanyak() {
  const batchId = generateUUID();
  const ket = keteranganMasuk.value;

  for (const i of keranjangMasuk) {
    await supabaseClient.rpc("stok_masuk", {
      p_id: i.id,
      p_jumlah: i.jumlah,
      p_keterangan: ket,
      p_batch_id: batchId
    });
  }

  alert("✅ Stok masuk tersimpan");
  go("baku");
}

/***************************
 * PAKAI STOK
 ***************************/
async function showPakaiStok() {
  keranjang = [];

  const { data } = await supabaseClient
    .from("barang")
    .select("id,nama,kategori")
    .order("kategori")
    .order("nama");

  document.getElementById("app").innerHTML = `
    <div class="card">
      <h2>Pakai Stok</h2>

      <select id="barang">
        ${data.map(b => `<option value="${b.id}">[${b.kategori}] ${b.nama}</option>`).join("")}
      </select>

      <input type="number" id="jumlah" placeholder="Jumlah">
      <button onclick="tambahKeKeranjang()">Tambah</button>

      <div id="list"></div>
      <input id="keterangan" placeholder="Contoh: Produksi tepung">
      <button onclick="submitPakaiStok()">Simpan Produksi</button>
    </div>
  `;
}

function tambahKeKeranjang() {
  keranjang.push({
    id: barang.value,
    nama: barang.selectedOptions[0].text,
    jumlah: Number(jumlah.value)
  });

  list.innerHTML =
    "<ul>" + keranjang.map(i => `<li>${i.nama} — ${i.jumlah}</li>`).join("") + "</ul>";
}

async function submitPakaiStok() {
  const batchId = generateUUID();

  for (const i of keranjang) {
    await supabaseClient.rpc("pakai_stok", {
      p_id: i.id,
      p_jumlah: i.jumlah,
      p_keterangan: keterangan.value,
      p_batch_id: batchId
    });
  }

  alert("✅ Produksi tersimpan");
  go("riwayat");
}

/***************************
 * STOK MINIMUM + PUSH
 ***************************/
async function cekStokMinimumDanPush() {
  const { data } = await supabaseClient.rpc("stok_di_bawah_minimum");

  if (!data || data.length === 0) return;

  if (Notification.permission === "granted") {
    new Notification("⚠ Stok Minimum", {
      body: data.map(b => b.nama).join(", "),
      icon: "icon-192.png"
    });
  }
}

cekStokMinimumDanPush();

/***************************
 * RIWAYAT PRODUKSI
 ***************************/
async function showRiwayatProduksi() {
  const app = document.getElementById("app");

  const { data } = await supabaseClient
    .from("stok_log")
    .select("batch_id,keterangan,tanggal")
    .eq("tipe", "KELUAR")
    .order("tanggal", { ascending: false });

  const uniq = {};
  data.forEach(r => uniq[r.batch_id] ??= r);

  app.innerHTML = `<h2>Riwayat Produksi</h2>` +
    Object.values(uniq).map(r => `
      <div class="batch-card" onclick="toggleDetail('${r.batch_id}')">
        <strong>${r.keterangan}</strong><br>
        <small>${new Date(r.tanggal).toLocaleDateString()}</small>
      </div>
      <div id="detail-${r.batch_id}" class="batch-detail" style="display:none"></div>
    `).join("");
}

async function toggleDetail(batchId) {
  const el = document.getElementById("detail-" + batchId);
  el.style.display = el.style.display === "block" ? "none" : "block";

  const { data } = await supabaseClient
    .from("stok_log")
    .select("qty, barang:barang_id(nama,satuan)")
    .eq("batch_id", batchId);

  el.innerHTML =
    "<ul>" + data.map(d => `<li>${d.barang.nama} — ${d.qty} ${d.barang.satuan}</li>`).join("") + "</ul>";
}

let cacheBarang = [];

async function showBarang() {
  const app = document.getElementById("app");
  app.innerHTML = "⏳ Memuat data...";

  const { data, error } = await supabaseClient
    .from("barang")
    .select("id,nama,kategori,satuan,stok_min")
    .order("nama");

  if (error) {
    app.innerHTML = "❌ " + error.message;
    return;
  }

  cacheBarang = data;

  app.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2>Data Barang</h2>
        <input
          id="searchBarang"
          type="text"
          placeholder="🔍 Cari barang..."
          style="padding:6px; width:200px;"
        >
      </div>

      <button onclick="formTambahBarang()">➕ Tambah Barang</button>

      <table>
        <thead>
          <tr>
            <th>Nama</th>
            <th>Kategori</th>
            <th>Satuan</th>
            <th>Stok Min</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody id="tabelBarang"></tbody>
      </table>
    </div>
  `;

  document
    .getElementById("searchBarang")
    .addEventListener("input", e => {
      filterBarang(e.target.value);
    });

  renderBarisBarang(cacheBarang);
}

function formTambahBarang() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="card">
      <h2>Tambah Barang</h2>

      <input id="nama" placeholder="Nama Barang">
      <select id="kategori">
        <option>BahanBaku</option>
        <option>BahanPenunjang</option>
      </select>
      <input id="satuan" placeholder="Satuan (kg, pcs, dll)">
      <input id="stok_min" type="number" placeholder="Stok Minimum">

      <button onclick="simpanBarang()">💾 Simpan</button>
      <button onclick="go('barang')">❌ Batal</button>
    </div>
  `;
}

async function simpanBarang() {
  const nama = document.getElementById("nama").value;
  const kategori = document.getElementById("kategori").value;
  const satuan = document.getElementById("satuan").value;
  const stok_min = Number(document.getElementById("stok_min").value);

  if (!nama || !satuan) {
    alert("❌ Data belum lengkap");
    return;
  }

  const ok = confirm(
    `Simpan barang baru?\n\nNama: ${nama}`
  );
  if (!ok) return;

  const { error } = await supabaseClient
    .from("barang")
    .insert([{
      id: crypto.randomUUID(),
      nama,
      kategori,
      satuan,
      stok: 0,
      stok_min
    }]);

  if (error) {
    alert("❌ " + error.message);
    return;
  }

  alert("✅ Barang berhasil ditambahkan");
  showBarang();
}

async function formEditBarang(id) {
  const { data, error } = await supabaseClient
    .from("barang")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="card">
      <h2>Edit Barang</h2>

      <input id="nama" value="${data.nama}">
      <input id="satuan" value="${data.satuan}">
      <input id="stok_min" type="number" value="${data.stok_min}">

      <button onclick="updateBarang('${id}')">💾 Simpan</button>
      <button onclick="showBarang()">❌ Batal</button>
    </div>
  `;
}

async function updateBarang(id) {
  const nama = document.getElementById("nama").value;
  const satuan = document.getElementById("satuan").value;
  const stok_min = Number(document.getElementById("stok_min").value);

  const ok = confirm("Simpan perubahan barang?");
  if (!ok) return;

  const { error } = await supabaseClient
    .from("barang")
    .update({
      nama,
      satuan,
      stok_min
    })
    .eq("id", id);

  if (error) {
    alert("❌ " + error.message);
    return;
  }

  alert("✅ Barang berhasil diperbarui");
  showBarang();
}

async function hapusBarang(id, nama) {
  const ok = confirm(
    `⚠️ HAPUS BARANG\n\n${nama}\n\nData tidak bisa dikembalikan`
  );
  if (!ok) return;

  const { error } = await supabaseClient
    .from("barang")
    .delete()
    .eq("id", id);

  if (error) {
    alert("❌ " + error.message);
    return;
  }

  alert("✅ Barang dihapus");
  showBarang();
}

function renderTabelBarang(data) {
  const app = document.getElementById("app");

  let html = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2>Data Barang</h2>

        <input 
          type="text"
          placeholder="🔍 Cari barang..."
          oninput="filterBarang(this.value)"
          style="padding:6px; width:200px;"
        >
      </div>

      <button onclick="formTambahBarang()">➕ Tambah Barang</button>

      <table>
        <tr>
          <th>Nama</th>
          <th>Kategori</th>
          <th>Satuan</th>
          <th>Stok Min</th>
          <th>Aksi</th>
        </tr>
  `;

  data.forEach(b => {
    html += `
      <tr>
        <td>${b.nama}</td>
        <td>${b.kategori}</td>
        <td>${b.satuan}</td>
        <td>${b.stok_min}</td>
        <td>
          <button onclick="formEditBarang('${b.id}')">✏</button>
          <button onclick="hapusBarang('${b.id}','${b.nama}')">🗑</button>
        </td>
      </tr>
    `;
  });

  html += `
      </table>
    </div>
  `;

  app.innerHTML = html;
}

function filterBarang(keyword) {
  const key = keyword.toLowerCase();

  const hasil = cacheBarang.filter(b =>
    b.nama.toLowerCase().includes(key) ||
    b.kategori.toLowerCase().includes(key) ||
    b.satuan.toLowerCase().includes(key)
  );

  renderBarisBarang(hasil);
}

function renderBarisBarang(data) {
  const tbody = document.getElementById("tabelBarang");

  tbody.innerHTML = data.map(b => `
    <tr>
      <td>${b.nama}</td>
      <td>${b.kategori}</td>
      <td>${b.satuan}</td>
      <td>${b.stok_min}</td>
      <td>
        <button onclick="formEditBarang('${b.id}')">✏</button>
        <button onclick="hapusBarang('${b.id}','${b.nama}')">🗑</button>
      </td>
    </tr>
  `).join("");
}

async function initFCM() {
  try {
    const permission = await Notification.requestPermission();
    console.log("Notification permission:", permission);

    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    console.log("ServiceWorker ready:", registration);

    const token = await messaging.getToken({
      vapidKey: "BDF5EBnh34T5afTxCxmdQS8Tljk3ZjdIr07keapbbsXDdJ1ngJvV8Sxt2S99cmLnB0ZwAgxlo-4NguOTivolMyc",
      serviceWorkerRegistration: registration
    });

    console.log("FCM TOKEN RESULT:", token);

    if (!token) {
      console.warn("⚠️ Token null / undefined");
      return;
    }

    const { error } = await supabaseClient
      .from("fcm_tokens")
      .upsert({ token }, { onConflict: "token" });

    if (error) {
      console.error("❌ Supabase error:", error);
      return;
    }

    console.log("✅ FCM token tersimpan ke Supabase");
  } catch (err) {
    console.error("❌ initFCM error:", err);
  }
}

window.addEventListener("load", () => {
  initFCM();
});








