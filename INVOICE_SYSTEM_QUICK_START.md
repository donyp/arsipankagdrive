# 🚀 Invoice System - Quick Start Guide

## Persiapan Awal (Hanya Sekali)

### 1. Jalankan Database Migration
```bash
node backend/execute-schema.js sql/add_invoice_file_list.sql
```

### 2. Pastikan Folder Google Drive Ada
Folder `/ARSIPINVOICE` sudah dibuat di Google Shared Drive ✅

### 3. Start Server
```bash
npm start
```

---

## Cara Pakai (Admin)

### 📤 Step 1: Upload Excel (Setiap Sore)

1. **Login** sebagai Super Admin atau Moderator
2. **Klik** menu **"Sistem Invoice" → "Upload Excel"**
3. **Siapkan** file Excel `REKAP_LABA.xls` dengan kolom:
   - TANGGAL
   - TOKO
   - FAKTUR
   - METODE BAYAR
   - JENIS TRANSAKSI
   - KONSUMEN
   - JUMLAH JUAL
   - KET 2 (PPN/NON PPN)

4. **Drag & Drop** file Excel atau klik untuk memilih
5. **Klik** tombol **"Upload & Proses"**
6. **Tunggu** proses selesai (akan tampil hasil)
7. **Klik** **"Lihat Daftar Invoice"**

**✅ Hasil:**
- Daftar invoice muncul dengan status "PENDING"
- Semua faktur dengan nomor sama otomatis digabung
- TOKO "ANKA" otomatis jadi "ANKA BEKASI"

---

### 📄 Step 2: Upload PDF Invoice

1. **Buka** **"Sistem Invoice" → "Daftar Invoice"**
2. **Cari** invoice yang mau diupload (gunakan filter atau search kalau banyak)
3. **Klik** tombol merah **"Upload"** di kolom Attachments
4. **Pilih** file PDF (nama file harus nomor faktur, contoh: `835100310.pdf`)
5. **Konfirmasi** upload
6. **Tunggu** sampai selesai

**✅ Hasil:**
- Status berubah dari "PENDING" (kuning) jadi "UPLOADED" (hijau)
- Tombol berubah dari "Upload" (merah) jadi "Lihat" (biru)
- File tersimpan di: `/ARSIPINVOICE/TAHUN/BULAN/TANGGAL/PPN atau NON/faktur.pdf`
- Statistik di atas otomatis update

---

## Contoh Lengkap

### Skenario: Upload Invoice Toko Berkah

**Data di Excel:**
```
TANGGAL    | TOKO  | FAKTUR    | METODE  | JENIS | KONSUMEN    | JUMLAH    | KET 2
02/10/2026 | ANKA  | 835100310 | CASH    | JUAL  | Toko Berkah | 1,500,000 | PPN
02/10/2026 | ANKA  | 835100310 | CASH    | JUAL  | Toko Berkah | 500,000   | PPN
```

**Setelah Upload Excel:**
```
Daftar Invoice akan tampil:
- Tanggal: 02/10/2026
- No Faktur: 835100310
- Toko: ANKA BEKASI (otomatis dinormalisasi)
- Total: Rp 2,000,000 (1,500,000 + 500,000 otomatis dijumlah)
- Keterangan: PPN
- Status: PENDING
- Tombol: [Upload] (merah)
```

**Setelah Upload PDF `835100310.pdf`:**
```
- Status: UPLOADED (hijau)
- Tombol: [Lihat] (biru)
- File tersimpan: /ARSIPINVOICE/2026/10/02/PPN/835100310.pdf
```

---

## Fitur Filter & Search

### Filter by Status
- **PENDING**: Invoice yang belum diupload PDF-nya
- **UPLOADED**: Invoice yang sudah diupload
- **MISSING**: Invoice yang hilang/tidak ditemukan

### Filter by Toko
- ANKA BEKASI
- ANKA PEMALANG

### Filter by Keterangan
- PPN: Invoice yang pakai PPN
- NON PPN: Invoice yang tidak pakai PPN

### Filter by Tanggal
- Dari tanggal: Pilih tanggal mulai
- Sampai tanggal: Pilih tanggal akhir

### Search
- Cari by nomor faktur: ketik `835100310`
- Cari by nama konsumen: ketik `Berkah`

**Cara pakai:**
1. Set filter yang mau dipakai
2. Klik **"Terapkan Filter"**
3. Hasil akan muncul sesuai filter
4. Klik **"Reset"** untuk hapus semua filter

---

## Statistik Dashboard

Di atas tabel ada 4 kartu statistik:

### 📊 Total Invoice
Jumlah semua invoice di sistem

### ✅ Uploaded
Jumlah invoice yang sudah diupload PDF-nya

### ⏳ Pending
Jumlah invoice yang masih menunggu diupload

### ❌ Missing
Jumlah invoice yang hilang/tidak ditemukan

**Update otomatis** setiap kali ada perubahan!

---

## Tips & Trik

### ✅ DO's (Yang Boleh)

1. **Upload Excel setiap sore** setelah tutup toko
2. **Cek daftar invoice** sebelum upload PDF
3. **Gunakan filter** untuk cari invoice tertentu
4. **Nama file PDF** harus sama dengan nomor faktur
5. **Upload PDF satu per satu** dari daftar

### ❌ DON'Ts (Yang Jangan)

1. ❌ Jangan upload Excel yang sama 2x (akan skip duplikat)
2. ❌ Jangan upload PDF dengan nama asal-asalan
3. ❌ Jangan upload PDF lebih dari 10MB
4. ❌ Jangan upload file selain PDF
5. ❌ Jangan hapus invoice kecuali yakin

---

## Troubleshooting Cepat

### 🔴 Problem: Excel upload gagal
**Solusi:**
- Cek format file (.xls atau .xlsx)
- Pastikan semua kolom ada
- Cek tanggal formatnya benar
- File max 10MB

### 🔴 Problem: PDF upload gagal
**Solusi:**
- Pastikan file PDF (bukan JPG/PNG)
- Nama file harus nomor faktur
- File max 10MB
- Cek internet connection

### 🔴 Problem: Faktur tidak ditemukan
**Solusi:**
- Upload Excel dulu
- Cek nomor faktur di daftar
- Pastikan ketik dengan benar

### 🔴 Problem: Status tidak update
**Solusi:**
- Refresh halaman (F5)
- Logout dan login lagi
- Cek koneksi internet

---

## FAQ (Frequently Asked Questions)

### Q: Berapa lama proses upload Excel?
**A:** Tergantung jumlah baris. Biasanya:
- 100 baris: ~5 detik
- 500 baris: ~15 detik
- 1000 baris: ~30 detik

### Q: Kalau Excel ada faktur yang sama dengan yang sudah ada?
**A:** Sistem akan skip duplikat. Invoice lama tidak akan berubah.

### Q: Bisa upload banyak PDF sekaligus?
**A:** Belum bisa. Harus satu per satu dari daftar.

### Q: Dimana file PDF tersimpan?
**A:** Di Google Drive folder `/ARSIPINVOICE/TAHUN/BULAN/TANGGAL/PPN atau NON/`

### Q: Bisa lihat PDF yang sudah diupload?
**A:** Klik tombol "Lihat" (biru) di kolom Attachments. (Fitur preview coming soon)

### Q: Bisa hapus invoice?
**A:** Hanya Super Admin yang bisa hapus.

### Q: Bisa edit data invoice?
**A:** Belum ada fitur edit. Kalau salah, hapus dan upload ulang Excel.

---

## Akses & Permission

### 👑 Super Admin
- ✅ Upload Excel
- ✅ Upload PDF
- ✅ Lihat semua invoice
- ✅ Hapus invoice
- ✅ Update status manual

### 🔧 Moderator
- ✅ Upload Excel
- ✅ Upload PDF
- ✅ Lihat semua invoice
- ❌ Tidak bisa hapus

### 👤 Admin Zona & User
- ✅ Lihat semua invoice
- ✅ Upload PDF
- ❌ Tidak bisa upload Excel
- ❌ Tidak bisa hapus

---

## Shortcut Keyboard (Coming Soon)

Fitur shortcut keyboard akan ditambahkan di update berikutnya.

---

## Contact Support

Jika ada masalah:
1. Cek dokumentasi lengkap: `NEW_INVOICE_SYSTEM_IMPLEMENTATION.md`
2. Cek testing guide: `INVOICE_SYSTEM_TESTING_GUIDE.md`
3. Hubungi system administrator

---

## Update Log

**v1.0.0** - September 2026
- ✅ Excel upload system
- ✅ Invoice list dengan filter
- ✅ PDF upload dengan auto-matching
- ✅ Statistics dashboard
- ✅ Role-based access

---

**🎉 Selamat menggunakan sistem invoice baru! 🎉**

Sistem ini dibuat untuk mempermudah pekerjaan admin dalam mengelola invoice. 
Jika ada saran atau masukan, silakan hubungi tim development.

---

**Made with ❤️ by Kiro AI Assistant**
