import { motion } from 'framer-motion';
import { Download, AlertTriangle, CheckCircle, Info, BarChart3, Globe, HelpCircle, XCircle } from 'lucide-react';
import CircleProgress from './CircleProgress';
import { Button } from '@/components/ui/button';

export interface AnalysisResult {
  aiPercentage: number;
  humanPercentage: number;
  internetPercentage: number;
  confidence: number;
  flaggedSections: string[];
  recommendations: string[];
  summary: string;
  isQnA?: boolean;
  questionsAnalysis?: {
    question: string;
    studentAnswer: string;
    verdict: 'Correct' | 'Partially Correct' | 'Incorrect';
    explanation: string;
    correctAnswer: string;
  }[];
}

interface ResultsViewProps {
  result: AnalysisResult;
  fileName: string;
  onDownload: () => void;
  onReset: () => void;
}

const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

const ResultsView = ({ result, fileName, onDownload, onReset }: ResultsViewProps) => {
  const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-3xl mx-auto space-y-6"
    >
      {/* Score circles */}
      <motion.div variants={item} className="glass-card rounded-2xl p-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 items-center justify-items-center gap-6">
          <CircleProgress value={result.aiPercentage} label="AI Generated" color="accent" />
          <CircleProgress value={result.humanPercentage} label="Human Written" color="primary" />
          <CircleProgress value={result.internetPercentage} label="Internet Match" color="warning" />
          <CircleProgress value={result.confidence} label="Confidence" color="secondary" />
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div variants={item} className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">Analysis Summary</h3>
        </div>
        <p className="text-muted-foreground text-sm mt-4 leading-relaxed">{result.summary}</p>
      </motion.div>

      {/* Internet content info */}
      {result.internetPercentage > 0 && (
        <motion.div variants={item} className="glass-card rounded-2xl p-6 border-l-4 border-warning">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-5 w-5 text-warning" />
            <h3 className="font-display font-semibold text-foreground">Internet Content Detected</h3>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Approximately <span className="text-warning font-semibold">{result.internetPercentage}%</span> of this assignment appears to match content found on the internet. This may indicate copied or closely paraphrased material from online sources.
          </p>
        </motion.div>
      )}

      {/* Flagged sections */}
      {result.flaggedSections.length > 0 && (
        <motion.div variants={item} className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-accent" />
            <h3 className="font-display font-semibold text-foreground">Flagged Sections</h3>
          </div>
          <ul className="space-y-2">
            {result.flaggedSections.map((s, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="text-sm text-muted-foreground pl-4 border-l-2 border-accent/40"
              >
                {s}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Q&A Analysis */}
      {result.isQnA && result.questionsAnalysis && result.questionsAnalysis.length > 0 && (
        <motion.div variants={item} className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Question & Answer Evaluation</h3>
          </div>
          <div className="space-y-4">
            {result.questionsAnalysis.map((q, i) => {
              const isCorrect = q.verdict === 'Correct';
              const isPartial = q.verdict === 'Partially Correct';
              const VerdictIcon = isCorrect ? CheckCircle : isPartial ? AlertTriangle : XCircle;
              const verdictColor = isCorrect
                ? 'text-primary border-primary/40'
                : isPartial
                  ? 'text-warning border-warning/40'
                  : 'text-destructive border-destructive/40';
              return (
                <div key={i} className={`rounded-xl border-l-4 bg-muted/40 p-4 ${verdictColor}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium text-foreground text-sm">
                      Q{i + 1}. {q.question}
                    </p>
                    <span className={`flex items-center gap-1 text-xs font-semibold shrink-0 ${verdictColor.split(' ')[0]}`}>
                      <VerdictIcon className="h-3.5 w-3.5" />
                      {q.verdict}
                    </span>
                  </div>
                  {q.studentAnswer && (
                    <p className="text-xs text-muted-foreground mb-2">
                      <span className="font-medium">Student answer:</span> {q.studentAnswer}
                    </p>
                  )}
                  {q.explanation && (
                    <p className="text-xs text-muted-foreground mb-2">{q.explanation}</p>
                  )}
                  {!isCorrect && q.correctAnswer && (
                    <p className="text-xs text-foreground bg-primary/5 rounded-md p-2 border border-primary/20">
                      <span className="font-semibold text-primary">Correct answer: </span>
                      {q.correctAnswer}
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
        <motion.div variants={item} className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-secondary" />
            <h3 className="font-display font-semibold text-foreground">Recommendations</h3>
          </div>
          <ul className="space-y-2">
            {result.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={onDownload} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-display">
          <Download className="h-4 w-4" />
          Download Report PDF
        </Button>
        <Button variant="outline" onClick={onReset} className="border-border bg-muted/40 hover:bg-muted text-foreground font-display">
          Analyze Another File
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default ResultsView;
