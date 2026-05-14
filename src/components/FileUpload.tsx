import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FileEntry } from '@/lib/types';

interface FileUploadProps {
  entries: FileEntry[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (id: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

const ACCEPTED = '.pdf,.doc,.docx,.txt';
const MAX_SIZE = 20 * 1024 * 1024;

const FileUpload = ({ entries, onFilesAdd, onFileRemove, onAnalyze, isAnalyzing }: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      setError('');
      const validFiles: File[] = [];
      const fileArray = Array.from(files);
      
      for (const f of fileArray) {
        const ext = f.name.split('.').pop()?.toLowerCase();
        if (!['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
          setError('Unsupported file type. Use PDF, DOCX, DOC, or TXT.');
          continue;
        }
        if (f.size > MAX_SIZE) {
          setError('File exceeds 20MB limit.');
          continue;
        }
        validFiles.push(f);
      }

      if (validFiles.length > 0) {
        onFilesAdd(validFiles);
      }

      if (inputRef.current) inputRef.current.value = '';
    },
    [onFilesAdd],
  );

  const clearFile = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onFileRemove(id);
      if (inputRef.current) inputRef.current.value = '';
    },
    [onFileRemove],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  const queuedEntries = entries.filter(e => e.status === 'queued');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={`glass-card-hover rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300
          ${dragActive ? 'border-primary/50 shadow-[var(--glow-primary)]' : ''}
          ${queuedEntries.length > 0 ? 'border-primary/20' : ''}`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          id="file-input"
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <AnimatePresence mode="wait">
          {queuedEntries.length === 0 ? (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center animate-float">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Drop your assignments here
              </h3>
              <p className="text-muted-foreground text-sm mb-1">
                or click to browse files
              </p>
              <p className="text-muted-foreground/60 text-xs">
                PDF, DOCX, DOC, TXT — up to 20 MB
              </p>
            </motion.div>
          ) : (
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
              {queuedEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-4 text-left bg-background/50 p-3 rounded-xl border border-border/50" onClick={(e) => e.stopPropagation()}>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium truncate">{entry.file.name}</p>
                    <p className="text-muted-foreground text-sm">{formatSize(entry.file.size)}</p>
                  </div>
                  <button
                    onClick={(e) => clearFile(e, entry.id)}
                    className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <div className="pt-4 flex items-center justify-center text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors">
                <Upload className="h-4 w-4 mr-2" />
                Add more files
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-2 text-destructive text-sm justify-center">
            <AlertCircle className="h-4 w-4" />
            {error}
          </motion.div>
        )}
      </div>

      {queuedEntries.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center">
          <Button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold px-8 animate-pulse-glow"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Analyzing {queuedEntries.length} File{queuedEntries.length !== 1 ? 's' : ''}…
              </span>
            ) : (
              `Analyze ${queuedEntries.length} File${queuedEntries.length !== 1 ? 's' : ''} with AI`
            )}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default FileUpload;