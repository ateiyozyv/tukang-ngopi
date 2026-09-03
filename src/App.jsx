import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Coffee,
  Target,
  FlaskConical,
  Settings,
  ChevronLeft,
  Plus,
  X,
  Trash2,
  Pencil,
  Bean as BeanIcon,
  Cog,
  Cpu,
  ClipboardList,
  Check,
  PackageX,
  PackageCheck,
  ChevronDown,
  History,
  Filter,
  UploadCloud,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');`;

const STORAGE_KEY = "coffee-db";

const emptyDB = { beans: [], grinders: [], machines: [], recipes: [], brews: [], roughGuessLog: [] };

// Seed data dari Coffee_Dial_In_Database_v4_seed.json — dipakai sebagai isi awal
// hanya jika database masih kosong (belum pernah diisi sebelumnya).
const SEED_DATA = {
  beans: [
    {
      id: "bean-rf",
      name: "RF - Robusta Fermentasi",
      origin: "",
      process: "Fermentasi",
      roast: "Medium",
      roastColor: 50,
      roastDate: "",
      density: "0.44",
      notes: "Tipe: Robusta. Benchmark favorit",
    },
    {
      id: "bean-adf",
      name: "ADF - Arabika Dampit Fermentasi",
      origin: "Dampit",
      process: "Fermentasi",
      roast: "",
      roastColor: 87,
      roastDate: "",
      density: "0.376",
      notes: "Tipe: Arabika. Data dial-in awal",
    },
    {
      id: "bean-adnf",
      name: "ADNF - Arabika Dampit Non-Fermentasi",
      origin: "Dampit",
      process: "Non-fermentasi",
      roast: "Medium-Dark",
      roastColor: 75,
      roastDate: "",
      density: "0.42",
      notes: "Tipe: Arabika. Balance pada Breville",
    },
    {
      id: "bean-turki",
      name: "Kopi Turki",
      origin: "",
      process: "",
      roast: "Light",
      roastColor: 0,
      roastDate: "",
      density: "0.40",
      notes: "Bridge dataset grinder",
    },
    {
      id: "bean-shaka",
      name: "Shaka Blend",
      origin: "",
      process: "",
      roast: "",
      roastColor: 98,
      roastDate: "",
      density: "0.30",
      notes: "Histori percobaan",
    },
    {
      id: "bean-jagung",
      name: "Kopi Jagung",
      origin: "",
      process: "",
      roast: "Dark",
      roastColor: 100,
      roastDate: "",
      density: "0.55",
      notes: "Tipe: Jagung sangrai. Eksperimen material non-kopi",
    },
    {
      id: "bean-robusta-biji-kecil",
      name: "Robusta Biji Kecil",
      origin: "",
      process: "",
      roast: "Dark",
      roastColor: 100,
      roastDate: "",
      density: "0.37",
      notes: "Biji kecil, dark roast",
    },
  ],
  grinders: [
    {
      id: "grinder-k64s",
      name: "K64S",
      burrType: "Flat",
      burrSize: "64",
      stepSize: "0.25",
      restrictedToMachineId: "",
      notes: "",
    },
    {
      id: "grinder-breville-built-in",
      name: "Breville Built-in",
      burrType: "Conical",
      burrSize: "",
      stepSize: "Step",
      restrictedToMachineId: "machine-breville",
      notes: "Inner burr kalibrasi: 4",
    },
  ],
  machines: [
    {
      id: "machine-breville",
      name: "Breville",
      type: "",
      notes: "Profile awal",
    },
  ],
  recipes: [
    {
      id: "recipe-rf-k64s",
      beanId: "bean-rf",
      grinderId: "grinder-k64s",
      machineId: "machine-breville",
      setting: "1.25",
      dose: "18",
      yield: "37.8",
      time: "27",
      taste: "",
      status: "Verified",
      isDefault: true,
      notes: "",
    },
    {
      id: "recipe-adnf-breville",
      beanId: "bean-adnf",
      grinderId: "grinder-breville-built-in",
      machineId: "machine-breville",
      setting: "8",
      dose: "18",
      yield: "41.5",
      time: "28",
      taste: "Balance",
      status: "Verified",
      isDefault: true,
      notes: "",
    },
    {
      id: "recipe-jagung-k64s",
      beanId: "bean-jagung",
      grinderId: "grinder-k64s",
      machineId: "machine-breville",
      setting: "7",
      dose: "18",
      yield: "22.6",
      time: "23",
      taste: "",
      status: "Experiment",
      isDefault: false,
      notes: "Puck lumpur lengket",
    },
  ],
  brews: [],
  roughGuessLog: [],
};

// Sebagian grinder cuma cocok dipakai di satu mesin tertentu (mis. grinder
// built-in yang nempel fisik di satu mesin espresso). Kalau restrictedToMachineId
// kosong, grinder itu dianggap "all-round" — cocok ke mesin mana pun (termasuk
// yang ditambahkan belakangan).
function compatibleMachines(db, grinder) {
  if (!grinder) return db.machines;
  if (!grinder.restrictedToMachineId) return db.machines;
  return db.machines.filter((m) => m.id === grinder.restrictedToMachineId);
}

// Beda dari findBestRecipe (yang prioritasin default/rating buat SARAN
// setting), ini khusus buat kartu "Percobaan Terakhir" — ambil yang
// TANGGALNYA paling baru, apa pun status default/rating-nya, dan nggak
// dibatasi jenis shot (biar nunjukin histori beneran, bukan yang "terbaik").
function findLatestRecipe(db, beanId, grinderId, machineId) {
  const matches = db.recipes.filter(
    (r) => r.beanId === beanId && r.grinderId === grinderId && r.machineId === machineId
  );
  if (matches.length === 0) return null;
  return matches.reduce((latest, r) =>
    new Date(r.date || 0).getTime() > new Date(latest.date || 0).getTime() ? r : latest
  );
}

function findBestRecipe(db, beanId, grinderId, machineId, shotType) {
  const pool = db.recipes.filter((r) => r.beanId === beanId && r.grinderId === grinderId);
  // Kalau machineId dikasih, wajib cocok persis mesinnya — jangan asal ambil
  // recipe dari mesin lain cuma karena bean+grinder-nya sama.
  let matches = machineId ? pool.filter((r) => r.machineId === machineId) : pool;
  // Kalau shotType dikasih, cocokkan juga jenis shot-nya (recipe lama tanpa
  // field ini dianggap "Espresso", biar data historis tetap kebaca).
  if (shotType) matches = matches.filter((r) => (r.shotType || "Espresso") === shotType);
  if (matches.length === 0) return null;
  const marked = matches.find((r) => r.isDefault);
  if (marked) return marked;
  const rated = matches.filter((r) => r.rating);
  if (rated.length > 0) {
    return rated.reduce((best, r) =>
      Number(r.rating) > Number(best.rating) ? r : best
    );
  }
  // fallback: belum ada rating/default — pakai yang terakhir ditambahkan
  return matches[matches.length - 1];
}

// Perkiraan geser step grinder per jenis shot, relatif ke setting Espresso
// biasa — dipakai kalau belum ada data asli buat jenis shot itu.
const SHOT_TYPE_STEP_OFFSET = {
  Ristretto: -1,
  Espresso: 0,
  Lungo: 0,
  "Turbo Shot": 3,
  Lainnya: 0,
};

// Tahap 3: cari rasio konversi setting antar dua grinder, berdasarkan bean
// yang kebetulan sudah punya recipe terbaik di KEDUA grinder itu ("bridge").
function findBridgeRatio(db, grinderAId, grinderBId) {
  const ratios = [];
  db.beans.forEach((bean) => {
    const rA = findBestRecipe(db, bean.id, grinderAId);
    const rB = findBestRecipe(db, bean.id, grinderBId);
    if (rA && rB) {
      const a = parseFloat(rA.setting);
      const b = parseFloat(rB.setting);
      if (!isNaN(a) && !isNaN(b) && a !== 0) ratios.push(b / a);
    }
  });
  if (ratios.length === 0) return null;
  const avg = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  return { ratio: avg, sampleCount: ratios.length };
}

// Tahap 2: kalau bean X belum pernah dicoba di grinder target, tapi pernah
// dicoba di grinder lain yang punya data bridge ke grinder target — prediksi
// settingnya lewat rasio itu. Selalu ditandai sebagai prediksi, bukan fakta.
// Bulatkan hasil prediksi ke step yang sungguhan bisa diputar di grinder
// (mis. K64S cuma bisa 0,25-an — 1,65 itu nggak ada di dunia nyata).
function roundToStep(value, grinder) {
  const step = parseFloat(grinder?.stepSize);
  if (!isNaN(step) && step > 0) {
    return Math.round(value / step) * step;
  }
  // stepSize bukan angka (mis. "Step" di Breville) — asumsikan step bulat
  return Math.round(value);
}

// Kalibrasi dari data pengguna: dose lebih kecil butuh grind lebih halus
// buat jaga waktu ekstraksi target, dose lebih besar butuh lebih kasar.
// Dihitung dari 2 pasangan data independen di grinder berbeda — keduanya
// konsisten di angka yang sama meski step-size grinder beda jauh:
// K64S: Robusta Fer 18g → setting 1,5 vs 10g → setting 1,0 (selisih 2 step
//   K64S @0,25 untuk selisih 8g)
// Breville: ADF Winey 18g → setting 4 vs (re-roast) 10g → setting 2
//   (selisih 2 step Breville @1 untuk selisih 8g juga)
// Keduanya = 0,25 "step grinder" per 4 gram dose → 0,0625 step per gram.
const DOSE_STEP_PER_GRAM = 0.0625; // dalam satuan step grinder, per gram dose

// Geser setting berdasarkan selisih dose dari dose asal recipe (baseDose)
// ke target dose yang diminta. Return null kalau salah satu dose nggak
// valid/nggak beda, biar caller tau nggak perlu nampilin penyesuaian.
function doseAdjustSetting(baseSetting, baseDose, targetDose, grinder) {
  if (baseDose == null || isNaN(baseDose) || targetDose == null || isNaN(targetDose)) return null;
  if (Math.abs(baseDose - targetDose) < 0.5) return null;
  const step = parseFloat(grinder?.stepSize) || 1;
  const gramDiff = targetDose - baseDose;
  const numericShift = gramDiff * DOSE_STEP_PER_GRAM * step;
  const raw = baseSetting + numericShift;
  return Math.round(roundToStep(raw, grinder) * 100) / 100;
}

// Dose nominal per pilihan ukuran di layar Bikin Kopi — dipakai buat
// menyesuaikan setting prediksi kalau data recipe yang ada dosenya beda.
const NOMINAL_DOSE_BY_SIZE = { single: 10, double: 18 };

// Ukuran seduhan: single/double punya dose nominal tetap, "lain" pakai
// angka custom yang diketik user. Dipakai di Bikin Kopi maupun Dial-In.
function resolveTargetDose(size, customDose) {
  if (size === "single") return NOMINAL_DOSE_BY_SIZE.single;
  if (size === "double") return NOMINAL_DOSE_BY_SIZE.double;
  if (size === "lain") {
    const v = parseFloat(customDose);
    return isNaN(v) ? null : v;
  }
  return null;
}

// Komponen pilihan Ukuran dipakai bareng di Bikin Kopi & Dial-In — 3 opsi:
// Single (10g), Double (18g), atau Ukuran lain (custom, muncul input angka).
function SizePicker({ size, setSize, customDose, setCustomDose, onContinue }) {
  return (
    <div className="px-5">
      <div className="grid grid-cols-3 gap-2.5">
        {["single", "double", "lain"].map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className="rounded-2xl py-5 px-2 text-sm text-center"
            style={{
              backgroundColor: size === s ? "#C69163" : "#F7F3EE",
              color: size === s ? "#332C2A" : "#2A2118",
              border: `1px solid ${size === s ? "#C69163" : "#DDD6CE"}`,
              fontWeight: 600,
            }}
          >
            {s === "single" ? `Single\n~${NOMINAL_DOSE_BY_SIZE.single}g` : s === "double" ? `Double\n~${NOMINAL_DOSE_BY_SIZE.double}g` : "Ukuran lain"}
          </button>
        ))}
      </div>

      {size === "lain" && (
        <div className="mt-4">
          <Field label="Dose target (g)">
            <input
              className={inputCls} style={inputStyle}
              placeholder="cth. 14"
              inputMode="decimal"
              value={customDose}
              onChange={(e) => setCustomDose(e.target.value)}
            />
          </Field>
        </div>
      )}

      <button
        onClick={onContinue}
        disabled={!size || (size === "lain" && !customDose.trim())}
        className="w-full mt-6 rounded-2xl py-4 text-sm font-semibold"
        style={{
          backgroundColor: size && !(size === "lain" && !customDose.trim()) ? "#C69163" : "#DDD6CE",
          color: size && !(size === "lain" && !customDose.trim()) ? "#332C2A" : "#736657",
          cursor: size && !(size === "lain" && !customDose.trim()) ? "pointer" : "not-allowed",
        }}
      >
        Lanjut
      </button>
    </div>
  );
}

// Rata-rata simpangan antara "saran awal" algoritma vs setting yang
// BENERAN dipakai user pas Dial-In (dicatat di recipe.predictedSetting vs
// recipe.setting) — cuma dihitung per kombinasi tipe prediksi + grinder,
// dan cuma dipakai kalau udah ada minimal 3 data poin biar nggak overreact
// ke 1-2 kejadian yang bisa aja kebetulan.
function computeDeviationNudge(db, predictionType, grinderId) {
  const matches = db.recipes.filter(
    (r) =>
      r.predictionType === predictionType &&
      r.grinderId === grinderId &&
      r.predictedSetting !== undefined &&
      r.predictedSetting !== null &&
      r.predictedSetting !== "" &&
      r.setting !== undefined &&
      r.setting !== null &&
      r.setting !== ""
  );
  const deviations = matches
    .map((r) => parseFloat(r.setting) - parseFloat(r.predictedSetting))
    .filter((d) => !isNaN(d));
  if (deviations.length < 3) return null;
  const avg = deviations.reduce((s, d) => s + d, 0) / deviations.length;
  return { avg, count: deviations.length };
}

// Terapin setengah dari rata-rata simpangan (konservatif, bukan full
// koreksi) ke sebuah prediction object bertipe non-exact, dibulatkan ke
// step grinder. Nempelin info nudge ke object-nya biar UI bisa nunjukin.
function applyDeviationNudge(prediction, db, grinder) {
  if (!prediction || prediction.type === "exact") return prediction;
  const nudge = computeDeviationNudge(db, prediction.type, grinder?.id);
  if (!nudge) return prediction;
  const shift = nudge.avg * 0.5;
  const nudged = roundToStep(prediction.setting + shift, grinder);
  return {
    ...prediction,
    setting: Math.round(nudged * 100) / 100,
    nudgeApplied: Math.round(shift * 100) / 100,
    nudgeSampleCount: nudge.count,
  };
}

function predictSetting(db, beanId, grinderId, machineId, shotType) {
  const targetGrinder = db.grinders.find((g) => g.id === grinderId);

  // Tahap 0: exact match buat jenis shot ini persis.
  const exact = findBestRecipe(db, beanId, grinderId, machineId, shotType);
  if (exact) return { type: "exact", recipe: exact };

  // Tahap 0.5: belum ada data buat jenis shot ini, tapi ada resep Espresso
  // biasa buat kombinasi yang sama — geser settingnya sesuai jenis shot.
  if (shotType && shotType !== "Espresso") {
    const base = findBestRecipe(db, beanId, grinderId, machineId, "Espresso");
    const offset = SHOT_TYPE_STEP_OFFSET[shotType] || 0;
    if (base && offset !== 0) {
      const baseSetting = parseFloat(base.setting);
      const step = parseFloat(targetGrinder?.stepSize);
      if (!isNaN(baseSetting) && !isNaN(step)) {
        const adjusted = roundToStep(baseSetting + offset * step, targetGrinder);
        return applyDeviationNudge(
          {
            type: "adjusted",
            setting: Math.round(adjusted * 100) / 100,
            baseSetting: base.setting,
            offset,
          },
          db,
          targetGrinder
        );
      }
    }
  }

  // Ambil recipe TERBAIK (bukan sembarang row) per grinder lain yang pernah
  // dicoba bean ini — findBestRecipe udah prioritasin default → rating
  // tertinggi → terbaru, jadi nggak kejebak ambil percobaan awal yang belum
  // matang cuma karena row-nya lebih dulu di array (bug lama).
  const otherGrinderIds = [
    ...new Set(
      db.recipes
        .filter((r) => r.beanId === beanId && r.grinderId !== grinderId)
        .map((r) => r.grinderId)
    ),
  ];
  for (const otherGrinderId of otherGrinderIds) {
    const r = findBestRecipe(db, beanId, otherGrinderId);
    if (!r) continue;
    const bridge = findBridgeRatio(db, r.grinderId, grinderId);
    if (bridge) {
      const sourceSetting = parseFloat(r.setting);
      if (!isNaN(sourceSetting)) {
        const fromGrinder = db.grinders.find((g) => g.id === r.grinderId);
        const raw = sourceSetting * bridge.ratio;
        const rounded = roundToStep(raw, targetGrinder);
        return applyDeviationNudge(
          {
            type: "bridge",
            setting: Math.round(rounded * 100) / 100,
            fromGrinderName: fromGrinder?.name || "grinder lain",
            fromSetting: r.setting,
            sampleCount: bridge.sampleCount,
          },
          db,
          targetGrinder
        );
      }
    }
  }

  // Tahap 3 (belum tervalidasi): tebakan kasar dari bean lain yang density-nya
  // paling dekat DAN sudah punya recipe di grinder ini. Nearest-neighbor
  // sederhana, bukan rumus — makanya selalu ditandai jujur sebagai "tebakan".
  const rough = guessSettingRough(db, beanId, grinderId, targetGrinder);
  if (rough) return applyDeviationNudge(rough, db, targetGrinder);

  return null;
}

// Tebakan kasar berbasis kemiripan density (+ roast sebagai tie-breaker),
// dibandingkan ke bean lain yang sudah punya recipe verified/default di
// grinder yang sama. Akurasinya dilacak lewat ROUGH_GUESS_LOG di
// db.roughGuessLog setiap kali dikonfirmasi user — belum boleh dianggap
// setara bridge (data asli) sampai terbukti konsisten.
function roastIndex(roast) {
  return ROAST_LEVELS.findIndex((r) => r.key === roast);
}

// Nilai roast 0-100 buat sebuah bean — pakai roastColor (data baru, kontinu)
// kalau ada, atau perkirakan dari label roast lama (data historis) sebagai fallback.
function roastValueOf(bean) {
  if (bean?.roastColor !== undefined && bean?.roastColor !== "" && bean?.roastColor !== null) {
    const v = Number(bean.roastColor);
    if (!isNaN(v)) return v;
  }
  const idx = roastIndex(bean?.roast);
  return idx >= 0 ? idx * 25 : null;
}

// Density kopi realistis ada di kisaran ini (g/ml). Di luar itu, kemungkinan
// besar salah ketik (misal "44" padahal maksudnya "0.44") — jangan dipakai
// buat perbandingan, karena bisa bikin tebakan kasar ngaco total.
const DENSITY_MIN = 0.1;
const DENSITY_MAX = 1.0;
function isPlausibleDensity(v) {
  return !isNaN(v) && v >= DENSITY_MIN && v <= DENSITY_MAX;
}

function guessSettingRough(db, beanId, grinderId, targetGrinder) {
  const target = db.beans.find((b) => b.id === beanId);
  const targetDensity = parseFloat(target?.density);
  if (!target || !isPlausibleDensity(targetDensity)) return null;

  const candidates = db.beans
    .filter((b) => b.id !== beanId)
    .map((b) => {
      const density = parseFloat(b.density);
      if (!isPlausibleDensity(density)) return null;
      const recipe = findBestRecipe(db, b.id, grinderId);
      if (!recipe) return null;
      const settingNum = parseFloat(recipe.setting);
      if (isNaN(settingNum)) return null;
      return { bean: b, density, recipe, settingNum };
    })
    .filter(Boolean);

  if (candidates.length === 0) return null;

  const targetRoastVal = roastValueOf(target);

  // Prioritas 1: kedekatan density (terbukti akurat 2x berturut-turut).
  // Prioritas 2: roast (nilai 0-100 kontinu) sebagai tie-breaker — BUKAN
  // penentu utama, karena korelasi density↔roast belum terbukti.
  candidates.sort((a, b) => {
    const diffA = Math.abs(a.density - targetDensity);
    const diffB = Math.abs(b.density - targetDensity);
    if (diffA !== diffB) return diffA - diffB;
    const aRoastVal = roastValueOf(a.bean);
    const bRoastVal = roastValueOf(b.bean);
    const aRoastDiff = targetRoastVal !== null && aRoastVal !== null ? Math.abs(aRoastVal - targetRoastVal) : 999;
    const bRoastDiff = targetRoastVal !== null && bRoastVal !== null ? Math.abs(bRoastVal - targetRoastVal) : 999;
    return aRoastDiff - bRoastDiff;
  });

  const nearest = candidates[0];
  // Kalibrasi dari pengalaman pemakaian: tebakan kasar biasanya kegedean
  // (terlalu kasar) 1 step, jadi digeser -1 step ke arah lebih halus
  // sebelum dibulatkan ke step grinder yang valid.
  const step = parseFloat(targetGrinder?.stepSize) || 1;
  const densityAdjusted = nearest.settingNum - step;

  // Koreksi tambahan berdasarkan selisih level roast — EKSPERIMENTAL,
  // dikalibrasi dari 2 pasangan data:
  // 1) Robusfer batch1(Medium)→batch3(Medium-Dark): density turun + roast
  //    lebih gelap, butuh jauh lebih kasar.
  // 2) Kopi Turki (Light, roastColor 0) vs Robusfer batch3 (Medium-Dark,
  //    roastColor 75) — density HAMPIR IDENTIK (0.40 vs 0.404), jadi ini
  //    pasangan paling bersih buat isolasi efek roast doang: basis density
  //    murni memprediksi ~2.75, tapi hasil asli yang works cuma 1.75 (roast
  //    lebih terang → jauh lebih halus dari prediksi density-only).
  // Nilai SHIFT dinaikkan dari 0.5 ke 1.0 berdasarkan data poin ke-2 ini
  // (0.5 ternyata KEKECILAN, cuma prediksi 2.375 padahal butuh 1.75) —
  // masih dibulatkan konservatif, bukan pas persis ke 1.33 hasil hitung
  // exact, karena baru 2 data poin. Akan makin akurat begitu ada lebih
  // banyak pasangan data buat dikalibrasi ulang.
  const ROAST_LEVEL_STEP_SHIFT = 1.0; // per 25 poin roastColor (~1 level), dalam satuan step grinder
  const nearestRoastVal = roastValueOf(nearest.bean);
  let roastAdjustment = 0;
  if (targetRoastVal !== null && nearestRoastVal !== null) {
    const roastDiff = targetRoastVal - nearestRoastVal; // positif = target lebih gelap dari basis
    roastAdjustment = (roastDiff / 25) * ROAST_LEVEL_STEP_SHIFT * step;
  }

  const adjusted = densityAdjusted + roastAdjustment;
  const rounded = roundToStep(adjusted, targetGrinder);

  return {
    type: "rough",
    setting: Math.round(rounded * 100) / 100,
    basedOnBeanName: nearest.bean.name,
    basedOnDensity: nearest.density,
    basedOnRoast: nearest.bean.roast || null,
    sameRoast: !!(target.roast && nearest.bean.roast === target.roast),
    roastAdjustmentApplied: roastAdjustment !== 0 ? Math.round(roastAdjustment * 100) / 100 : 0,
    candidateCount: candidates.length,
  };
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Migrasi kecil: kalau bean yang sudah ada di database (tersimpan sebelumnya)
// belum punya field tertentu (density/roast), tapi namanya cocok dengan data
// yang sudah kita catat, isikan otomatis. Tidak menimpa field yang sudah diisi manual.
const KNOWN_BEAN_FIXES = {
  "RF - Robusta Fermentasi": { density: "0.44", roast: "Medium", roastColor: 50 },
  "ADF - Arabika Dampit Fermentasi": { density: "0.376", roastColor: 87 },
  "ADNF - Arabika Dampit Non-Fermentasi": { density: "0.42", roast: "Medium-Dark", roastColor: 75 },
  "Kopi Turki": { density: "0.40", roast: "Light", roastColor: 0 },
  "Shaka Blend": { density: "0.30", roastColor: 98 },
  "Kopi Jagung": { density: "0.55", roast: "Dark", roastColor: 100 },
  "Robusta Biji Kecil": { roastColor: 100 },
  "Robusta Dark Wine": { roastColor: 87 },
};

// Koreksi (overwrite paksa, beda dari KNOWN_BEAN_FIXES yang cuma isi-kalau-kosong)
const BEAN_FIELD_CORRECTIONS = {
  "bean-robusta-dark-wine": { roast: "Medium-Light", origin: "Semekar" },
  "bean-arabika-gayo": { name: "Arabika Gayo Wine", origin: "Shaka" },
  "bean-rf": { outOfStock: true },
  "bean-adf": { outOfStock: true },
  "bean-adnf": { outOfStock: true },
  "bean-shaka": { process: "Blend 75% Arabika / 25% Robusta", roast: "Medium-dark" },
  "bean-robustafer-batang": { density: "0.435" },
  "bean-adf-winey": { outOfStock: true },
  "bean-adf-winey-reroast": { outOfStock: true },
};

function applyDensityFix(db) {
  let changed = false;
  const beans = db.beans.map((b) => {
    let updated = b;
    const fix = KNOWN_BEAN_FIXES[b.name];
    if (fix) {
      const patch = {};
      Object.entries(fix).forEach(([k, v]) => {
        if (updated[k] === undefined || updated[k] === "" || updated[k] === null) patch[k] = v;
      });
      if (Object.keys(patch).length > 0) {
        changed = true;
        updated = { ...updated, ...patch };
      }
    }
    const corrections = BEAN_FIELD_CORRECTIONS[b.id];
    if (corrections) {
      const patch = {};
      Object.entries(corrections).forEach(([k, v]) => {
        if (updated[k] !== v) patch[k] = v;
      });
      if (Object.keys(patch).length > 0) {
        changed = true;
        updated = { ...updated, ...patch };
      }
    }
    return updated;
  });
  return { changed, fixed: { ...db, beans } };
}

// Backfill shot historis yang dicatat manual (dipindah dari catatan ChatGPT
// yang suka hilang) — ditambahkan sekali lewat pencocokan id, tidak pernah
// dobel walau migrasi ini jalan ulang tiap buka app.
const HISTORICAL_ROUGH_LOG = [
  {
    id: "roughlog-robustakecil-breville-20260814",
    beanId: "bean-robusta-biji-kecil",
    grinderId: "grinder-breville-built-in",
    basedOnBeanName: "ADNF",
    predictedSetting: 8,
    confirmedGood: true,
    feedback: "Krema bagus (visual, belum ditimbang)",
    date: "2026-08-14",
  },
];

const HISTORICAL_RECIPES = [
  {
    id: "recipe-shaka-k64s-recovered",
    beanId: "bean-shaka",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "3.25",
    dose: "18",
    yield: "42.9",
    time: "21",
    shotType: "Espresso",
    taste: "",
    status: "Experiment",
    isDefault: false,
    notes: "Dipulihkan dari histori chat lain (ChatGPT), tanggal asli tidak diketahui pasti. Ada masalah channeling — grind kemungkinan terlalu kasar untuk target espresso, tapi channeling bikin interpretasi agak sulit. Confidence: sedang-rendah.",
    date: "2026-08-10T00:00:00.000Z",
  },
  {
    id: "recipe-shaka-breville-recovered",
    beanId: "bean-shaka",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "12",
    dose: "18",
    yield: "33",
    time: "30",
    shotType: "Espresso",
    taste: "Bitter",
    status: "Experiment",
    isDefault: false,
    notes: "Dipulihkan dari histori chat lain (ChatGPT), tanggal asli tidak diketahui pasti. Inner burr kalibrasi 4 (sama seperti bean lain di Breville). Kemungkinan ekstraksi agak tinggi/flow terlalu lambat untuk karakter roast ini. Confidence: sedang.",
    date: "2026-08-10T00:00:01.000Z",
  },
  {
    id: "recipe-rf-k64s",
    beanId: "bean-rf",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1.25",
    dose: "18",
    yield: "37.8",
    time: "27",
    taste: "",
    status: "Verified",
    isDefault: true,
    notes: "",
  },
  {
    id: "recipe-adnf-breville",
    beanId: "bean-adnf",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "8",
    dose: "18",
    yield: "41.5",
    time: "28",
    taste: "Balance",
    status: "Verified",
    isDefault: true,
    notes: "",
  },
  {
    id: "recipe-jagung-k64s",
    beanId: "bean-jagung",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "7",
    dose: "18",
    yield: "22.6",
    time: "23",
    taste: "",
    status: "Experiment",
    isDefault: false,
    notes: "Puck lumpur lengket",
  },
  {
    id: "recipe-darkwine-breville-20260818-s1",
    beanId: "bean-robusta-dark-wine",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "6",
    dose: "",
    yield: "38.7",
    time: "40",
    wdt: "Tidak",
    puck: "Kertas",
    basket: "Standard",
    shotType: "Espresso",
    taste: "Balance",
    rating: 10,
    status: "Verified",
    isDefault: true,
    notes: "",
    date: "2026-08-18T03:01:22.827Z",
  },
  {
    id: "recipe-peaberry-k64s-20260817-s1",
    beanId: "bean-robusta-peaberry",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1",
    dose: "16",
    yield: "52.6",
    time: "17",
    wdt: "Ya",
    puck: "Kertas",
    basket: "Standard",
    shotType: "Espresso",
    taste: "Balance",
    rating: 5,
    status: "Experiment",
    isDefault: false,
    notes: "Terlalu encer, harus perhalus gilingan, mungkin 0,5",
    date: "2026-08-17T12:05:53.397Z",
  },
  {
    id: "recipe-peaberry-k64s-20260817-s2",
    beanId: "bean-robusta-peaberry",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "0.5",
    dose: "",
    yield: "49.5",
    time: "28",
    wdt: "Ya",
    puck: "Kertas",
    basket: "Standard",
    shotType: "Espresso",
    taste: "Encer",
    rating: 8,
    status: "Verified",
    isDefault: true,
    notes: "Rasa pahit tidak dominan, muncul asemnya dikit, next harus turun lagi ke 0,25",
    date: "2026-08-17T12:18:00.128Z",
  },
  {
    id: "recipe-peaberry-k64s-20260817-s3",
    beanId: "bean-robusta-peaberry",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "0.25",
    dose: "16",
    yield: "58.2",
    time: "16",
    wdt: "Ya",
    puck: "Kertas",
    basket: "Standard",
    shotType: "Espresso",
    taste: "",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "RDT dipakai sebelum giling — statis/muncrat berkurang jauh, tapi volume bubuk masih kegedean, nggak cukup di basket Standard. Rasa belum dievaluasi. Rencana: coba dose dikurangi (misal 14-15g).",
    date: "2026-08-17T14:00:00.000Z",
  },
  {
    id: "recipe-peaberry-k64s-20260820-s4",
    beanId: "bean-robusta-peaberry",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "3",
    dose: "",
    yield: "38.8",
    time: "15",
    shotType: "Espresso",
    taste: "",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Uji teori: tebakan murni density-based nearest-neighbor (basis Shaka, density mirip) tanpa kalibrasi -1 step. Hasil: flow rate ekstrem (~2,59 g/detik), jauh lebih cepat dari bean lain manapun di setting serupa. Menguatkan teori anomali bentuk biji peaberry (bulat) — bukan cuma soal kalibrasi grinder K64S yang sempat error. Kesimpulan: density SAJA tidak cukup untuk prediksi Peaberry, jangan pakai basis density murni buat bean ini.",
    date: "2026-08-22T08:00:00.000Z",
  },
  {
    id: "recipe-adnf-k64s-mokapot-20260816-mix",
    beanId: "bean-adnf",
    grinderId: "grinder-k64s",
    machineId: "machine-mokapot-9barista",
    setting: "Campuran",
    dose: "13",
    yield: "",
    time: "",
    shotType: "Lainnya",
    taste: "",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Eksperimen: campuran grind 5g @ setting 5 + 8g @ setting 12 (total dose 13g). Air panas penuh dituang, dibalik ke gelas, tunggu tetesan dari basket, lalu dipompa ke 0,8 bar. Aliran agak ngocor. Disajikan iced (dituang ke es batu). Rasa: dapet/enak (belum breakdown detail rasa).",
    date: "2026-08-16T12:00:00.000Z",
  },
  {
    id: "recipe-gayo-k64s-20260816-s1",
    beanId: "bean-arabika-gayo",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1.25",
    dose: "18",
    yield: "35.9",
    time: "29",
    wdt: "Ya",
    puck: "Ya",
    basket: "Bottomless",
    taste: "Asam",
    rating: 8,
    status: "Experiment",
    isDefault: false,
    notes: "Kayaknya harus dipanjangin waktu ekstraksinya supaya ga terlalu asam",
    date: "2026-08-16T01:52:39.288Z",
  },
  {
    id: "mszohgjcbupfa",
    beanId: "bean-arabika-gayo",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1",
    dose: "",
    yield: "30",
    time: "56",
    wdt: "Ya",
    puck: "Kertas",
    basket: "Bottomless",
    shotType: "Espresso",
    taste: "Asam",
    rating: 7,
    status: "Experiment",
    isDefault: false,
    notes: "Saya salah setting ke 1, next harusnya di 1,5",
    date: "2026-08-19T05:55:57.048Z",
  },
  {
    id: "recipe-adfwiney-breville-20260820-s1",
    beanId: "bean-adf-winey",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "7",
    dose: "18",
    yield: "52.9",
    time: "27",
    shotType: "Lungo",
    taste: "Encer tapi enak",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Rasio ~1:2,94, waktu 27s — masuk Lungo, bukan Turbo Shot (waktu normal, bukan cepat).",
    date: "2026-08-22T05:00:00.000Z",
  },
  {
    id: "recipe-adfwiney-breville-20260820-s2",
    beanId: "bean-adf-winey",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "5",
    dose: "18",
    yield: "45.3",
    time: "22",
    shotType: "Espresso",
    taste: "",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Flow lebih cepat dari setting 7 padahal lebih halus (indikasi channeling — retained coffee + dose kurang, belum sampai smiley hijau di Impress).",
    date: "2026-08-22T05:10:00.000Z",
  },
  {
    id: "recipe-adfwiney-breville-20260820-s3",
    beanId: "bean-adf-winey",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "5",
    dose: "18",
    yield: "38",
    time: "20",
    shotType: "Espresso",
    taste: "Asam",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Dose dipenuhin sampai smiley hijau keluar (fitur Impress) — flow lebih konsisten dari percobaan sebelumnya, tapi waktu masih terlalu cepat (under-extracted, asam lebih terasa).",
    date: "2026-08-22T05:20:00.000Z",
  },
  {
    id: "recipe-adfwiney-breville-20260820-s4",
    beanId: "bean-adf-winey",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "4",
    dose: "18",
    yield: "39",
    time: "21",
    shotType: "Espresso",
    taste: "",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Belum purge retained coffee dari grinder — efek turun 1 step dari setting 5 jadi keredam/nggak proporsional (flow rate cuma turun sedikit).",
    date: "2026-08-22T05:30:00.000Z",
  },
  {
    id: "recipe-adfwiney-breville-20260820-s5",
    beanId: "bean-adf-winey",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "4",
    dose: "18",
    yield: "37.5",
    time: "26",
    wdt: "Tidak",
    shotType: "Espresso",
    taste: "Balance",
    rating: null,
    status: "Verified",
    isDefault: true,
    notes: "Titik terbaik hari ini — dose full sampai smiley hijau + purge grinder dulu (buang sisa retained coffee dari setting sebelumnya). Rasio ~1:2,08, waktu 26s, masuk rentang espresso normal. Rasa balance & enak, asam masih terasa tapi kemungkinan besar karakter bawaan kopi (proses Winey + arabika), bukan under-extraction. Kalau mau kurangin asam lagi, bisa coba 3.5-3.75. Prediksi (belum dites) buat K64S: ~1.0-1.1 (dari bridge ratio K64S↔Breville).",
    date: "2026-08-22T05:45:00.000Z",
  },
  {
    id: "recipe-adfwiney-breville-20260822-2cuppreset",
    beanId: "bean-adf-winey",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "4",
    dose: "18",
    yield: "48.4",
    time: "22",
    basket: "Standard",
    shotType: "Lainnya",
    taste: "",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Pakai preset tombol '2 cangkir' (mode volumetrik otomatis Breville, bukan mode Manual) + portafilter bawaan (bukan bottomless). Setting grinder tetap 4 (sama kayak default), tapi hasil beda jauh dari default manual (37.5g/26s) karena mode brewing-nya beda (target volume & profil tekanan preprogram, bukan waktu/rasio manual). Rasio ~1:2,69 (Lungo-ish), flow jauh lebih cepat (~2,2 g/detik vs default ~1,44 g/detik), rasanya keenceran. TIDAK sebanding langsung dengan data manual — dicatat sebagai referensi mode alternatif aja, bukan buat dibandingin apple-to-apple. RENCANA BERIKUTNYA: tetap pakai mode otomatis (preset 2 cangkir), geser grinder ke setting 3 (lebih halus dari 4) buat ADF Winey di Breville — biar nggak keenceran lagi.",
    date: "2026-08-22T16:44:00.000Z",
  },
  {
    id: "recipe-adfwiney-breville-20260824-singledose",
    beanId: "bean-adf-winey-reroast",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "4",
    dose: "10",
    yield: "21.2",
    time: "23",
    basket: "Standard",
    puck: "Kertas",
    shotType: "Lainnya",
    taste: "Asam segar, pahit nggak terlalu, aliran encer tapi rasa nggak encer",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Bean sudah disangrai ulang (density 0.413), suhu diturunin ke 91°C. Single dose ~10g (bukan double 18g). Rasio ~1:2,12, waktu 23s — pas target buat single dose. PENTING — jangan disalahartikan: setting 4 adalah default LAMA yang ditetapkan waktu density MASIH 0.48 (sebelum roasting ulang) untuk dose 18g. Setelah density turun ke 0.413, setting yang tepat buat dose 18g itu BELUM PERNAH DITES ULANG — dugaan/hipotesis mengarah ke 5-6 (density turun + roast lebih gelap → butuh lebih kasar), tapi masih perlu dikonfirmasi lewat trial asli, bukan diasumsikan dari hasil single dose ini. Hasil setting 4 di sini murni spesifik buat kombinasi density baru + dose 10g — TIDAK bisa dipakai sebagai bukti kalau 4 juga cocok buat 18g di density baru. PR yang masih terbuka: tes 18g di setting 5-6 (density baru) buat dapetin default 18g yang valid.",
    date: "2026-08-24T13:00:00.000Z",
  },
  {
    id: "recipe-adfwiney-breville-20260824-singledose-s2",
    beanId: "bean-adf-winey-reroast",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "3",
    dose: "10",
    yield: "21",
    time: "27",
    basket: "Standard",
    shotType: "Lainnya",
    taste: "",
    rating: null,
    status: "Verified",
    isDefault: false,
    notes: "Setting 3 (lebih halus dari setting 4 yang dites sebelumnya) buat single dose 10g — rasio ~1:2,1, waktu 27s, tepat di tengah rentang normal 25-30s. Sempat jadi default, tapi diganti setting 2 (lihat recipe-adfwiney-breville-20260824-singledose-s3) setelah trial ulang di setting 3 malah dapet hasil beda jauh (22,7g/16s, kemungkinan retained coffee/variasi shot-ke-shot), lalu digeser ke 2 dan hasilnya lebih konsisten pas target.",
    date: "2026-08-24T15:00:00.000Z",
  },
  {
    id: "recipe-adfwiney-breville-20260824-1cuppreset",
    beanId: "bean-adf-winey-reroast",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "3",
    dose: "10",
    yield: "30",
    time: "21",
    basket: "Standard",
    shotType: "Lainnya",
    taste: "",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Sama setting (3) & dose (10g) kayak default manual, tapi pakai TOMBOL PRESET '1 cup' (bukan mode Manual) DAN TANPA puck screen kertas (sebelumnya pakai). Hasil jauh beda dari default manual (30g/21s vs 21g/27s) — konsisten sama pola preset volumetrik yang udah ketauan sebelumnya (beda target/profil dari manual, nggak sebanding langsung). 2 variabel berubah bareng (preset + no puck screen), jadi nggak bisa dipastiin mana yang lebih dominan.",
    date: "2026-08-24T15:15:00.000Z",
  },
  {
    id: "recipe-adfwiney-breville-20260824-singledose-s3",
    beanId: "bean-adf-winey-reroast",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "3",
    dose: "10",
    yield: "22.7",
    time: "16",
    basket: "Standard",
    puck: "Kertas",
    shotType: "Lainnya",
    taste: "",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Tes ulang setting 3, manual mode, puck screen kertas — hasilnya beda jauh dari trial pertama di setting 3 (22,7g/16s vs 21g/27s), padahal parameter kelihatan sama. Kemungkinan retained coffee atau variasi shot-ke-shot yang belum kepetakan. Karena hasil di setting 3 nggak konsisten, digeser ke setting 2 (lihat entry berikutnya).",
    date: "2026-08-24T15:30:00.000Z",
  },
  {
    id: "recipe-adfwiney-breville-20260824-singledose-s4",
    beanId: "bean-adf-winey-reroast",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "2",
    dose: "10",
    yield: "22.7",
    time: "27",
    basket: "Standard",
    puck: "Kertas",
    shotType: "Lainnya",
    taste: "Enak, nggak terlalu asam, balance",
    rating: null,
    status: "Verified",
    isDefault: true,
    notes: "Digeser ke setting 2 (lebih halus dari 3) setelah setting 3 hasilnya nggak konsisten. Hasil: rasio ~1:2,27, waktu 27s — tepat di rentang normal 25-30s. Rasa enak, balance, nggak terlalu asam. Dijadikan default baru buat single dose 10g bean ini (gantiin setting 3 & 4 sebelumnya).",
    date: "2026-08-24T15:45:00.000Z",
  },
  {
    id: "recipe-turki-k64s-20260826-s1",
    beanId: "bean-turki",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1.75",
    dose: "18",
    yield: "38",
    time: "24",
    basket: "Bottomless",
    puck: "Kertas",
    shotType: "Espresso",
    taste: "Cenderung asam tapi balance",
    rating: null,
    status: "Verified",
    isDefault: true,
    notes: "Percobaan pertama Kopi Turki di K64S — belum pernah ada data sebelumnya. DATA KALIBRASI PALING BERSIH sejauh ini: density (0.40) hampir identik sama Robusfer Batang Batch3 (0.404, setting default 3), tapi roast jauh beda (Light, roastColor 0 vs Medium-Dark, roastColor 75 — selisih 75 poin). Basis density murni (nearest-neighbor -1 step) memprediksi ~2.75, tapi setting yang beneran works itu 1.75 — jauh lebih halus. Ini berarti angka ROAST_LEVEL_STEP_SHIFT lama (0.5) KEKECILAN (cuma mrediksi 2.375, bukan 1.75 yang dibutuhkan) — sudah dinaikkan ke 1.0 di kode berdasarkan data ini. Rasio ~1:2,11, waktu 24s, hampir pas target. Rasa asam khas roast Light tapi balance (bukan under-extraction).",
    date: "2026-08-26T10:00:00.000Z",
  },
  {
    id: "recipe-turki-k64s-20260826-s2",
    beanId: "bean-turki",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1.75",
    dose: "18",
    yield: "37.7",
    time: "29",
    basket: "Bottomless",
    puck: "Kertas",
    shotType: "Espresso",
    taste: "Sama, cenderung asam tapi balance",
    rating: null,
    status: "Verified",
    isDefault: true,
    notes: "Ulangan setting 1.75 dengan parameter sama — hasil konsisten sama percobaan pertama (37.7g/29s vs 38g/24s), variasi wajar shot-ke-shot. Waktu kedua ini malah lebih pas ke tengah rentang normal 25-30s. Menguatkan 1.75 sebagai default solid buat Kopi Turki. Dugaan variasi waktu antar-shot: kemungkinan retained coffee dari kopi sebelumnya di grinder (pola yang udah beberapa kali kejadian).",
    date: "2026-08-26T10:15:00.000Z",
  },
  {
    id: "recipe-turki-k64s-20260826-s3",
    beanId: "bean-turki",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1.75",
    dose: "18",
    yield: "38.5",
    time: "22",
    basket: "Bottomless",
    puck: "Kertas",
    shotType: "Espresso",
    taste: "Asam banget",
    rating: null,
    status: "Verified",
    isDefault: true,
    notes: "Trial ketiga di setting 1.75, semuanya bottomless. INSIGHT: dari 3 data poin (24s balance, 29s balance, 22s asam banget), yang waktunya PALING CEPAT (22s) justru yang PALING ASAM — konsisten sama pola under-extraction. Setting 1.75 kelihatannya di ambang batas: kadang jatuh oke (24-29s), kadang jatuh ke sisi under-extracted (22s) tergantung variasi kecil (retained coffee, packing puck). RENCANA BERIKUTNYA: coba geser ke 1.5 (lebih halus) buat konsisten jaga waktu di atas 25 detik, hindari zona asam.",
    date: "2026-08-26T10:30:00.000Z",
  },
  {
    id: "recipe-adfwiney-breville-20260824-singledose-s56",
    beanId: "bean-adf-winey-reroast",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "5-6",
    dose: "10",
    yield: "",
    time: "",
    basket: "Standard",
    shotType: "Lainnya",
    taste: "Encer banget",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Angka yield/waktu lupa dicatat. Setting 5-6 ini sebenarnya hipotesis buat DOSE 18G di density baru (0.413) — tapi kepakai duluan buat tes dose 10g, hasilnya kelewat encer. Ini BUKAN bukti kalau 5-6 salah buat 18g — cuma nunjukin 5-6 kekasaran buat dose sekecil 10g. Setting 4 (lihat recipe-adfwiney-breville-20260824-singledose) yang works itu spesifik buat kombinasi density baru + dose 10g, bukan pengganti hipotesis 5-6 untuk 18g. 5-6 di dose 18g (density baru) masih PR, belum dites.",
    date: "2026-08-24T12:45:00.000Z",
  },
  {
    id: "recipe-robustaferbatang-k64s-20260820-s1",
    beanId: "bean-robustafer-batang",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1.25",
    dose: "18",
    yield: "38",
    time: "18",
    puck: "Kertas",
    basket: "Bottomless",
    shotType: "Espresso",
    taste: "Asam",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Under-extracted, waktu terlalu cepat.",
    date: "2026-08-22T06:00:00.000Z",
  },
  {
    id: "recipe-robustaferbatang-k64s-20260820-s2",
    beanId: "bean-robustafer-batang",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "0.75",
    dose: "18",
    yield: "38.4",
    time: "24",
    shotType: "Espresso",
    taste: "Balance tapi body kurang tebal",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Masuk rentang espresso normal, tapi grinder mulai kerasa buntu — jangan diperhalus lebih jauh lagi dari sini.",
    date: "2026-08-22T06:10:00.000Z",
  },
  {
    id: "recipe-robustaferbatang-k64s-20260820-s3",
    beanId: "bean-robustafer-batang",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1",
    dose: "20",
    yield: "38",
    time: "23",
    shotType: "Espresso",
    taste: "Balance",
    rating: null,
    status: "Verified",
    isDefault: true,
    notes: "Naikin dose (18→20g) buat nambah body tanpa perlu perhalus grind lebih jauh (setting 0.75 udah mulai buntu). Asam-pahit seimbang, aftertaste manis, karakter nutty & mirip arabika.",
    date: "2026-08-22T06:20:00.000Z",
  },
  {
    id: "recipe-robustaferbatang-k64s-20260820-reroast-s1",
    beanId: "bean-robustafer-batang",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1.25",
    dose: "20",
    yield: "31",
    time: "38",
    shotType: "Espresso",
    taste: "Balance, ga terlalu pahit, ga terlalu asam",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "PENTING: disangrai ulang hari ini, density baru 0.435 (dari 0.48). Rasio jadi lebih pekat (~1:1,55) & lebih lambat (38 detik) dari default lama (setting 1, 38g/23s) — meski density turun (biasanya diprediksi butuh lebih kasar), hasilnya malah butuh perlakuan beda, kemungkinan biji jadi lebih rapuh pasca-roasting ulang. Rasa tetap enak & balance. Belum dijadikan default resmi pengganti — masih bisa dieksplor lagi ke arah 1.5-1.75 kalau mau rasio lebih standar (1:2, 25-30 detik).",
    date: "2026-08-22T13:00:00.000Z",
  },
  {
    id: "recipe-darkwine-k64s-20260820-s3",
    beanId: "bean-robusta-dark-wine",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1.75",
    dose: "18",
    yield: "37.2",
    time: "40",
    shotType: "Espresso",
    taste: "Aftertaste manis (mirip trial sebelumnya)",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Yield nyaris identik sama default lama (37.2g vs 37g), tapi waktu jauh lebih lama (40s vs 33s) — kemungkinan efek retained coffee dari Robusfer (setting lebih halus, 1.25) yang dicoba sebelumnya di grinder yang sama. Rasa tetap ada aftertaste manis, belum over-extracted. Default tetap di recipe-darkwine-k64s-20260816-s2 (setting 1.75, 37g/33s) — ini cuma log tambahan, bukan pengganti.",
    date: "2026-08-22T13:30:00.000Z",
  },
  {
    id: "recipe-adfwiney-k64s-20260820-s1",
    beanId: "bean-adf-winey",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1.25",
    dose: "18",
    yield: "37.1",
    time: "26",
    shotType: "Espresso",
    taste: "Asam, enak (setting-nya sendiri belum tentu manis di depan — lihat catatan)",
    rating: null,
    status: "Verified",
    isDefault: true,
    notes: "Prediksi bridge (dari Breville setting 4) ternyata tepat di percobaan pertama — rasio ~1:2,06, waktu 26s, langsung masuk rentang espresso normal. KOREKSI PENTING: review 'manis di depan/seger/manisnya berasa jelas' sebelumnya TERNYATA karena user nambahin sirup ke gelas espresso-nya, bukan karakter murni kopi — jadi observasi soal sweetness itu tidak valid buat dial-in. Yang masih valid: settingnya sendiri (1.25) menghasilkan rasio & waktu ekstraksi yang tepat sesuai target espresso di percobaan pertama, dan rasa dasarnya asam & enak. Kalau mau tau karakter manis asli kopi ini di K64S, perlu dites ulang tanpa campuran apa pun (black espresso murni).",
    date: "2026-08-22T14:00:00.000Z",
  },
  {
    id: "recipe-adfwiney-k64s-20260824-reroast-s1",
    beanId: "bean-adf-winey",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "2.75",
    dose: "10",
    yield: "48",
    time: "29",
    wdt: "Ya",
    puck: "Kertas",
    basket: "Standard",
    shotType: "Lainnya",
    taste: "Krema pucat (tanda under-extract), tapi anehnya rasanya enak",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Bean sudah disangrai ulang, density berubah jadi 0.413 (dari 0.48). Setting ditebak dari cross-bean bridge: bean lain yang density & roast level (Medium-Dark) paling mirip adalah Robusfer Batang Batch 1kg (density 0.404, setting default 3 di K64S) — dikurangi 1 step (0.25) sesuai kalibrasi standar jadi 2.75. Dose SENGAJA cuma 10g (single shot literal, bukan salah takar) — jadi rasio (~1:4,8) & data ini TIDAK sebanding langsung dengan recipe dose 18g lainnya. Krema pucat konsisten sama tanda under-extraction (dose kecil + yield besar), tapi rasanya tetap enak meski keliatan under-extract secara visual — kemungkinan karakter dasar kopi ini emang udah kuat/manis natural. Belum jelas apakah 2.75 ini titik yang tepat buat dose 18g standar — perlu dites ulang pakai dose 18g biar bisa dibandingin apple-to-apple sama data lain.",
    date: "2026-08-24T11:00:00.000Z",
  },
  {
    id: "recipe-robustaferbatch3-k64s-20260822-s1",
    beanId: "bean-robustafer-batang-batch3",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1.25",
    dose: "18",
    yield: "26.9",
    time: "37",
    puck: "Kertas",
    basket: "Bottomless",
    shotType: "Ristretto",
    taste: "Nggak pahit, robusta banget, nggak kerasa asam",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Rasio ~1:1,49 (ristretto range) tapi waktu 37s jauh lebih lama dari ristretto normal (20-25s) — lebih ke gejala flow lambat/under-flow daripada ristretto yang disengaja. Rasa: nggak pahit meski lambat, karakter robusta kuat, asam nggak kerasa (kemungkinan karena ekstraksi pekat & panjang, senyawa asam udah 'abis' duluan). Kalau mau versi lebih ke arah espresso standar, coba naik ke 1.75-2. Dihentikan sementara di titik ini (belum eksplor lebih jauh).",
    date: "2026-08-22T15:00:00.000Z",
  },
  {
    id: "recipe-robustaferbatch3-k64s-20260822-s2",
    beanId: "bean-robustafer-batang-batch3",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1.75",
    dose: "18",
    yield: "37.4",
    time: "47",
    puck: "Kertas",
    basket: "Standard",
    shotType: "Espresso",
    taste: "Dominan pahit tapi enak",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Rasio ~1:2,08 (pas target), tapi waktu 47s jauh melebihi rentang normal (25-30s) — over-extracted, konsisten sama rasa dominan pahit. Flow rate cuma naik dikit dari setting 1.25 sebelumnya (±0,80 g/detik).",
    date: "2026-08-22T15:15:00.000Z",
  },
  {
    id: "recipe-robustaferbatch3-k64s-20260822-s3",
    beanId: "bean-robustafer-batang-batch3",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "2.5",
    dose: "18",
    yield: "40.9",
    time: "26",
    puck: "Kertas",
    basket: "Standard",
    shotType: "Espresso",
    taste: "Pahit berkurang, rasa espresso lebih enak & seimbang",
    rating: null,
    status: "Verified",
    isDefault: false,
    notes: "Rasio ~1:2,27, waktu 26s — pas target espresso normal, flow rate ±1,57 g/detik jauh lebih masuk akal. Dibanding setting 1.75 (over-extracted), pahitnya berkurang signifikan begitu waktu ekstraksi normal — karakter robusta bitter-forward tapi nggak berlebih. Dijadikan default sementara buat batch 1kg ini.",
    date: "2026-08-22T15:30:00.000Z",
  },
  {
    id: "recipe-robustaferbatch3-k64s-20260824-s4",
    beanId: "bean-robustafer-batang-batch3",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "3",
    dose: "18",
    yield: "41.8",
    time: "23",
    puck: "Kertas",
    basket: "Bottomless",
    shotType: "Espresso",
    taste: "Enak, tapi asamnya belum keluar",
    rating: null,
    status: "Verified",
    isDefault: false,
    notes: "Rasio ~1:2,32, waktu 23s (dikit di bawah rentang normal 25-30s), flow rate ±1,82 g/detik (lebih cepat dari setting 2.5). INSIGHT PENTING: asam tetap nggak keluar meski setting sudah dinaikkan ke arah lebih kasar (harusnya lebih ngangkat asam) — kemungkinan besar ini bukan soal setting grinder, tapi karakter bawaan kopi (durasi fermentasi yang kurang lama). Dijadikan default sementara (gantiin setting 2.5) karena rasanya lebih disukai & waktu lebih pas target.",
    date: "2026-08-24T10:00:00.000Z",
  },
  {
    id: "recipe-robustaferbatch3-k64s-20260824-s5",
    beanId: "bean-robustafer-batang-batch3",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "3",
    dose: "18",
    yield: "39.6",
    time: "23",
    puck: "Kertas",
    basket: "Standard",
    shotType: "Espresso",
    taste: "Sama seperti sebelumnya, tidak ada beda",
    rating: null,
    status: "Verified",
    isDefault: false,
    notes: "Ulangan setting 3, tapi pakai portafilter standar (bukan bottomless) — hasil yield sedikit beda (39,6g vs 41,8g sebelumnya, variasi normal shot-ke-shot), waktu sama (23s). INSIGHT: rasa TIDAK ada beda antara bottomless vs portafilter standar untuk batch ini — jenis portafilter nggak signifikan mempengaruhi rasa di sini.",
    date: "2026-08-24T11:30:00.000Z",
  },
  {
    id: "recipe-robustaferbatch3-k64s-20260824-s6",
    beanId: "bean-robustafer-batang-batch3",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "3",
    dose: "18",
    yield: "37.6",
    time: "28",
    puck: "Kertas",
    basket: "Standard",
    shotType: "Espresso",
    taste: "Asam masih belum keluar",
    rating: null,
    status: "Verified",
    isDefault: true,
    notes: "Coba suhu diturunin ke 91°C (paling rendah yang bisa diset mesin, sesuai panduan roast Medium-Dark idealnya 85-90°C). Rasio ~1:2,09, waktu 28s — paling pas dibanding 2 percobaan setting 3 sebelumnya (yang nyangkut di 23s), flow rate ±1,34 g/detik. TAPI asam tetap nggak keluar meski waktu udah pas & suhu diturunin — ini KUAT mengkonfirmasi kesimpulan sebelumnya: keterbatasan asam bukan soal parameter seduh (setting/suhu/waktu), melainkan karakter bawaan kopi dari durasi fermentasi yang kurang lama saat processing. Kombinasi setting 3 + suhu 91°C ini dijadikan default terbaru (waktu ekstraksi paling ideal sejauh ini).",
    date: "2026-08-24T12:00:00.000Z",
  },
  {
    id: "recipe-robustaferbatch3-icafilas-20260824-s1",
    beanId: "bean-robustafer-batang-batch3",
    grinderId: "grinder-k64s",
    machineId: "machine-icafilas",
    setting: "3",
    dose: "10",
    yield: "20",
    time: "",
    shotType: "Lainnya",
    taste: "Enak banget",
    rating: null,
    status: "Experiment",
    isDefault: false,
    notes: "Air panas dituang dari termos, ±5 menit setelah mendidih (perkiraan suhu turun ke ~80-85°C, di bawah rentang ideal riset 90-93°C untuk Medium-Dark — tapi hasilnya justru enak banget, beda dari Breville yang asamnya nggak pernah keluar). Waktu ekstraksi lupa dicatat. Setting grinder sama kayak default Breville (3), tapi mesinnya beda total — iCafilas itu portable elektrik self-heating one-button (rating pompa ~15-19 bar, mekanisme internal belum jelas apakah ada regulasi tekanan/OPV kayak Breville). BUKAN pompa manual (koreksi dari catatan sebelumnya yang salah nyebut Wacaco Nanopresso). Kemungkinan suhu lebih rendah dari air termos itu yang paling berperan bikin hasilnya lebih balance dibanding Breville (91°C). INSIGHT PENTING: pertama kalinya asam/karakter lain 'keluar' dari batch ini setelah berkali-kali gagal di Breville — worth dieksplor lebih jauh, terutama faktor suhu.",
    date: "2026-08-24T14:00:00.000Z",
  },
  {
    id: "recipe-robustafer-k64s-20260816-s1",
    beanId: "bean-robusta-fer",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "2",
    dose: "",
    yield: "46",
    time: "19",
    wdt: "Ya",
    puck: "Ya",
    basket: "Bottomless",
    taste: "Pahit",
    rating: 9,
    status: "Experiment",
    isDefault: false,
    notes: "Setting grinder harus dikurangi karena terlalu cepat",
    date: "2026-08-16T01:59:35.129Z",
  },
  {
    id: "recipe-darkwine-k64s-20260816-s2",
    beanId: "bean-robusta-dark-wine",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1.75",
    dose: "",
    yield: "37",
    time: "23",
    wdt: "Ya",
    puck: "Ya",
    basket: "Bottomless",
    taste: "Balance",
    rating: 10,
    status: "Verified",
    isDefault: true,
    notes: "Mungkin bisa dicoba setting 1,5 untuk tau rasanya",
    date: "2026-08-16T02:10:03.190Z",
  },
  {
    id: "recipe-adf-k64s-mokapot-20260814-s1",
    beanId: "bean-adf",
    grinderId: "grinder-k64s",
    machineId: "machine-mokapot-9barista",
    setting: "2",
    dose: "",
    yield: "",
    time: "",
    taste: "Fruity, karamel, tidak terlalu pahit",
    status: "Verified",
    isDefault: true,
    notes: "Moka pot 9Barista mod — air 130ml, basket 51mm. Grind K64S: 1 step (0.25) lebih kasar dari setting espresso di bean & grinder yang sama.",
    date: "2026-08-14",
  },
  {
    id: "recipe-robustakecil-k64s-20260814-s2",
    beanId: "bean-robusta-biji-kecil",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "2",
    dose: "18",
    yield: "36.6",
    time: "24",
    taste: "Lebih balance dibanding setting 2.25",
    status: "Verified",
    isDefault: true,
    notes: "Bottomless, puck screen paper. Menggantikan default sebelumnya (2.25).",
    date: "2026-08-14",
  },
  {
    id: "recipe-robustakecil-breville-20260814-s1",
    beanId: "bean-robusta-biji-kecil",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "8",
    dose: "",
    yield: "",
    time: "",
    taste: "Krema bagus (kesan visual, belum ditimbang dose/yield/waktu)",
    status: "Experiment",
    isDefault: false,
    notes: "Dari perkiraan tebakan kasar (basis: ADNF). Belum dijadikan default karena data belum lengkap.",
    date: "2026-08-14",
  },
  {
    id: "recipe-darkwine-k64s-20260814-s1",
    beanId: "bean-robusta-dark-wine",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "1.75",
    dose: "18",
    yield: "37.6",
    time: "33",
    taste: "Pas, aftertaste manis",
    status: "Verified",
    isDefault: true,
    notes: "Percobaan pertama, nice.",
    date: "2026-08-14",
  },
  {
    id: "recipe-robustakecil-k64s-20260814-s1",
    beanId: "bean-robusta-biji-kecil",
    grinderId: "grinder-k64s",
    machineId: "machine-breville",
    setting: "2.25",
    dose: "18",
    yield: "36.9",
    time: "25",
    taste: "Nice",
    status: "Verified",
    isDefault: true,
    notes: "Puck screen kertas. Percobaan pertama, dari perkiraan manual K64S ~2.25.",
    date: "2026-08-14",
  },
  {
    id: "recipe-adnf-breville-20260814-s1",
    beanId: "bean-adnf",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "8",
    dose: "18",
    yield: "36.7",
    time: "34",
    taste: "Cenderung asam, sedikit asin",
    status: "Experiment",
    isDefault: false,
    notes: "Puck: paper. Shot 1, 14 Agustus 2026.",
    date: "2026-08-14",
  },
  {
    id: "recipe-adnf-breville-20260814-s2",
    beanId: "bean-adnf",
    grinderId: "grinder-breville-built-in",
    machineId: "machine-breville",
    setting: "8",
    dose: "18",
    yield: "48.4",
    time: "34",
    taste: "",
    status: "Experiment",
    isDefault: false,
    notes: "Puck: paper. Shot 2, 14 Agustus 2026. Rasa belum dicatat.",
    date: "2026-08-14",
  },
];

const GRINDER_NOTE_APPENDS = {
  "grinder-breville-built-in": "Kelipatan setting: 1. Kandidat berikutnya untuk dicoba: setting 6.",
  "grinder-k64s": "Patokan ujung kasar: Kopi Tubruk (sangat kasar, direbus) ≈ setting 5. Catatan tambahan (perbandingan visual, belum dikonfirmasi rasa): setting 12 terlihat mirip grind pour-over di cafe — ganjil karena lebih kasar dari patokan tubruk, perlu dicek ulang salah satu datanya.",
};

// Koreksi field grinder yang salah dicatat sebelumnya (overwrite paksa,
// bukan cuma isi-kalau-kosong).
const GRINDER_FIELD_CORRECTIONS = {
  "grinder-k64s": { stepSize: "0.25" },
  "grinder-breville-built-in": {
    notes: "Inner burr kalibrasi: 4 Kelipatan setting: 1. Kandidat berikutnya untuk dicoba: setting 6.",
  },
};

// Isi-kalau-kosong buat grinder (sama polanya kayak KNOWN_BEAN_FIXES) — nggak
// menimpa kalau kamu udah pernah ubah manual.
const KNOWN_GRINDER_FIXES = {
  "grinder-breville-built-in": { restrictedToMachineId: "machine-breville" },
};

// Koreksi field recipe tertentu yang datanya sempat salah dicatat (overwrite paksa).
const RECIPE_FIELD_CORRECTIONS = {
  "recipe-adf-k64s-mokapot-20260814-s1": {
    notes: "Moka pot 9Barista mod — air 130ml, basket 51mm. Grind K64S: 1 step (0.25) lebih kasar dari setting espresso di bean & grinder yang sama.",
  },
  "recipe-adnf-k64s-mokapot-20260816-mix": {
    setting: "Campuran",
    date: "2026-08-16T12:00:00.000Z",
  },
  "recipe-peaberry-k64s-20260817-s3": {
    notes: "RDT dipakai sebelum giling — statis/muncrat berkurang jauh, tapi volume bubuk masih kegedean, nggak cukup di basket Standard. Rasa belum dievaluasi. Rencana: coba dose dikurangi (misal 14-15g).",
  },
  "recipe-gayo-k64s-20260816-s1": {
    notes: "Kayaknya harus dipanjangin waktu ekstraksinya supaya ga terlalu asam",
  },
  "recipe-robustafer-k64s-20260816-s1": {
    notes: "Setting grinder harus dikurangi karena terlalu cepat",
  },
  "recipe-darkwine-k64s-20260816-s2": {
    notes: "Mungkin bisa dicoba setting 1,5 untuk tau rasanya",
  },
};

// Catatan umum yang ditempel ke machine tertentu (fill sekali, bukan overwrite paksa).
const MACHINE_NOTE_APPENDS = {
  "machine-mokapot-9barista": "Aturan grind: mulai dari 1 step (sesuai step size grinder) lebih kasar dari setting espresso bean & grinder yang sama.",
};

// Bean baru yang disebut user tapi belum ada di database — ditambahkan sekali
// lewat pencocokan id, sama seperti recipe historis.
// Machine baru yang disebut user tapi belum ada di database.
const NEW_MACHINES = [
  {
    id: "machine-mokapot-9barista",
    name: "Mokapot 9Barista (mod)",
    type: "Moka pot modifikasi (tekanan tinggi)",
    notes: "Aturan grind: mulai dari 1 step (sesuai step size grinder) lebih kasar dari setting espresso bean & grinder yang sama.",
  },
  {
    id: "machine-icafilas",
    name: "iCafilas (portable electric espresso)",
    type: "Portable espresso elektrik, self-heating, one-button (rating pompa ~15-19 bar, aktual brew pressure kemungkinan diregulasi turun kayak mesin lain — belum dites/dikonfirmasi)",
    notes: "BUKAN Wacaco Nanopresso (itu manual pump, beda produk) — sempat ketuker di catatan awal. iCafilas ini elektrik dengan elemen pemanas built-in + baterai, operasinya cuma pencet tombol, nggak ada kontrol manual sama sekali. KEMUNGKINAN BESAR pakai basket bertekanan/pressurized (umum di mesin travel compact yang kompatibel ground coffee + capsule) — basket ini punya restriksi/katup tambahan yang 'memaksa' tekanan terbangun meski grind kurang presisi, hasilnya sering lebih forgiving/balance dibanding basket standar non-pressurized di Breville. Ini variabel besar yang belum diverifikasi tapi kemungkinan lebih dominan dari faktor suhu.",
  },
];

const NEW_BEANS = [
  {
    id: "bean-rf",
    name: "RF - Robusta Fermentasi",
    origin: "",
    process: "Fermentasi",
    roast: "Medium",
    roastColor: 50,
    roastDate: "",
    density: "0.44",
    notes: "Tipe: Robusta. Benchmark favorit",
  },
  {
    id: "bean-adf",
    name: "ADF - Arabika Dampit Fermentasi",
    origin: "Dampit",
    process: "Fermentasi",
    roast: "",
    roastColor: 87,
    roastDate: "",
    density: "0.376",
    notes: "Tipe: Arabika. Data dial-in awal",
  },
  {
    id: "bean-adnf",
    name: "ADNF - Arabika Dampit Non-Fermentasi",
    origin: "Dampit",
    process: "Non-fermentasi",
    roast: "Medium-Dark",
    roastColor: 75,
    roastDate: "",
    density: "0.42",
    notes: "Tipe: Arabika. Balance pada Breville",
  },
  {
    id: "bean-turki",
    name: "Kopi Turki",
    origin: "",
    process: "",
    roast: "Light",
    roastColor: 0,
    roastDate: "",
    density: "0.40",
    notes: "Bridge dataset grinder",
  },
  {
    id: "bean-shaka",
    name: "Shaka Blend",
    origin: "",
    process: "",
    roast: "",
    roastColor: 98,
    roastDate: "",
    density: "0.30",
    notes: "Histori percobaan",
  },
  {
    id: "bean-jagung",
    name: "Kopi Jagung",
    origin: "",
    process: "",
    roast: "Dark",
    roastColor: 100,
    roastDate: "",
    density: "0.55",
    notes: "Tipe: Jagung sangrai. Eksperimen material non-kopi",
  },
  {
    id: "bean-robusta-biji-kecil",
    name: "Robusta Biji Kecil",
    origin: "",
    process: "",
    roast: "Dark",
    roastDate: "",
    density: "0.37",
    notes: "Biji kecil, dark roast",
  },
  {
    id: "bean-robusta-dark-wine",
    name: "Robusta Dark Wine",
    origin: "Semekar",
    process: "Wine",
    roast: "Medium-Light",
    roastColor: 87,
    roastDate: "",
    density: "0.382",
    notes: "",
  },
  {
    id: "bean-arabika-gayo",
    name: "Arabika Gayo Wine",
    origin: "Shaka",
    process: "Wine",
    roastColor: "82",
    roastDate: "9-8-2026",
    density: "0.42",
    notes: "",
  },
  {
    id: "bean-robusta-fer",
    name: "Robusta fer",
    origin: "",
    process: "Fermentasi",
    roastColor: "100",
    roastDate: "",
    density: "0.37",
    notes: "",
  },
  {
    id: "bean-robusta-peaberry",
    name: "Robusta peaberry",
    origin: "Sorong papua",
    process: "",
    roastColor: "78",
    roastDate: "",
    density: "0.33",
    notes: "",
  },
  {
    id: "bean-adf-winey",
    name: "ADF Winey",
    origin: "Dampit",
    process: "Winey",
    roast: "Medium-Dark",
    roastColor: 75,
    roastDate: "2026-08-17",
    density: "0.48",
    notes: "Stok baru ADF, roasting 17 Agustus 2026 (Senin, ~5 hari sebelum dial-in 22 Agustus — sudah cukup istirahat/rested, bukan fresh-roast) — beda karakter dari ADF lama (density lebih tinggi, proses winey bukan fermentasi biasa). ADF lama (bean-adf, density 0.376) tetap dianggap habis stok, jangan ketuker. STATUS: sudah habis, batch ini disangrai ulang jadi bean-adf-winey-reroast (density baru 0.413) — lihat bean itu buat data selanjutnya.",
  },
  {
    id: "bean-adf-winey-reroast",
    name: "ADF Winey (Re-roast)",
    origin: "Dampit",
    process: "Winey",
    roast: "Medium-Dark",
    roastColor: 75,
    roastDate: "",
    density: "0.413",
    notes: "Hasil roasting ulang dari bean-adf-winey (density turun dari 0.48 ke 0.413, ~14%, tanggal roasting ulang belum dicatat). Dipisah jadi bean tersendiri biar histori recipe nggak ketuker sama batch sebelum roasting ulang. Default 18g (setting 4 lama) BELUM valid lagi untuk density baru ini — kemungkinan butuh 5-6, tapi belum dites buat dose 18g (baru dites buat dose 10g, lihat recipe terkait). CATATAN KALIBRASI: roast level sebenarnya juga sedikit berubah saat roasting ulang (dugaan: api terlalu besar, bagian luar biji gosong duluan sebelum bagian dalam matang merata) — jadi batch ini BUKAN kasus 'density-only' yang bersih, ada kemungkinan roast uneven yang bikin perilaku grind kurang bisa diprediksi model density/roast sederhana. Jangan dipakai sebagai data kalibrasi murni buat misahin efek density vs roast.",
  },
  {
    id: "bean-robustafer-batang",
    name: "Robusfer (Batang)",
    origin: "Batang, Zenkopi Shopee",
    process: "Fermentasi",
    roast: "Medium",
    roastColor: 50,
    roastDate: "",
    density: "0.48",
    notes: "Beda batch dari 'Robusta fer' lama (bean-robusta-fer, density 0.37) — jangan ketuker. Rasa: asam-pahit balance, aftertaste manis, karakter nutty & mirip arabika (nggak umum buat robusta biasa) — worth diinget kalau beli ulang dari Zenkopi. CATATAN: disangrai 21 Agustus 2026 pagi, disangrai ulang malam harinya di hari yang sama karena terlalu keras — density hasil roasting ulang jadi 0.435 (turun dari 0.48). Lihat BEAN_FIELD_CORRECTIONS.",
  },
  {
    id: "bean-robustafer-batang-batch3",
    name: "Robusfer (Batang) - Batch 1kg",
    origin: "Batang, Zenkopi Shopee",
    process: "Fermentasi",
    roast: "Medium-Dark",
    roastColor: 75,
    roastDate: "2026-08-22",
    density: "0.404",
    notes: "Batch baru 1kg, disangrai 22 Agustus 2026 — beda dari 2 batch Robusfer sebelumnya (bean-robustafer-batang, density 0.48/0.435, roast Medium) dalam hal kuantitas & level roast (lebih gelap). Jangan ketuker sama bean-robustafer-batang.",
  },
];

function applyHistoricalPatch(db) {
  let changed = false;
  const existingIds = new Set(db.recipes.map((r) => r.id));
  const newRecipes = HISTORICAL_RECIPES.filter((r) => !existingIds.has(r.id));
  if (newRecipes.length > 0) changed = true;

  const existingLogIds = new Set((db.roughGuessLog || []).map((l) => l.id));
  const newLogEntries = HISTORICAL_ROUGH_LOG.filter((l) => !existingLogIds.has(l.id));
  if (newLogEntries.length > 0) changed = true;

  const existingBeanIds = new Set(db.beans.map((b) => b.id));
  const newBeans = NEW_BEANS.filter((b) => !existingBeanIds.has(b.id));
  if (newBeans.length > 0) changed = true;

  const existingMachineIds = new Set(db.machines.map((m) => m.id));
  const newMachines = NEW_MACHINES.filter((m) => !existingMachineIds.has(m.id));
  if (newMachines.length > 0) changed = true;

  const grinders = db.grinders.map((g) => {
    let updated = g;
    const note = GRINDER_NOTE_APPENDS[g.id];
    if (note && !(updated.notes || "").includes(note)) {
      changed = true;
      updated = { ...updated, notes: updated.notes ? `${updated.notes} ${note}` : note };
    }
    const corrections = GRINDER_FIELD_CORRECTIONS[g.id];
    if (corrections) {
      const patch = {};
      Object.entries(corrections).forEach(([k, v]) => {
        if (updated[k] !== v) patch[k] = v;
      });
      if (Object.keys(patch).length > 0) {
        changed = true;
        updated = { ...updated, ...patch };
      }
    }
    const fillFix = KNOWN_GRINDER_FIXES[g.id];
    if (fillFix) {
      const patch = {};
      Object.entries(fillFix).forEach(([k, v]) => {
        if (updated[k] === undefined || updated[k] === "" || updated[k] === null) patch[k] = v;
      });
      if (Object.keys(patch).length > 0) {
        changed = true;
        updated = { ...updated, ...patch };
      }
    }
    return updated;
  });

  const machines = db.machines.map((m) => {
    let updated = m;
    const note = MACHINE_NOTE_APPENDS[m.id];
    if (note && !(updated.notes || "").includes(note)) {
      changed = true;
      updated = { ...updated, notes: updated.notes ? `${updated.notes} ${note}` : note };
    }
    return updated;
  });

  // Gabungkan recipe lama (yang mungkin di-supersede) dengan recipe baru DULU,
  // baru terapkan koreksi field ke gabungannya — biar recipe yang baru aja
  // ditambahin dari HISTORICAL_RECIPES juga ikut kena perbaikan, bukan cuma
  // yang udah ada sebelumnya.
  const mergedRecipes = [
    ...db.recipes.map((r) => {
      const supersede = newRecipes.some(
        (nr) => nr.isDefault && nr.beanId === r.beanId && nr.grinderId === r.grinderId
      );
      return supersede ? { ...r, isDefault: false } : r;
    }),
    ...newRecipes,
  ].map((r) => {
    const corrections = RECIPE_FIELD_CORRECTIONS[r.id];
    if (!corrections) return r;
    const patch = {};
    Object.entries(corrections).forEach(([k, v]) => {
      if (r[k] !== v) patch[k] = v;
    });
    if (Object.keys(patch).length === 0) return r;
    changed = true;
    return { ...r, ...patch };
  });

  return {
    changed,
    fixed: {
      ...db,
      beans: [...db.beans, ...newBeans],
      machines: [...machines, ...newMachines],
      recipes: mergedRecipes,
      roughGuessLog: [...(db.roughGuessLog || []), ...newLogEntries],
      grinders,
    },
  };
}

// Nama mekanisme ini dipertahankan untuk kebutuhan masa depan, tapi kosong
// sekarang — "Robusta Dark Wine" sudah dipindah ke NEW_BEANS + HISTORICAL_RECIPES
// (id tetap) karena pencocokan lewat nama gagal saat bean aslinya hilang.
const PENDING_RECIPES_BY_BEAN_NAME = [];

function applyPendingByName(db) {
  let changed = false;
  let recipes = db.recipes.slice();

  PENDING_RECIPES_BY_BEAN_NAME.forEach((p) => {
    const already = recipes.some((r) => (r.notes || "").includes(p.sourceKey));
    if (already) return;
    const bean = db.beans.find((b) =>
      b.name.toLowerCase().includes(p.beanName.toLowerCase())
    );
    if (!bean) return; // bean belum ketemu di database user — coba lagi migrasi berikutnya

    if (p.isDefault) {
      recipes = recipes.map((r) =>
        r.beanId === bean.id && r.grinderId === p.grinderId ? { ...r, isDefault: false } : r
      );
    }
    recipes.push({
      id: uid(),
      beanId: bean.id,
      grinderId: p.grinderId,
      machineId: p.machineId,
      setting: p.setting,
      dose: p.dose,
      yield: p.yield,
      time: p.time,
      taste: p.taste,
      status: p.status,
      isDefault: p.isDefault,
      notes: p.notes,
    });
    changed = true;
  });

  return { changed, fixed: { ...db, recipes } };
}

// ---------- Storage hook ----------
// ---------- Supabase (database online) ----------
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gocvfahyeuhghmgjlbzf.supabase.co";
const SUPABASE_KEY = "sb_publishable_2CH4q3AA3Eig-BAygA89xA_J9jUnLxp";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sbSelect(table) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw new Error(`Gagal ambil data ${table}: ${error.message}`);
  return data;
}

async function sbUpsert(table, rows) {
  if (!rows || !rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`Gagal simpan ${table}: ${error.message}`);
}

async function sbDelete(table, ids) {
  if (!ids || !ids.length) return;
  const { error } = await supabase.from(table).delete().in("id", ids);
  if (error) throw new Error(`Gagal hapus dari ${table}: ${error.message}`);
}

// Konversi antara field camelCase yang dipakai app (di objek db) dan
// kolom snake_case di tabel Supabase.
function beanToRow(b) {
  return {
    id: b.id,
    name: b.name || "",
    origin: b.origin || "",
    process: b.process || "",
    roast: b.roast || "",
    roast_color: b.roastColor === undefined || b.roastColor === "" ? null : b.roastColor,
    roast_date: b.roastDate || "",
    density: b.density || "",
    notes: b.notes || "",
    out_of_stock: !!b.outOfStock,
    created_at: b.createdAt || new Date().toISOString(),
    updated_at: b.updatedAt || new Date().toISOString(),
  };
}
function rowToBean(r) {
  return {
    id: r.id,
    name: r.name,
    origin: r.origin,
    process: r.process,
    roast: r.roast,
    roastColor: r.roast_color,
    roastDate: r.roast_date,
    density: r.density,
    notes: r.notes,
    outOfStock: r.out_of_stock,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function grinderToRow(g) {
  return {
    id: g.id,
    name: g.name || "",
    burr_type: g.burrType || "",
    burr_size: g.burrSize || "",
    step_size: g.stepSize ?? "1",
    inner_burr: g.innerBurr || "",
    restricted_to_machine_id: g.restrictedToMachineId || null,
    notes: g.notes || "",
  };
}
function rowToGrinder(r) {
  return {
    id: r.id,
    name: r.name,
    burrType: r.burr_type,
    burrSize: r.burr_size,
    stepSize: r.step_size,
    innerBurr: r.inner_burr,
    restrictedToMachineId: r.restricted_to_machine_id || "",
    notes: r.notes,
  };
}
function machineToRow(m) {
  return { id: m.id, name: m.name || "", type: m.type || "", notes: m.notes || "" };
}
function rowToMachine(r) {
  return { id: r.id, name: r.name, type: r.type, notes: r.notes };
}
function recipeToRow(rec) {
  return {
    id: rec.id,
    bean_id: rec.beanId || null,
    grinder_id: rec.grinderId || null,
    machine_id: rec.machineId || null,
    setting: rec.setting != null ? String(rec.setting) : "",
    dose: rec.dose || "",
    yield: rec.yield || "",
    time: rec.time || "",
    wdt: rec.wdt || "",
    puck: rec.puck || "",
    basket: rec.basket || "",
    shot_type: rec.shotType || "Espresso",
    taste: rec.taste || "",
    rating: rec.rating === undefined || rec.rating === "" ? null : rec.rating,
    status: rec.status || "Experiment",
    is_default: !!rec.isDefault,
    notes: rec.notes || "",
    inner_burr: rec.innerBurr || "",
    predicted_setting: rec.predictedSetting != null ? String(rec.predictedSetting) : "",
    prediction_type: rec.predictionType || "",
    date: rec.date || new Date().toISOString(),
  };
}
function rowToRecipe(r) {
  return {
    id: r.id,
    beanId: r.bean_id,
    grinderId: r.grinder_id,
    machineId: r.machine_id,
    setting: r.setting,
    dose: r.dose,
    yield: r.yield,
    time: r.time,
    wdt: r.wdt,
    puck: r.puck,
    basket: r.basket,
    shotType: r.shot_type,
    taste: r.taste,
    rating: r.rating,
    status: r.status,
    isDefault: r.is_default,
    notes: r.notes,
    innerBurr: r.inner_burr,
    predictedSetting: r.predicted_setting,
    predictionType: r.prediction_type,
    date: r.date,
  };
}
function brewToRow(b) {
  return {
    id: b.id,
    recipe_id: b.recipeId || null,
    bean_id: b.beanId || null,
    grinder_id: b.grinderId || null,
    machine_id: b.machineId || null,
    size: b.size || "",
    feedback: b.feedback || "",
    dose: b.dose || "",
    yield: b.yield || "",
    time: b.time || "",
    inner_burr: b.innerBurr || "",
    date: b.date || new Date().toISOString(),
  };
}
function rowToBrew(r) {
  return {
    id: r.id,
    recipeId: r.recipe_id,
    beanId: r.bean_id,
    grinderId: r.grinder_id,
    machineId: r.machine_id,
    size: r.size,
    feedback: r.feedback,
    dose: r.dose,
    yield: r.yield,
    time: r.time,
    innerBurr: r.inner_burr,
    date: r.date,
  };
}
function roughToRow(rg) {
  return {
    id: rg.id,
    bean_id: rg.beanId || null,
    grinder_id: rg.grinderId || null,
    based_on_bean_name: rg.basedOnBeanName || "",
    predicted_setting: rg.predictedSetting ?? null,
    confirmed_good: rg.confirmedGood === undefined ? null : rg.confirmedGood,
    feedback: rg.feedback || "",
    date: rg.date || new Date().toISOString(),
  };
}
function rowToRough(r) {
  return {
    id: r.id,
    beanId: r.bean_id,
    grinderId: r.grinder_id,
    basedOnBeanName: r.based_on_bean_name,
    predictedSetting: r.predicted_setting,
    confirmedGood: r.confirmed_good,
    feedback: r.feedback,
    date: r.date,
  };
}

function useCoffeeDB() {
  const [db, setDb] = useState(emptyDB);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [saveStatus, setSaveStatus] = useState("saved"); // saved | saving | error
  const lastFailedRef = useRef(null);
  const dbRef = useRef(emptyDB);

  const syncToSupabase = useCallback(async (prev, next) => {
    const tables = [
      { key: "beans", table: "beans", toRow: beanToRow },
      { key: "grinders", table: "grinders", toRow: grinderToRow },
      { key: "machines", table: "machines", toRow: machineToRow },
      { key: "recipes", table: "recipes", toRow: recipeToRow },
      { key: "brews", table: "brews", toRow: brewToRow },
      { key: "roughGuessLog", table: "rough_guess_log", toRow: roughToRow },
    ];
    for (const { key, table, toRow } of tables) {
      const prevIds = new Set((prev[key] || []).map((r) => r.id));
      const nextRows = next[key] || [];
      const nextIds = new Set(nextRows.map((r) => r.id));
      const toDelete = [...prevIds].filter((id) => !nextIds.has(id));
      if (toDelete.length) await sbDelete(table, toDelete);
      if (nextRows.length) await sbUpsert(table, nextRows.map(toRow));
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [beansRows, grindersRows, machinesRows, recipesRows, brewsRows, roughRows] = await Promise.all([
          sbSelect("beans"),
          sbSelect("grinders"),
          sbSelect("machines"),
          sbSelect("recipes"),
          sbSelect("brews"),
          sbSelect("rough_guess_log"),
        ]);

        if (beansRows.length === 0) {
          const seedStep = applyHistoricalPatch(SEED_DATA);
          const { fixed } = applyDensityFix(seedStep.fixed);
          await Promise.all([
            sbUpsert("beans", fixed.beans.map(beanToRow)),
            sbUpsert("grinders", fixed.grinders.map(grinderToRow)),
            sbUpsert("machines", fixed.machines.map(machineToRow)),
            sbUpsert("recipes", fixed.recipes.map(recipeToRow)),
            sbUpsert("brews", fixed.brews.map(brewToRow)),
            sbUpsert("rough_guess_log", fixed.roughGuessLog.map(roughToRow)),
          ]);
          setDb(fixed);
          dbRef.current = fixed;
        } else {
          const loaded = {
            beans: beansRows.map(rowToBean),
            grinders: grindersRows.map(rowToGrinder),
            machines: machinesRows.map(rowToMachine),
            recipes: recipesRows.map(rowToRecipe),
            brews: brewsRows.map(rowToBrew),
            roughGuessLog: roughRows.map(rowToRough),
          };
          const step1 = applyDensityFix(loaded);
          const step2 = applyHistoricalPatch(step1.fixed);
          const step3 = applyPendingByName(step2.fixed);
          const fixed = step3.fixed;
          const changed = step1.changed || step2.changed || step3.changed;
          setDb(fixed);
          dbRef.current = fixed;
          if (changed) {
            try {
              await syncToSupabase(loaded, fixed);
              dbRef.current = fixed;
            } catch (syncErr) {
              console.error("Gagal sinkronin perbaikan data ke Supabase", syncErr);
            }
          }
        }
      } catch (e) {
        console.error("Gagal load data dari Supabase", e);
        setStatus("error");
        return;
      }
      setStatus("ready");
    })();
  }, [syncToSupabase]);

  const persist = useCallback(
    async (next) => {
      setDb(next);
      setSaveStatus("saving");
      try {
        await syncToSupabase(dbRef.current, next);
        dbRef.current = next;
        lastFailedRef.current = null;
        setSaveStatus("saved");
      } catch (e) {
        console.error("Gagal menyimpan ke Supabase", e);
        lastFailedRef.current = next;
        setSaveStatus("error");
      }
    },
    [syncToSupabase]
  );

  const retrySave = useCallback(async () => {
    if (!lastFailedRef.current) return;
    setSaveStatus("saving");
    try {
      await syncToSupabase(dbRef.current, lastFailedRef.current);
      dbRef.current = lastFailedRef.current;
      lastFailedRef.current = null;
      setSaveStatus("saved");
    } catch (e) {
      console.error("Retry gagal", e);
      setSaveStatus("error");
    }
  }, [syncToSupabase]);

  return { db, status, persist, saveStatus, retrySave };
}



// Indikator status simpan permanen — nempel di pojok atas, selalu keliatan
// biar user tau kapan data beneran udah kesimpen vs masih proses vs gagal.
function SaveStatusBadge({ saveStatus, onRetry }) {
  if (saveStatus === "saved") {
    return (
      <div
        className="fixed top-3 right-3 z-50 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
        style={{ backgroundColor: "#E3F5EC", color: "#1F7A4C" }}
      >
        <CheckCircle2 size={13} /> Tersimpan
      </div>
    );
  }
  if (saveStatus === "saving") {
    return (
      <div
        className="fixed top-3 right-3 z-50 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
        style={{ backgroundColor: "#FBF3DD", color: "#A6801F" }}
      >
        <Loader2 size={13} className="animate-spin" /> Menyimpan…
      </div>
    );
  }
  return (
    <button
      onClick={onRetry}
      className="fixed top-3 right-3 z-50 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
      style={{ backgroundColor: "#FBEADD", color: "#B8632E", border: "1px solid #B8632E" }}
    >
      <AlertCircle size={13} /> Gagal, tap utk retry
    </button>
  );
}

// ---------- Small UI atoms ----------
function ScreenHeader({ title, subtitle, onBack }) {
  return (
    <div className="flex items-start gap-3 px-5 pt-6 pb-4">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Kembali"
          className="mt-1 shrink-0 w-9 h-9 rounded-full flex items-center justify-center focus:outline-none"
          style={{ backgroundColor: "#F0ECE7", border: "1px solid #DDD6CE", color: "#C69163" }}
        >
          <ChevronLeft size={18} />
        </button>
      )}
      <div>
        <h1
          className="text-2xl leading-tight tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: "#1A1512" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: "#6B6058" }}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function BigMenuButton({ icon: Icon, label, desc, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-4 rounded-2xl border px-5 py-4 text-left focus:outline-none"
      style={{
        borderColor: disabled ? "#E5DFD8" : "#DDD6CE",
        backgroundColor: disabled ? "#F7F3EE" : "#F0ECE7",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div
        className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: disabled ? "#EDE8E3" : "#F5E6D8" }}
      >
        <Icon size={20} style={{ color: disabled ? "#736657" : "#B8763C" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[15px]"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: "#2A2118" }}
        >
          {label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "#6B6058" }}>{desc}</div>
      </div>
      {disabled && (
        <span
          className="shrink-0 text-[10px] uppercase tracking-wide rounded-full px-2 py-1"
          style={{ color: "#736657", border: "1px solid #DDD6CE" }}
        >
          Segera
        </span>
      )}
    </button>
  );
}

function EmptyState({ text, cta }) {
  return (
    <div className="text-center py-14 px-6">
      <p className="text-sm" style={{ color: "#6B6058" }}>{text}</p>
      {cta}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs mb-1.5" style={{ color: "#6B6058" }}>{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none";
const inputStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #DDD6CE",
  color: "#2A2118",
};

// Dropdown buatan sendiri — TIDAK pakai <select> native, karena popup bawaan
// sistem (terutama di iOS) sering transparan/kontras jelek dan nggak bisa
// diwarnai penuh lewat CSS. Ini full custom, styling terjamin konsisten.
// Tombol pilihan langsung (bukan dropdown) — buat field yang cuma 2-3 opsi.
// Nggak butuh lapisan "penutup layar" kayak CustomSelect, jadi nggak rawan
// macet/freeze di beberapa device.
function ToggleGroup({ value, onChange, options }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="rounded-xl py-2.5 text-sm"
          style={{
            backgroundColor: value === o.value ? "#C69163" : "transparent",
            color: value === o.value ? "#332C2A" : "#736657",
            border: `1px solid ${value === o.value ? "#C69163" : "#DDD6CE"}`,
            fontWeight: value === o.value ? 600 : 400,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CustomSelect({ value, onChange, options, placeholder = "Pilih…" }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={inputCls + " flex items-center justify-between gap-2"}
        style={inputStyle}
      >
        <span style={{ color: selected ? "#2A2118" : "#736657" }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          style={{ color: "#6B6058" }}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 right-0 mt-1.5 z-40 rounded-xl overflow-hidden shadow-xl max-h-60 overflow-y-auto"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #DDD6CE" }}
          >
            {options.length === 0 ? (
              <div className="px-3.5 py-3 text-sm" style={{ color: "#736657" }}>
                Belum ada pilihan.
              </div>
            ) : (
              options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-sm"
                  style={{
                    backgroundColor: o.value === value ? "#F0ECE7" : "#FFFFFF",
                    color: o.value === value ? "#C69163" : "#2A2118",
                    borderBottom: "1px solid #F0ECE7",
                  }}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Bikin Kopi module ----------
// Ikon biji kopi flat (bukan cuma garis outline) — bentuk oval dimiringkan
// plus garis lekuk di tengah, diisi warna solid sesuai roast color-nya.
// Nempel di bawah badge prediksi (bridge/rough/adjusted) kalau angkanya
// udah dikoreksi otomatis dari histori simpangan saran vs pemakaian nyata.
function NudgeNote({ prediction }) {
  if (!prediction?.nudgeApplied) return null;
  const amt = prediction.nudgeApplied;
  return (
    <div className="text-[11px] mt-1" style={{ color: "#736657" }}>
      🔧 Sudah dikoreksi {amt > 0 ? "+" : ""}
      {amt} dari histori simpangan saran ({prediction.nudgeSampleCount} data)
    </div>
  );
}

function CoffeeBeanIcon({ size = 40, color = "#8F5A34" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ shapeRendering: "geometricPrecision" }}>
      <ellipse cx="12" cy="12" rx="9.5" ry="6.5" transform="rotate(-40 12 12)" fill={color} />
      <path
        d="M6.2 12 C8.8 8.6, 15.2 8.6, 17.8 12 C15.2 15.4, 8.8 15.4, 6.2 12 Z"
        transform="rotate(-40 12 12)"
        fill="rgba(0,0,0,0.28)"
      />
    </svg>
  );
}

// Kartu recap percobaan TERAKHIR (by tanggal) — beda dari saran setting,
// ini murni histori "apa yang beneran saya coba terakhir kali", nggak
// peduli itu default/rating tertinggi atau bukan.
function LastTrialCard({ db, beanId, grinderId, machineId }) {
  const r = findLatestRecipe(db, beanId, grinderId, machineId);
  if (!r) {
    return (
      <div
        className="mt-4 rounded-2xl px-4 py-3.5 text-center"
        style={{ backgroundColor: "#F7F3EE", border: "1px solid #DDD6CE" }}
      >
        <div className="text-sm" style={{ color: "#736657" }}>
          Belum pernah dicoba untuk kombinasi ini
        </div>
      </div>
    );
  }
  const details = [r.dose && `${r.dose}g`, r.yield && `→${r.yield}g`, r.time && `${r.time}s`]
    .filter(Boolean)
    .join(" · ");
  const tasteLine = [r.taste, r.rating && `${r.rating}/10`].filter(Boolean).join(" · ");
  const fmtDate = (iso) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };
  return (
    <div
      className="mt-4 rounded-2xl px-4 py-3.5"
      style={{ backgroundColor: "#FBF3DD", border: "1px solid #A6801F" }}
    >
      <div className="text-xs font-semibold mb-1.5" style={{ color: "#A6801F" }}>
        📋 Percobaan Terakhir · setting {r.setting}
      </div>
      {details && <div className="text-sm" style={{ color: "#2A2118" }}>{details}</div>}
      {tasteLine && <div className="text-sm mt-0.5" style={{ color: "#2A2118" }}>{tasteLine}</div>}
      {fmtDate(r.date) && <div className="text-xs mt-1" style={{ color: "#736657" }}>{fmtDate(r.date)}</div>}
      {r.notes && (
        <div className="text-sm mt-1.5 italic" style={{ color: "#2A2118" }}>
          "{r.notes}"
        </div>
      )}
    </div>
  );
}

function SelectCard({ title, subtitle, onClick, swatchColor }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl px-4 py-3.5 focus:outline-none"
      style={{ backgroundColor: "#F7F3EE", border: "1px solid #DDD6CE" }}
    >
      <div className="flex items-center gap-2">
        {swatchColor && (
          <span
            className="w-3.5 h-3.5 rounded-full shrink-0"
            style={{ backgroundColor: swatchColor, border: "1px solid rgba(0,0,0,0.3)" }}
          />
        )}
        <div
          className="text-sm"
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#2A2118" }}
        >
          {title}
        </div>
      </div>
      {subtitle && <div className="text-xs mt-1" style={{ color: "#6B6058" }}>{subtitle}</div>}
    </button>
  );
}

function BikinKopiScreen({ db, persist, onBack, onGoDatabase }) {
  const [step, setStep] = useState("bean"); // bean | grinder | machine | size | result | feedback | confirmSave | done
  const [beanId, setBeanId] = useState(null);
  const [grinderId, setGrinderId] = useState(null);
  const [machineId, setMachineId] = useState(null);
  const [size, setSize] = useState(null); // single | double | lain
  const [customDose, setCustomDose] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [quickDose, setQuickDose] = useState("");
  const [quickYield, setQuickYield] = useState("");
  const [quickTime, setQuickTime] = useState("");

  const bean = db.beans.find((b) => b.id === beanId);
  const grinder = db.grinders.find((g) => g.id === grinderId);
  const machine = db.machines.find((m) => m.id === machineId);
  const prediction = beanId && grinderId && machineId ? predictSetting(db, beanId, grinderId, machineId) : null;
  const availableBeans = db.beans.filter((b) => !b.outOfStock);

  // Kalau prediksinya "exact" (ada recipe asli) dan dose recipe itu beda
  // dari dose target ukuran yang dipilih, geser settingnya sesuai
  // kalibrasi dose→step. Bridge/rough/adjusted dilewati karena nggak ada
  // dose baseline yang jelas buat jadi patokan geser.
  const targetDose = resolveTargetDose(size, customDose);
  const baseDoseForAdjust = prediction?.type === "exact" ? parseFloat(prediction.recipe.dose) : null;
  const doseAdjusted =
    prediction?.type === "exact" && targetDose != null
      ? doseAdjustSetting(parseFloat(prediction.recipe.setting), baseDoseForAdjust, targetDose, grinder)
      : null;

  // Kalau recipe yang lagi ditampilkan dicatat waktu inner burr grinder ini
  // masih di posisi beda dari sekarang, settingnya kemungkinan udah nggak
  // valid lagi — tampilkan sebagai peringatan, bukan cuma diam-diam salah.
  const innerBurrMismatch =
    prediction?.type === "exact" &&
    grinder?.innerBurr &&
    prediction.recipe.innerBurr &&
    String(grinder.innerBurr).trim() !== String(prediction.recipe.innerBurr).trim();

  const reset = () => {
    setStep("bean");
    setBeanId(null);
    setGrinderId(null);
    setMachineId(null);
    setSize(null);
    setCustomDose("");
    setFeedback(null);
    setQuickDose("");
    setQuickYield("");
    setQuickTime("");
  };

  const STEP_BACK = { bean: null, grinder: "bean", machine: "grinder", size: "machine", result: "size", feedback: "result" };
  const goBack = () => {
    const prev = STEP_BACK[step];
    if (prev) setStep(prev);
    else onBack();
  };

  const finishBrew = (fb) => {
    const brew = {
      id: uid(),
      recipeId: prediction?.type === "exact" ? prediction.recipe.id : null,
      beanId,
      grinderId,
      machineId,
      size,
      feedback: fb || null,
      dose: quickDose.trim(),
      yield: quickYield.trim(),
      time: quickTime.trim(),
      innerBurr: grinder?.innerBurr || "",
      date: new Date().toISOString(),
    };
    setFeedback(fb);
    persist({ ...db, brews: [...db.brews, brew] });

    // kalau ini masih prediksi (bridge) atau tebakan kasar (rough), tanya dulu
    // apa mau dijadikan recipe verified — sekaligus jadi titik pencatatan akurasi.
    const needsConfirm = prediction?.type === "bridge" || prediction?.type === "rough";
    setStep(needsConfirm ? "confirmSave" : "done");
  };

  const confirmAsDefault = (yes) => {
    if (prediction?.type === "rough") {
      const logEntry = {
        id: uid(),
        beanId,
        grinderId,
        basedOnBeanName: prediction.basedOnBeanName,
        predictedSetting: prediction.setting,
        confirmedGood: yes,
        feedback,
        date: new Date().toISOString(),
      };
      persist({ ...db, roughGuessLog: [...db.roughGuessLog, logEntry] });
    }
    if (yes && (prediction?.type === "bridge" || prediction?.type === "rough")) {
      const newRecipe = {
        id: uid(),
        beanId,
        grinderId,
        machineId,
        setting: String(prediction.setting),
        dose: "",
        yield: "",
        time: "",
        taste: feedback,
        rating: null,
        status: "Verified",
        isDefault: true,
        innerBurr: grinder?.innerBurr || "",
        notes:
          prediction.type === "bridge"
            ? `Dikonfirmasi dari prediksi bridge (via ${prediction.fromGrinderName})`
            : `Dikonfirmasi dari tebakan kasar (basis: ${prediction.basedOnBeanName})`,
        date: new Date().toISOString(),
      };
      const cleared = db.recipes.map((r) =>
        r.beanId === beanId && r.grinderId === grinderId && r.machineId === machineId ? { ...r, isDefault: false } : r
      );
      persist({ ...db, recipes: [...cleared, newRecipe] });
    }
    setStep("done");
  };

  return (
    <div className="min-h-full pb-10">
      <ScreenHeader
        title="Bikin Kopi"
        subtitle={
          step === "bean"
            ? "Pilih bean yang mau diseduh"
            : step === "grinder"
            ? "Pilih grinder yang dipakai"
            : step === "machine"
            ? "Pilih mesin yang dipakai"
            : step === "size"
            ? "Ukuran seduhan"
            : step === "result"
            ? "Setting siap"
            : step === "feedback"
            ? "Gimana rasanya?"
            : step === "confirmSave"
            ? "Konfirmasi hasil prediksi"
            : ""
        }
        onBack={step === "confirmSave" || step === "done" ? undefined : goBack}
      />

      {step === "bean" &&
        (availableBeans.length === 0 ? (
          <div className="px-5">
            <EmptyState
              text={
                db.beans.length === 0
                  ? "Belum ada bean di database."
                  : "Semua bean lagi ditandai habis. Tandai ada stok lagi di Database, atau tambah bean baru."
              }
              cta={
                <button
                  onClick={() => onGoDatabase("beans")}
                  className="mt-3 rounded-xl text-sm font-semibold px-4 py-2" style={{ backgroundColor: "#C69163", color: "#332C2A" }}
                >
                  {db.beans.length === 0 ? "Tambah Bean" : "Buka Database"}
                </button>
              }
            />
          </div>
        ) : (
          <div className="px-5 space-y-2.5">
            {availableBeans.map((b) => (
              <SelectCard
                key={b.id}
                title={b.name}
                subtitle={[b.origin, b.roastColor !== undefined && b.roastColor !== "" ? nearestRoastLabel(b.roastColor) : b.roast].filter(Boolean).join(" · ")}
                swatchColor={b.roastColor !== undefined && b.roastColor !== "" ? roastColorFromValue(b.roastColor) : undefined}
                onClick={() => {
                  setBeanId(b.id);
                  setStep("grinder");
                }}
              />
            ))}
          </div>
        ))}

      {step === "grinder" &&
        (db.grinders.length === 0 ? (
          <div className="px-5">
            <EmptyState
              text="Belum ada grinder di database."
              cta={
                <button
                  onClick={() => onGoDatabase("grinders")}
                  className="mt-3 rounded-xl text-sm font-semibold px-4 py-2" style={{ backgroundColor: "#C69163", color: "#332C2A" }}
                >
                  Tambah Grinder
                </button>
              }
            />
          </div>
        ) : (
          <div className="px-5 space-y-2.5">
            {db.grinders.map((g) => (
              <SelectCard
                key={g.id}
                title={g.name}
                subtitle={g.burrType}
                onClick={() => {
                  setGrinderId(g.id);
                  const compat = compatibleMachines(db, g);
                  if (compat.length === 1) {
                    setMachineId(compat[0].id);
                    setStep("size");
                  } else {
                    setStep("machine");
                  }
                }}
              />
            ))}
          </div>
        ))}

      {step === "machine" &&
        (compatibleMachines(db, grinder).length === 0 ? (
          <div className="px-5">
            <EmptyState
              text="Belum ada machine yang cocok buat grinder ini di database."
              cta={
                <button
                  onClick={() => onGoDatabase("machines")}
                  className="mt-3 rounded-xl text-sm font-semibold px-4 py-2" style={{ backgroundColor: "#C69163", color: "#332C2A" }}
                >
                  Tambah Machine
                </button>
              }
            />
          </div>
        ) : (
          <div className="px-5 space-y-2.5">
            {compatibleMachines(db, grinder).map((m) => (
              <SelectCard
                key={m.id}
                title={m.name}
                subtitle={m.type}
                onClick={() => {
                  setMachineId(m.id);
                  setStep("size");
                }}
              />
            ))}
          </div>
        ))}

      {step === "size" && (
        <SizePicker
          size={size}
          setSize={setSize}
          customDose={customDose}
          setCustomDose={setCustomDose}
          onContinue={() => setStep("result")}
        />
      )}

      {step === "result" && (
        <div className="px-5">
          {!prediction ? (
            <EmptyState
              text={`Belum ada data sama sekali untuk ${bean?.name} + ${machine?.name} + ${grinder?.name} (termasuk tebakan kasar — kemungkinan density bean ini juga belum diisi). Coba Dial-In dulu.`}
              cta={
                <button
                  onClick={() => onGoDatabase("history")}
                  className="mt-3 rounded-xl text-sm font-semibold px-4 py-2" style={{ backgroundColor: "#C69163", color: "#332C2A" }}
                >
                  Tambah Recipe
                </button>
              }
            />
          ) : (
            <>
              <div
                className="rounded-3xl px-6 py-8 text-center"
                style={{ backgroundColor: "#F7F3EE", border: "1px solid #DDD6CE" }}
              >
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "#6B6058" }}>
                  {bean?.name} · {machine?.name} · {grinder?.name}
                </div>
                <div className="flex items-center justify-center gap-3 mt-3">
                  {bean?.roastColor !== undefined && bean?.roastColor !== "" && (
                    <CoffeeBeanIcon
                      size={40}
                      color={roastColorFromValue(bean.roastColor)}
                    />
                  )}
                  <div
                    className="text-6xl"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#2A2118" }}
                  >
                    {doseAdjusted != null ? doseAdjusted : prediction.type === "exact" ? prediction.recipe.setting : prediction.setting}
                  </div>
                </div>
                <div className="text-xs mt-1" style={{ color: "#6B6058" }}>Putaran grinder</div>

                {innerBurrMismatch && (
                  <div
                    className="inline-flex items-center gap-1.5 mt-4 rounded-full text-xs px-3 py-1.5"
                    style={{ backgroundColor: "#FBEADD", color: "#B5493A" }}
                  >
                    ⚠️ Inner burr sekarang ({grinder.innerBurr}) beda dari saat data ini dicatat ({prediction.recipe.innerBurr})
                  </div>
                )}
                {doseAdjusted != null && (
                  <div
                    className="inline-flex items-center gap-1.5 mt-4 rounded-full text-xs px-3 py-1.5"
                    style={{ backgroundColor: "#F5E6D8", color: "#B8763C" }}
                  >
                    ⚖️ Disesuaikan dari data dose {prediction.recipe.dose}g ke ~{targetDose}g
                  </div>
                )}
                {doseAdjusted == null && prediction.type === "exact" && prediction.recipe.status === "Experiment" && (
                  <div
                    className="inline-flex items-center gap-1.5 mt-4 rounded-full text-xs px-3 py-1.5"
                    style={{ backgroundColor: "#FBF3DD", color: "#A6801F" }}
                  >
                    🟡 Eksperimen — belum tentu pas
                  </div>
                )}
                {doseAdjusted == null && prediction.type === "exact" && prediction.recipe.status !== "Experiment" && (
                  <div
                    className="inline-flex items-center gap-1.5 mt-4 rounded-full text-xs px-3 py-1.5"
                    style={{ backgroundColor: "#E3F5EC", color: "#1F7A4C" }}
                  >
                    🟢 Verified
                  </div>
                )}
                {prediction.type === "bridge" && (
                  <>
                    <div
                      className="inline-flex items-center gap-1.5 mt-4 rounded-full text-xs px-3 py-1.5"
                      style={{ backgroundColor: "#EDE7F7", color: "#6B4FA0" }}
                    >
                      🔮 Prediksi — belum pernah dites langsung
                    </div>
                    <div className="text-[11px] mt-2" style={{ color: "#736657" }}>
                      Dihitung dari {grinder?.name} vs {prediction.fromGrinderName} ({bean?.name} pernah di setting {prediction.fromSetting} di {prediction.fromGrinderName}) · {prediction.sampleCount} data bridge
                    </div>
                    <NudgeNote prediction={prediction} />
                  </>
                )}
                {prediction.type === "rough" && (
                  <>
                    <div
                      className="inline-flex items-center gap-1.5 mt-4 rounded-full text-xs px-3 py-1.5"
                      style={{ backgroundColor: "#FBEADD", color: "#B8632E" }}
                    >
                      🧪 Tebakan kasar — belum tervalidasi
                    </div>
                    <div className="text-[11px] mt-2" style={{ color: "#736657" }}>
                      Berdasarkan density terdekat: {prediction.basedOnBeanName} (d={Math.round(prediction.basedOnDensity * 100)}{prediction.sameRoast ? ", roast sama" : ""}) · bukan hasil seduhan langsung
                    </div>
                    <NudgeNote prediction={prediction} />
                  </>
                )}
              </div>

              <LastTrialCard db={db} beanId={beanId} grinderId={grinderId} machineId={machineId} />

              <button
                onClick={() => setStep("feedback")}
                className="w-full mt-6 rounded-2xl py-4 text-sm font-semibold"
                style={{ backgroundColor: "#C69163", color: "#332C2A" }}
              >
                Seduh
              </button>
            </>
          )}
        </div>
      )}

      {step === "feedback" && (
        <div className="px-5">
          <p className="text-sm mb-4" style={{ color: "#6B6058" }}>
            {prediction?.type === "bridge"
              ? "Ini masih prediksi — catat rasanya biar bisa dikonfirmasi."
              : prediction?.type === "rough"
              ? "Ini masih tebakan kasar — catat rasanya biar bisa dinilai akurasinya."
              : "Opsional — catat rasanya biar makin akurat ke depan."}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {["Asam", "Balance", "Pahit", "Encer", "Nendang", "Hambar"].map((tag) => (
              <button
                key={tag}
                onClick={() => setFeedback(tag)}
                className="rounded-xl py-3 text-sm"
                style={{
                  backgroundColor: feedback === tag ? "#C69163" : "transparent",
                  color: feedback === tag ? "#332C2A" : "#2A2118",
                  border: `1px solid ${feedback === tag ? "#C69163" : "#DDD6CE"}`,
                  fontWeight: feedback === tag ? 600 : 400,
                }}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl px-4 py-3.5" style={{ backgroundColor: "#F7F3EE", border: "1px dashed #DDD6CE" }}>
            <div className="text-xs mb-2.5" style={{ color: "#6B6058" }}>
              Kalau sempat nimbang/hitung waktu (opsional, boleh dikosongin)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Dose (g)">
                <input
                  className={inputCls} style={inputStyle}
                  placeholder="—"
                  value={quickDose}
                  onChange={(e) => setQuickDose(e.target.value)}
                />
              </Field>
              <Field label="Yield (g)">
                <input
                  className={inputCls} style={inputStyle}
                  placeholder="—"
                  value={quickYield}
                  onChange={(e) => setQuickYield(e.target.value)}
                />
              </Field>
              <Field label="Waktu (s)">
                <input
                  className={inputCls} style={inputStyle}
                  placeholder="—"
                  value={quickTime}
                  onChange={(e) => setQuickTime(e.target.value)}
                />
              </Field>
            </div>
          </div>

          <button
            onClick={() => finishBrew(feedback)}
            className="w-full mt-4 rounded-2xl py-3.5 text-sm font-semibold"
            style={{ backgroundColor: "#C69163", color: "#332C2A" }}
          >
            Selesai
          </button>
          <button
            onClick={() => finishBrew(null)}
            className="w-full mt-2.5 rounded-xl py-3 text-sm"
            style={{ color: "#6B6058", border: "1px solid #E5DFD8" }}
          >
            Lewati
          </button>
        </div>
      )}

      {step === "confirmSave" && (
        <div className="px-5 text-center py-10">
          <h2
            className="text-xl mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: "#2A2118" }}
          >
            Rasanya pas?
          </h2>
          <p className="text-sm mb-6" style={{ color: "#6B6058" }}>
            Setting {prediction?.setting} ({feedback || "tanpa catatan rasa"}) tadi masih {prediction?.type === "rough" ? "tebakan kasar" : "prediksi"}. Simpan jadi recipe verified untuk {bean?.name} + {grinder?.name}?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => confirmAsDefault(false)}
              className="flex-1 rounded-xl py-3 text-sm"
              style={{ border: "1px solid #DDD6CE", color: "#6B6058" }}
            >
              Belum, masih coba
            </button>
            <button
              onClick={() => confirmAsDefault(true)}
              className="flex-1 rounded-xl py-3 text-sm font-semibold"
              style={{ backgroundColor: "#C69163", color: "#332C2A" }}
            >
              Ya, enak & pas
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="px-5 text-center py-10">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#E3F5EC", color: "#1F7A4C" }}
          >
            <Check size={26} />
          </div>
          <h2
            className="text-xl mb-1.5"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: "#2A2118" }}
          >
            Selamat menikmati ☕
          </h2>
          <p className="text-sm" style={{ color: "#6B6058" }}>
            {feedback ? `Dicatat: ${feedback}` : "Kopi tercatat tanpa feedback rasa."}
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={reset}
              className="flex-1 rounded-xl py-2.5 text-sm"
              style={{ border: "1px solid #DDD6CE", color: "#6B6058" }}
            >
              Bikin Lagi
            </button>
            <button
              onClick={onBack}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
              style={{ backgroundColor: "#C69163", color: "#332C2A" }}
            >
              Ke Beranda
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Dial-In module ----------
const TASTE_TAGS = ["Asam", "Balance", "Pahit", "Encer", "Nendang", "Hambar"];

// Target kasar per jenis shot — cuma buat hint di layar, bukan aturan kaku.
const SHOT_TYPES = [
  { key: "Ristretto", hint: "Rasio ~1:1-1:1,5 · waktu ~20-25 detik" },
  { key: "Espresso", hint: "Rasio ~1:2 · waktu ~25-30 detik" },
  { key: "Lungo", hint: "Rasio ~1:3-1:4 · waktu ~30-40 detik" },
  { key: "Turbo Shot", hint: "Rasio ~1:2,5-1:3 · waktu ~15-20 detik · grind lebih kasar, tekanan lebih rendah" },
  { key: "Lainnya", hint: "" },
];

// Rentang waktu (detik) buat masing-masing jenis shot — sama kayak yang
// dipakai di hint SHOT_TYPES di atas, tapi dalam bentuk angka biar bisa
// dipakai buat klasifikasi otomatis + saran arah geser grind.
const SHOT_TIME_RANGE = {
  "Turbo Shot": [15, 20],
  Ristretto: [20, 25],
  Espresso: [25, 30],
  Lungo: [30, 40],
};

// Klasifikasi hasil shot berdasarkan waktu ekstraksi aktual (paling
// reliable dibanding rasio doang) — dipakai buat kasih tau user "ini
// hasilnya kecemplung ke kategori apa", terlepas dari yang dia pilih di awal.
function classifyShotResult(dose, yieldVal, time) {
  const d = parseFloat(dose);
  const y = parseFloat(yieldVal);
  const t = parseFloat(time);
  if (isNaN(t)) return null;
  const ratio = !isNaN(d) && !isNaN(y) && d > 0 ? y / d : null;
  let category = "Lainnya";
  if (t < 15) category = "Lainnya";
  else if (t <= 20) category = "Turbo Shot";
  else if (t <= 25) category = "Ristretto";
  else if (t <= 30) category = "Espresso";
  else if (t <= 40) category = "Lungo";
  return { category, ratio, time: t };
}

// Saran arah geser grind buat shot BERIKUTNYA kalau mau ngejar shotType
// yang tadinya diniatkan (bukan yang kepencet). Ini estimasi konservatif
// (1 step grinder ke arah yang benar), BUKAN hasil kalkulasi presisi —
// nggak ada data kalibrasi detik-per-step, jadi cuma dikasih arah + 1 step
// kecil sebagai titik awal coba-coba berikutnya.
function suggestNextGrindShift(actualTime, targetShotType, grinder) {
  const range = SHOT_TIME_RANGE[targetShotType];
  const t = parseFloat(actualTime);
  if (!range || isNaN(t)) return null;
  const step = parseFloat(grinder?.stepSize) || 1;
  if (t < range[0]) return { direction: "finer", stepDelta: step };
  if (t > range[1]) return { direction: "coarser", stepDelta: step };
  return null;
}

function DialInScreen({ db, persist, onBack, onGoDatabase }) {
  const [step, setStep] = useState("bean"); // bean|grinder|machine|size|shotType|prediction|shot|evaluasi|confirmDefault|done
  const [beanId, setBeanId] = useState(null);
  const [grinderId, setGrinderId] = useState(null);
  const [machineId, setMachineId] = useState(null);
  const [size, setSize] = useState(null); // single | double | lain
  const [customDose, setCustomDose] = useState("");
  const [shotType, setShotType] = useState(null);
  const [shot, setShot] = useState({
    setting: "",
    dose: "",
    yield: "",
    time: "",
    wdt: "Ya",
    puck: "Kertas",
    basket: "Standard",
  });
  const [taste, setTaste] = useState(null);
  const [rating, setRating] = useState(null);
  const [savedRecipe, setSavedRecipe] = useState(null);
  const [taste2Notes, setTaste2Notes] = useState("");

  const bean = db.beans.find((b) => b.id === beanId);
  const grinder = db.grinders.find((g) => g.id === grinderId);
  const prediction = beanId && grinderId && machineId && shotType ? predictSetting(db, beanId, grinderId, machineId, shotType) : null;
  const availableBeans = db.beans.filter((b) => !b.outOfStock);

  // Sama kayak Bikin Kopi: kalau ada recipe asli (exact) dengan dose beda
  // dari target ukuran yang dipilih, geser settingnya sebagai titik awal.
  const targetDose = resolveTargetDose(size, customDose);
  const baseDoseForAdjust = prediction?.type === "exact" ? parseFloat(prediction.recipe.dose) : null;
  const doseAdjusted =
    prediction?.type === "exact" && targetDose != null
      ? doseAdjustSetting(parseFloat(prediction.recipe.setting), baseDoseForAdjust, targetDose, grinder)
      : null;
  const innerBurrMismatch =
    prediction?.type === "exact" &&
    grinder?.innerBurr &&
    prediction.recipe.innerBurr &&
    String(grinder.innerBurr).trim() !== String(prediction.recipe.innerBurr).trim();

  const reset = () => {
    setStep("bean");
    setBeanId(null);
    setGrinderId(null);
    setMachineId(null);
    setSize(null);
    setCustomDose("");
    setShotType(null);
    setShot({ setting: "", dose: "", yield: "", time: "", wdt: "Ya", puck: "Kertas", basket: "Standard" });
    setTaste(null);
    setRating(null);
    setSavedRecipe(null);
    setTaste2Notes("");
  };

  const setShotField = (k, v) => setShot((prev) => ({ ...prev, [k]: v }));

  const STEP_BACK = {
    bean: null,
    grinder: "bean",
    machine: "grinder",
    size: "machine",
    shotType: "size",
    prediction: "shotType",
    shot: "prediction",
    evaluasi: "shot",
  };
  const goBack = () => {
    const prev = STEP_BACK[step];
    if (prev) setStep(prev);
    else onBack();
  };

  const canSaveShot = shot.setting.trim().length > 0;

  const saveTrial = () => {
    const recipe = {
      id: uid(),
      beanId,
      grinderId,
      machineId,
      setting: shot.setting,
      dose: shot.dose,
      yield: shot.yield,
      time: shot.time,
      wdt: shot.wdt,
      puck: shot.puck,
      basket: shot.basket,
      shotType: shotType || "Espresso",
      taste,
      rating,
      status: "Experiment",
      isDefault: false,
      innerBurr: grinder?.innerBurr || "",
      predictedSetting: prediction && prediction.type !== "exact" ? prediction.setting : "",
      predictionType: prediction && prediction.type !== "exact" ? prediction.type : "",
      notes: taste2Notes.trim(),
      date: new Date().toISOString(),
    };
    persist({ ...db, recipes: [...db.recipes, recipe] });
    setSavedRecipe(recipe);
    setStep("confirmDefault");
  };

  const markDefault = (yes) => {
    if (!yes) {
      setStep("done");
      return;
    }
    const updated = db.recipes.map((r) => {
      if (r.id === savedRecipe.id) return { ...r, isDefault: true, status: "Verified" };
      if (r.beanId === beanId && r.grinderId === grinderId) return { ...r, isDefault: false };
      return r;
    });
    persist({ ...db, recipes: updated });
    setStep("done");
  };

  return (
    <div className="min-h-full pb-10">
      <ScreenHeader
        title="Dial-In"
        subtitle={
          step === "bean"
            ? "Pilih bean yang mau dieksplor"
            : step === "grinder"
            ? "Pilih grinder yang dipakai"
            : step === "machine"
            ? "Pilih mesin yang dipakai"
            : step === "size"
            ? "Ukuran seduhan"
            : step === "shotType"
            ? "Mau bikin jenis shot apa?"
            : step === "prediction"
            ? "Titik awal percobaan"
            : step === "shot"
            ? "Catat hasil shot"
            : step === "evaluasi"
            ? "Evaluasi rasa"
            : ""
        }
        onBack={step === "confirmDefault" || step === "done" ? undefined : goBack}
      />

      {step === "bean" &&
        (availableBeans.length === 0 ? (
          <div className="px-5">
            <EmptyState
              text={
                db.beans.length === 0
                  ? "Belum ada bean di database."
                  : "Semua bean lagi ditandai habis. Tandai ada stok lagi di Database, atau tambah bean baru."
              }
              cta={
                <button onClick={() => onGoDatabase("beans")} className="mt-3 rounded-xl text-sm font-semibold px-4 py-2" style={{ backgroundColor: "#C69163", color: "#332C2A" }}>
                  {db.beans.length === 0 ? "Tambah Bean" : "Buka Database"}
                </button>
              }
            />
          </div>
        ) : (
          <div className="px-5 space-y-2.5">
            {availableBeans.map((b) => (
              <SelectCard
                key={b.id}
                title={b.name}
                subtitle={[b.origin, b.roastColor !== undefined && b.roastColor !== "" ? nearestRoastLabel(b.roastColor) : b.roast].filter(Boolean).join(" · ")}
                swatchColor={b.roastColor !== undefined && b.roastColor !== "" ? roastColorFromValue(b.roastColor) : undefined}
                onClick={() => { setBeanId(b.id); setStep("grinder"); }}
              />
            ))}
            <button
              onClick={() => onGoDatabase("beans")}
              className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5"
              style={{ border: "1px dashed #DDD6CE", color: "#6B6058" }}
            >
              <Plus size={16} />
              <span className="text-sm">Tambah Bean Baru</span>
            </button>
          </div>
        ))}

      {step === "grinder" &&
        (db.grinders.length === 0 ? (
          <div className="px-5">
            <EmptyState
              text="Belum ada grinder di database."
              cta={
                <button onClick={() => onGoDatabase("grinders")} className="mt-3 rounded-xl text-sm font-semibold px-4 py-2" style={{ backgroundColor: "#C69163", color: "#332C2A" }}>
                  Tambah Grinder
                </button>
              }
            />
          </div>
        ) : (
          <div className="px-5 space-y-2.5">
            {db.grinders.map((g) => (
              <SelectCard
                key={g.id}
                title={g.name}
                subtitle={g.burrType}
                onClick={() => {
                  setGrinderId(g.id);
                  const compat = compatibleMachines(db, g);
                  if (compat.length === 1) {
                    setMachineId(compat[0].id);
                    setStep("size");
                  } else {
                    setStep("machine");
                  }
                }}
              />
            ))}
          </div>
        ))}

      {step === "machine" &&
        (compatibleMachines(db, grinder).length === 0 ? (
          <div className="px-5">
            <EmptyState
              text="Belum ada machine yang cocok buat grinder ini di database."
              cta={
                <button onClick={() => onGoDatabase("machines")} className="mt-3 rounded-xl text-sm font-semibold px-4 py-2" style={{ backgroundColor: "#C69163", color: "#332C2A" }}>
                  Tambah Machine
                </button>
              }
            />
          </div>
        ) : (
          <div className="px-5 space-y-2.5">
            {compatibleMachines(db, grinder).map((m) => (
              <SelectCard key={m.id} title={m.name} subtitle={m.type} onClick={() => { setMachineId(m.id); setStep("size"); }} />
            ))}
          </div>
        ))}

      {step === "size" && (
        <SizePicker
          size={size}
          setSize={setSize}
          customDose={customDose}
          setCustomDose={setCustomDose}
          onContinue={() => setStep("shotType")}
        />
      )}

      {step === "shotType" && (
        <div className="px-5 space-y-2.5">
          {SHOT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setShotType(t.key);
                setStep("prediction");
              }}
              className="w-full text-left rounded-2xl px-4 py-3.5"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid #DDD6CE" }}
            >
              <div className="text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#2A2118" }}>
                {t.key}
              </div>
              {t.hint && (
                <div className="text-xs mt-1" style={{ color: "#6B6058" }}>{t.hint}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {step === "prediction" && (
        <div className="px-5">
          <div
            className="rounded-3xl px-6 py-8 text-center"
            style={{ backgroundColor: "#F7F3EE", border: "1px solid #DDD6CE" }}
          >
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "#6B6058" }}>
              {bean?.name} · {grinder?.name}
            </div>
            {shotType && (
              <div
                className="inline-flex items-center gap-1.5 mb-3 rounded-full text-xs px-3 py-1"
                style={{ backgroundColor: "#F5E6D8", color: "#B8763C" }}
              >
                Mode: {shotType}
              </div>
            )}
            {prediction?.type === "exact" ? (
              <>
                <div className="flex items-center justify-center gap-3 mt-3">
                  {bean?.roastColor !== undefined && bean?.roastColor !== "" && (
                    <CoffeeBeanIcon size={40} color={roastColorFromValue(bean.roastColor)} />
                  )}
                  <div className="text-6xl" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#2A2118" }}>
                    {doseAdjusted != null ? doseAdjusted : prediction.recipe.setting}
                  </div>
                </div>
                <div className="text-xs mt-1" style={{ color: "#6B6058" }}>
                  {doseAdjusted != null ? "Disesuaikan dari data dose beda" : "Setting terbaik yang tercatat"}
                </div>
                {innerBurrMismatch && (
                  <div
                    className="inline-flex items-center gap-1.5 mt-2 rounded-full text-xs px-3 py-1.5"
                    style={{ backgroundColor: "#FBEADD", color: "#B5493A" }}
                  >
                    ⚠️ Inner burr sekarang ({grinder.innerBurr}) beda dari saat data ini dicatat ({prediction.recipe.innerBurr})
                  </div>
                )}
                {doseAdjusted != null && (
                  <div className="text-[11px] mt-2" style={{ color: "#736657" }}>
                    Dari recipe dose {prediction.recipe.dose}g → target ~{targetDose}g
                  </div>
                )}
                <div
                  className="inline-flex items-center gap-1.5 mt-4 rounded-full text-xs px-3 py-1.5"
                  style={{ backgroundColor: "#E3F5EC", color: "#1F7A4C" }}
                >
                  🟢 Sudah ada data — coba perbaiki dari sini
                </div>
              </>
            ) : prediction?.type === "adjusted" ? (
              <>
                <div className="flex items-center justify-center gap-3 mt-3">
                  {bean?.roastColor !== undefined && bean?.roastColor !== "" && (
                    <CoffeeBeanIcon size={40} color={roastColorFromValue(bean.roastColor)} />
                  )}
                  <div className="text-6xl" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#2A2118" }}>
                    {prediction.setting}
                  </div>
                </div>
                <div className="text-xs mt-1" style={{ color: "#6B6058" }}>Disesuaikan dari resep Espresso</div>
                <div
                  className="inline-flex items-center gap-1.5 mt-4 rounded-full text-xs px-3 py-1.5"
                  style={{ backgroundColor: "#F5E6D8", color: "#B8763C" }}
                >
                  🎯 {prediction.offset > 0 ? `+${prediction.offset}` : prediction.offset} step dari Espresso ({prediction.baseSetting})
                </div>
                <NudgeNote prediction={prediction} />
              </>
            ) : prediction?.type === "bridge" ? (
              <>
                <div className="flex items-center justify-center gap-3 mt-3">
                  {bean?.roastColor !== undefined && bean?.roastColor !== "" && (
                    <CoffeeBeanIcon size={40} color={roastColorFromValue(bean.roastColor)} />
                  )}
                  <div className="text-6xl" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#2A2118" }}>
                    {prediction.setting}
                  </div>
                </div>
                <div className="text-xs mt-1" style={{ color: "#6B6058" }}>Titik awal dari prediksi</div>
                <div
                  className="inline-flex items-center gap-1.5 mt-4 rounded-full text-xs px-3 py-1.5"
                  style={{ backgroundColor: "#EDE7F7", color: "#6B4FA0" }}
                >
                  🔮 Prediksi — belum pernah dites langsung
                </div>
                <div className="text-[11px] mt-2" style={{ color: "#736657" }}>
                  Dihitung dari {bean?.name} di {prediction.fromGrinderName} (setting {prediction.fromSetting}) · {prediction.sampleCount} data bridge
                </div>
                <NudgeNote prediction={prediction} />
              </>
            ) : prediction?.type === "rough" ? (
              <>
                <div className="flex items-center justify-center gap-3 mt-3">
                  {bean?.roastColor !== undefined && bean?.roastColor !== "" && (
                    <CoffeeBeanIcon size={40} color={roastColorFromValue(bean.roastColor)} />
                  )}
                  <div className="text-6xl" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#2A2118" }}>
                    {prediction.setting}
                  </div>
                </div>
                <div className="text-xs mt-1" style={{ color: "#6B6058" }}>Titik awal dari tebakan kasar</div>
                <div
                  className="inline-flex items-center gap-1.5 mt-4 rounded-full text-xs px-3 py-1.5"
                  style={{ backgroundColor: "#FBEADD", color: "#B8632E" }}
                >
                  🧪 Tebakan kasar — belum tervalidasi
                </div>
                <div className="text-[11px] mt-2" style={{ color: "#736657" }}>
                  Berdasarkan density terdekat: {prediction.basedOnBeanName} (d={Math.round(prediction.basedOnDensity * 100)}{prediction.sameRoast ? ", roast sama" : ""})
                </div>
                <NudgeNote prediction={prediction} />
              </>
            ) : (
              <>
                <div className="text-2xl mt-3" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: "#2A2118" }}>
                  Belum ada data
                </div>
                <div
                  className="inline-flex items-center gap-1.5 mt-4 rounded-full text-xs px-3 py-1.5"
                  style={{ backgroundColor: "#FBF3DD", color: "#A6801F" }}
                >
                  🟡 Ini percobaan pertama untuk kombinasi ini
                </div>
              </>
            )}
          </div>

          {prediction && <LastTrialCard db={db} beanId={beanId} grinderId={grinderId} machineId={machineId} />}

          <button
            onClick={() => {
              if (prediction?.type === "exact") setShotField("setting", doseAdjusted != null ? String(doseAdjusted) : prediction.recipe.setting);
              else if (prediction?.type === "bridge" || prediction?.type === "rough" || prediction?.type === "adjusted") setShotField("setting", String(prediction.setting));
              if (targetDose != null) setShotField("dose", String(targetDose));
              setStep("shot");
            }}
            className="w-full mt-6 rounded-2xl py-4 text-sm font-semibold"
            style={{ backgroundColor: "#C69163", color: "#332C2A" }}
          >
            Siapkan Kopi
          </button>
        </div>
      )}

      {step === "shot" && (
        <div className="px-5 space-y-3.5">
          <Field label="Setting grinder *">
            <input className={inputCls} style={inputStyle} placeholder="cth. 1.25" value={shot.setting} onChange={(e) => setShotField("setting", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dose (g)">
              <input className={inputCls} style={inputStyle} placeholder="18" value={shot.dose} onChange={(e) => setShotField("dose", e.target.value)} />
            </Field>
            <Field label="Yield (g)">
              <input className={inputCls} style={inputStyle} placeholder="37" value={shot.yield} onChange={(e) => setShotField("yield", e.target.value)} />
            </Field>
          </div>
          <Field label="Waktu (detik)">
            <input className={inputCls} style={inputStyle} placeholder="27" value={shot.time} onChange={(e) => setShotField("time", e.target.value)} />
          </Field>

          {(() => {
            const result = classifyShotResult(shot.dose, shot.yield, shot.time);
            if (!result) return null;
            const mismatch = shotType && shotType !== "Lainnya" && result.category !== shotType;
            const suggestion = mismatch ? suggestNextGrindShift(result.time, shotType, grinder) : null;
            return (
              <div
                className="rounded-2xl px-4 py-3.5"
                style={{ backgroundColor: mismatch ? "#FBEADD" : "#E3F5EC", border: `1px solid ${mismatch ? "#B8632E" : "#1F7A4C"}` }}
              >
                <div className="text-xs" style={{ color: mismatch ? "#B8632E" : "#1F7A4C" }}>
                  {result.ratio != null
                    ? `Rasio ~1:${Math.round(result.ratio * 100) / 100}, ${result.time}s — masuk kategori ${result.category}`
                    : `${result.time}s — masuk kategori ${result.category}`}
                  {mismatch && ` (kamu pilih ${shotType})`}
                </div>
                {suggestion && (
                  <div className="text-xs mt-1.5" style={{ color: "#6B6058" }}>
                    💡 Buat next kali ngejar {shotType}, coba geser {suggestion.direction === "finer" ? "lebih halus" : "lebih kasar"} ~{suggestion.stepDelta} step di {grinder?.name || "grinder ini"} — estimasi awal, bukan angka pasti.
                  </div>
                )}
              </div>
            );
          })()}

          <Field label="Puck screen">
            <ToggleGroup
              value={shot.puck}
              onChange={(v) => setShotField("puck", v)}
              options={[
                { value: "Kertas", label: "Kertas" },
                { value: "Metal", label: "Metal" },
                { value: "Tanpa", label: "Tanpa" },
              ]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="WDT">
              <ToggleGroup
                value={shot.wdt}
                onChange={(v) => setShotField("wdt", v)}
                options={[
                  { value: "Ya", label: "Ya" },
                  { value: "Tidak", label: "Tidak" },
                ]}
              />
            </Field>
            <Field label="Basket">
              <ToggleGroup
                value={shot.basket}
                onChange={(v) => setShotField("basket", v)}
                options={[
                  { value: "Standard", label: "Standard" },
                  { value: "Bottomless", label: "Bottomless" },
                ]}
              />
            </Field>
          </div>
          <button
            onClick={() => canSaveShot && setStep("evaluasi")}
            disabled={!canSaveShot}
            className="w-full mt-3 rounded-2xl py-4 text-sm font-semibold"
            style={{
              backgroundColor: canSaveShot ? "#C69163" : "#DDD6CE",
              color: canSaveShot ? "#332C2A" : "#736657",
              cursor: canSaveShot ? "pointer" : "not-allowed",
            }}
          >
            Lanjut ke Evaluasi Rasa
          </button>
        </div>
      )}

      {step === "evaluasi" && (
        <div className="px-5">
          <div className="text-xs mb-2.5" style={{ color: "#6B6058" }}>Rasa</div>
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {TASTE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setTaste(tag)}
                className="rounded-xl py-3 text-sm"
                style={{
                  backgroundColor: taste === tag ? "#C69163" : "transparent",
                  color: taste === tag ? "#332C2A" : "#2A2118",
                  border: `1px solid ${taste === tag ? "#C69163" : "#DDD6CE"}`,
                  fontWeight: taste === tag ? 600 : 400,
                }}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="text-xs mb-2.5" style={{ color: "#6B6058" }}>Seberapa enak? (1-10)</div>
          <div className="grid grid-cols-5 gap-2 mb-6">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className="rounded-lg py-2.5 text-sm"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  backgroundColor: rating === n ? "#C69163" : "transparent",
                  color: rating === n ? "#332C2A" : "#6B6058",
                  border: rating === n ? "none" : "1px solid #DDD6CE",
                  fontWeight: rating === n ? 600 : 400,
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <div className="text-xs mb-1.5" style={{ color: "#6B6058" }}>
              Catatan (opsional)
            </div>
            <textarea
              value={taste2Notes}
              onChange={(e) => setTaste2Notes(e.target.value)}
              placeholder="cth. Terlalu lambat ekstraksinya, coba naik ke 2.00 lain kali"
              className="w-full text-sm rounded-xl p-3 resize-none"
              style={{ ...inputStyle, minHeight: "70px" }}
            />
          </div>

          <button
            onClick={saveTrial}
            disabled={!taste || !rating}
            className="w-full rounded-2xl py-4 text-sm font-semibold"
            style={{
              backgroundColor: taste && rating ? "#C69163" : "#DDD6CE",
              color: taste && rating ? "#332C2A" : "#736657",
              cursor: taste && rating ? "pointer" : "not-allowed",
            }}
          >
            Simpan
          </button>
        </div>
      )}

      {step === "confirmDefault" && (
        <div className="px-5 text-center py-10">
          <h2 className="text-xl mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: "#2A2118" }}>
            Jadikan default recipe?
          </h2>
          <p className="text-sm mb-6" style={{ color: "#6B6058" }}>
            Setting {savedRecipe?.setting} akan jadi rekomendasi utama untuk {bean?.name} + {grinder?.name} di Bikin Kopi.
          </p>
          {savedRecipe?.predictedSetting !== undefined && savedRecipe?.predictedSetting !== "" && (
            <div
              className="rounded-2xl px-4 py-3 mb-6 text-xs"
              style={{ backgroundColor: "#F7F3EE", border: "1px solid #DDD6CE", color: "#6B6058" }}
            >
              Prediksi awal: {savedRecipe.predictedSetting} → Kamu pakai: {savedRecipe.setting} (selisih{" "}
              {(() => {
                const diff = parseFloat(savedRecipe.setting) - parseFloat(savedRecipe.predictedSetting);
                if (isNaN(diff)) return "?";
                return `${diff > 0 ? "+" : ""}${Math.round(diff * 100) / 100}`;
              })()}
              )
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => markDefault(false)}
              className="flex-1 rounded-xl py-3 text-sm"
              style={{ border: "1px solid #DDD6CE", color: "#6B6058" }}
            >
              Tidak
            </button>
            <button
              onClick={() => markDefault(true)}
              className="flex-1 rounded-xl py-3 text-sm font-semibold"
              style={{ backgroundColor: "#C69163", color: "#332C2A" }}
            >
              Ya
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="px-5 text-center py-10">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#E3F5EC", color: "#1F7A4C" }}
          >
            <Check size={26} />
          </div>
          <h2 className="text-xl mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: "#2A2118" }}>
            Trial tersimpan
          </h2>
          <p className="text-sm" style={{ color: "#6B6058" }}>
            {bean?.name} · {grinder?.name} · setting {savedRecipe?.setting} · rating {rating}/10
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={reset}
              className="flex-1 rounded-xl py-2.5 text-sm"
              style={{ border: "1px solid #DDD6CE", color: "#6B6058" }}
            >
              Dial-In Lagi
            </button>
            <button
              onClick={onBack}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
              style={{ backgroundColor: "#C69163", color: "#332C2A" }}
            >
              Ke Beranda
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Database module ----------
const DB_TABS = [
  { key: "beans", label: "Bean", icon: BeanIcon, single: "Bean" },
  { key: "grinders", label: "Grinder", icon: Cog, single: "Grinder" },
  { key: "machines", label: "Machine", icon: Cpu, single: "Machine" },
  { key: "history", label: "Recipe", icon: ClipboardList, single: "Recipe" },
  { key: "brews", label: "Riwayat Seduh", icon: History, single: "Brew" },
];

// Skala roast dengan swatch warna, biar lebih presisi daripada nulis bebas
// ("medium" bisa macam-macam) — nanti dipakai juga buat cari pola density↔roast.
const ROAST_LEVELS = [
  { key: "Light", color: "#C89666", desc: "Coklat muda terang" },
  { key: "Medium-Light", color: "#B37D4E", desc: "Coklat muda" },
  { key: "Medium", color: "#8F5A34", desc: "Coklat" },
  { key: "Medium-Dark", color: "#6B4226", desc: "Coklat tua" },
  { key: "Dark", color: "#3D2817", desc: "Coklat sangat tua / nyaris hitam" },
];

// value: 0 (paling terang) - 100 (paling gelap), kontinu — bukan cuma 5 kotak.
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
  const c = (v) => Math.round(v).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function roastColorFromValue(value) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const stops = ROAST_LEVELS.map((r, i) => ({ pos: i * 25, color: r.color }));
  for (let i = 0; i < stops.length - 1; i++) {
    if (v >= stops[i].pos && v <= stops[i + 1].pos) {
      const t = (v - stops[i].pos) / (stops[i + 1].pos - stops[i].pos);
      const c1 = hexToRgb(stops[i].color);
      const c2 = hexToRgb(stops[i + 1].color);
      return rgbToHex(
        c1.r + (c2.r - c1.r) * t,
        c1.g + (c2.g - c1.g) * t,
        c1.b + (c2.b - c1.b) * t
      );
    }
  }
  return stops[stops.length - 1].color;
}
function nearestRoastLabel(value) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const idx = Math.round(v / 25);
  return ROAST_LEVELS[idx]?.key || "Medium";
}
const ROAST_GRADIENT_CSS = `linear-gradient(to right, ${ROAST_LEVELS.map((r) => r.color).join(", ")})`;

const FORM_SCHEMAS = {
  beans: [
    { key: "name", label: "Nama kopi", placeholder: "cth. Robusta Fermentasi", required: true },
    { key: "origin", label: "Origin", placeholder: "cth. Dampit" },
    { key: "process", label: "Process", placeholder: "cth. Fermentasi" },
    { key: "roastColor", label: "Warna roast", roastSlider: true, default: 50 },
    { key: "roastDate", label: "Tanggal roasting", placeholder: "cth. 2026-08-14" },
    { key: "density", label: "Density (gram per 100ml)", placeholder: "cth. 44", densityField: true },
    { key: "notes", label: "Catatan", textarea: true },
  ],
  grinders: [
    { key: "name", label: "Nama grinder", placeholder: "cth. K64S", required: true },
    { key: "burrType", label: "Tipe burr", placeholder: "cth. Flat" },
    { key: "burrSize", label: "Ukuran burr (mm)", placeholder: "cth. 64" },
    { key: "stepSize", label: "Step size", placeholder: "cth. 0.25" },
    { key: "innerBurr", label: "Setting Inner Burr saat ini (kalau ada, mis. grinder Breville)", placeholder: "cth. 4" },
    { key: "restrictedToMachineId", label: "Khusus mesin (kosongkan kalau bisa semua)", ref: "machines" },
    { key: "notes", label: "Catatan", textarea: true },
  ],
  machines: [
    { key: "name", label: "Nama mesin", placeholder: "cth. Breville Barista Express Impress", required: true },
    { key: "type", label: "Tipe", placeholder: "cth. Semi-auto assisted tamp" },
    { key: "notes", label: "Catatan", textarea: true },
  ],
  recipes: [
    { key: "beanId", label: "Bean", ref: "beans", required: true },
    { key: "grinderId", label: "Grinder", ref: "grinders", required: true },
    { key: "machineId", label: "Machine", ref: "machines", required: true },
    { key: "setting", label: "Setting grinder", placeholder: "cth. 1.25", required: true },
    { key: "status", label: "Status", options: ["Verified", "Experiment"], default: "Verified" },
    { key: "shotType", label: "Jenis Shot", options: SHOT_TYPES.map((t) => t.key), default: "Espresso" },
    { key: "dose", label: "Dose (g)", placeholder: "cth. 18" },
    { key: "yield", label: "Yield (g)", placeholder: "cth. 37" },
    { key: "time", label: "Waktu (detik)", placeholder: "cth. 27" },
    { key: "wdt", label: "WDT", options: ["Ya", "Tidak"], default: "Ya" },
    { key: "puck", label: "Puck screen", options: ["Kertas", "Metal", "Tanpa"], default: "Kertas" },
    { key: "basket", label: "Basket", options: ["Standard", "Bottomless"], default: "Standard" },
    { key: "taste", label: "Rasa / evaluasi", placeholder: "cth. Balance" },
    { key: "rating", label: "Rating rasa (1-10)", placeholder: "cth. 8" },
    { key: "notes", label: "Catatan", textarea: true },
  ],
};

function itemTitle(tabKey, item, db) {
  if (tabKey !== "recipes") return item.name || "(tanpa nama)";
  const bean = db.beans.find((b) => b.id === item.beanId);
  const grinder = db.grinders.find((g) => g.id === item.grinderId);
  const machine = db.machines.find((m) => m.id === item.machineId);
  const parts = [bean ? bean.name : "?"];
  if (machine) parts.push(machine.name);
  parts.push(grinder ? grinder.name : "?");
  return `${parts.join(" · ")} @ ${item.setting || "?"}`;
}

// Label singular buat judul modal Tambah/Edit — dipisah dari DB_TABS supaya
// nggak kebentur kalau nama/key tab UI-nya beda dari key data aslinya
// (misal tab "Recipe" di UI itu key-nya "history", tapi data aslinya "recipes").
const SINGULAR_LABELS = {
  beans: "Bean",
  grinders: "Grinder",
  machines: "Machine",
  recipes: "Recipe",
};

function ItemForm({ tabKey, db, initial, onCancel, onSave }) {
  const schema = FORM_SCHEMAS[tabKey];
  const [values, setValues] = useState(() => {
    const base = {};
    schema.forEach((f) => {
      let v = initial?.[f.key] ?? (f.default ?? "");
      // Density disimpan sebagai g/ml (data lama), tapi ditampilkan di form
      // sebagai gram per 100ml (lebih gampang, langsung dari hasil timbang).
      if (f.densityField && v !== "" && !isNaN(parseFloat(v))) {
        v = String(Math.round(parseFloat(v) * 100 * 100) / 100);
      }
      base[f.key] = v;
    });
    return base;
  });

  const set = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));
  const [showDensityGuide, setShowDensityGuide] = useState(false);

  const canSave = schema
    .filter((f) => f.required)
    .every((f) => String(values[f.key] || "").trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-20 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border p-5"
        style={{
          backgroundColor: "#F7F3EE",
          borderColor: "#DDD6CE",
          maxHeight: "85vh",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: "#2A2118" }}
          >
            {initial ? "Edit" : "Tambah"} {SINGULAR_LABELS[tabKey] || tabKey}
          </h2>
          <button
            onClick={onCancel}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ color: "#6B6058" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5">
          {schema.map((f) => (
            <Field key={f.key} label={f.label + (f.required ? " *" : "")}>
              {f.ref ? (
                <CustomSelect
                  value={values[f.key]}
                  onChange={(v) => set(f.key, v)}
                  placeholder={`Pilih ${f.label.toLowerCase()}…`}
                  options={db[f.ref].map((opt) => ({ value: opt.id, label: opt.name }))}
                />
              ) : f.roastSlider ? (
                <div>
                  <div className="flex items-center gap-3 mb-2.5">
                    <span
                      className="w-9 h-9 rounded-full border border-black/30 shrink-0"
                      style={{ backgroundColor: roastColorFromValue(values[f.key] || 50) }}
                    />
                    <div className="text-xs" style={{ color: "#6B6058" }}>
                      {nearestRoastLabel(values[f.key] || 50)}
                      <span style={{ color: "#736657" }}> · nilai {values[f.key] || 50}</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={values[f.key] || 50}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer"
                    style={{ background: ROAST_GRADIENT_CSS }}
                  />
                  <div className="flex justify-between text-[9px] mt-1" style={{ color: "#736657" }}>
                    <span>Terang</span>
                    <span>Gelap</span>
                  </div>
                </div>
              ) : f.options ? (
                <CustomSelect
                  value={values[f.key]}
                  onChange={(v) => set(f.key, v)}
                  options={f.options.map((opt) => ({ value: opt, label: opt }))}
                />
              ) : f.textarea ? (
                <textarea
                  className={inputCls + " resize-none"} style={{ ...inputStyle, minHeight: "70px" }}
                  placeholder={f.placeholder}
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ) : (
                <>
                  <input
                    className={inputCls} style={inputStyle}
                    type={f.type || "text"}
                    placeholder={f.placeholder}
                    value={values[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                  {f.densityField &&
                    values[f.key] &&
                    !isNaN(parseFloat(values[f.key])) &&
                    (parseFloat(values[f.key]) < 15 || parseFloat(values[f.key]) > 100) && (
                      <p className="text-[11px] mt-1.5" style={{ color: "#B8763C" }}>
                        ⚠️ Kelihatannya kurang wajar (density kopi biasanya 20–70 gram per 100ml) — cek lagi timbangannya.
                      </p>
                    )}
                  {f.densityField && (
                    <button
                      type="button"
                      onClick={() => setShowDensityGuide((v) => !v)}
                      className="text-[11px] mt-1.5"
                      style={{ color: "#B8763C" }}
                    >
                      {showDensityGuide ? "Sembunyikan cara ukur" : "Bingung cara isinya? Klik ini aja"}
                    </button>
                  )}
                  {f.densityField && showDensityGuide && (
                    <div
                      className="mt-2 rounded-xl p-3 text-[11px] leading-relaxed"
                      style={{ backgroundColor: "#F7F3EE", border: "1px solid #DDD6CE", color: "#2A2118" }}
                    >
                      <div className="font-semibold mb-1">Cara ukur density biji kopi:</div>
                      <div>Alat: timbangan dapur + wadah/gelas ukur 100ml.</div>
                      <ol className="mt-1 ml-4" style={{ listStyleType: "decimal" }}>
                        <li>Taruh wadah 100ml kosong di atas timbangan</li>
                        <li>Tekan Tare/Zero biar mulai dari angka 0</li>
                        <li>Tuang biji kopi utuh (belum digiling) sampai pas rata 100ml</li>
                        <li>Ketuk-ketuk pelan wadahnya biar nggak ada rongga kosong</li>
                        <li>Catat angka gram yang muncul di timbangan</li>
                        <li>Masukin angka itu langsung ke kolom ini, nggak perlu dihitung ulang</li>
                      </ol>
                      <div className="mt-1.5">Contoh: biji sampai 100ml beratnya 44 gram → isi kolom ini dengan 44.</div>
                    </div>
                  )}
                </>
              )}
            </Field>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 text-sm"
            style={{ border: "1px solid #DDD6CE", color: "#6B6058" }}
          >
            Batal
          </button>
          <button
            onClick={() => {
              if (!canSave) return;
              const output = { ...values };
              schema.forEach((f) => {
                if (f.densityField && output[f.key] !== "" && !isNaN(parseFloat(output[f.key]))) {
                  output[f.key] = String(Math.round((parseFloat(output[f.key]) / 100) * 10000) / 10000);
                }
              });
              onSave(output);
            }}
            disabled={!canSave}
            className="flex-1 rounded-xl py-2.5 text-sm flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: canSave ? "#C69163" : "#DDD6CE",
              color: canSave ? "#332C2A" : "#736657",
              fontWeight: canSave ? 600 : 400,
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            <Check size={16} /> Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Shot History ----------
const TASTE_FILTER_OPTIONS = ["Asam", "Balance", "Pahit", "Encer", "Nendang", "Hambar"];

function ShotHistoryPanel({ db, persist, onEdit }) {
  const [dateFilter, setDateFilter] = useState("all"); // all | 7d | 30d
  const [tasteFilter, setTasteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all | Verified | Experiment
  const [beanFilter, setBeanFilter] = useState("all");
  const [shotTypeFilter, setShotTypeFilter] = useState("all");
  const [onlyGood, setOnlyGood] = useState(false); // rating >= 7
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDelete = (id) => {
    persist({ ...db, recipes: db.recipes.filter((r) => r.id !== id) });
    setConfirmDeleteId(null);
  };

  const now = Date.now();
  const dateCutoff =
    dateFilter === "7d" ? now - 7 * 86400000 : dateFilter === "30d" ? now - 30 * 86400000 : null;

  const entries = db.recipes
    .filter((r) => {
      if (dateCutoff && (!r.date || new Date(r.date).getTime() < dateCutoff)) return false;
      if (tasteFilter !== "all" && r.taste !== tasteFilter) return false;
      if (statusFilter !== "all" && (r.status || "Verified") !== statusFilter) return false;
      if (beanFilter !== "all" && r.beanId !== beanFilter) return false;
      if (shotTypeFilter !== "all" && (r.shotType || "Espresso") !== shotTypeFilter) return false;
      if (onlyGood && !(r.rating && Number(r.rating) >= 7)) return false;
      return true;
    })
    .slice()
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const fmtDate = (iso) => {
    if (!iso) return "Tanggal tidak diketahui";
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="px-5 mt-4">
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mb-2.5">
        {[
          { key: "all", label: "Semua Tanggal" },
          { key: "7d", label: "7 Hari" },
          { key: "30d", label: "30 Hari" },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setDateFilter(opt.key)}
            className="shrink-0 rounded-full px-3.5 py-2 text-xs"
            style={{
              backgroundColor: dateFilter === opt.key ? "#C69163" : "transparent",
              color: dateFilter === opt.key ? "#332C2A" : "#6B6058",
              border: `1px solid ${dateFilter === opt.key ? "#C69163" : "#DDD6CE"}`,
              fontWeight: dateFilter === opt.key ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => setOnlyGood((v) => !v)}
          className="shrink-0 rounded-full px-3.5 py-2 text-xs flex items-center gap-1"
          style={{
            backgroundColor: onlyGood ? "#E3F5EC" : "transparent",
            color: onlyGood ? "#1F7A4C" : "#6B6058",
            border: `1px solid ${onlyGood ? "#E3F5EC" : "#DDD6CE"}`,
            fontWeight: onlyGood ? 600 : 400,
          }}
        >
          🟢 Rasa Enak (7+)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <CustomSelect
          value={beanFilter}
          onChange={setBeanFilter}
          placeholder="Semua Bean"
          options={[{ value: "all", label: "Semua Bean" }, ...db.beans.map((b) => ({ value: b.id, label: b.name }))]}
        />
        <CustomSelect
          value={shotTypeFilter}
          onChange={setShotTypeFilter}
          placeholder="Semua Jenis Shot"
          options={[{ value: "all", label: "Semua Jenis Shot" }, ...SHOT_TYPES.map((t) => ({ value: t.key, label: t.key }))]}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <CustomSelect
          value={tasteFilter}
          onChange={setTasteFilter}
          placeholder="Semua Rasa"
          options={[{ value: "all", label: "Semua Rasa" }, ...TASTE_FILTER_OPTIONS.map((t) => ({ value: t, label: t }))]}
        />
        <CustomSelect
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Semua Status"
          options={[
            { value: "all", label: "Semua Status" },
            { value: "Verified", label: "Verified" },
            { value: "Experiment", label: "Experiment" },
          ]}
        />
      </div>

      <div className="text-xs mb-2.5" style={{ color: "#736657" }}>
        {entries.length} shot ditemukan
      </div>

      {entries.length === 0 ? (
        <EmptyState text="Nggak ada shot yang cocok sama filter ini." />
      ) : (
        <div className="space-y-2.5 pb-10">
          {entries.map((r) => {
            const bean = db.beans.find((b) => b.id === r.beanId);
            const grinder = db.grinders.find((g) => g.id === r.grinderId);
            const machine = db.machines.find((m) => m.id === r.machineId);
            return (
              <div
                key={r.id}
                onClick={() => onEdit(r)}
                className="rounded-2xl px-4 py-3.5 cursor-pointer"
                style={{ backgroundColor: "#F7F3EE", border: "1px solid #DDD6CE" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="text-sm min-w-0"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#2A2118" }}
                  >
                    {bean?.name || "?"} · {machine ? `${machine.name} · ` : ""}{grinder?.name || "?"} @ {r.setting}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div
                      className="text-[10px] rounded-full px-2 py-0.5"
                      style={{
                        backgroundColor: r.status === "Experiment" ? "#FBF3DD" : "#E3F5EC",
                        color: r.status === "Experiment" ? "#A6801F" : "#1F7A4C",
                      }}
                    >
                      {r.status || "Verified"}
                    </div>
                    <button
                      onClick={() => setConfirmDeleteId(r.id)}
                      aria-label="Hapus"
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ color: "#B5493A", border: "1px solid #DDD6CE" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="text-xs mt-1" style={{ color: "#6B6058" }}>
                  {[r.shotType && r.shotType !== "Espresso" && r.shotType, r.dose && `${r.dose}g`, r.yield && `→${r.yield}g`, r.time && `${r.time}s`, r.basket === "Bottomless" && "Bottomless", r.taste, r.rating && `${r.rating}/10`]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {r.notes && (
                  <div
                    className="text-xs mt-1"
                    style={{
                      color: "#736657",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    📝 {r.notes}
                  </div>
                )}
                <div className="text-[11px] mt-1.5" style={{ color: "#736657" }}>
                  {fmtDate(r.date)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5"
            style={{ backgroundColor: "#F7F3EE", border: "1px solid #DDD6CE" }}
          >
            <p className="text-sm mb-4" style={{ color: "#2A2118" }}>
              Hapus shot ini permanen? Tindakan ini nggak bisa dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-xl py-2.5 text-sm"
                style={{ border: "1px solid #DDD6CE", color: "#6B6058" }}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                style={{ backgroundColor: "#B5493A", color: "#332C2A" }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Brew History (Riwayat Seduh) ----------
function BrewHistoryPanel({ db, persist }) {
  const [dateFilter, setDateFilter] = useState("all"); // all | 7d | 30d
  const [beanFilter, setBeanFilter] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDelete = (id) => {
    persist({ ...db, brews: db.brews.filter((b) => b.id !== id) });
    setConfirmDeleteId(null);
  };

  const now = Date.now();
  const dateCutoff =
    dateFilter === "7d" ? now - 7 * 86400000 : dateFilter === "30d" ? now - 30 * 86400000 : null;

  const entries = db.brews
    .filter((b) => {
      if (dateCutoff && (!b.date || new Date(b.date).getTime() < dateCutoff)) return false;
      if (beanFilter !== "all" && b.beanId !== beanFilter) return false;
      return true;
    })
    .slice()
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const fmtDate = (iso) => {
    if (!iso) return "Tanggal tidak diketahui";
    const d = new Date(iso);
    return (
      d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
      " · " +
      d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <div className="px-5 mt-4">
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mb-2.5">
        {[
          { key: "all", label: "Semua Tanggal" },
          { key: "7d", label: "7 Hari" },
          { key: "30d", label: "30 Hari" },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setDateFilter(opt.key)}
            className="shrink-0 rounded-full px-3.5 py-2 text-xs"
            style={{
              backgroundColor: dateFilter === opt.key ? "#C69163" : "transparent",
              color: dateFilter === opt.key ? "#332C2A" : "#6B6058",
              border: `1px solid ${dateFilter === opt.key ? "#C69163" : "#DDD6CE"}`,
              fontWeight: dateFilter === opt.key ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <CustomSelect
          value={beanFilter}
          onChange={setBeanFilter}
          placeholder="Semua Bean"
          options={[{ value: "all", label: "Semua Bean" }, ...db.beans.map((b) => ({ value: b.id, label: b.name }))]}
        />
      </div>

      <div className="text-xs mb-2.5" style={{ color: "#736657" }}>
        {entries.length} seduhan tercatat
      </div>

      {entries.length === 0 ? (
        <EmptyState text="Belum ada riwayat seduh yang cocok sama filter ini." />
      ) : (
        <div className="space-y-2.5 pb-10">
          {entries.map((b) => {
            const bean = db.beans.find((x) => x.id === b.beanId);
            const grinder = db.grinders.find((x) => x.id === b.grinderId);
            const machine = db.machines.find((x) => x.id === b.machineId);
            const recipe = b.recipeId ? db.recipes.find((r) => r.id === b.recipeId) : null;
            return (
              <div
                key={b.id}
                className="rounded-2xl px-4 py-3.5"
                style={{ backgroundColor: "#F7F3EE", border: "1px solid #DDD6CE" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="text-sm min-w-0"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#2A2118" }}
                  >
                    {bean?.name || "?"} · {machine ? `${machine.name} · ` : ""}
                    {grinder?.name || "?"}
                  </div>
                  <button
                    onClick={() => setConfirmDeleteId(b.id)}
                    aria-label="Hapus"
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ color: "#B5493A", border: "1px solid #DDD6CE" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="text-xs mt-1" style={{ color: "#6B6058" }}>
                  {[
                    b.size === "single" ? "Single" : b.size === "double" ? "Double" : null,
                    recipe?.setting && `setting ${recipe.setting}`,
                    b.dose && `${b.dose}g`,
                    b.yield && `→${b.yield}g`,
                    b.time && `${b.time}s`,
                    b.feedback,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <div className="text-[11px] mt-1.5" style={{ color: "#736657" }}>
                  {fmtDate(b.date)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5"
            style={{ backgroundColor: "#F7F3EE", border: "1px solid #DDD6CE" }}
          >
            <p className="text-sm mb-4" style={{ color: "#2A2118" }}>
              Hapus riwayat seduh ini permanen? Tindakan ini nggak bisa dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-xl py-2.5 text-sm"
                style={{ border: "1px solid #DDD6CE", color: "#6B6058" }}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                style={{ backgroundColor: "#B5493A", color: "#332C2A" }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DatabaseScreen({ db, persist, onBack, initialTab }) {
  const [tab, setTab] = useState(initialTab || "beans");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [formTabKey, setFormTabKey] = useState("beans");
  const [backupStatus, setBackupStatus] = useState("idle"); // idle | loading | success | error
  const [backupMessage, setBackupMessage] = useState("");
  const [showRawJson, setShowRawJson] = useState(false);
  const [showImportBox, setShowImportBox] = useState(false);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState("idle"); // idle | error
  const [importMessage, setImportMessage] = useState("");
  const [importPreview, setImportPreview] = useState(null); // parsed db, menunggu konfirmasi
  const importFileRef = useRef(null);

  // Aktivitas terakhir sebuah bean = yang paling baru di antara: kapan bean
  // itu sendiri diedit/ditambah, kapan terakhir dipakai di trial Dial-In
  // (recipes), atau kapan terakhir diseduh lewat Bikin Kopi (brews) — bukan
  // cuma kapan data bean-nya diutak-atik.
  const lastBeanActivity = (beanId, bean) => {
    let latest = new Date(bean.updatedAt || bean.createdAt || 0).getTime();
    db.recipes.forEach((r) => {
      if (r.beanId === beanId) {
        const t = new Date(r.date || 0).getTime();
        if (t > latest) latest = t;
      }
    });
    db.brews.forEach((br) => {
      if (br.beanId === beanId) {
        const t = new Date(br.date || 0).getTime();
        if (t > latest) latest = t;
      }
    });
    return latest;
  };

  const rawItems = db[tab] || [];
  const items =
    tab === "recipes"
      ? rawItems.slice().sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      : tab === "beans"
      ? rawItems.slice().sort((a, b) => {
          const stockDiff = (a.outOfStock ? 1 : 0) - (b.outOfStock ? 1 : 0);
          if (stockDiff !== 0) return stockDiff;
          const aTime = lastBeanActivity(a.id, a);
          const bTime = lastBeanActivity(b.id, b);
          return bTime - aTime;
        })
      : rawItems;

  const handleExport = () => {
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `TukangNgopi/tukang-ngopi-backup-${dateStr}.json`;
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupStatus("success");
      setBackupMessage(`Coba cek folder Download/TukangNgopi`);
    } catch (e) {
      setBackupStatus("error");
      setBackupMessage("Gagal export. Coba lagi.");
    }
  };

  const handleCopy = async () => {
    try {
      const jsonText = JSON.stringify(db, null, 2);
      await navigator.clipboard.writeText(jsonText);
      setBackupStatus("success");
      setBackupMessage("Tersalin ke clipboard — paste di mana pun.");
    } catch (e) {
      setBackupStatus("error");
      setBackupMessage("Gagal salin. Coba tekan lama teksnya di bawah, lalu copy manual.");
      setShowRawJson(true);
    }
  };

  // Validasi ringan: pastikan ini beneran struktur backup Tukang Ngopi,
  // bukan sekadar JSON valid — biar nggak nimpa data pakai file yang salah.
  const parseImportCandidate = (text) => {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { error: "Teksnya bukan JSON yang valid. Cek lagi ada yang kepotong atau nggak." };
    }
    const requiredArrays = ["beans", "grinders", "machines", "recipes"];
    const missing = requiredArrays.filter((k) => !Array.isArray(parsed[k]));
    if (missing.length > 0) {
      return { error: `File ini kelihatannya bukan backup Tukang Ngopi — field ${missing.join(", ")} nggak ketemu/bukan list.` };
    }
    return { data: parsed };
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseImportCandidate(String(reader.result || ""));
      if (result.error) {
        setImportStatus("error");
        setImportMessage(result.error);
        setImportPreview(null);
      } else {
        setImportStatus("idle");
        setImportMessage("");
        setImportPreview(result.data);
      }
    };
    reader.onerror = () => {
      setImportStatus("error");
      setImportMessage("Gagal baca file. Coba cara paste teks manual di bawah.");
    };
    reader.readAsText(file);
    e.target.value = ""; // biar bisa pilih file yang sama lagi kalau perlu
  };

  const handleImportPasteCheck = () => {
    const result = parseImportCandidate(importText);
    if (result.error) {
      setImportStatus("error");
      setImportMessage(result.error);
      setImportPreview(null);
    } else {
      setImportStatus("idle");
      setImportMessage("");
      setImportPreview(result.data);
    }
  };

  const confirmImport = () => {
    if (!importPreview) return;
    persist(importPreview);
    setImportPreview(null);
    setImportText("");
    setShowImportBox(false);
    setBackupStatus("success");
    setBackupMessage("Data berhasil di-import.");
  };

  const handleSave = (values) => {
    const list = db[formTabKey].slice();
    const now = new Date().toISOString();
    if (editing) {
      const idx = list.findIndex((i) => i.id === editing.id);
      const extra = formTabKey === "beans" ? { updatedAt: now } : {};
      list[idx] = { ...editing, ...values, ...extra };
    } else {
      const extra =
        formTabKey === "recipes"
          ? { date: now }
          : formTabKey === "beans"
          ? { createdAt: now, updatedAt: now }
          : {};
      list.push({ id: uid(), ...values, ...extra });
    }
    persist({ ...db, [formTabKey]: list });
    setFormOpen(false);
    setEditing(null);
  };

  const toggleStock = (beanId) => {
    const list = db.beans.map((b) =>
      b.id === beanId ? { ...b, outOfStock: !b.outOfStock, updatedAt: new Date().toISOString() } : b
    );
    persist({ ...db, beans: list });
  };

  const handleDelete = (id) => {
    persist({ ...db, [tab]: db[tab].filter((i) => i.id !== id) });
    setConfirmDelete(null);
  };

  return (
    <div className="min-h-full pb-28">
      <ScreenHeader title="Database" subtitle="Kelola data bean, grinder, machine & recipe" onBack={onBack} />

      <div className="px-5 pb-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs"
            style={{ border: "1px solid #DDD6CE", color: "#6B6058" }}
          >
            <UploadCloud size={14} /> Download File
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs"
            style={{ border: "1px solid #DDD6CE", color: "#6B6058" }}
          >
            <ClipboardList size={14} /> Salin ke Clipboard
          </button>
        </div>
        {backupStatus === "success" && (
          <p className="text-[11px] text-center" style={{ color: "#1F7A4C" }}>
            <CheckCircle2 size={12} className="inline mr-1" />
            {backupMessage}
          </p>
        )}
        {backupStatus === "error" && (
          <p className="text-[11px] text-center" style={{ color: "#B5493A" }}>
            <AlertCircle size={12} className="inline mr-1" />
            {backupMessage}
          </p>
        )}
        <button
          onClick={() => setShowRawJson((v) => !v)}
          className="w-full text-center text-[11px]"
          style={{ color: "#736657" }}
        >
          {showRawJson ? "Sembunyikan teks mentah" : "Nggak ketemu file-nya? Tampilkan teks buat di-copy manual"}
        </button>
        {showRawJson && (
          <textarea
            readOnly
            value={JSON.stringify(db, null, 2)}
            onFocus={(e) => e.target.select()}
            className="w-full text-[10px] rounded-xl p-3"
            style={{
              backgroundColor: "#F7F3EE",
              border: "1px solid #DDD6CE",
              color: "#6B6058",
              height: "160px",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          />
        )}

        <div className="pt-1">
          <button
            onClick={() => {
              setShowImportBox((v) => !v);
              setImportStatus("idle");
              setImportMessage("");
              setImportPreview(null);
            }}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs"
            style={{ border: "1px solid #DDD6CE", color: "#6B6058" }}
          >
            <Download size={14} /> {showImportBox ? "Tutup Import" : "Import dari Backup"}
          </button>
        </div>

        {showImportBox && (
          <div className="rounded-2xl p-3.5 space-y-2.5" style={{ backgroundColor: "#F7F3EE", border: "1px solid #DDD6CE" }}>
            <p className="text-xs" style={{ color: "#6B6058" }}>
              ⚠️ Ini bakal GANTI SEMUA data yang ada sekarang dengan isi file backup. Pastikan file-nya benar sebelum konfirmasi.
            </p>
            <input
              ref={importFileRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="w-full text-xs"
            />
            <div className="text-center text-[11px]" style={{ color: "#736657" }}>atau</div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste teks JSON backup di sini…"
              className="w-full text-[11px] rounded-xl p-3 resize-none"
              style={{ ...inputStyle, height: "100px", fontFamily: "'IBM Plex Mono', monospace" }}
            />
            <button
              onClick={handleImportPasteCheck}
              className="w-full rounded-xl py-2 text-xs"
              style={{ border: "1px solid #DDD6CE", color: "#6B6058" }}
            >
              Cek Teks Ini
            </button>

            {importStatus === "error" && (
              <p className="text-[11px]" style={{ color: "#B5493A" }}>
                <AlertCircle size={12} className="inline mr-1" />
                {importMessage}
              </p>
            )}

            {importPreview && (
              <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: "#FBEADD", border: "1px solid #B8632E" }}>
                <div className="text-xs font-semibold" style={{ color: "#B8632E" }}>File valid, siap di-import:</div>
                <div className="text-xs" style={{ color: "#2A2118" }}>
                  {importPreview.beans.length} bean · {importPreview.grinders.length} grinder · {importPreview.machines.length} machine · {importPreview.recipes.length} recipe
                </div>
                <button
                  onClick={confirmImport}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold"
                  style={{ backgroundColor: "#C69163", color: "#332C2A" }}
                >
                  Ya, Timpa Data Sekarang
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {DB_TABS.map((t) => {
          const active = t.key === tab;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                backgroundColor: active ? "#C69163" : "transparent",
                color: active ? "#332C2A" : "#6B6058",
                border: `1px solid ${active ? "#C69163" : "#DDD6CE"}`,
                fontWeight: active ? 600 : 400,
              }}
            >
              <Icon size={14} />
              {t.label}
              <span
                className="ml-0.5 text-[10px] rounded-full px-1.5"
                style={{ backgroundColor: active ? "rgba(28,21,18,0.2)" : "#F0ECE7" }}
              >
                {t.key === "history" ? db.recipes.length : t.key === "brews" ? db.brews.length : db[t.key].length}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "history" ? (
        <ShotHistoryPanel
          db={db}
          persist={persist}
          onEdit={(item) => {
            setFormTabKey("recipes");
            setEditing(item);
            setFormOpen(true);
          }}
        />
      ) : tab === "brews" ? (
        <BrewHistoryPanel db={db} persist={persist} />
      ) : (
        <div className="px-5 mt-4 space-y-2.5">
          {items.length === 0 ? (
            <EmptyState
              text={`Belum ada data ${DB_TABS.find((t) => t.key === tab).single.toLowerCase()}.`}
            />
          ) : (
            items.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setFormTabKey(tab);
                setEditing(item);
                setFormOpen(true);
              }}
              className="rounded-2xl px-4 py-3.5 cursor-pointer"
              style={{
                backgroundColor: "#F7F3EE",
                border: "1px solid #DDD6CE",
                opacity: tab === "beans" && item.outOfStock ? 0.5 : 1,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {tab === "beans" && item.roastColor !== undefined && item.roastColor !== "" && (
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: roastColorFromValue(item.roastColor), border: "1px solid rgba(0,0,0,0.3)" }}
                        title={nearestRoastLabel(item.roastColor)}
                      />
                    )}
                    <div
                      className="text-sm"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#2A2118" }}
                    >
                      {itemTitle(tab, item, db)}
                    </div>
                    {tab === "beans" && item.outOfStock && (
                      <span
                        className="shrink-0 text-[9px] uppercase tracking-wide rounded-full px-1.5 py-0.5"
                        style={{ color: "#B5493A", border: "1px solid rgba(180,105,90,0.4)" }}
                      >
                        Habis
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#6B6058" }}>
                    {tab === "beans" &&
                      [
                        item.origin,
                        item.process,
                        item.roastColor !== undefined && item.roastColor !== "" ? nearestRoastLabel(item.roastColor) : item.roast,
                        item.density && `d=${Math.round(parseFloat(item.density) * 100)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    {tab === "grinders" && [item.burrType, item.burrSize && `${item.burrSize}mm`, item.stepSize && `step ${item.stepSize}`, item.innerBurr && `inner burr ${item.innerBurr}`].filter(Boolean).join(" · ")}
                    {tab === "machines" && item.type}
                    {tab === "recipes" && [item.shotType && item.shotType !== "Espresso" && item.shotType, item.dose && `${item.dose}g`, item.yield && `→${item.yield}g`, item.time && `${item.time}s`, item.basket === "Bottomless" && "Bottomless", item.taste, item.status].filter(Boolean).join(" · ")}
                  </div>
                  {tab === "recipes" && item.notes && (
                    <div
                      className="text-xs mt-1"
                      style={{ color: "#736657", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      📝 {item.notes}
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {tab === "beans" && (
                    <button
                      onClick={() => toggleStock(item.id)}
                      aria-label={item.outOfStock ? "Tandai ada stok" : "Tandai stok habis"}
                      title={item.outOfStock ? "Tandai ada stok" : "Tandai stok habis"}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ color: "#6B6058", border: "1px solid #DDD6CE" }}
                    >
                      {item.outOfStock ? <PackageCheck size={14} /> : <PackageX size={14} />}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setFormTabKey(tab);
                      setEditing(item);
                      setFormOpen(true);
                    }}
                    aria-label="Edit"
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ color: "#6B6058", border: "1px solid #DDD6CE" }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(item.id)}
                    aria-label="Hapus"
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ color: "#B5493A", border: "1px solid #DDD6CE" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
          )}
        </div>
      )}

      {tab !== "brews" && (
        <button
          onClick={() => {
            setFormTabKey(tab === "history" ? "recipes" : tab);
            setEditing(null);
            setFormOpen(true);
          }}
          className="fixed bottom-6 right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center focus:outline-none"
          style={{ backgroundColor: "#C69163", color: "#332C2A" }}
          aria-label={`Tambah ${DB_TABS.find((t) => t.key === tab).single}`}
        >
          <Plus size={24} />
        </button>
      )}

      {formOpen && (
        <ItemForm
          tabKey={formTabKey}
          db={db}
          initial={editing}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5"
            style={{ backgroundColor: "#F7F3EE", border: "1px solid #DDD6CE" }}
          >
            <p className="text-sm mb-4" style={{ color: "#2A2118" }}>
              Hapus data ini? Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl py-2.5 text-sm"
                style={{ border: "1px solid #DDD6CE", color: "#6B6058" }}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                style={{ backgroundColor: "#B5493A", color: "#332C2A" }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Home ----------
function HomeScreen({ db, onNavigate }) {
  return (
    <div className="min-h-full pb-10">
      <div className="px-5 pt-10 pb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F5E6D8" }}>
            <Coffee size={18} style={{ color: "#B8763C" }} />
          </div>
          <span
            className="text-xs uppercase tracking-widest"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#6B6058" }}
          >
            Tukang Ngopi
          </span>
        </div>
        <h1
          className="text-[28px] leading-tight mt-3"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#1A1512" }}
        >
          Mau ngapain hari ini?
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "#6B6058" }}>
          {db.beans.length} bean · {db.grinders.length} grinder · {db.recipes.length} recipe tersimpan
        </p>
      </div>

      <div className="px-5 space-y-3">
        <BigMenuButton
          icon={Coffee}
          label="Bikin Kopi"
          desc="Pilih bean & grinder, langsung dapat setting"
          onClick={() => onNavigate("bikin")}
        />
        <BigMenuButton
          icon={Target}
          label="Dial-In"
          desc="Cari resep baru, catat & evaluasi hasil shot"
          onClick={() => onNavigate("dialin")}
        />
        <BigMenuButton
          icon={Settings}
          label="Database"
          desc="Kelola bean, grinder, machine & recipe"
          onClick={() => onNavigate("database")}
        />
      </div>
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const { db, status, persist, saveStatus, retrySave } = useCoffeeDB();
  const [screen, setScreen] = useState("home");
  const [dbInitialTab, setDbInitialTab] = useState("beans");

  const goDatabase = (tabKey) => {
    setDbInitialTab(tabKey);
    setScreen("database");
  };

  return (
    <div className="w-full min-h-screen" style={{ fontFamily: "'Manrope', sans-serif", colorScheme: "light", backgroundColor: "#FFFFFF" }}>
      <style>{`
        ${FONT_IMPORT}
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        input, select, textarea {
          color-scheme: light;
          -webkit-text-fill-color: #2A2118;
          opacity: 1;
          font-size: 16px;
        }
        input::placeholder, textarea::placeholder {
          -webkit-text-fill-color: #736657;
          opacity: 1;
        }
        select option {
          background-color: #FFFFFF;
          color: #2A2118;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px #FFFFFF inset;
          -webkit-text-fill-color: #2A2118;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>

      {status === "ready" && <SaveStatusBadge saveStatus={saveStatus} onRetry={retrySave} />}

      {status === "loading" ? (
        <div className="min-h-screen flex items-center justify-center">
          <span className="text-sm" style={{ color: "#6B6058" }}>Memuat data…</span>
        </div>
      ) : status === "error" ? (
        <div className="min-h-screen flex items-center justify-center px-8 text-center">
          <div>
            <p className="text-sm mb-1.5" style={{ color: "#2A2118" }}>Data tersimpan gagal dibaca.</p>
            <p className="text-xs" style={{ color: "#6B6058" }}>
              Ini bukan berarti datanya hilang — kami sengaja tidak menimpanya. Coba muat ulang artifact ini sebentar lagi.
            </p>
          </div>
        </div>
      ) : screen === "home" ? (
        <HomeScreen db={db} onNavigate={setScreen} />
      ) : screen === "database" ? (
        <DatabaseScreen
          db={db}
          persist={persist}
          onBack={() => setScreen("home")}
          initialTab={dbInitialTab}
        />
      ) : screen === "bikin" ? (
        <BikinKopiScreen
          db={db}
          persist={persist}
          onBack={() => setScreen("home")}
          onGoDatabase={goDatabase}
        />
      ) : screen === "dialin" ? (
        <DialInScreen
          db={db}
          persist={persist}
          onBack={() => setScreen("home")}
          onGoDatabase={goDatabase}
        />
      ) : null}
    </div>
  );
}
