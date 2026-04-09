import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isAnalyzing: boolean;
}

const ACCEPTED = '.pdf,.doc,.docx,.txt';
const MAX_SIZE = 20 * 1024 * 1024;

const FileUpload = ({ onFileSelect, isAnalyzing }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback((f: File) => {
    setError('');
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
      setError('Unsupported file type. Use PDF, DOCX, DOC, or TXT.');
      return;
    }
    if (f.size > MAX_SIZE) {
      setError('File exceeds 20MB limit.');
      return;
    }
    setFile(f);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

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
          ${file ? 'border-primary/20' : ''}`}
        onClick={() => {
          if (!file) document.getElementById('file-input')?.click();
        }}
      >
        <input
          id="file-input"
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center animate-float">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Drop your assignment here
              </h3>
              <p className="text-muted-foreground text-sm mb-1">
                or click to browse files
              </p>
              <p className="text-muted-foreground/60 text-xs">
                PDF, DOCX, DOC, TXT — up to 20 MB
              </p>
            </motion.div>
          ) : (
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="flex items-center gap-4 text-left">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium truncate">{file.name}</p>
                  <p className="text-muted-foreground text-sm">{formatSize(file.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
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

      {file && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center">
          <Button
            onClick={() => onFileSelect(file)}
            disabled={isAnalyzing}
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold px-8 animate-pulse-glow"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Analyzing…
              </span>
            ) : (
              'Analyze with AI'
            )}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default FileUpload;
