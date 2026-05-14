import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Header from '@/components/Header';
import FileUpload from '@/components/FileUpload';
import MultiResultsView from '@/components/MultiResultsView';
import AnalyzingOverlay from '@/components/AnalyzingOverlay';
import { extractText } from '@/lib/fileParser';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { FileEntry } from '@/lib/types';

// ── Stable browser-side SHA-256 hash ─────────────────────────────────────────
async function getFileHash(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

let idSeq = 0;
const newId = () => `file-${Date.now()}-${idSeq++}`;

// ── Index page ────────────────────────────────────────────────────────────────
const Index = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [globalAnalyzing, setGlobalAnalyzing] = useState(false);

  // Helpers to mutate a single entry by id
  const patchEntry = useCallback(
    (id: string, patch: Partial<FileEntry>) =>
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e))),
    [],
  );

  // ── Add files from the drop zone ──────────────────────────────────────────
  const handleFilesAdd = useCallback(
    (files: File[]) => {
      const newEntries: FileEntry[] = files.map((f) => ({
        id: newId(),
        file: f,
        status: 'queued',
      }));
      setEntries((prev) => [...prev, ...newEntries]);
    },
    [],
  );

  // ── Remove a file card ────────────────────────────────────────────────────
  const handleFileRemove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // ── Analyze one file (called in parallel for all queued files) ────────────
  const analyzeOne = useCallback(
    async (entry: FileEntry) => {
      if (!user) return;

      patchEntry(entry.id, { status: 'analyzing' });

      try {
        const text = await extractText(entry.file);
        if (!text.trim()) {
          patchEntry(entry.id, { status: 'error', error: 'Could not extract text.' });
          return;
        }

        const hash = entry.hash ?? (await getFileHash(entry.file));
        patchEntry(entry.id, { hash });

        const { data, error } = await supabase.functions.invoke('analyze-assignment', {
          body: { fileHash: hash, fileName: entry.file.name, text },
        });

        if (error) throw new Error(error.message || 'Analysis failed.');
        if (!data) throw new Error('No response from analysis service.');

        if (data.fallback) {
          const hint = typeof data.retryAfterSeconds === 'number'
            ? ` Retry in ~${Math.ceil(data.retryAfterSeconds)}s.`
            : '';
          patchEntry(entry.id, {
            status: 'error',
            error: (data.error || 'Service temporarily unavailable.') + hint,
          });
          return;
        }

        if (data.error) throw new Error(data.error);

        patchEntry(entry.id, {
          status: data.cached ? 'cached' : 'done',
          result: data,
        });
      } catch (err: any) {
        patchEntry(entry.id, { status: 'error', error: err.message || 'Analysis failed.' });
      }
    },
    [user, patchEntry],
  );

  // ── Fan-out: run all queued files in parallel ─────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in with Google first.');
      return;
    }

    const queued = entries.filter((e) => e.status === 'queued');
    if (queued.length === 0) return;

    setGlobalAnalyzing(true);

    try {
      // Parallel fan-out — one edge function invocation per file
      await Promise.all(queued.map(analyzeOne));

      const doneCount = queued.length;
      toast.success(`Analysis complete for ${doneCount} file${doneCount !== 1 ? 's' : ''}!`);
    } finally {
      setGlobalAnalyzing(false);
    }
  }, [user, entries, analyzeOne]);

  // ── Reset everything ──────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setEntries([]);
    setGlobalAnalyzing(false);
  }, []);

  const hasResults = entries.some((e) => e.status === 'done' || e.status === 'cached');
  const allSettled = entries.length > 0 && entries.every(
    (e) => e.status === 'done' || e.status === 'cached' || e.status === 'error',
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-secondary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/3 blur-3xl" />
      </div>

      <main className="flex-1 container py-12 px-4 flex flex-col items-center justify-center gap-10">
        {/* Title */}
        <AnimatePresence>
          {!allSettled && (
            <div className="text-center">
              <h2 className="font-display text-3xl sm:text-4xl font-bold gradient-text mb-3">
                Stella College AI Checker
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                Upload up to 10 assignments. Each is analyzed in parallel for AI content and plagiarism.
              </p>
            </div>
          )}
        </AnimatePresence>

        {/* Upload zone — always visible so more files can be added */}
        {!allSettled && (
          <FileUpload
            entries={entries}
            onFilesAdd={handleFilesAdd}
            onFileRemove={handleFileRemove}
            onAnalyze={handleAnalyze}
            isAnalyzing={globalAnalyzing}
          />
        )}

        {/* Per-file results dashboard */}
        {hasResults && (
          <MultiResultsView entries={entries} onReset={handleReset} />
        )}
      </main>
    </div>
  );
};

export default Index;