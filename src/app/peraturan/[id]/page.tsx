import regulations from "@/data/regulations.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Tag, ExternalLink, ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return regulations.map((item) => ({
    id: item.id,
  }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const data = regulations.find((r) => r.id === params.id);
  return {
    title: data ? `${data.judul} - Peraturan Perpajakan` : "Peraturan Tidak Ditemukan",
  };
}

export default function DetailPage({ params }: { params: { id: string } }) {
  const data = regulations.find((r) => r.id === params.id);
  
  if (!data) {
    notFound();
  }

  // Konten sudah ada di data.fullContent
  const content = data.fullContent || data.deskripsi;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-[#1a2332] to-[#0d1117] border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Detail Peraturan</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
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
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 mb-4">
                  {data.status || "Berlaku"}
                </Badge>
                <Separator className="my-4" />
                
                <h3 className="text-lg font-semibold text-white mb-4">Isi Peraturan</h3>
                
                {content ? (
                  <div className="prose prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-foreground bg-muted p-4 rounded-lg overflow-x-auto max-h-[600px] overflow-y-auto">
                      {content}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Konten lengkap belum tersedia.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informasi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Jenis</label>
                  <p className="font-medium">{data.jenis}</p>
                </div>
                <Separator />
                <div>
                  <label className="text-sm text-muted-foreground">Kategori</label>
                  <p className="font-medium">{data.kategori}</p>
                </div>
                <Separator />
                <div>
                  <label className="text-sm text-muted-foreground">Topik</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Tag className="h-4 w-4 text-primary" />
                    <span className="font-medium">{data.topik}</span>
                  </div>
                </div>
                <Separator />
                <div>
                  <label className="text-sm text-muted-foreground">Tanggal Berlaku</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium">{data.tanggalBerlaku || "-"}</span>
                  </div>
                </div>
                <Separator />
                <a href={data.url} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full" variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Unduh PDF Asli
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
