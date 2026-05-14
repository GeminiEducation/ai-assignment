import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download, AlertTriangle, CheckCircle, Info, BarChart3, Globe,
    HelpCircle, XCircle, RefreshCw, Zap, AlertCircle, Loader2,
} from 'lucide-react';
import CircleProgress from './CircleProgress';
import { Button } from '@/components/ui/button';
import { generateMultiReport } from '@/lib/reportGenerator';
import type { FileEntry, AnalysisResult } from '@/lib/types';

interface MultiResultsViewProps {
    entries: FileEntry[];
    onReset: () => void;
}

// ── Single-file result panel ─────────────────────────────────────────────────
const SingleResult = ({
    result,
    fileName,
}: {
    result: AnalysisResult;
    fileName: string;
}) => {
    const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
    const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
            {/* Score circles */}
            <motion.div variants={item} className="glass-card rounded-2xl p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 items-center justify-items-center gap-4">
                    <CircleProgress value={result.aiPercentage} label="AI Generated" color="accent" />
                    <CircleProgress value={result.humanPercentage} label="Human Written" color="primary" />
                    <CircleProgress value={result.internetPercentage} label="Internet Match" color="warning" />
                    <CircleProgress value={result.confidence} label="Confidence" color="secondary" />
                </div>
            </motion.div>

            {/* Summary */}
            <motion.div variants={item} className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h4 className="font-display font-semibold text-foreground text-sm">Analysis Summary</h4>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{result.summary}</p>
            </motion.div>

            {/* Internet match */}
            {result.internetPercentage > 0 && (
                <motion.div variants={item} className="glass-card rounded-2xl p-5 border-l-4 border-warning">
                    <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-4 w-4 text-warning" />
                        <h4 className="font-display font-semibold text-foreground text-sm">Internet Content Detected</h4>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Approximately <span className="text-warning font-semibold">{result.internetPercentage}%</span> matches
                        content found online. This may indicate copied or paraphrased material.
                    </p>
                </motion.div>
            )}

            {/* Flagged sections */}
            {result.flaggedSections.length > 0 && (
                <motion.div variants={item} className="glass-card rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-accent" />
                        <h4 className="font-display font-semibold text-foreground text-sm">Flagged Sections</h4>
                    </div>
                    <ul className="space-y-1.5">
                        {result.flaggedSections.map((s, i) => (
                            <li key={i} className="text-sm text-muted-foreground pl-3 border-l-2 border-accent/40">{s}</li>
                        ))}
                    </ul>
                </motion.div>
            )}

            {/* Q&A */}
            {result.isQnA && result.questionsAnalysis && result.questionsAnalysis.length > 0 && (
                <motion.div variants={item} className="glass-card rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <HelpCircle className="h-4 w-4 text-primary" />
                        <h4 className="font-display font-semibold text-foreground text-sm">Q&A Evaluation</h4>
                    </div>
                    <div className="space-y-3">
                        {result.questionsAnalysis.map((q, i) => {
                            const isCorrect = q.verdict === 'Correct';
                            const isPartial = q.verdict === 'Partially Correct';
                            const VerdictIcon = isCorrect ? CheckCircle : isPartial ? AlertTriangle : XCircle;
                            const cls = isCorrect
                                ? 'text-primary border-primary/40'
                                : isPartial
                                    ? 'text-warning border-warning/40'
                                    : 'text-destructive border-destructive/40';
                            return (
                                <div key={i} className={`rounded-xl border-l-4 bg-muted/40 p-3 ${cls}`}>
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="font-medium text-foreground text-xs">Q{i + 1}. {q.question}</p>
                                        <span className={`flex items-center gap-1 text-xs font-semibold shrink-0 ${cls.split(' ')[0]}`}>
                                            <VerdictIcon className="h-3 w-3" /> {q.verdict}
                                        </span>
                                    </div>
                                    {q.explanation && <p className="text-xs text-muted-foreground">{q.explanation}</p>}
                                    {!isCorrect && q.correctAnswer && (
                                        <p className="text-xs mt-1 bg-primary/5 rounded p-1.5 border border-primary/20">
                                            <span className="font-semibold text-primary">Correct: </span>{q.correctAnswer}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
                <motion.div variants={item} className="glass-card rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-secondary" />
                        <h4 className="font-display font-semibold text-foreground text-sm">Recommendations</h4>
                    </div>
                    <ul className="space-y-1.5">
                        {result.recommendations.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" /> {r}
                            </li>
                        ))}
                    </ul>
                </motion.div>
            )}

            {/* Download */}
            <motion.div variants={item} className="flex justify-center pt-1">
                <p className="text-xs text-muted-foreground italic">Use the "Download Full Report PDF" button above to export all files.</p>
            </motion.div>
        </motion.div>
    );
};

// ── Main multi-results dashboard ─────────────────────────────────────────────
const MultiResultsView = ({ entries, onReset }: MultiResultsViewProps) => {
    const finished = entries.filter((e) => e.status === 'done' || e.status === 'cached');
    const [activeId, setActiveId] = useState<string>('');
    // Track whether the user has manually chosen a tab
    const userSelectedRef = useRef(false);

    // Auto-select the first finished entry; after that, only switch if user
    // hasn't manually picked a tab yet (so new completions don't hijack the view)
    useEffect(() => {
        if (!userSelectedRef.current && finished.length > 0) {
            setActiveId(finished[0].id);
        }
    }, [finished.length]); // re-run whenever a new file finishes

    const handleTabSelect = (id: string) => {
        userSelectedRef.current = true;
        setActiveId(id);
    };

    // Resolve active entry: prefer explicit selection, fall back to first finished
    const activeEntry = entries.find((e) => e.id === activeId) ?? finished[0];

    const statusIcon = (entry: FileEntry) => {
        if (entry.status === 'analyzing') return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
        if (entry.status === 'cached') return <Zap className="h-3.5 w-3.5 text-secondary" />;
        if (entry.status === 'done') return <CheckCircle className="h-3.5 w-3.5 text-green-400" />;
        if (entry.status === 'error') return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
        return null;
    };

    const handleDownloadAll = () => generateMultiReport(entries);

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-3xl mx-auto space-y-6"
        >
            {/* Summary bar */}
            <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h3 className="font-display font-bold text-foreground text-lg">Analysis Results</h3>
                        <p className="text-muted-foreground text-sm">
                            {finished.length} of {entries.length} file{entries.length !== 1 ? 's' : ''} analyzed
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            size="sm"
                            className="gap-2 bg-primary text-primary-foreground font-display"
                            onClick={handleDownloadAll}
                        >
                            <Download className="h-4 w-4" />
                            Download Full Report PDF
                        </Button>
                        <Button variant="outline" onClick={onReset} size="sm" className="gap-2 font-display">
                            <RefreshCw className="h-4 w-4" />
                            Start Over
                        </Button>
                    </div>
                </div>

                {/* Aggregate chips */}
                {finished.length > 1 && (() => {
                    const avg = (key: keyof AnalysisResult) =>
                        Math.round(
                            finished.reduce((s, e) => s + ((e.result?.[key] as number) ?? 0), 0) / finished.length,
                        );
                    return (
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { label: 'Avg AI%', value: avg('aiPercentage'), color: 'text-accent' },
                                { label: 'Avg Human%', value: avg('humanPercentage'), color: 'text-primary' },
                                { label: 'Avg Internet%', value: avg('internetPercentage'), color: 'text-warning' },
                                { label: 'Avg Confidence', value: avg('confidence'), color: 'text-secondary' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="rounded-xl bg-muted/40 p-3 text-center">
                                    <div className={`text-xl font-bold font-display ${color}`}>{value}%</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* File tabs */}
            {entries.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {entries.map((entry) => (
                        <button
                            key={entry.id}
                            onClick={() => entry.result && handleTabSelect(entry.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                ${activeEntry?.id === entry.id
                                    ? 'bg-primary/20 border-primary/40 text-primary'
                                    : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted/70'
                                }
                ${!entry.result ? 'cursor-default opacity-60' : 'cursor-pointer'}
              `}
                        >
                            {statusIcon(entry)}
                            <span className="max-w-[120px] truncate">{entry.file.name}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Active file result */}
            <AnimatePresence mode="wait">
                {activeEntry?.result ? (
                    <motion.div
                        key={activeEntry.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                    >
                        {entries.length > 1 && (
                            <p className="text-xs text-muted-foreground mb-3 font-medium">
                                {activeEntry.file.name}
                                {activeEntry.status === 'cached' && (
                                    <span className="ml-2 text-secondary">(from cache)</span>
                                )}
                            </p>
                        )}
                        <SingleResult
                            result={activeEntry.result}
                            fileName={activeEntry.file.name}
                        />
                    </motion.div>
                ) : activeEntry?.status === 'error' ? (
                    <motion.div
                        key={activeEntry.id + '-err'}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass-card rounded-2xl p-8 text-center"
                    >
                        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
                        <p className="text-foreground font-semibold">{activeEntry.file.name}</p>
                        <p className="text-muted-foreground text-sm mt-1">{activeEntry.error}</p>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </motion.div>
    );
};

export default MultiResultsView;