"use client";

import { useState, useEffect } from "react";
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

function RegulationContent({ contentFile }: { contentFile?: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      if (!contentFile) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`/data/content/${contentFile}`);
        if (response.ok) {
          const text = await response.text();
          const match = text.match(/## Isi Peraturan\s*\n([\s\S]*)/);
          setContent(match ? match[1].trim() : text);
        }
      } catch (e) {
        console.error("Failed to load:", e);
      } finally {
        setLoading(false);
      }
    }
    
    loadContent();
  }, [contentFile]);

  if (loading) return (
    <div className="text-center py-8">
      <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p className="mt-2 text-muted-foreground">Memuat konten...</p>
    </div>
  );
  
  if (!content) return (
    <div className="text-center py-8 text-muted-foreground">
      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Konten sedang diproses.</p>
    </div>
  );

  return (
    <div className="prose prose-invert max-w-none">
      <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg max-h-[600px] overflow-y-auto">
        {content}
      </pre>
    </div>
  );
}

export default function DetailPage({ params }: { params: { id: string } }) {
  const data = regulations.find((r) => r.id === params.id);
  
  if (!data) {
    notFound();
  }

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
          <div className="lg:col-span-2">
            <Card>
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
                <RegulationContent contentFile={data.contentFile} />
              </CardContent>
            </Card>
          </div>

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
                  <label className="text-sm text-muted-foreground">Topiklabel
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
