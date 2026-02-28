"use client";

import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";

interface RegulationContentProps {
  id: string;
  contentFile?: string;
}

export function RegulationContent({ contentFile }: RegulationContentProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        if (!contentFile) {
          setIsLoading(false);
          return;
        }
        
        const response = await fetch(`/data/content/${contentFile}`);
        if (response.ok) {
          const text = await response.text();
          // Extract content after "## Konten"
          const match = text.match(/## Konten\n\n([\s\S]*)/);
          setContent(match ? match[1].trim() : text);
        }
      } catch (error) {
        console.error("Failed to load content:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadContent();
  }, [contentFile]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Memuat konten...</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Konten lengkap belum tersedia.</p>
        <p className="text-sm mt-2">Silakan kunjungi sumber asli di DDTC.</p>
      </div>
    );
  }

  return (
    <div className="prose prose-invert max-w-none">
      <pre className="whitespace-pre-wrap font-mono text-sm text-foreground bg-muted p-4 rounded-lg overflow-x-auto">
        {content}
      </pre>
    </div>
  );
}
