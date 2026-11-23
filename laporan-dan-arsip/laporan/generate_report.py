"""
generate_report.py
Generator Laporan Pengembangan Proyek Akhir (Final Project) Sub-CPMK 5
Diformat penuh mengikuti standar tata tulis akademik skill `yuss-males-laprak`:
- Kertas A4 (21.0 x 29.7 cm), Margin 4-4-3-3 cm
- Times New Roman 12 pt seragam, hitam pekat (#000000), 1.5 spasi
- Paragraf Justified, indentasi baris pertama 1.27 cm
- Heading 1, 2, 3 native MS Word (terintegrasi Navigation Pane)
- Page Break mutlak di setiap pergantian Bab (tiap Bab di halaman baru)
- List hierarki native OpenXML (<w:numPr>) 1. 2. 3. -> a. b. c. dengan text indent 0.75 cm
- Cetak miring otomatis istilah asing / non-KBBI (kbbi_italicizer + PySastrawi)
- Sitasi ilmiah Open-Access (>= 2020) & Daftar Pustaka APA 7th Edition (hanging indent 1.27 cm)
- Placeholder gambar dokumentasi [Sisipkan Gambar: ...]
"""

import os
import sys
import re
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

# Impor modul styler dan KBBI italicizer dari skill yuss-males-laprak
SKILL_SCRIPTS_DIR = r"C:\Users\tedon\.gemini\config\skills\yuss-males-laprak\scripts"
SKILL_TEMPLATE_PATH = r"C:\Users\tedon\.gemini\config\skills\yuss-males-laprak\templates\base_template.docx"

if SKILL_SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SKILL_SCRIPTS_DIR)

import kbbi_italicizer
import docx_styler


def configure_kbbi_and_tech_terms():
    """
    Memperkaya kamus KBBI allowlist (nama diri, nama geografis Sulawesi Tengah,
    kosakata akademik/rekayasa perangkat lunak resmi KBBI) dan daftar istilah teknis
    asing agar cetak miring non-KBBI berjalan akurat.
    """
    kbbi_italicizer.KBBI_ALLOWLIST.update({
        # Nama diri anggota kelompok, kampus, wilayah Sulteng, & penulis sitasi
        "tadulako", "untad", "sulawesi", "palu", "sigi", "donggala", "poso",
        "tolitoli", "tondo", "talise", "koro", "teluk", "lidiya", "tabita",
        "creaselia", "belicia", "theona", "muhammad", "zikri", "adam",
        "trista", "sheryl", "lambei", "indonesia", "rupiah", "jepang",
        "tokyo", "shinjuku", "kyoto", "lawi", "panggabean", "yoshida",
        "muzaki", "salam", "dalimunthe", "putra", "ridha", "fielding",
        "januari", "februari", "maret", "april", "mei", "juni", "juli",
        "agustus", "september", "oktober", "november", "desember",

        # Kosakata bahasa Indonesia baku (KBBI) berimbuhan & istilah serapan sah
        "kebencanaan", "terelasi", "berelasi", "berlatar", "berkala", "berstatus",
        "berstandar", "berformat", "berbatas", "berdampingan", "diperbarui",
        "diimplementasikan", "dipertanggungjawabkan", "ditegakkan", "dipersyaratkan",
        "ditelusuri", "terdokumentasi", "terverifikasi", "terdaftar", "terintegrasi",
        "ketidaktersediaan", "ketersediaan", "keterbatasan", "pemangku", "terkemuka",
        "seringkali", "perjalanan", "dinas", "pencatatan", "pengamanan",
        "pengelolaan", "pengembangan", "pembagian", "perancangan", "pengujian",
        "perbandingan", "penerbitan", "kedaluwarsa", "otentikasi", "autentikasi",
        "otorisasi", "kriptografi", "algoritma", "skema", "atribut", "validasi",
        "relasional", "relasi", "spesifikasi", "dokumentasi", "enkripsi",
        "integrasi", "mutasi", "versi", "legasi", "lampiran", "kesimpulan",
        "pustaka", "kontrak", "proyek", "kelompok", "anggota", "stambuk",
        "informatika", "teknologi", "rekayasa", "kurikulum", "mahasiswa",
        "dosen", "asisten", "fakultas", "universitas", "teknik", "jurusan",
        "program", "studi", "kelas", "plafon", "anggaran", "transaksi",
        "kegiatan", "ekspedisi", "mitigasi", "sesar", "geoteknik", "pesisir",
        "infrastruktur", "sipil", "operasional", "logistik", "lapangan",
        "posko", "konsumsi", "komponen", "impor", "valuta", "valas", "kurs",
        "konversi", "satuan", "antarmuka", "repositori", "skenario", "matriks",
        "jaringan", "lokal", "daring", "luring", "simulasi", "prototipe",
        "otomasi", "konfigurasi", "keamanan", "identitas", "peran", "klien",
        "peladen", "permintaan", "respons", "metode", "parameter", "jalur",
        "aturan", "berkas", "dokumen", "sumber", "rujukan", "capaian", "rencana",
        "notifikasi", "ambang", "batas", "ribuan", "konkuren", "migrasi",
        "komprehensif", "substansial", "transparan", "proporsional", "etis",
        "mandiri", "mutlak", "acak", "kebal", "serangan", "rahasia", "digital",
        "ketat", "lambat", "gangguan", "cadangan", "bawaan", "tambahan",
        "eksternal", "internal", "pembacaan", "pemutusan", "mendadak",
        "restrukturisasi", "datar", "bersarang", "pengampu", "terbukti",
        "kegagalan", "mekanisme", "penyediaan", "kriteria", "andal",
        "perangkat", "lunak", "komunikasi", "efisiensi", "latensi", "skala",
        "produksi", "deklarasi", "pernyataan", "transparansi", "rekomendasi",
        "sintaks", "penentuan", "wawancara", "lisan", "hadapan", "penguji",
        "menghindari", "ketergantungan", "performa", "evaluasi", "geolistrik",
        "pantai", "tujuan", "alamat", "objek", "nilai", "tukar", "mata", "uang",
        "asing", "internasional", "simposium", "seminar", "konferensi",
        "banding", "kendaraan", "perahu", "kimia", "penginapan", "suhu",
        "udara", "kecepatan", "angin", "interpretasi", "koordinat", "kabupaten",
        "tingkat", "risiko", "akibat", "pihak", "ketiga", "prinsip", "cabang",
        "utama", "rilis", "akhir", "individu", "tim", "pengembang", "pendahuluan",
        "gambaran", "rancangan", "strategi", "penutup", "daftar", "aspek",
        "keadaan", "sekarang", "lama", "dilarang", "diizinkan", "operasi",
        "tindakan", "nomor", "bagian", "bukti", "cuplikan", "contoh", "teks",
        "ekspektasi", "hasil", "nama", "susunan", "diagram", "cara", "kerja",
        "latar", "belakang", "sasaran", "kondisi", "dibayangkan", "berikut",
        "analisis", "sistem", "informasi", "kunci", "ganda", "berbasis",
        "dibentuk", "diuji", "dipahami", "dihasilkan", "disertai", "dilengkapi",
        "menghitung", "menjalankan", "mengelola", "memeriksa", "membedakan",
        "mengirim", "menerima", "menghasilkan", "mengembalikan", "memutus",
        "meneruskan", "menolak", "menyertakan", "menerapkan", "membuktikan",
        "mencakup", "mengikuti", "menunjukkan", "memuat", "menyajikan", "beralih",
        "mengalami", "menghubungkan", "menambahkan", "mengembangkan", "melindungi",
        "memeroleh", "memperoleh", "sekaligus", "mengurangi", "berlebihan",
        "kekurangan", "pengambilan", "pemrosesan", "penyimpanan", "pemanggilan",
        "penandatanganan", "verifikasi", "pencarian", "pemeliharaan", "pengawasan",
        "akademik", "perguruan", "tinggi", "mata", "kuliah", "seluruh", "masing",
        "berdasarkan", "terkait", "tersebut", "berjalan", "berbeda", "tersedia",
        "semua", "setiap", "sebagai", "sesuai", "melalui", "selama", "antara",
        "hanya", "hingga", "maupun", "namun", "oleh", "karena", "sehingga",
        "secara", "lebih", "sangat", "baik", "baru", "penuh", "ringkas", "cepat",
        "jelas", "tegas", "aman", "resmi", "bebas", "umum", "khusus", "nyata",
        "tunggal", "persisten", "statis", "dinamis", "struktural", "empiris",
        "kritis", "kredensial", "lembar", "kami", "yang", "bertanda", "bawah",
        "menyatakan", "sesungguhnya", "penyelesaian", "mitra", "diskusi",
        "merancang", "struktur", "arsitektur", "menyusun", "memvalidasi",
        "kesesuaian", "panduan", "timur", "kawasan", "daerah", "seperti",
        "serta", "maupun", "dalam", "untuk", "dengan", "pada", "dari", "ke",
        "di", "dan", "atau", "tidak", "tanpa", "jika", "bila", "saat", "ketika",
        "agar", "guna", "demi", "akan", "telah", "sedang", "masih", "dapat",
        "bisa", "wajib", "harus", "perlu", "belum", "sudah", "pun", "kali",
        "buah", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan",
        "sembilan", "sepuluh", "pertama", "kedua", "berikutnya", "selanjutnya",
        "sebelumnya", "awal", "tengah", "sisa", "total", "jumlah", "rata",
        "standar", "industri", "modul", "bab", "tabel", "gambar", "kode",
        "skrip", "berkas", "pesan", "kesalahan", "peringatan", "layanan",
        "pengguna", "kegiatan", "pengeluaran", "biaya", "belanja", "alat",
        "pelaporan", "laporan", "catatan", "daftar", "pusat", "lokasi",
        "wilayah", "negara", "kota", "kampung", "sungai", "gunung", "gempa",
        "bumi", "air", "kualitas", "cuaca", "prakiraan", "suhu", "angin",
        "iklim", "tema", "wisata", "umum", "halaman", "sampul", "subjek",
        "disusun", "oleh", "tahun", "bulan", "hari", "jam", "menit", "detik",
        "menit", "juta", "ribu", "persen", "rupiah", "dolar", "yen", "euro",
        "subbab", "uraian", "penjelasan", "pembahasan", "terhadap", "atas",
        "tentang", "mengenai", "menurut", "bersama", "langsung", "terpisah",
        "secara", "otomatis", "manual", "acak", "khusus", "umum", "salah",
        "benar", "cocok", "sah", "batal", "hapus", "ubah", "tambah", "lihat",
        "ambil", "simpan", "kirim", "terima", "buka", "tutup", "masuk", "keluar",
        "pengisian", "penarikan", "pembuatan", "pembaruan", "penghapusan",
        "penolakan", "pembatasan", "pencegahan", "perlindungan", "pendukung",
        "pemantauan", "pelacakan", "penanganan", "penerapan", "pelaksanaan",
        "pembuatan", "pembentukan", "pengaturan", "penyesuaian", "penyajian",
        "penggabungan", "pemecahan", "pemuatan", "pengiriman", "penerimaan",
        "pengambilan", "pemeriksaan", "pengesahan", "perhitungan", "penilaian",
        # Angka Romawi, kode bab/lampiran, dan singkatan tanggal/nomor baku KBBI
        "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
        "l", "n", "no", "des", "rincian", "lat", "lon"
    })

    # Frasa teknis bahasa asing / non-KBBI yang dicetak miring utuh
    kbbi_italicizer.TECH_PHRASES.extend([
        "field research", "travel expense", "travel expense tracker",
        "project based learning", "final project", "open-meteo", "open meteo",
        "exchangerate-api", "exchangerate api", "signed token", "api key",
        "bearer token", "foreign key", "breaking change", "breaking changes",
        "timing attack", "rainbow table", "in-memory", "over-budget",
        "over-fetching", "under-fetching", "auto-save", "open-access",
        "open access", "pair programmer", "pair programming", "generative ai",
        "feature branching", "semantic versioning", "merge commit",
        "fast-forward", "status code", "swagger editor", "web dashboard",
        "client console", "client sdk", "service layer", "router dispatcher",
        "separation of concerns", "one-to-many", "nested array", "nested object",
        "nested relation", "nested query", "role-based access control",
        "access control", "password hashing", "key management", "session management",
        "react native", "mongodb atlas", "postman collection runner",
        "bruno collection", "test case", "test script", "read-only",
        "real-time", "current weather", "weather code", "response header",
        "request body", "query parameter", "path parameter", "mocking api",
        "user interface", "rate limit", "error handling", "timeout handling",
        "cache fallback", "offline cache", "bad request", "not found",
        "timing safe equal", "successor version", "legacy endpoint"
    ])

    # Kata tunggal non-KBBI / teknis bahasa Inggris yang wajib miring
    kbbi_italicizer.TECH_WORDS.update({
        "backend", "frontend", "endpoint", "endpoints", "framework", "frameworks",
        "timeout", "fallback", "cache", "cached", "caching", "token", "tokens",
        "hash", "hashed", "hashing", "scrypt", "scryptsync", "salt", "salted",
        "payload", "payloads", "header", "headers", "query", "queries",
        "mutation", "mutations", "nested", "array", "arrays", "foreign",
        "breaking", "timing", "attack", "rainbow", "collection", "collections",
        "runner", "runners", "native", "git", "branch", "branches", "branching",
        "merge", "merged", "commit", "commits", "tag", "tags", "mocking",
        "swagger", "client", "clients", "server", "servers", "error", "errors",
        "warning", "warnings", "status", "field", "fields", "webhook",
        "webhooks", "cluster", "driver", "drivers", "locking", "workflow",
        "script", "scripts", "assertion", "assertions", "live", "dashboard",
        "console", "web", "mobile", "request", "requests", "response",
        "responses", "body", "path", "paths", "resource", "resources",
        "middleware", "flat", "base64", "signature", "signatures", "expiry",
        "sunset", "deprecation", "deprecated", "successor", "semantic",
        "versioning", "mongodb", "atlas", "telegram", "flutter", "bruno",
        "postman", "nodejs", "javascript", "playwright", "figcraft", "openapi",
        "graphql", "restful", "rest", "jsonwebtoken", "bcrypt", "crypto",
        "localhost", "github", "npm", "yaml", "json", "bearer", "admin",
        "guest", "valid", "pass", "passed", "fail", "failed", "forbidden",
        "unauthorized", "created", "online", "offline", "ready", "nullable",
        "true", "false", "title", "location", "latitude", "longitude", "unit",
        "category", "cost", "amount", "currency", "date", "notes", "sukses",
        "weathercode", "windspeed", "temperature", "time", "rates", "iat",
        "exp", "timingsafeequal", "abortsignal", "activityid", "leadresearcher",
        "budgetlimitidr", "startdate", "enddate", "submittedby", "nominalidr",
        "formatrupiah", "kurspersatuan", "createexpense", "createexpenseinput",
        "current_weather", "cachedrates", "apikeyauth", "bearerauth",
        "antigravity", "coding", "agent", "google", "deepmind", "gemini",
        "generative", "pair", "programmer", "main", "repository", "round-trip",
        "throughput", "overhead", "serialization"
    })


def format_cell_borders(cell, top=True, bottom=True, left=False, right=False):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(r'''
        <w:tcBorders {} >
            <w:top w:val="{}" w:sz="6" w:space="0" w:color="000000"/>
            <w:left w:val="{}" w:sz="6" w:space="0" w:color="000000"/>
            <w:bottom w:val="{}" w:sz="6" w:space="0" w:color="000000"/>
            <w:right w:val="{}" w:sz="6" w:space="0" w:color="000000"/>
        </w:tcBorders>
    '''.format(
        nsdecls('w'),
        'single' if top else 'none',
        'single' if left else 'none',
        'single' if bottom else 'none',
        'single' if right else 'none'
    ))
    tcPr.append(tcBorders)


def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(r'<w:shd {} w:fill="{}"/>'.format(nsdecls('w'), fill_hex))
    tcPr.append(shd)


def _prevent_row_split(row):
    """Mencegah baris tabel terpotong di tengah antar halaman (<w:cantSplit/>)."""
    trPr = row._tr.get_or_add_trPr()
    trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))


def _repeat_header_row(row):
    """Mengulang baris header tabel otomatis jika tabel bersambung ke halaman berikut."""
    trPr = row._tr.get_or_add_trPr()
    trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))


def add_styled_table(doc, headers, rows_data, col_widths_cm=None, row_line_spacing=1.15, cell_pad_pt=2, after_space_pt=4):
    """
    Membuat tabel akademik dengan styling Times New Roman, cetak miring non-KBBI,
    warna hitam #000000, border horizontal bersih, anti-potong baris, dan header berulang.
    """
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Header row
    _prevent_row_split(table.rows[0])
    _repeat_header_row(table.rows[0])
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        cell = hdr_cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        docx_styler.set_paragraph_spacing(p, line_spacing=row_line_spacing, space_before_pt=cell_pad_pt, space_after_pt=cell_pad_pt)
        docx_styler.add_runs(p, h, base_bold=True, font_size_pt=11)
        set_cell_background(cell, 'E5E7EB')
        format_cell_borders(cell, top=True, bottom=True)
        if col_widths_cm and i < len(col_widths_cm):
            cell.width = Cm(col_widths_cm[i])

    # Data rows
    for row_vals in rows_data:
        new_row = table.add_row()
        _prevent_row_split(new_row)
        row_cells = new_row.cells
        for i, val in enumerate(row_vals):
            cell = row_cells[i]
            cell.text = ""
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            docx_styler.set_paragraph_spacing(p, line_spacing=row_line_spacing, space_before_pt=cell_pad_pt, space_after_pt=cell_pad_pt)
            lines = str(val).split("\n")
            for idx, line in enumerate(lines):
                if idx > 0:
                    p = cell.add_paragraph()
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    docx_styler.set_paragraph_spacing(p, line_spacing=row_line_spacing, space_before_pt=1, space_after_pt=1)
                docx_styler.add_runs(p, line, base_bold=False, font_size_pt=11)
            format_cell_borders(cell, top=False, bottom=True)
            if col_widths_cm and i < len(col_widths_cm):
                cell.width = Cm(col_widths_cm[i])

    # Jeda rapi setelah tabel
    p_after = doc.add_paragraph()
    docx_styler.set_paragraph_spacing(p_after, line_spacing=1.0, space_before_pt=0, space_after_pt=after_space_pt)
    return table


def create_fresh_numbered_list_id(doc):
    """
    Membuat definisi <w:abstractNum> + <w:num> tersendiri (tanpa berbagi abstractNumId/lvlOverride)
    agar setiap daftar bernomor di MS Word selalu menghitung berurutan 1., 2., 3. dan a., b., c.
    """
    docx_styler.setup_academic_numbering(doc)
    num_part = doc.part.numbering_part
    num_el = num_part._element

    existing_nums = [int(n.get(qn('w:numId'), 0)) for n in num_el.findall(qn('w:num'))]
    existing_abs = [int(a.get(qn('w:abstractNumId'), 0)) for a in num_el.findall(qn('w:abstractNum'))]
    new_num_id = max(existing_nums + [199]) + 1
    new_abs_id = max(existing_abs + [199]) + 1

    abstract_xml = f'''
    <w:abstractNum {nsdecls("w")} w:abstractNumId="{new_abs_id}">
      <w:multiLevelType w:val="hybridMultilevel"/>
      <w:lvl w:ilvl="0">
        <w:start w:val="1"/>
        <w:numFmt w:val="decimal"/>
        <w:lvlText w:val="%1."/>
        <w:lvlJc w:val="left"/>
        <w:pPr><w:ind w:left="1145" w:hanging="425"/></w:pPr>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          <w:sz w:val="24"/>
          <w:color w:val="000000"/>
        </w:rPr>
      </w:lvl>
      <w:lvl w:ilvl="1">
        <w:start w:val="1"/>
        <w:numFmt w:val="lowerLetter"/>
        <w:lvlText w:val="%2."/>
        <w:lvlJc w:val="left"/>
        <w:pPr><w:ind w:left="1570" w:hanging="425"/></w:pPr>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          <w:sz w:val="24"/>
          <w:color w:val="000000"/>
        </w:rPr>
      </w:lvl>
      <w:lvl w:ilvl="2">
        <w:start w:val="1"/>
        <w:numFmt w:val="decimal"/>
        <w:lvlText w:val="%3)"/>
        <w:lvlJc w:val="left"/>
        <w:pPr><w:ind w:left="1995" w:hanging="425"/></w:pPr>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          <w:sz w:val="24"/>
          <w:color w:val="000000"/>
        </w:rPr>
      </w:lvl>
    </w:abstractNum>
    '''
    num_xml = f'''
    <w:num {nsdecls("w")} w:numId="{new_num_id}">
      <w:abstractNumId w:val="{new_abs_id}"/>
    </w:num>
    '''
    first_num = num_el.find(qn('w:num'))
    if first_num is not None:
        first_num.addprevious(parse_xml(abstract_xml))
    else:
        num_el.append(parse_xml(abstract_xml))
    num_el.append(parse_xml(num_xml))
    return new_num_id


def add_clean_list_item(doc, text, list_type="numbered", level=1, num_id=None, base_indent_cm=1.27, text_indent_cm=0.75, space_after_pt=3):
    """
    Membungkus docx_styler.add_list_item tanpa memangkas tanda '**' di awal kalimat
    agar label tebal pada poin daftar tidak rusak menjadi tanda bintang nyasar.
    """
    p = docx_styler.add_list_item(
        doc, "", list_type=list_type, level=level, num_id=num_id,
        base_indent_cm=base_indent_cm, text_indent_cm=text_indent_cm
    )
    docx_styler.set_paragraph_spacing(p, line_spacing=1.5, space_before_pt=0, space_after_pt=space_after_pt)
    docx_styler.add_runs(p, text, font_size_pt=12)
    return p


def add_bibliography_entry_clean(doc, text):
    """Entri Daftar Pustaka APA 7th Edition rata kiri dengan hanging indent 1.27 cm agar URL tidak meregang."""
    p = docx_styler.add_bibliography_entry(doc, text)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    docx_styler.set_paragraph_spacing(p, line_spacing=1.5, space_before_pt=0, space_after_pt=3)
    return p


def add_report_figure(doc, rel_asset_path, caption_text, width_cm=13.2):
    """Menyisipkan gambar dokumentasi terpusat dengan caption akademik Times New Roman 11 pt."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    full_path = os.path.abspath(os.path.join(base_dir, rel_asset_path))
    if os.path.exists(full_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.keep_with_next = True
        docx_styler.set_paragraph_spacing(p_img, line_spacing=1.0, space_before_pt=6, space_after_pt=3)
        p_img.add_run().add_picture(full_path, width=Cm(width_cm))

        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        docx_styler.set_paragraph_spacing(p_cap, line_spacing=1.15, space_before_pt=0, space_after_pt=8)
        docx_styler.add_runs(p_cap, caption_text, base_bold=False, font_size_pt=11)
        return p_img
    return docx_styler.add_image_placeholder(doc, caption_text, left_indent_cm=1.27)


def add_code_block(doc, code_text, left_indent_cm=1.27):
    """Blok kode program/skema berbingkai rapi tanpa memutus aliran margin akademik."""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.left_indent = Cm(left_indent_cm)
    docx_styler.set_paragraph_spacing(p, line_spacing=1.15, space_before_pt=4, space_after_pt=8)

    # Border kiri tebal abu gelap & latar belakang terang
    pPr = p._element.get_or_add_pPr()
    pBdr = parse_xml(
        f'<w:pBdr {nsdecls("w")}>'
        f'<w:left w:val="single" w:sz="18" w:space="8" w:color="4B5563"/>'
        f'<w:top w:val="single" w:sz="4" w:space="4" w:color="D1D5DB"/>'
        f'<w:bottom w:val="single" w:sz="4" w:space="4" w:color="D1D5DB"/>'
        f'<w:right w:val="single" w:sz="4" w:space="8" w:color="D1D5DB"/>'
        f'</w:pBdr>'
    )
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:val="clear" w:color="auto" w:fill="F8FAFC"/>')
    pPr.append(pBdr)
    pPr.append(shd)

    run = p.add_run(code_text)
    run.font.name = 'Courier New'
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(0, 0, 0)
    return p


def add_cover_page(doc):
    """
    Halaman Sampul (Halaman 1 berdiri sendiri, Times New Roman 12 pt,
    Center Aligned, warna hitam pekat #000000, spasi 1.5, dilengkapi Logo Untad).
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    logo_candidates = [
        os.path.abspath(os.path.join(base_dir, "assets", "logo_untad.png")),
        os.path.abspath(os.path.join(base_dir, "..", "..", "public", "logo-untad.png")),
    ]
    logo_path = next((p for p in logo_candidates if os.path.exists(p)), None)

    top_blocks = [
        ("LAPORAN PENGEMBANGAN PROYEK AKHIR (FINAL PROJECT)\nEVALUASI SUB-CPMK 5 — PROJECT BASED LEARNING", True, 12),
        ("PENGEMBANGAN API SESUAI STANDAR INDUSTRI: SISTEM MANAJEMEN BIAYA DAN LOGISTIK PERJALANAN DINAS / RISET LAPANGAN FAKULTAS TEKNIK UNIVERSITAS TADULAKO TERINTEGRASI PUBLIC API DAN GRAPHQL", True, 16),
        ("KELOMPOK 2 — KELAS TIC", True, 10),
    ]
    bottom_blocks = [
        ("Disusun Oleh:\n1. Lidiya (F5512530118)\n2. Tabita Creaselia Belicia Theona (F5512520086)\n3. Muhammad Zikri Adam (F5512530117)\n4. Trista Sheryl Lambei (F5512530106)", False, 12),
        ("Alamat Repositori GitHub:\nhttps://github.com/zikriadamm/PROJEK-BASED-2-API", False, 18),
        ("MATA KULIAH REKAYASA API (F09252013)\nPROGRAM STUDI S1 TEKNIK INFORMATIKA\nJURUSAN TEKNOLOGI INFORMASI\nFAKULTAS TEKNIK\nUNIVERSITAS TADULAKO\n2026", True, 0),
    ]

    def _emit_cover_blocks(blocks, first_block_top_pt=0):
        for b_idx, (text_block, is_bold, after_pt) in enumerate(blocks):
            lines = text_block.split("\n")
            for idx, line in enumerate(lines):
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                sp_before = first_block_top_pt if (b_idx == 0 and idx == 0) else 0
                sp_after = after_pt if idx == len(lines) - 1 else 0
                docx_styler.set_paragraph_spacing(p, line_spacing=1.5, space_before_pt=sp_before, space_after_pt=sp_after)
                docx_styler.add_runs(p, line, is_heading=True, base_bold=is_bold, font_size_pt=12)

    _emit_cover_blocks(top_blocks, first_block_top_pt=6)

    if logo_path:
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        docx_styler.set_paragraph_spacing(p_logo, line_spacing=1.0, space_before_pt=6, space_after_pt=14)
        p_logo.add_run().add_picture(logo_path, width=Cm(3.6))

    _emit_cover_blocks(bottom_blocks, first_block_top_pt=0)

    docx_styler.add_page_break(doc)


def build_final_report():
    configure_kbbi_and_tech_terms()

    tpl = SKILL_TEMPLATE_PATH if os.path.exists(SKILL_TEMPLATE_PATH) else None
    doc = docx_styler.create_document(tpl)

    # ==================== HALAMAN 1: SAMPUL ====================
    add_cover_page(doc)

    # ==================== BAB I: GAMBARAN PROYEK ====================
    docx_styler.add_heading_1(doc, "BAB I\nGAMBARAN PROYEK")

    docx_styler.add_heading_2(doc, "1.1\tLatar Belakang dan Konteks Wilayah Universitas Tadulako")
    docx_styler.add_body_paragraph(
        doc,
        "Fakultas Teknik Universitas Tadulako (Untad) sebagai salah satu institusi pendidikan tinggi teknik terkemuka di kawasan timur Indonesia secara aktif menjalankan berbagai ekspedisi penelitian ilmiah lapangan, pengabdian masyarakat (KKN Tematik), serta perjalanan dinas akademik ke berbagai daerah di Sulawesi Tengah (seperti Sigi, Donggala, Poso, Tolitoli) hingga simposium riset internasional di luar negeri. Karakteristik geografis Sulawesi Tengah yang dilalui jalur sesar aktif Palu-Koro menuntut para peneliti untuk melakukan survei geoteknik berkala, pemasangan sensor IoT kualitas air di pesisir Teluk Palu, dan pengujian mitigasi kebencanaan infrastruktur sipil."
    )
    docx_styler.add_body_paragraph(
        doc,
        "Dalam pelaksanaan riset tersebut, pengelolaan keuangan operasional dan logistik lapangan seringkali menghadapi kendala. Tim peneliti di lapangan sering kali melakukan transaksi belanja sewa perahu atau kendaraan 4WD, bahan kimia, penginapan posko, konsumsi tim, serta pembelian komponen sensor impor dalam mata uang asing (USD, JPY, EUR). Pada Evaluasi Sub-CPMK 4, kelompok telah membangun API pencatatan pengeluaran (*Travel Expense Tracker*), namun sistem tersebut masih berupa prototipe dasar tanpa pengamanan, tanpa pemisahan hak akses, tanpa *versioning*, dan datanya belum terintegrasi dengan konteks lokal Sulawesi Tengah. Oleh karena itu, pada *Final Project* (Sub-CPMK 5) ini, sistem dikembangkan menjadi *backend* berstandar industri dengan mengikat pengeluaran ke master kegiatan riset FT Untad, menerapkan pengamanan ganda (*API Key* dan *Signed Token* HMAC-SHA256), *GraphQL*, serta integrasi dua *Public API* tangguh (*Open-Meteo* dan *ExchangeRate-API*)."
    )

    docx_styler.add_heading_2(doc, "1.2\tSasaran Pengguna yang Dibayangkan")
    docx_styler.add_body_paragraph(
        doc,
        "Sistem ini dirancang untuk melayani dua profil pemangku kepentingan utama di lingkungan kampus:"
    )
    list_id_12 = create_fresh_numbered_list_id(doc)
    add_clean_list_item(
        doc,
        "**Dosen Peneliti atau Pimpinan Fakultas (Role Admin):** Bertanggung jawab menyetujui proposal kegiatan riset, memantau batas plafon anggaran belanja (budget limit), memeriksa kondisi cuaca posko lapangan demi keselamatan tim, serta memiliki hak akses administratif penuh untuk menambah kegiatan dan menghapus transaksi.",
        level=1, num_id=list_id_12, base_indent_cm=1.27, text_indent_cm=0.75
    )
    add_clean_list_item(
        doc,
        "**Mahasiswa Peneliti atau Asisten Lapangan (Role Mahasiswa):** Bertugas melakukan pencatatan rincian biaya riil langsung dari lokasi posko riset. Mahasiswa hanya diberi hak akses melihat data dan mencatat transaksi pengeluaran baru dengan kewajiban menyertakan referensi `activityId`, namun dibatasi dari tindakan administratif menghapus master data.",
        level=1, num_id=list_id_12, base_indent_cm=1.27, text_indent_cm=0.75
    )

    docx_styler.add_heading_2(doc, "1.3\tTabel Perbandingan Sub-CPMK 4 dengan Sub-CPMK 5")
    docx_styler.add_body_paragraph(
        doc,
        "Berikut adalah analisis perbandingan mendalam yang membuktikan evolusi substansial dari proyek lama menuju standar industri baru:"
    )
    add_styled_table(
        doc,
        headers=['Aspek Evaluasi', 'Keadaan Proyek Sub-CPMK 4 (Lama)', 'Keadaan Proyek Sub-CPMK 5 (Sekarang)'],
        rows_data=[
            ('Latar Wilayah dan Tema', 'Perjalanan wisata umum bebas (lokasi luar negeri atau Jepang)', 'Riset Lapangan dan Perjalanan Dinas FT Untad di Sulawesi Tengah (Palu, Sigi, Donggala)'),
            ('Resource dan Relasi', 'Hanya 1 resource tunggal (expenses)', 'Minimal 2 resource berelasi: activities (1) ke expenses (N)'),
            ('Keamanan (Security)', 'Terbuka tanpa autentikasi (siapa pun bisa akses atau ubah)', 'API Key global (`x-api-key`) + *Signed Token* HMAC-SHA256 ber-*expiry* + *Hash Scrypt* dan *Salt*'),
            ('Otorisasi Role (RBAC)', 'Tidak ada pembedaan peran pengguna', 'Dua role tegas: *Admin* (CRUD Penuh) dan Mahasiswa (Terbatas, status 403 *Forbidden* ditegakkan)'),
            ('Integrasi Public API', '1 *Public API* (*ExchangeRate*) dengan *fallback* dasar', '2 *Public API*: *ExchangeRate-API* (kurs) + *Open-Meteo* API (cuaca posko Sulteng) dengan *timeout* 4 detik'),
            ('Versioning Endpoint', 'Tanpa versi (`/expenses` langsung)', '`/v1` (*legacy* + *Sunset Header* 31 Des 2026) dan `/v2` (standar industri *breaking change*)'),
            ('Dukungan GraphQL', 'Tidak tersedia (hanya REST API)', '*Endpoint* `POST /graphql` *native* untuk *query* bersarang (*nested* `activities` dan `expenses`) dan *mutation*'),
            ('Dokumentasi Standar', 'Hanya berkas teks `README.md` biasa', 'Spesifikasi OpenAPI 3.0.3 resmi (`openapi.yaml`) *valid* 100% di *Swagger Editor*'),
            ('Pengujian Otomatis', 'Pengujian manual beberapa skenario', 'Koleksi lengkap Bruno dan Postman *Runner* (8 skenario ber-*script*, *auto-save token*), serta *integration* dan E2E *test*'),
            ('Antarmuka Klien', '*Client Console* CLI sederhana', '*Client Console* CLI diperbarui (*login* dan *token*) + *Web Dashboard* Interaktif')
        ],
        col_widths_cm=[3.5, 4.8, 5.7]
    )

    docx_styler.add_page_break(doc)

    # ==================== BAB II: RANCANGAN API ====================
    docx_styler.add_heading_1(doc, "BAB II\nRANCANGAN API")

    docx_styler.add_heading_2(doc, "2.1\tResource dan Relasi Data")
    docx_styler.add_body_paragraph(
        doc,
        "Sistem mengelola dua entitas data utama yang saling berelasi secara relasional *one-to-many* (1 : N):"
    )
    list_id_21 = create_fresh_numbered_list_id(doc)
    add_clean_list_item(
        doc,
        "**Resource** `activities`: Merepresentasikan master kegiatan riset lapangan FT Untad. Berisi atribut unik: `id`, `title`, `location`, `latitude`, `longitude`, `unit`, `leadResearcher`, `budgetLimitIDR`, `startDate`, `endDate`, `status`, dan `description`.",
        level=1, num_id=list_id_21, base_indent_cm=1.27, text_indent_cm=0.75
    )
    add_clean_list_item(
        doc,
        "**Resource** `expenses`: Merepresentasikan transaksi pengeluaran keuangan riil yang dikeluarkan selama riset. Berisi atribut: `id`, `activityId` (*foreign key*), `title`, `category`, `cost` (`amount`, `currency`, `nominalIDR`, `formatRupiah`, `kursPerSatuan`), `date`, `notes`, dan `submittedBy`.",
        level=1, num_id=list_id_21, base_indent_cm=1.27, text_indent_cm=0.75
    )
    docx_styler.add_body_paragraph(
        doc,
        "Aturan Integritas Relasi: Setiap catatan pengeluaran pada API v2 wajib menyertakan `activityId` yang *valid* dan terdaftar. Jika `activityId` tidak ditemukan, *server* menolak transaksi dengan status 404 *Not Found*."
    )

    docx_styler.add_heading_2(doc, "2.2\tDaftar Endpoint RESTful API (/v1 dan /v2)")
    docx_styler.add_body_paragraph(
        doc,
        "Berikut adalah daftar lengkap rute *endpoint* yang diimplementasikan pada *server* Node.js *native* `http`:"
    )
    add_styled_table(
        doc,
        headers=['Metode', 'Endpoint URL', 'Keamanan / Role', 'Keterangan dan Logika Bisnis'],
        rows_data=[
            ('POST', '`/v2/auth/login`', 'API Key (Publik)', 'Autentikasi kredensial pengguna, menghasilkan *signed token* HMAC-SHA256 ber-*expiry*.'),
            ('GET', '`/v2/activities`', 'API Key', 'Mengambil seluruh master kegiatan riset Untad beserta kalkulasi sisa dana dan cuaca *Open-Meteo*.'),
            ('GET', '`/v2/activities/:id`', 'API Key', 'Mengambil detail satu kegiatan riset lengkap dengan *nested array* rincian pengeluaran (`expenses`).'),
            ('POST', '`/v2/activities`', 'API Key + *Bearer* (*Admin*)', 'Menambah master kegiatan riset baru. Ditolak 403 *Forbidden* jika diakses oleh mahasiswa.'),
            ('PUT', '`/v2/activities/:id`', 'API Key + *Bearer* (*Admin*)', 'Memperbarui informasi kegiatan riset atau plafon anggaran.'),
            ('DELETE', '`/v2/activities/:id`', 'API Key + *Bearer* (*Admin*)', 'Menghapus master kegiatan riset dari sistem.'),
            ('GET', '`/v2/expenses`', 'API Key', 'Mengambil seluruh pengeluaran terelasi dengan filter `?activityId`, `?category`, `?currency`.'),
            ('POST', '`/v2/expenses`', 'API Key + *Bearer* (Semua *Role*)', 'Mencatat pengeluaran riset baru (wajib `activityId`, mengecek *over-budget* dan konversi kurs valas).'),
            ('GET', '`/v2/expenses/:id`', 'API Key', 'Mengambil detail tunggal pengeluaran dengan relasi objek *parent* `activity`.'),
            ('PUT', '`/v2/expenses/:id`', 'API Key + *Bearer*', 'Memperbarui catatan pengeluaran riset.'),
            ('DELETE', '`/v2/expenses/:id`', 'API Key + *Bearer* (*Admin*)', 'Menghapus pengeluaran. Mahasiswa diblokir dengan status 403 *Forbidden*.'),
            ('GET', '`/v2/expenses/summary`', 'API Key', 'Konsolidasi laporan keuangan riset fakultas, evaluasi risiko *over-budget*, cuaca dan valas *live*.'),
            ('GET', '`/v1/expenses`', 'API Key', '*Endpoint legacy* Sub-CPMK 4. Melayani data *flat* lama dan membawa *header* `Sunset` 31 Des 2026.')
        ],
        col_widths_cm=[1.8, 3.5, 3.2, 5.5],
        row_line_spacing=1.08,
        cell_pad_pt=1,
        after_space_pt=2
    )

    docx_styler.add_heading_2(doc, "2.3\tSkema GraphQL (POST /graphql)")
    docx_styler.add_body_paragraph(
        doc,
        "*Server* menyediakan *endpoint* `POST /graphql` *native* untuk memberikan fleksibilitas *query* bagi aplikasi *web* maupun perangkat seluler. Berdasarkan studi empiris oleh Lawi et al. (2021) dan Muzaki & Salam (2024), penerapan *GraphQL* sangat efektif mengeliminasi masalah *under-fetching* maupun *over-fetching* pada data relasional bersarang dalam satu kali permintaan jaringan (*single round-trip request*). Skema *GraphQL* pada proyek ini mendukung resolusi relasi bersarang dua arah (`activities` memuat *nested* `expenses`, dan `expense` memuat objek *parent* `activity`)."
    )
    add_code_block(
        doc,
        'type Query {\n'
        '  activities: [Activity!]!\n'
        '  activity(id: ID!): Activity\n'
        '  expenses(activityId: ID, category: String): [Expense!]!\n'
        '  expense(id: ID!): Expense\n'
        '}\n\n'
        'type Mutation {\n'
        '  createExpense(input: CreateExpenseInput!): Expense!\n'
        '}'
    )

    docx_styler.add_heading_2(doc, "2.4\tDiagram Susunan Sistem (System Architecture)")
    docx_styler.add_body_paragraph(
        doc,
        "Arsitektur dirancang dengan pemisahan tanggung jawab berlapis (*Separation of Concerns*) agar mudah dipelihara dan terhindar dari konflik penggabungan kode antar anggota tim:"
    )
    bullet_id_24 = docx_styler.create_bullet_list_id(doc, pattern=2)
    for item in [
        "**Klien:** *Bruno Collection*, *Postman Collection Runner*, *Client Console* CLI (`client.js`), dan *Web Dashboard* Interaktif (`public/`).",
        "**Gateway HTTP Node.js** (`server.js`): Memeriksa *header* API Key `x-api-key` dan *Authorization Bearer token* pada seluruh rute.",
        "**Router Dispatcher:** Memetakan permintaan ke `v1Router`, `v2Router`, `graphqlSchema`, atau layanan berkas statis antarmuka web.",
        "**Service Layer:** Menangani kriptografi (`security.js`), penyimpanan berkas persisten (`storage.js`), dan ketahanan pemanggilan pihak ketiga (`publicApis.js`).",
        "**Penyimpanan:** Tiga berkas JSON persisten mandiri (`activities.json`, `expenses.json`, `users.json`)."
    ]:
        add_clean_list_item(doc, item, list_type="bullet", num_id=bullet_id_24, base_indent_cm=1.27, text_indent_cm=0.75, space_after_pt=1)

    add_report_figure(doc, os.path.join("assets", "diagram_arsitektur_api.png"), "Gambar 2.1 Diagram Arsitektur Sistem dan Alur Request Gateway API FT Untad", width_cm=13.2)

    docx_styler.add_page_break(doc)

    # ==================== BAB III: DOKUMENTASI API ====================
    docx_styler.add_heading_1(doc, "BAB III\nDOKUMENTASI API (SWAGGER / OPENAPI 3.0)")

    docx_styler.add_heading_2(doc, "3.1\tKontrak Spesifikasi OpenAPI 3.0.3")
    docx_styler.add_body_paragraph(
        doc,
        "Seluruh kontrak layanan *backend* didokumentasikan secara formal menggunakan berkas standar OpenAPI 3.0.3 (`openapi.yaml`). Berkas ini mencakup rincian URL, metode HTTP, skema *request body*, parameter *query* dan *path*, skema keamanan `ApiKeyAuth` dan `BearerAuth`, seluruh kemungkinan status respons (200, 201, 400, 401, 403, 404), serta penandaan rute `/v1` dengan atribut `deprecated: true`."
    )
    docx_styler.add_body_paragraph(
        doc,
        "Berkas `openapi.yaml` disajikan secara dinamis oleh *server* pada *endpoint* `http://localhost:3000/openapi.yaml` dan telah diuji pada *Swagger Editor* (`editor.swagger.io`) dengan status *VALID* 100% tanpa adanya *error* maupun *warning* struktural. Pengembang lain dapat langsung memanfaatkan dokumentasi ini untuk membangkitkan *client SDK* atau melakukan *mocking API* secara otomatis."
    )
    add_report_figure(doc, os.path.join("assets", "swagger_openapi_valid.png"), "Gambar 3.1 Validasi Spesifikasi Kontrak openapi.yaml pada Swagger UI (0 Structural Errors)", width_cm=13.2)

    docx_styler.add_page_break(doc)

    # ==================== BAB IV: STRATEGI KEAMANAN ====================
    docx_styler.add_heading_1(doc, "BAB IV\nSTRATEGI KEAMANAN DAN OTORISASI")

    docx_styler.add_heading_2(doc, "4.1\tCara Kerja API Key Global")
    docx_styler.add_body_paragraph(
        doc,
        "Setiap permintaan HTTP yang ditujukan ke *endpoint* layanan API (`/v1`, `/v2`, maupun `/graphql`) wajib melampirkan *header* `x-api-key: untad-api-key-2026`. *Middleware server* memeriksa keberadaan dan nilai *header* ini sebelum permintaan diteruskan ke *router* bisnis. Jika *header* tidak disertakan atau nilainya tidak cocok dengan kunci rahasia di berkas `.env`, *server* secara instan memutus koneksi dan mengembalikan respons HTTP 401 *Unauthorized* dengan *payload* JSON berisi pesan *error* yang jelas."
    )

    docx_styler.add_heading_2(doc, "4.2\tAutentikasi Login, Password Hash Scrypt, dan Signed Token HMAC-SHA256")
    docx_styler.add_body_paragraph(
        doc,
        "Sesuai ketentuan teknis bahwa *package* tambahan yang diperbolehkan hanya `graphql`, sistem keamanan kriptografi dibangun secara *native* menggunakan modul bawaan `crypto` pada Node.js tanpa bergantung pada pustaka eksternal seperti `jsonwebtoken` atau `bcrypt`. Sebagaimana dijelaskan oleh Dalimunthe et al. (2023), mekanisme tanda tangan HMAC mampu menjaga integritas *token* tanpa status (*stateless*) sehingga mencegah pemalsuan sesi maupun pembajakan hak akses:"
    )
    bullet_id_42 = docx_styler.create_bullet_list_id(doc, pattern=2)
    add_clean_list_item(
        doc,
        "**Password Hashing:** *Password* pengguna disimpan dengan teknik *salt* 16-*byte* acak dan algoritma derivasi kunci *scrypt* (`crypto.scryptSync`) menghasilkan format *string* tersimpan `<salt>:<hash>` yang kebal terhadap serangan *rainbow table*.",
        list_type="bullet", num_id=bullet_id_42, base_indent_cm=1.27, text_indent_cm=0.75
    )
    add_clean_list_item(
        doc,
        "**Signed Token Generation:** *Endpoint* `POST /v2/auth/login` menerbitkan *token* bertanda tangan digital berformat tiga bagian `base64(header).base64(payload).base64(signature)`. Tanda tangan dihitung menggunakan HMAC-SHA256 dengan *secret key* yang aman. *Payload* memuat identitas pengguna, hak akses peran (*role*), waktu penerbitan (`iat`), dan waktu kedaluwarsa (`exp` = 2 jam). Verifikasi tanda tangan dilakukan menggunakan `crypto.timingSafeEqual` guna mencegah serangan *timing attack*.",
        list_type="bullet", num_id=bullet_id_42, base_indent_cm=1.27, text_indent_cm=0.75
    )

    docx_styler.add_heading_2(doc, "4.3\tRole-Based Access Control (RBAC) dan Penegakan Status 401 serta 403")
    docx_styler.add_body_paragraph(
        doc,
        "Sistem menerapkan aturan otorisasi berbasis peran (RBAC) yang membedakan hak akses secara ketat antara peran *Admin* dan Mahasiswa:"
    )
    add_styled_table(
        doc,
        headers=['Tindakan / Operasi API', 'Role Admin (Dosen / Keuangan)', 'Role Mahasiswa (Peneliti)', 'Status HTTP Jika Ditolak'],
        rows_data=[
            ('Lihat Master Kegiatan dan Pengeluaran', 'Diizinkan (200 *OK*)', 'Diizinkan (200 *OK*)', '401 jika tanpa *API Key*'),
            ('Tambah Pengeluaran Riset (`POST /v2/expenses`)', 'Diizinkan (201 *Created*)', 'Diizinkan (201 *Created*)', '401 jika tanpa *token login*'),
            ('Tambah Master Kegiatan (`POST /v2/activities`)', 'Diizinkan (201 *Created*)', 'DITOLAK (403 *Forbidden*)', '403 *Forbidden* (Khusus *Admin*)'),
            ('Hapus Kegiatan / Pengeluaran (`DELETE`)', 'Diizinkan (200 *OK*)', 'DITOLAK (403 *Forbidden*)', '403 *Forbidden* (Khusus *Admin*)'),
            ('Mutasi *GraphQL* `createExpense`', 'Diizinkan', 'Diizinkan', '401 *Unauthorized* jika tanpa *token*')
        ],
        col_widths_cm=[4.2, 3.2, 3.2, 3.4]
    )

    docx_styler.add_page_break(doc)

    # ==================== BAB V: INTEGRASI PUBLIC API ====================
    docx_styler.add_heading_1(doc, "BAB V\nSTRATEGI INTEGRASI PUBLIC API DAN KETAHANAN SISTEM")

    docx_styler.add_heading_2(doc, "5.1\tPublic API 1: ExchangeRate-API (Valuta Asing ke Rupiah)")
    docx_styler.add_body_paragraph(
        doc,
        "Untuk mendukung perhitungan biaya transaksi lintas negara secara tepat, sistem mengintegrasikan layanan *ExchangeRate-API* dengan rincian teknis sebagai berikut:"
    )
    bullet_id_51 = docx_styler.create_bullet_list_id(doc, pattern=2)
    for item in [
        "**Tujuan:** Menghitung konversi nilai tukar riil mata uang asing (USD, JPY, EUR, SGD, MYR, GBP, AUD) ke mata uang Rupiah (IDR) secara otomatis pada setiap transaksi belanja riset internasional atau pembelian komponen sensor impor.",
        "**Alamat Endpoint:** `https://open.er-api.com/v6/latest/USD`.",
        "**Data yang Diambil:** Objek nilai tukar `rates` (terutama nilai `rates['IDR']` dan nilai tukar mata uang terkait per 1 USD).",
        "**Mekanisme Ketahanan (Resilience):** Permintaan ke *server ExchangeRate* dibatasi dengan batas waktu tunggu 4 detik menggunakan `AbortSignal.timeout(4000)`. Jika jaringan internet kampus mengalami gangguan atau *server* pihak ketiga lambat, *server* secara otomatis beralih menggunakan data cadangan (*in-memory* `cachedRates`) sehingga *server* kelompok tidak pernah mengalami *crash* dan tetap melayani respons 200 *OK* dengan metadata status `OFFLINE_CACHE`."
    ]:
        add_clean_list_item(doc, item, list_type="bullet", num_id=bullet_id_51, base_indent_cm=1.27, text_indent_cm=0.75)

    docx_styler.add_heading_2(doc, "5.2\tPublic API 2: Open-Meteo API (Prakiraan Cuaca Posko Riset Sulteng)")
    docx_styler.add_body_paragraph(
        doc,
        "Sebagai pemenuhan aspek keselamatan kerja tim peneliti di lapangan Sulawesi Tengah, sistem mengintegrasikan layanan *Open-Meteo* dengan spesifikasi berikut:"
    )
    bullet_id_52 = docx_styler.create_bullet_list_id(doc, pattern=2)
    for item in [
        "**Tujuan:** Menyajikan informasi kondisi cuaca *real-time* (suhu udara, kecepatan angin, dan interpretasi cuaca WMO) di titik posko kegiatan riset lapangan di Sulawesi Tengah (Kampus Untad Tondo Palu: Lat `-0.836`, Lon `119.893`; Kabupaten Sigi: Lat `-1.385`, Lon `119.967`; Teluk Palu: Lat `-0.873`, Lon `119.865`).",
        "**Alamat Endpoint:** `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true`.",
        "**Data yang Diambil:** Objek `current_weather` (`temperature`, `windspeed`, `weathercode`, `time`).",
        "**Mekanisme Ketahanan (Resilience):** Dilengkapi `AbortSignal.timeout(4000)` dan *fallback cache* koordinat *default* Untad Palu. Dengan strategi ini, sistem tetap mampu merespons permintaan melalui *cache* cadangan meskipun layanan pihak ketiga sedang tidak tersedia."
    ]:
        add_clean_list_item(doc, item, list_type="bullet", num_id=bullet_id_52, base_indent_cm=1.27, text_indent_cm=0.75)

    docx_styler.add_page_break(doc)

    # ==================== BAB VI: VERSIONING & GIT ====================
    docx_styler.add_heading_1(doc, "BAB VI\nPENGELOLAAN VERSI DAN RIWAYAT GIT")

    docx_styler.add_heading_2(doc, "6.1\tAnalisis Breaking Change antara REST /v1 dan /v2")
    docx_styler.add_body_paragraph(
        doc,
        "Sistem mengimplementasikan prinsip *Semantic Versioning* dengan menjalankan rute `/v1` dan `/v2` secara berdampingan sesuai standar RFC 8594 (IETF, 2019):"
    )
    list_id_61 = create_fresh_numbered_list_id(doc)
    add_clean_list_item(
        doc,
        "**Kewajiban Relasi Data (Mandatory Foreign Key):** Pada versi v1 (Sub-CPMK 4), pengeluaran bersifat mandiri tanpa relasi. Pada versi v2, *field* `activityId` menjadi kewajiban mutlak. Permintaan `POST /v2/expenses` tanpa `activityId` akan ditolak dengan status 400 *Bad Request*.",
        level=1, num_id=list_id_61, base_indent_cm=1.27, text_indent_cm=0.75, space_after_pt=1
    )
    add_clean_list_item(
        doc,
        "**Restrukturisasi Format Objek Biaya (Nested Cost Object):** Pada versi v1, nominal dan mata uang berupa *field* terpisah datar (`amount` dan `currency`). Pada versi v2, data distrukturkan menjadi objek keuangan bersarang `cost: { amount, currency, nominalIDR, formatRupiah, kursPerSatuan }`.",
        level=1, num_id=list_id_61, base_indent_cm=1.27, text_indent_cm=0.75, space_after_pt=1
    )
    add_clean_list_item(
        doc,
        "**Header HTTP Sunset pada** `/v1`: Untuk melindungi klien lama dari pemutusan mendadak, *endpoint* `GET /v1/expenses` tetap melayani pembacaan dengan format lama namun disertai *header* HTTP resmi:",
        level=1, num_id=list_id_61, base_indent_cm=1.27, text_indent_cm=0.75, space_after_pt=1
    )
    add_clean_list_item(
        doc,
        "`Sunset: Thu, 31 Dec 2026 23:59:59 GMT` (RFC 8594)",
        level=2, num_id=list_id_61, base_indent_cm=1.27, text_indent_cm=0.75, space_after_pt=1
    )
    add_clean_list_item(
        doc,
        "`Deprecation: true`",
        level=2, num_id=list_id_61, base_indent_cm=1.27, text_indent_cm=0.75, space_after_pt=1
    )
    add_clean_list_item(
        doc,
        "`Link: </v2/expenses>; rel=\"successor-version\"`",
        level=2, num_id=list_id_61, base_indent_cm=1.27, text_indent_cm=0.75, space_after_pt=1
    )

    p_h62 = docx_styler.add_heading_2(doc, "6.2\tRiwayat Branch Fitur dan Rilis Tag Git")
    docx_styler.set_paragraph_spacing(p_h62, line_spacing=1.5, space_before_pt=6, space_after_pt=2)
    p_b62 = docx_styler.add_body_paragraph(
        doc,
        "Seluruh pengembangan dikelola menggunakan *repository Git* lokal dengan strategi *feature branching* dan digabungkan ke cabang utama `main` menggunakan *merge commit* tanpa *fast-forward* (`--no-ff`):"
    )
    docx_styler.set_paragraph_spacing(p_b62, line_spacing=1.5, space_before_pt=0, space_after_pt=2)
    bullet_id_62 = docx_styler.create_bullet_list_id(doc, pattern=2)
    for item in [
        "`feat/security-auth` (Tabita Creaselia Belicia Theona): Implementasi enkripsi *salt*, HMAC-SHA256, dan otorisasi *role*.",
        "`feat/rest-v2-public-apis` (Lidiya): Implementasi REST v2 `activities` dan `expenses` berelasi serta integrasi *Public API*.",
        "`feat/graphql-web-dashboard` (Muhammad Zikri Adam): Implementasi *GraphQL*, REST v1 *Sunset Header*, dan *Web Dashboard* interaktif.",
        "`feat/testing-docs-report` (Trista Sheryl Lambei): Dokumentasi `openapi.yaml`, koleksi Bruno, Postman *Runner*, CLI, dan laporan.",
        "Rilis Akhir: Diberi *tag* resmi `v2.0.0-final`."
    ]:
        add_clean_list_item(doc, item, list_type="bullet", num_id=bullet_id_62, base_indent_cm=1.27, text_indent_cm=0.75, space_after_pt=1)

    docx_styler.add_page_break(doc)

    # ==================== BAB VII: PENGUJIAN API ====================
    docx_styler.add_heading_1(doc, "BAB VII\nPENGUJIAN API (TESTING DAN RUNNER)")

    docx_styler.add_heading_2(doc, "7.1\tTabel Skenario Pengujian Otomatis")
    docx_styler.add_body_paragraph(
        doc,
        "Pengujian otomatis mencakup 8 skenario komprehensif (3 skenario positif, 3 skenario negatif, 1 pengujian *header sunset*, dan 1 pengujian *GraphQL*) yang dijalankan melalui *Postman Collection Runner*, *Bruno Runner*, *Playwright* (19 skenario *end-to-end browser*), serta `test-suite.js` mandiri (28 *assertions*):"
    )
    add_styled_table(
        doc,
        headers=['No', 'Nama Skenario Uji', 'Metode & Endpoint', 'Ekspektasi Status', 'Hasil Evaluasi'],
        rows_data=[
            ('1', '*Login Admin* dan *Auto-Save Token* (Positif)', 'POST `/v2/auth/login`', '200 *OK*', '*PASS* (Token tersimpan otomatis)'),
            ('2', '*Get* Master Kegiatan dan Cuaca (Positif)', 'GET `/v2/activities`', '200 *OK*', '*PASS* (*Array* data dan cuaca *valid*)'),
            ('3', 'Tambah Pengeluaran Relasi `activityId` (Positif)', 'POST `/v2/expenses`', '201 *Created*', '*PASS* (Tersimpan ke kegiatan)'),
            ('4', 'Verifikasi *Header Sunset* Versi Lama (Positif)', 'GET `/v1/expenses`', '200 *OK*', '*PASS* (*Header Sunset* 31 Des 2026)'),
            ('5', 'Akses Ditolak Tanpa *API Key* (Negatif 1)', 'GET `/v2/expenses`', '401 *Unauthorized*', '*PASS* (Ditolak pesan `x-api-key`)'),
            ('6', 'Akses Dilarang *Role* Mahasiswa Hapus Data (Negatif 2)', 'DELETE `/v2/expenses/1`', '403 *Forbidden*', '*PASS* (Ditolak pesan hanya *admin*)'),
            ('7', 'Validasi Gagal Tanpa `activityId` (Negatif 3)', 'POST `/v2/expenses`', '400 *Bad Request*', '*PASS* (Ditolak pesan *breaking change*)'),
            ('8', '*Query* Bersarang Relasi *GraphQL* (Positif)', 'POST `/graphql`', '200 *OK*', '*PASS* (`activities` memuat *nested* `expenses`)')
        ],
        col_widths_cm=[0.9, 4.3, 3.1, 2.5, 3.2]
    )

    docx_styler.add_heading_2(doc, "7.2\tCuplikan Script Pengujian Postman dan Hasil Eksekusi")
    docx_styler.add_body_paragraph(
        doc,
        "Berikut merupakan cuplikan *test script* JavaScript pada *Postman Collection Runner* untuk menyimpan *token* login secara otomatis dan memvalidasi penolakan *role* mahasiswa:"
    )
    add_code_block(
        doc,
        '// Test Script Auto-Save Token pada POST /v2/auth/login\n'
        'pm.test("Status code is 200 OK", function () {\n'
        '    pm.response.to.have.status(200);\n'
        '});\n'
        'pm.test("Login berhasil & token bertanda tangan diterbitkan", function () {\n'
        '    var jsonData = pm.response.json();\n'
        '    pm.expect(jsonData.sukses).to.eql(true);\n'
        '    pm.expect(jsonData.token).to.be.a("string");\n'
        '    pm.collectionVariables.set("auth_token", jsonData.token);\n'
        '});\n\n'
        '// Test Script Negatif Role Mahasiswa pada DELETE /v2/expenses/1\n'
        'pm.test("Status code is 403 Forbidden", function () {\n'
        '    pm.response.to.have.status(403);\n'
        '});\n'
        'pm.test("Role mahasiswa diblokir dari operasi administratif", function () {\n'
        '    var jsonData = pm.response.json();\n'
        '    pm.expect(jsonData.error).to.include("Hanya role \\"admin\\"");\n'
        '});'
    )
    add_report_figure(doc, os.path.join("assets", "dashboard_live_verifikasi.png"), "Gambar 7.1 Tampilan Antarmuka Web Dashboard Live Terintegrasi REST v2, Public API, dan GraphQL", width_cm=13.2)

    docx_styler.add_page_break(doc)

    # ==================== BAB VIII: PEMBAGIAN PERAN ====================
    docx_styler.add_heading_1(doc, "BAB VIII\nPEMBAGIAN PERAN ANGGOTA KELOMPOK")

    docx_styler.add_heading_2(doc, "8.1\tMatriks Kontribusi Tim Pengembang")
    docx_styler.add_body_paragraph(
        doc,
        "Setiap anggota kelompok memiliki kontribusi spesifik yang terdokumentasi dan dapat ditelusuri secara transparan pada riwayat *Git commit* dan *branch*:"
    )
    add_styled_table(
        doc,
        headers=['Nama Anggota', 'Nomor Stambuk', 'Bagian / Modul yang Dikerjakan', 'Bukti Git Branch & Commit'],
        rows_data=[
            ('Lidiya', 'F5512530118', '*Lead Backend*: Perancangan skema relasi `activities-expenses`, *router* REST v2, integrasi *ExchangeRate* dan *Open-Meteo*.', '*Branch*: `feat/rest-v2-public-apis`\n*Commit*: `22047b8`'),
            ('Tabita Creaselia Belicia Theona', 'F5512520086', '*Security Engineer*: Arsitektur keamanan *token* HMAC-SHA256, *hash scrypt salt native*, *middleware API Key*, dan RBAC.', '*Branch*: `feat/security-auth`\n*Commit*: `ac551cd`'),
            ('Muhammad Zikri Adam', 'F5512530117', '*GraphQL* dan *Frontend Engineer*: Implementasi `POST /graphql` *native*, *endpoint legacy* v1 *Sunset Header*, dan *Web Dashboard*.', '*Branch*: `feat/graphql-web-dashboard`\n*Commit*: `5a60fb9`'),
            ('Trista Sheryl Lambei', 'F5512530106', 'QA dan *Technical Writer*: Penyusunan kontrak `openapi.yaml`, koleksi pengujian Bruno dan Postman *runner*, CLI *console*, dan laporan.', '*Branch*: `feat/testing-docs-report`\n*Commit*: `d69600f`')
        ],
        col_widths_cm=[3.2, 2.3, 5.1, 3.4]
    )

    docx_styler.add_page_break(doc)

    # ==================== BAB IX: PENUTUP ====================
    docx_styler.add_heading_1(doc, "BAB IX\nPENUTUP")

    p_h91 = docx_styler.add_heading_2(doc, "9.1\tKesimpulan")
    docx_styler.set_paragraph_spacing(p_h91, line_spacing=1.5, space_before_pt=6, space_after_pt=2)
    p_h911 = docx_styler.add_heading_3(doc, "\t9.1.1\tCapaian Proyek")
    docx_styler.set_paragraph_spacing(p_h911, line_spacing=1.5, space_before_pt=4, space_after_pt=1)
    p_c1 = docx_styler.add_conclusion_paragraph(
        doc,
        "Proyek pengembangan API pada Evaluasi Sub-CPMK 5 ini telah mengimplementasikan seluruh spesifikasi fungsional, keamanan, dan pengujian yang direncanakan. Sistem berevolusi dari prototipe sederhana Sub-CPMK 4 menjadi *backend* dengan dua *resource* berelasi berlatar Universitas Tadulako dan Sulawesi Tengah. Keamanan kriptografi mandiri (*API Key*, *Signed Token* HMAC-SHA256, *Hash Salt*, dan RBAC status 401 serta 403) berhasil diterapkan tanpa *framework*. Integrasi dua *Public API* (*Open-Meteo* dan *ExchangeRate-API*) terbukti tetap berjalan stabil saat gangguan jaringan berkat mekanisme *timeout* dan *in-memory cache fallback*. Penyediaan antarmuka *Web Dashboard* interaktif di samping *Client Console* CLI memberikan kemudahan interaksi dan pengujian fitur secara langsung bagi pengguna akhir."
    )
    docx_styler.set_paragraph_spacing(p_c1, line_spacing=1.5, space_before_pt=0, space_after_pt=2)

    p_h912 = docx_styler.add_heading_3(doc, "\t9.1.2\tKeterbatasan Sistem")
    docx_styler.set_paragraph_spacing(p_h912, line_spacing=1.5, space_before_pt=4, space_after_pt=1)
    p_c2 = docx_styler.add_conclusion_paragraph(
        doc,
        "Penyimpanan data saat ini mengandalkan berkas JSON lokal (`activities.json`, `expenses.json`, dan `users.json`). Meskipun sangat andal dan mandiri saat demonstrasi luring, untuk skala produksi ribuan transaksi konkuren diperlukan *locking file* atau migrasi ke *database cluster* resmi."
    )
    docx_styler.set_paragraph_spacing(p_c2, line_spacing=1.5, space_before_pt=0, space_after_pt=2)

    p_h92 = docx_styler.add_heading_2(doc, "9.2\tRencana Pengembangan Selanjutnya")
    docx_styler.set_paragraph_spacing(p_h92, line_spacing=1.5, space_before_pt=6, space_after_pt=2)
    p_b92 = docx_styler.add_body_paragraph(
        doc,
        "Untuk pengembangan jangka panjang pada lingkungan produksi kampus, tim merencanakan langkah lanjutan sebagai berikut:"
    )
    docx_styler.set_paragraph_spacing(p_b92, line_spacing=1.5, space_before_pt=0, space_after_pt=2)
    list_id_92 = create_fresh_numbered_list_id(doc)
    for item in [
        "Menghubungkan modul penyimpanan ke *cluster database* MongoDB Atlas via *driver* resmi `mongodb` tanpa ODM.",
        "Menambahkan notifikasi *webhook* otomatis ke *Telegram* tim peneliti ketika pengeluaran mendekati ambang batas *over-budget* (>= 80%).",
        "Mengembangkan aplikasi *mobile native* (*Flutter* atau *React Native*) berbasis kontrak OpenAPI 3.0.3 yang telah dibentuk."
    ]:
        add_clean_list_item(doc, item, level=1, num_id=list_id_92, base_indent_cm=1.27, text_indent_cm=0.75, space_after_pt=1)

    docx_styler.add_page_break(doc)

    # ==================== DAFTAR PUSTAKA ====================
    docx_styler.add_heading_1(doc, "DAFTAR PUSTAKA")

    bibliography_entries = [
        "Dalimunthe, S., Putra, E. H., & Ridha, M. A. F. (2023). Restful API security using JSON Web Token (JWT) with HMAC-Sha512 algorithm in session management. *IT Journal Research and Development (ITJRD)*, 7(2). https://doi.org/10.25299/itjrd.2023.12029",
        "Fielding, R. T. (2000). *Architectural styles and the design of network-based software architectures* [Disertasi doktoral, University of California, Irvine]. UCI Repository. https://ics.uci.edu/~fielding/pubs/dissertation/top.htm",
        "GraphQL Foundation. (2021). *GraphQL specification (October 2021 edition)*. https://spec.graphql.org/",
        "Internet Engineering Task Force (IETF). (2019). *The Sunset HTTP header field (RFC 8594)*. https://datatracker.ietf.org/doc/html/rfc8594",
        "Lawi, A., Panggabean, B. L. E., & Yoshida, T. (2021). Evaluating GraphQL and REST API services performance in a massive and intensive accessible information system. *Computers*, 10(11), 138. https://doi.org/10.3390/computers10110138",
        "Muzaki, R. N., & Salam, A. (2024). Reducing under-fetching and over-fetching in REST API with GraphQL for web-based software development. *Jurnal Teknik Informatika (JUTIF)*, 5(2). https://doi.org/10.52436/1.jutif.2024.5.2.1725",
        "Node.js Foundation. (2026). *Node.js v24 cryptography and HTTP documentation*. https://nodejs.org/api/",
        "Open Exchange Rates. (2026). *ExchangeRate-API free currency data documentation*. https://open.er-api.com/",
        "OpenAPI Initiative. (2021). *OpenAPI specification version 3.0.3*. https://spec.openapis.org/oas/v3.0.3",
        "Open-Meteo. (2026). *Free weather forecast API documentation*. https://open-meteo.com/en/docs"
    ]
    for ref in bibliography_entries:
        add_bibliography_entry_clean(doc, ref)

    docx_styler.add_page_break(doc)

    # ==================== LAMPIRAN ====================
    docx_styler.add_heading_1(doc, "LAMPIRAN")

    p_hl1 = docx_styler.add_heading_2(doc, "L.1\tLembar Deklarasi Penggunaan Generative AI")
    docx_styler.set_paragraph_spacing(p_hl1, line_spacing=1.5, space_before_pt=4, space_after_pt=2)
    p_l1 = docx_styler.add_body_paragraph(
        doc,
        "Kami yang bertanda tangan di bawah ini menyatakan dengan sesungguhnya bahwa dalam penyelesaian *Final Project* Rekayasa API (Sub-CPMK 5) ini, kami menggunakan teknologi *Generative AI* (*Antigravity Assistant*) secara etis, bertanggung jawab, dan proporsional sebagai mitra diskusi (*pair programmer*) untuk merancang struktur arsitektur, menyusun skrip pengujian *Postman*, serta memvalidasi kesesuaian format laporan dengan panduan akademik."
    )
    docx_styler.set_paragraph_spacing(p_l1, line_spacing=1.5, space_before_pt=0, space_after_pt=2)
    p_l2 = docx_styler.add_body_paragraph(
        doc,
        "Rincian pernyataan transparansi penggunaan alat bantu kecerdasan buatan adalah sebagai berikut:"
    )
    docx_styler.set_paragraph_spacing(p_l2, line_spacing=1.5, space_before_pt=0, space_after_pt=2)
    bullet_id_lamp = docx_styler.create_bullet_list_id(doc, pattern=2)
    for item in [
        "**Alat bantu AI yang digunakan:** *Antigravity AI Coding Agent* (Google DeepMind).",
        "**Bagian yang dibantu AI:** Rekomendasi pola struktur HMAC-SHA256 *native* Node.js, validasi sintaks skema `openapi.yaml`, penyusunan *test assertions Postman* dan *Bruno*, serta pemformatan dokumen akademik.",
        "**Bagian yang dikerjakan mandiri oleh tim:** Penentuan latar lokal Universitas Tadulako dan Sulawesi Tengah, logika bisnis pembagian pagu anggaran riset lapangan, pengujian langsung pada *terminal*, dan verifikasi lisan saat wawancara evaluasi."
    ]:
        add_clean_list_item(doc, item, list_type="bullet", num_id=bullet_id_lamp, base_indent_cm=1.27, text_indent_cm=0.75, space_after_pt=1)

    p_l3 = docx_styler.add_body_paragraph(
        doc,
        "Seluruh kode sumber dan luaran yang dihasilkan telah dipahami, diuji, dan dapat dipertanggungjawabkan sepenuhnya secara individu maupun kelompok di hadapan dosen penguji."
    )
    docx_styler.set_paragraph_spacing(p_l3, line_spacing=1.5, space_before_pt=0, space_after_pt=2)

    p_ttd = doc.add_paragraph()
    p_ttd.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_ttd.paragraph_format.left_indent = Cm(1.27)
    p_ttd.paragraph_format.keep_with_next = True
    docx_styler.set_paragraph_spacing(p_ttd, line_spacing=1.5, space_before_pt=6, space_after_pt=4)
    docx_styler.add_runs(
        p_ttd,
        "Palu, 23 November 2026\nTim Pengembang Kelompok 2:"
    )

    add_styled_table(
        doc,
        headers=['No', 'Nama Anggota', 'NIM', 'Tanda Tangan'],
        rows_data=[
            ('1', 'Lidiya', 'F5512530118', '( ............................ )'),
            ('2', 'Tabita Creaselia Belicia Theona', 'F5512520086', '( ............................ )'),
            ('3', 'Muhammad Zikri Adam', 'F5512530117', '( ............................ )'),
            ('4', 'Trista Sheryl Lambei', 'F5512530106', '( ............................ )')
        ],
        col_widths_cm=[1.0, 5.5, 3.0, 4.5],
        row_line_spacing=1.1,
        cell_pad_pt=1,
        after_space_pt=0
    )

    # ==================== SIMPAN DOKUMEN ====================
    output_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "FinalProject_Kelompok2_UntadFieldResearchExpenseAPI.docx"
    )
    try:
        doc.save(output_path)
        print(f"[Sukses] Dokumen berhasil dibuat di: {output_path}")
    except PermissionError:
        base, ext = os.path.splitext(output_path)
        fallback_path = f"{base}_revisi{ext}"
        doc.save(fallback_path)
        print(f"[Peringatan] Berkas '{output_path}' sedang terbuka. Disimpan di: {fallback_path}")


if __name__ == "__main__":
    build_final_report()
