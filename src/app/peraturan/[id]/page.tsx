import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Tag, FileText, ExternalLink, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import regulations from "@/data/regulations.json";
import { RegulationContent } from "./RegulationContent";

interface PeraturanDetail {
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

export function generateStaticParams() {
  return regulations.map((item: PeraturanDetail) => ({ id: item.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const data = regulations.find((r: PeraturanDetail) => r.id === params.id);
  return {
    title: data ? `${data.judul} - Peraturan Perpajakan` : "Peraturan Tidak Ditemukan",
    description: data?.deskripsi || "Detail peraturan perpajakan",
  };
}

function getStatusColor(status: string) {
  if (status?.toLowerCase().includes("berlaku")) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (status?.toLowerCase().includes("perubahan")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (status?.toLowerCase().includes("dicabut")) return "bg-red-500/20 text-red-400 border-red-500/30";
  return "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

function getStatusIcon(status: string) {
  if (status?.toLowerCase().includes("berlaku")) return <CheckCircle2 className="h-4 w-4 text-green-400" />;
  if (status?.toLowerCase().includes("dicabut")) return <XCircle className="h-4 w-4 text-red-400" />;
  return <CheckCircle2 className="h-4 w-4 text-blue-400" />;
}

export default function DetailPage({ params }: { params: { id: string } }) {
  const data = regulations.find((r: PeraturanDetail) => r.id === params.id) as PeraturanDetail | undefined;
  
  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Peraturan Tidak Ditemukan</h2>
            <p className="text-muted-foreground mb-4">Maaf, peraturan yang Anda cari tidak tersedia.</p>
            <Link href="/">
              <Button><ArrowLeft className="h-4 w-4 mr-2" />Kembali ke Beranda</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-[#1a2332] to-[#0d1117] border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Kembali</Button></Link>
            <div>
              <nav className="text-sm text-muted-foreground mb-2"><span>Beranda</span><span className="mx-2">›</span><span>Detail Peraturan</span></nav>
              <h1 className="text-2xl font-bold text-white">Detail Peraturan</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-20 bg-gradient-to-b from-yellow-500/20 to-yellow-600/10 rounded flex items-center justify-center border border-yellow-500/30 flex-shrink-0">
                    <span className="text-yellow-500 text-2xl">🦅</span>
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{data.judul}</CardTitle>
                    <p className="text-muted-foreground text-sm">{data.deskripsi}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  {getStatusIcon(data.status)}
                  <Badge variant="outline" className={getStatusColor(data.status)}>{data.status}</Badge>
                </div>
                <Separator className="my-4" />
                <RegulationContent id={data.id} contentFile={data.contentFile} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader><CardTitle className="text-lg">Informasi</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><label className="text-sm text-muted-foreground">Jenis Peraturan</label><p className="font-medium">{data.jenis}</p></div>
                <Separator />
                <div><label className="text-sm text-muted-foreground">Kategori</label><p className="font-medium">{data.kategori}</p></div>
                <Separator />
                <div><label className="text-sm text-muted-foreground">Topik</label><div className="flex items-center gap-2 mt-1"><Tag className="h-4 w-4 text-primary" /><span className="font-medium">{data.topik}</span></div></div>
                <Separator />
                <div><label className="text-sm text-muted-foreground">Bahasa</label><p className="font-medium">{data.bahasa}</p></div>
                <Separator />
                <div><label className="text-sm text-muted-foreground">Tanggal Berlaku</label><div className="flex items-center gap-2 mt-1"><Calendar className="h-4 w-4 text-primary" /><span className="font-medium">{data.tanggalBerlaku}</span></div></div>
                <Separator />
                <a href={data.url} target="_blank" rel="noopener noreferrer" className="block"><Button className="w-full" variant="outline"><ExternalLink className="h-4 w-4 mr-2" />Lihat di DDTC</Button></a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
