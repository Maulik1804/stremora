import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle, XCircle, Trophy, RotateCcw, X } from 'lucide-react';
import { featuresService } from '../../services/features.service';
import Button from '../ui/Button';

// ── Result screen ─────────────────────────────────────────────────────────────
const QuizResult = ({ score, correct, total, results, questions, onRetry, onClose }) => {
  const emoji = score >= 80 ? '🏆' : score >= 50 ? '👍' : '📚';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-5"
    >
      <div className="text-center">
        <p className="text-4xl mb-2">{emoji}</p>
        <h3 className="text-xl font-bold text-[#f8f8f8]">
          {score >= 80 ? 'Excellent!' : score >= 50 ? 'Good job!' : 'Keep learning!'}
        </h3>
        <p className="text-[#a0a0a0] mt-1">
          {correct}/{total} correct · <span className="text-[#f8f8f8] font-semibold">{score}%</span>
        </p>
      </div>

      {/* Score bar */}
      <div className="h-2 bg-white/8 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
        />
      </div>

      {/* Per-question breakdown */}
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-none">
        {results.map((r, i) => (
          <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl text-sm
            ${r.isCorrect ? 'bg-green-900/20 border border-green-800/30' : 'bg-red-900/20 border border-red-800/30'}`}
          >
            {r.isCorrect
              ? <CheckCircle size={15} className="text-green-400 flex-shrink-0 mt-0.5" />
              : <XCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />}
            <div className="min-w-0">
              <p className="text-[#f8f8f8] line-clamp-1">{questions[i]?.question}</p>
              {!r.isCorrect && r.explanation && (
                <p className="text-xs text-[#a0a0a0] mt-0.5">{r.explanation}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" size="sm" onClick={onRetry} className="flex-1">
          <RotateCcw size={14} /> Retry
        </Button>
        <Button variant="primary" size="sm" onClick={onClose} className="flex-1">
          Done
        </Button>
      </div>
    </motion.div>
  );
};

// ── Main quiz modal ───────────────────────────────────────────────────────────
const QuizModal = ({ videoId, onClose }) => {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState([]); // answers array
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['quiz', videoId],
    queryFn: () => featuresService.getQuiz(videoId).then((r) => r.data.data),
    staleTime: 300_000,
  });

  const submitMutation = useMutation({
    mutationFn: (answers) => featuresService.submitQuiz(videoId, answers),
    onSuccess: (res) => {
      setResult(res.data.data);
      setSubmitted(true);
    },
  });

  const quiz = data?.quiz;
  const questions = quiz?.questions ?? [];
  const q = questions[current];

  const handleSelect = (optIdx) => {
    if (submitted) return;
    const next = [...selected];
    next[current] = optIdx;
    setSelected(next);
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      submitMutation.mutate(selected);
    }
  };

  const handleRetry = () => {
    setCurrent(0);
    setSelected([]);
    setSubmitted(false);
    setResult(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 16 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#141414] border border-white/8 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-yellow-400" />
            <h3 className="text-base font-semibold text-[#f8f8f8]">Video Quiz</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/8 text-[#a0a0a0]">
            <X size={16} />
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-white/10 border-t-[#ff0000] rounded-full animate-spin" />
          </div>
        )}

        {isError && (
          <p className="text-center text-[#a0a0a0] py-8">No quiz available for this video.</p>
        )}

        {quiz && !submitted && q && (
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-4"
          >
            {/* Progress */}
            <div className="flex items-center justify-between text-xs text-[#606060]">
              <span>Question {current + 1} of {questions.length}</span>
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-colors
                    ${i < current ? 'bg-green-500' : i === current ? 'bg-[#ff0000]' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>

            <p className="text-sm font-medium text-[#f8f8f8] leading-snug">{q.question}</p>

            <div className="flex flex-col gap-2">
              {q.options.map((opt, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(i)}
                  className={`text-left px-4 py-3 rounded-xl text-sm border transition-all
                    ${selected[current] === i
                      ? 'bg-[#ff0000]/15 border-[#ff0000]/50 text-[#f8f8f8]'
                      : 'bg-white/3 border-white/8 text-[#a0a0a0] hover:bg-white/6 hover:text-[#f8f8f8]'}`}
                >
                  <span className="font-mono text-xs mr-2 opacity-60">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </motion.button>
              ))}
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              disabled={selected[current] === undefined}
              loading={submitMutation.isPending}
              className="w-full rounded-xl"
            >
              {current < questions.length - 1 ? 'Next →' : 'Submit'}
            </Button>
          </motion.div>
        )}

        {submitted && result && (
          <QuizResult
            {...result}
            questions={questions}
            onRetry={handleRetry}
            onClose={onClose}
          />
        )}
      </motion.div>
    </motion.div>
  );
};

export default QuizModal;
