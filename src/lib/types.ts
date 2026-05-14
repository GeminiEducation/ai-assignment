// ─── Shared types for multi-file analysis architecture ───────────────────────
// Drop this file at: src/lib/types.ts
// Import in components as:  import type { FileEntry, AnalysisResult, FileStatus } from '@/lib/types';

export type FileStatus = 'queued' | 'analyzing' | 'done' | 'error' | 'cached';

export interface AnalysisResult {
    aiPercentage: number;
    humanPercentage: number;
    internetPercentage: number;
    confidence: number;
    flaggedSections: string[];
    recommendations: string[];
    summary: string;
    cached?: boolean;
    isQnA?: boolean;
    questionsAnalysis?: {
        question: string;
        studentAnswer: string;
        verdict: 'Correct' | 'Partially Correct' | 'Incorrect';
        explanation: string;
        correctAnswer: string;
    }[];
}

export interface FileEntry {
    /** Stable client-side UUID for React keys & state lookup */
    id: string;
    file: File;
    status: FileStatus;
    result?: AnalysisResult;
    /** Set after successful analysis or cache hit */
    error?: string;
    /** SHA-256 of file bytes, computed once before edge fn call */
    hash?: string;
}