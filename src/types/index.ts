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
}

export interface FilterOptions {
  bahasa: string[];
  kategori: string[];
  jenisPeraturan: string[];
  topik: string[];
  tahun: string[];
}

export interface SearchResult extends Peraturan {
  matches?: any[];
}
