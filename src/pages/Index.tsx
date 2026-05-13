import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Header from '@/components/Header';
import FileUpload from '@/components/FileUpload';
import ResultsView, { type AnalysisResult } from '@/components/ResultsView';
import AnalyzingOverlay from '@/components/AnalyzingOverlay';
import { extractText } from '@/lib/fileParser';
import { generateReport } from '@/lib/reportGenerator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// ── Inline hash function — do NOT import this from the Deno edge-function folder.
// That import silently breaks in the browser build, making every file produce
// the same (undefined) hash and returning the same cached result every time.
async function getFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

const Index = () => {
  const { user } = useAuth();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState('');

  const handleAnalyze = async (file: File) => {
    if (!user) {
      toast.error('Please sign in with Google first.');
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setFileName(file.name);

    try {
      const text = await extractText(file);
      if (!text.trim()) {
        toast.error('Could not extract text from file.');
        setAnalyzing(false);
        return;
      }

      const fileHash = await getFileHash(file);

      // Quick sanity-check — remove after confirming the fix
      console.log('[analyze] file:', file.name, '| hash:', fileHash.slice(0, 12) + '…');

      const { data, error } = await supabase.functions.invoke('analyze-assignment', {
        body: {
          fileHash,
          fileName: file.name,
          text,
        },
      });

      if (error) {
        throw new Error(error.message || 'Analysis failed. Please try again.');
      }

      if (!data) {
        throw new Error('No response from the analysis service.');
      }

      if (data.fallback) {
        const retryHint = typeof data.retryAfterSeconds === 'number'
          ? ` Please wait about ${Math.ceil(data.retryAfterSeconds)} seconds and try again.`
          : '';
        toast.error(`${data.error || 'Analysis service is temporarily unavailable.'}${retryHint}`);
        setResult(null);
        return;
      }

      if (data.error) throw new Error(data.error);

      setResult(data as AnalysisResult);

      if (data.cached) {
        toast.success('Analysis complete! (result from cache)');
      } else {
        toast.success('Analysis complete!');
      }

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setFileName('');
  };

  const handleDownload = () => {
    if (!result) return;
    generateReport(result, fileName, user?.user_metadata?.full_name);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Background effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-secondary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/3 blur-3xl" />
      </div>

      <main className="flex-1 container py-12 px-4 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {analyzing ? (
            <AnalyzingOverlay key="analyzing" />
          ) : result ? (
            <ResultsView
              key="results"
              result={result}
              fileName={fileName}
              onDownload={handleDownload}
              onReset={handleReset}
            />
          ) : (
            <div key="upload" className="w-full flex flex-col items-center gap-8">
              <div className="text-center">
                <h2 className="font-display text-3xl sm:text-4xl font-bold gradient-text mb-3">
                  Stella College AI Checker
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                  Upload your assignment to detect AI-generated content and internet plagiarism.
                </p>
              </div>
              <FileUpload
                onFileSelect={handleAnalyze}
                onReset={handleReset}
                isAnalyzing={analyzing}
              />
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;