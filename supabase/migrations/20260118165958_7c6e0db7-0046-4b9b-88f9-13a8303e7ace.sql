-- Insert Token Saver Tips ke admin_chatbot_knowledge_base
INSERT INTO public.admin_chatbot_knowledge_base (title, content, category, source_type, is_active, tokens_count, summary)
VALUES
(
  'Gunakan Template yang Sudah Ada',
  'TUJUAN: Menghemat token dengan reuse prompt yang sudah terbukti efektif.

CARA:
1. Buka Developer Tools → Tab Prompt Templates
2. Cari template yang sesuai dengan kebutuhan
3. Copy dan sesuaikan variabel/placeholder
4. Kirim ke AI

CONTOH:
Alih-alih menulis: "Tolong buatkan hook baru untuk fetch data dari tabel bookings dengan filter status dan tanggal, juga tambahkan loading state dan error handling..."

Gunakan template: "Buatkan custom hook `useBookings` untuk CRUD operasi pada tabel `bookings` dengan fitur: fetch, add, update, delete"

ESTIMASI HEMAT: ~40% token per request',
  'token_saver',
  'txt',
  true,
  150,
  'Cara menghemat token dengan menggunakan Prompt Templates yang sudah tersedia di Developer Tools'
),
(
  'Berikan Konteks Spesifik',
  'PRINSIP: Semakin spesifik konteks yang diberikan, semakin sedikit iterasi yang dibutuhkan.

YANG HARUS DISERTAKAN:
- Nama file lengkap dengan path (contoh: src/components/RoomCard.tsx)
- Nama tabel database yang terlibat
- Nama fungsi atau komponen yang ingin dimodifikasi
- Line number jika memungkinkan

CONTOH BURUK:
"Perbaiki bug di halaman booking"

CONTOH BAIK:
"Perbaiki error TypeScript di src/hooks/useBooking.tsx line 45: Property ''status'' does not exist on type ''Booking''"

TIPS: Copy paste error message langsung dari console, jangan diringkas.',
  'token_saver',
  'txt',
  true,
  140,
  'Tips memberikan konteks spesifik untuk mengurangi iterasi dan pertanyaan follow-up dari AI'
),
(
  'Satu Request, Satu Fokus',
  'PRINSIP: Request yang fokus lebih mudah diproses dan lebih akurat hasilnya.

❌ HINDARI (Multiple Request):
"Buatkan halaman dashboard dengan chart revenue, tambahkan tabel booking, dan juga bikin sidebar navigation dengan menu settings"

✅ LAKUKAN (Single Focus):
Request 1: "Buatkan komponen MonthlyRevenueChart.tsx dengan data dari tabel bookings"
Request 2: "Buatkan komponen BookingTable.tsx untuk menampilkan list booking terbaru"
Request 3: "Update AdminSidebar.tsx untuk menambah menu Settings"

KEUNTUNGAN:
- Lebih mudah di-review hasilnya
- Lebih mudah di-rollback jika ada masalah
- Setiap perubahan lebih terfokus dan akurat',
  'token_saver',
  'txt',
  true,
  130,
  'Best practice untuk membuat request yang fokus pada satu perubahan agar lebih efisien'
),
(
  'Gunakan Format Terstruktur',
  'PRINSIP: Format yang jelas membantu AI memahami kebutuhan dengan lebih cepat.

FORMAT YANG DIREKOMENDASIKAN:

## Request
[Jelaskan apa yang ingin dilakukan]

## File yang Terlibat
- path/to/file1.tsx
- path/to/file2.tsx

## Detail Perubahan
1. [Perubahan pertama]
2. [Perubahan kedua]

## Contoh Output yang Diharapkan
[Jika ada, berikan contoh]

TIPS:
- Gunakan bullet points untuk list item
- Gunakan heading untuk memisahkan bagian
- Gunakan code block untuk contoh kode',
  'token_saver',
  'txt',
  true,
  120,
  'Panduan menggunakan format terstruktur untuk request yang kompleks'
),
(
  'Hindari Kata-kata Ambigu',
  'PRINSIP: Kata yang spesifik mengurangi interpretasi dan revisi.

KATA AMBIGU → ALTERNATIF SPESIFIK:

❌ "Baguskan tampilannya"
✅ "Tambahkan padding 16px, border-radius 8px, dan shadow-sm"

❌ "Perbaiki errornya"
✅ "Perbaiki TypeScript error: Property ''x'' does not exist on type ''Y'' di file src/components/X.tsx line 45"

❌ "Buatkan yang mirip"
✅ "Buatkan komponen serupa dengan src/components/RoomCard.tsx tapi untuk menampilkan data dari tabel facilities"

❌ "Tambah validasi"
✅ "Tambah validasi: email format, minimum 8 karakter password, phone number format +62"

❌ "Lebih cepat"
✅ "Tambahkan React.memo dan useMemo untuk mencegah re-render pada komponen RoomList"

TIPS: Jika Anda sendiri tidak bisa menjelaskan dengan detail, luangkan waktu untuk memikirkannya terlebih dahulu.',
  'token_saver',
  'txt',
  true,
  160,
  'Daftar kata-kata ambigu yang sebaiknya dihindari dan alternatif yang lebih spesifik'
),
(
  'Referensikan Kode yang Ada',
  'PRINSIP: Contoh kode yang ada di project adalah referensi terbaik untuk konsistensi.

CARA MENGGUNAKAN:

1. Buka Developer Tools → Tab Code Snippets
2. Cari pattern yang serupa dengan yang ingin dibuat
3. Copy snippet sebagai referensi dalam prompt

CONTOH PROMPT:
"Buatkan hook useFacilities.tsx dengan pattern yang sama seperti ini:
```typescript
[paste code snippet useRooms.tsx]
```
Tapi untuk tabel facilities dengan kolom: id, name, icon, description"

KEUNTUNGAN:
- AI memahami coding style project Anda
- Hasil lebih konsisten dengan kode existing
- Mengurangi revisi untuk penyesuaian style',
  'token_saver',
  'txt',
  true,
  130,
  'Tips menggunakan Code Snippets sebagai referensi untuk hasil yang konsisten'
),
(
  'Gunakan Placeholder Variables',
  'PRINSIP: Placeholder membuat template lebih reusable dan efisien.

PLACEHOLDER YANG UMUM DIGUNAKAN:
- [nama_file] → nama file yang akan dibuat/dimodifikasi
- [nama_tabel] → nama tabel database
- [nama_komponen] → nama komponen React
- [kolom_1], [kolom_2] → nama kolom database
- [tipe_data] → TypeScript type

CONTOH TEMPLATE DENGAN PLACEHOLDER:

"Buatkan custom hook `use[nama_komponen]` untuk CRUD operasi pada tabel `[nama_tabel]` dengan kolom: [kolom_1], [kolom_2], [kolom_3]. Gunakan pattern yang sama dengan useRooms.tsx."

PENGGUNAAN:
1. Copy template dari Prompt Templates
2. Replace placeholder dengan nilai aktual
3. Kirim ke AI

HEMAT: Tidak perlu menulis ulang struktur prompt yang sama.',
  'token_saver',
  'txt',
  true,
  140,
  'Panduan menggunakan placeholder variables di template prompt'
),
(
  'Review Before Send Checklist',
  'CHECKLIST SEBELUM MENGIRIM PROMPT:

□ Apakah request sudah spesifik?
  - Nama file/komponen disebutkan
  - Error message di-copy lengkap
  - Tidak ada kata ambigu

□ Apakah scope sudah terfokus?
  - Hanya 1 perubahan utama
  - Tidak ada "juga tambahkan..." yang tidak perlu

□ Apakah ada referensi yang bisa diberikan?
  - Code snippet yang serupa
  - Template yang bisa dipakai
  - Contoh output yang diharapkan

□ Apakah format sudah jelas?
  - Menggunakan bullet points untuk list
  - Heading untuk memisahkan bagian
  - Code block untuk contoh kode

□ Sudahkah cek existing solution?
  - Cek apakah sudah ada komponen serupa
  - Cek apakah ada template yang cocok
  - Cek apakah bisa extend yang sudah ada

TIPS: Meluangkan 30 detik untuk review bisa menghemat beberapa iterasi.',
  'token_saver',
  'txt',
  true,
  150,
  'Checklist sederhana sebelum mengirim prompt untuk memastikan efisiensi'
);