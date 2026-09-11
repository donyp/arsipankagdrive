# CHANGELOG_FIXES.md

Memori institusional proyek ini — akar tiap bug yang sudah diperbaiki, supaya
sesi berikutnya tak mengulang kesalahan yang sama. Entri terbaru di ATAS.

Format tiap entri:
```
### Fix #N — Judul Singkat: Gejala + Akar
| | |
|---|---|
| **Tanggal** | YYYY-MM-DD |
| **File** | path + fungsi yang diubah |
| **Masalah** | gejala konkret (sertakan angka/log nyata) |
| **Akar** | penyebab sebenarnya, bukan sekadar apa yang salah |
| **Fix** | apa yang diubah dan mengapa pendekatan itu |
| **Verifikasi** | bukti nyata: test/log/repro sebelum-sesudah |
| **Pelajaran** | pola kesalahan yang perlu dihindari |
```

### Fix #1 — Field name mismatch: undefined.pdf → correct invoice name
| | |
|---|---|
| **Tanggal** | 2026-09-11 |
| **File** | `backend/rename-invoice-hijau-endpoints.js` → response body field |
| **Masalah** | File ter-download dengan nama `undefined.pdf` alih-alih `no_invoice.pdf`. Log Railway menunjukkan OCR berhasil ekstrak "02182760000", tapi filename hasil `undefined`. |
| **Akar** | Backend mengirim field bernama `renamedFileName`, tapi frontend (`js/rename-invoice-hijau.js:146`) membaca `r.newName`. Mismatch ini membuat `link.download = undefined` → jadi `undefined.pdf`. |
| **Fix** | Ubah field response dari `renamedFileName` menjadi `newName` di `sendResponse(200, {...})` baris 459. |
| **Verifikasi** | Log Railway baris `New filename: 02182760000.pdf` + `Selected: Priority 2 - 02182760000` menunjukkan extraction benar; tinggal koneksi field name. |
| **Pelajaran** | Frontend-backend field name harus sinkron — jangan asumsi `result.newName` akan match dengan key apa pun di response. |

### Fix #2 — Invoice number extraction wrong: phone number picked instead of actual invoice
| | |
|---|---|
| **Tanggal** | 2026-09-11 |
| **File** | `backend/rename-invoice-hijau-endpoints.js` → extraction patterns |
| **Masalah** | File `aab.pdf` berhasil rename tapi pakai nomor telepon `02182760000` alih-alih invoice `83510031019082600`. Pattern1 gagal karena OCR teks `"Invoice : 83510031019082600"` tidak cocok regex lama. |
| **Akar** | Pattern1 hanya cocok `"No. Invoice:"` atau `"No :"` tapi tidak menangkap format `"Invoice :"`. Pattern2 fallback ambil yang pertama (telepon), bukan yang invoice. |
| **Fix** | 1) Perbaiki Pattern1 regex + split logic agar tangkap `"Invoice : XXXXX"`. 2) Pattern2 fallback: prefer longest match (bukan first), jadi nomor telepon pendek tidak menang. |
| **Verifikasi** | Test lokal: text `"Invoice : 83510031019082600"` → P1 result `83510031019082600` ✅. Text `"1002101906#6015"` → P0 result `1002101906#6015` ✅. |
| **Pelajaran** | Pastikan semua format yang mungkin ada di OCR text ditangani regex — jangan cuma satu format. Fallback pattern juga harus pilih yang paling relevan, bukan pertama. |
