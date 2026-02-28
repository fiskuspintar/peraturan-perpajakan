export interface Peraturan {
  id: string;
  judul: string;
  deskripsi: string;
  jenis: string;
  kategori: string;
  topik: string;
  bahasa: string;
  status: string;
  tanggalBerlaku: string;
  url: string;
  contentFile?: string;
  fullContent?: string; // Tambahan untuk konten lengkap
}

export interface FilterOptions {
  bahasa: string[];
  kategori: string[];
  jenisPeraturan: string[];
  topik: string[];
  tahun: string[];
}
