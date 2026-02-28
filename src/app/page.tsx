"use client";

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X, ChevronDown, FileText, Calendar, Tag } from "lucide-react";
import Fuse from "fuse.js";
import { Peraturan, FilterOptions } from "@/types";

// Sample data from DDTC
const sampleData: Peraturan[] = [
  {
    id: "uu-2-2025",
    judul: "Undang-Undang Nomor: 2 Tahun 2025",
    deskripsi: "PERUBAHAN KEEMPAT ATAS UNDANG-UNDANG NOMOR 4 TAHUN 2009 TENTANG PERTAMBANGAN MINERAL DAN BATUBARA",
    jenis: "Undang-Undang (UU)",
    kategori: "Peraturan Pusat",
    topik: "PBB",
    bahasa: "Bahasa Indonesia",
    status: "Berlaku",
    tanggalBerlaku: "19 Mar 2025",
    url: "https://perpajakan.ddtc.co.id/sumber-hukum/peraturan/uu-2-2025",
    contentFile: "regulation_uu-2-2025.md",
  },
  {
    id: "uu-3-2020",
    judul: "Undang-Undang Nomor: 3 Tahun 2020",
    deskripsi: "PERUBAHAN ATAS UNDANG-UNDANG NOMOR 4 TAHUN 2009 TENTANG PERTAMBANGAN MINERAL DAN BATUBARA",
    jenis: "Undang-Undang (UU)",
    kategori: "Peraturan Pusat",
    topik: "PBB",
    bahasa: "Bahasa Indonesia",
    status: "Perubahan atau penyempurnaan",
    tanggalBerlaku: "10 Jun 2020",
    url: "#",
  },
  {
    id: "uu-15-2006",
    judul: "Undang-Undang Nomor: 15 Tahun 2006",
    deskripsi: "BADAN PEMERIKSA KEUANGAN",
    jenis: "Undang-Undang (UU)",
    kategori: "Peraturan Pusat",
    topik: "PBB",
    bahasa: "Bahasa Indonesia",
    status: "Berlaku",
    tanggalBerlaku: "30 Okt 2006",
    url: "#",
  },
  {
    id: "uu-15-2002",
    judul: "Undang-Undang Nomor: 15 Tahun 2002",
    deskripsi: "TINDAK PIDANA PENCUCIAN UANG",
    jenis: "Undang-Undang (UU)",
    kategori: "Peraturan Pusat",
    topik: "PBB",
    bahasa: "Bahasa Indonesia",
    status: "Perubahan dan kondisi terakhir tidak berlaku karena diganti/dicabut",
    tanggalBerlaku: "17 Apr 2002",
    url: "#",
  },
  {
    id: "uu-1-2000",
    judul: "Undang-Undang Nomor: 1 Tahun 2000",
    deskripsi: "PENGESAHAN ILO CONVENTION NOMOR 182 CONCERNING THE PROHIBITION AND IMMEDIATE ACTION FOR THE ELIMINATION OF THE WORST FORMS OF CHILD LABOUR",
    jenis: "Undang-Undang (UU)",
    kategori: "Peraturan Pusat",
    topik: "PBB",
    bahasa: "Bahasa Indonesia",
    status: "Berlaku",
    tanggalBerlaku: "08 Mar 2000",
    url: "#",
  },
  {
    id: "uu-42-1999",
    judul: "Undang-Undang Nomor: 42 Tahun 1999",
    deskripsi: "JAMINAN FIDUSIA",
    jenis: "Undang-Undang (UU)",
    kategori: "Peraturan Pusat",
    topik: "PBB",
    bahasa: "Bahasa Indonesia",
    status: "Berlaku",
    tanggalBerlaku: "30 Sep 1999",
    url: "#",
  },
];

const filterOptions: FilterOptions = {
  bahasa: ["Bahasa Indonesia", "Bahasa Inggris"],
  kategori: ["Peraturan Pusat", "Peraturan Daerah"],
  jenisPeraturan: [
    "Undang-Undang (UU)",
    "Kitab Undang-Undang Hukum Dagang",
    "Undang-Undang Darurat (UU Darurat)",
    "Peraturan Pemerintah Pengganti Undang-Undang (Perpu)",
  ],
  topik: ["PBB", "PPh", "PPN", "PPh Badan", "PPh Orang Pribadi"],
  tahun: ["2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015", "2014", "2013", "2012", "2011", "2010", "2009", "2008", "2007", "2006", "2005", "2004", "2003", "2002", "2001", "2000", "1999"],
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<{
    bahasa: string[];
    kategori: string[];
    jenisPeraturan: string[];
    topik: string[];
    tahun: string[];
  }>({
    bahasa: ["Bahasa Indonesia"],
    kategori: ["Peraturan Pusat"],
    jenisPeraturan: ["Undang-Undang (UU)"],
    topik: ["PBB"],
    tahun: [],
  });
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [sortBy, setSortBy] = useState("terbaru");
  const [data, setData] = useState<Peraturan[]>(sampleData);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from JSON
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/search_index.json');
        if (response.ok) {
          const jsonData = await response.json();
          setData(jsonData);
        } else {
          // Fallback to sample data if file not found
          setData(sampleData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setData(sampleData);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Fuse.js setup for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(data, {
      keys: [
        { name: "judul", weight: 0.4 },
        { name: "deskripsi", weight: 0.3 },
        { name: "jenis", weight: 0.1 },
        { name: "topik", weight: 0.1 },
        { name: "status", weight: 0.1 },
      ],
      threshold: 0.4,
      includeMatches: true,
    });
  }, [data]);

  // Filter and search logic
  const filteredData = useMemo(() => {
    let result = data;

    // Apply filters
    if (selectedFilters.bahasa.length > 0) {
      result = result.filter((item) => selectedFilters.bahasa.includes(item.bahasa));
    }
    if (selectedFilters.kategori.length > 0) {
      result = result.filter((item) => selectedFilters.kategori.includes(item.kategori));
    }
    if (selectedFilters.jenisPeraturan.length > 0) {
      result = result.filter((item) => selectedFilters.jenisPeraturan.includes(item.jenis));
    }
    if (selectedFilters.topik.length > 0) {
      result = result.filter((item) => selectedFilters.topik.includes(item.topik));
    }
    if (selectedFilters.tahun.length > 0) {
      result = result.filter((item) => {
        const year = item.tanggalBerlaku?.match(/\d{4}/)?.[0];
        return year && selectedFilters.tahun.includes(year);
      });
    }

    // Apply search
    if (searchQuery.trim()) {
      const searchResults = fuse.search(searchQuery);
      result = searchResults.map((r) => ({ ...r.item, matches: r.matches }));
    }

    // Apply sorting
    if (sortBy === "terbaru") {
      result = [...result].sort((a, b) => {
        const yearA = a.tanggalBerlaku?.match(/\d{4}/)?.[0] || "0";
        const yearB = b.tanggalBerlaku?.match(/\d{4}/)?.[0] || "0";
        return parseInt(yearB) - parseInt(yearA);
      });
    } else {
      result = [...result].sort((a, b) => {
        const yearA = a.tanggalBerlaku?.match(/\d{4}/)?.[0] || "0";
        const yearB = b.tanggalBerlaku?.match(/\d{4}/)?.[0] || "0";
        return parseInt(yearA) - parseInt(yearB);
      });
    }

    return result;
  }, [data, selectedFilters, searchQuery, fuse, sortBy]);

  const toggleFilter = (category: keyof typeof selectedFilters, value: string) => {
    setSelectedFilters((prev) => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const clearFilters = () => {
    setSelectedFilters({
      bahasa: [],
      kategori: [],
      jenisPeraturan: [],
      topik: [],
      tahun: [],
    });
    setSearchQuery("");
  };

  const getStatusColor = (status: string) => {
    if (status?.toLowerCase().includes("berlaku")) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (status?.toLowerCase().includes("perubahan")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (status?.toLowerCase().includes("dicabut")) return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  const activeFilterCount = Object.values(selectedFilters).flat().length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat data peraturan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1a2332] to-[#0d1117] border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="text-sm text-muted-foreground mb-4">
            <span>Beranda</span>
            <span className="mx-2">›</span>
            <span>Sumber Hukum</span>
            <span className="mx-2">›</span>
            <span className="text-primary">Peraturan Pajak</span>
          </nav>

          <h1 className="text-3xl font-bold text-white mb-6">Cari Peraturan</h1>

          {/* Search Bar */}
          <div className="relative max-w-3xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari peraturan perpajakan, insentif, dan lainnya..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg bg-card border-border rounded-lg text-white placeholder:text-muted-foreground focus-visible:ring-primary"
            />
            <Button 
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary/90"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Advanced Search Toggle */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedSearch ? "rotate-180" : ""}`} />
              Pencarian Lanjutan
            </button>
            <button
              onClick={clearFilters}
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Ulang Pencarian
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">Filter</h2>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    Hapus Filter
                  </button>
                )}
              </div>

              {/* Bahasa */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Bahasa</h3>
                <div className="space-y-2">
                  {filterOptions.bahasa.map((item) => (
                    <div key={item} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bahasa-${item}`}
                        checked={selectedFilters.bahasa.includes(item)}
                        onCheckedChange={() => toggleFilter("bahasa", item)}
                      />
                      <Label htmlFor={`bahasa-${item}`} className="text-sm cursor-pointer">
                        {item}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Kategori */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Kategori</h3>
                <div className="space-y-2">
                  {filterOptions.kategori.map((item) => (
                    <div key={item} className="flex items-center space-x-2">
                      <Checkbox
                        id={`kategori-${item}`}
                        checked={selectedFilters.kategori.includes(item)}
                        onCheckedChange={() => toggleFilter("kategori", item)}
                      />
                      <Label htmlFor={`kategori-${item}`} className="text-sm cursor-pointer">
                        {item}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Jenis Peraturan */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Jenis Peraturan</h3>
                <div className="space-y-2">
                  {filterOptions.jenisPeraturan.map((item) => (
                    <div key={item} className="flex items-center space-x-2">
                      <Checkbox
                        id={`jenis-${item}`}
                        checked={selectedFilters.jenisPeraturan.includes(item)}
                        onCheckedChange={() => toggleFilter("jenisPeraturan", item)}
                      />
                      <Label htmlFor={`jenis-${item}`} className="text-sm cursor-pointer">
                        {item}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Topik */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Topik</h3>
                <div className="space-y-2">
                  {filterOptions.topik.map((item) => (
                    <div key={item} className="flex items-center space-x-2">
                      <Checkbox
                        id={`topik-${item}`}
                        checked={selectedFilters.topik.includes(item)}
                        onCheckedChange={() => toggleFilter("topik", item)}
                      />
                      <Label htmlFor={`topik-${item}`} className="text-sm cursor-pointer">
                        {item}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Tahun */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Tahun</h3>
                <div className="flex gap-2">
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Terlama" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.tahun.slice().reverse().map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground self-center">-</span>
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Terbaru" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.tahun.map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg font-semibold text-white">
                Menampilkan {filteredData.length} hasil
              </h2>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="terbaru">Terbaru</SelectItem>
                    <SelectItem value="terlama">Terlama</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedFilters.bahasa.map((item) => (
                  <Badge key={item} variant="secondary" className="gap-1">
                    {item}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => toggleFilter("bahasa", item)}
                    />
                  </Badge>
                ))}
                {selectedFilters.kategori.map((item) => (
                  <Badge key={item} variant="secondary" className="gap-1">
                    {item}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => toggleFilter("kategori", item)}
                    />
                  </Badge>
                ))}
                {selectedFilters.jenisPeraturan.map((item) => (
                  <Badge key={item} variant="secondary" className="gap-1">
                    {item}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => toggleFilter("jenisPeraturan", item)}
                    />
                  </Badge>
                ))}
                {selectedFilters.topik.map((item) => (
                  <Badge key={item} variant="secondary" className="gap-1">
                    {item}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => toggleFilter("topik", item)}
                    />
                  </Badge>
                ))}
              </div>
            )}

            {/* Results List */}
            <div className="space-y-4">
              {filteredData.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-lg border border-border">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Tidak ada peraturan yang ditemukan</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={clearFilters}
                  >
                    Hapus Filter
                  </Button>
                </div>
              ) : (
                filteredData.map((item) => (
                  <div
                    key={item.id}
                    className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-20 bg-gradient-to-b from-yellow-500/20 to-yellow-600/10 rounded flex items-center justify-center border border-yellow-500/30">
                          <div className="text-center">
                            <div className="text-yellow-500 text-2xl">🦅</div>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white mb-2 hover:text-primary cursor-pointer">
                          {item.judul}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {item.deskripsi}
                        </p>

                        {/* Status Badge */}
                        <Badge 
                          variant="outline" 
                          className={`mb-3 ${getStatusColor(item.status)}`}
                        >
                          {item.status || "Berlaku"}
                        </Badge>

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Tanggal Berlaku: {item.tanggalBerlaku || "-"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            <span>Topik: {item.topik || "-"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
