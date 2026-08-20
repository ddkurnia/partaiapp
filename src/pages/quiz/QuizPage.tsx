import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getActiveQuizzes, getAllQuizzes, getQuizAttemptCount,
  submitQuizResult, getQuizResults,
} from '@/services/gamification/gamificationService';
import { getQuizCategoryLabel } from '@/constants/gamification';
import { getLevelFromXP } from '@/constants/roles';
import type { Quiz, QuizResult } from '@/types';
import {
  BookOpen, Clock, CheckCircle2, XCircle, Trophy, Star,
  Loader2, ChevronRight, RotateCcw, Zap, Play, HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

type View = 'list' | 'detail' | 'taking' | 'result';

export default function QuizPage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('list');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{ result: QuizResult; xpGained: number; leveledUp: boolean } | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [timeLeft, setTimeLeft] = useState(0);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      if (user?.role === 'super_admin' || user?.role === 'admin_kabupaten') {
        setQuizzes(await getAllQuizzes());
      } else {
        setQuizzes(await getActiveQuizzes());
      }
    } catch { toast.error('Gagal memuat kuis'); }
    setLoading(false);
  }, [user?.role]);

  useEffect(() => { loadQuizzes(); }, [loadQuizzes]);

  async function loadResults() {
    if (!user) return;
    try { setResults(await getQuizResults(user.uid)); } catch { /* */ }
  }

  async function handleSelectQuiz(quiz: Quiz) {
    if (!user) return;
    setSelectedQuiz(quiz);
    const count = await getQuizAttemptCount(user.uid, quiz.quizId);
    setAttemptCount(count);
    setView('detail');
  }

 function handleStartQuiz() {
 if (!selectedQuiz) return;
 if (selectedQuiz.attemptsAllowed > 0 && attemptCount >= selectedQuiz.attemptsAllowed) {
   toast.error('Batas percobaan habis');
   return;
 }
 setCurrentQuestion(0);
 setAnswers(new Array(selectedQuiz.questions.length).fill(-1));
 setSelectedAnswer(null);
 setShowExplanation(false);
 setTimeLeft(selectedQuiz.timeLimitSeconds);
 setView('taking');
 }

 useEffect(() => {
 if (view !== 'taking' || timeLeft <= 0) return;
 timerRef.current = setInterval(() => {
   setTimeLeft(prev => {
     if (prev <= 1) {
       clearInterval(timerRef.current);
       handleSubmitQuiz();
       return 0;
     }
     return prev - 1;
   });
 }, 1000);
 return () => clearInterval(timerRef.current);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [view, currentQuestion]);

 function handleSelectAnswer(optionIdx: number) {
 setSelectedAnswer(optionIdx);
 setAnswers(prev => {
   const copy = [...prev];
   copy[currentQuestion] = optionIdx;
   return copy;
 });
 setShowExplanation(true);
 }

 async function handleSubmitQuiz() {
 if (!selectedQuiz || !user) return;
 clearInterval(timerRef.current);
 setSubmitting(true);
 try {
   const res = await submitQuizResult(selectedQuiz, user.uid, answers, Date.now() - timeLeft * 1000);
   setQuizResult(res);
   setView('result');
   if (res.leveledUp) {
     toast.success(`Level Up! Sekarang Level ${getLevelFromXP((user.xp || 0) + res.xpGained)}`);
   }
 } catch (err) {
   toast.error(err instanceof Error ? err.message : 'Gagal mengirim kuis');
 }
 setSubmitting(false);
 }

 function formatTime(seconds: number): string {
 const m = Math.floor(seconds / 60);
 const s = seconds % 60;
 return `${m}:${s.toString().padStart(2, '0')}`;
 }

 function getStatusInfo(quiz: Quiz) {
 if (!user) return { label: 'Mulai', color: 'btn-primary' };
 const bestResult = results
   .filter(r => r.quizId === quiz.quizId)
   .sort((a, b) => b.percentage - a.percentage)[0];
 if (bestResult?.passed) return { label: 'Lulus ✓', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' };
 if (bestResult) return { label: `${bestResult.percentage}%`, color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' };
 return { label: 'Mulai', color: 'btn-primary' };
 }

 // ---- LIST VIEW ----
 if (view === 'list') {
 return (
   <div className="max-w-2xl mx-auto space-y-4 pb-20 lg:pb-6">
     <div className="flex items-center justify-between">
       <div>
         <h2 className="text-xl font-bold text-primary">Pelatihan & Kuis</h2>
         <p className="text-sm text-muted-foreground">Uji pengetahuanmu dan dapatkan XP</p>
       </div>
       <button onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadResults(); }} className="btn-outline text-xs h-9 px-3">
         {showHistory ? 'Kuis' : 'Riwayat'}
       </button>
     </div>

     {showHistory ? (
       results.length === 0 ? (
         <div className="card p-8 text-center">
           <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
           <p className="text-sm text-muted-foreground">Belum ada riwayat kuis</p>
         </div>
       ) : (
         <div className="space-y-2">
           {results.map(r => {
             const quiz = quizzes.find(q => q.quizId === r.quizId);
             return (
               <div key={r.resultId} className="card p-3 flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                   r.passed ? 'bg-emerald-500/10' : 'bg-red-500/10'
                 }`}>
                   {r.passed
                     ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                     : <XCircle className="w-5 h-5 text-red-500" />}
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium text-primary truncate">{quiz?.title || 'Kuis'}</p>
                   <p className="text-xs text-muted-foreground">
                     {r.score}/{r.maxScore} ({r.percentage}%) · +{r.xpEarned} XP
                   </p>
                 </div>
                 <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                   r.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                 }`}>
                   {r.passed ? 'Lulus' : 'Belum'}
                 </span>
               </div>
             );
           })}
         </div>
       )
     ) : loading ? (
       <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
     ) : quizzes.length === 0 ? (
       <div className="card p-8 text-center">
         <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
         <h3 className="text-base font-semibold text-primary">Belum ada kuis</h3>
         <p className="text-sm text-muted-foreground mt-1">Kuis akan tersedia setelah dibuat oleh admin</p>
       </div>
     ) : (
       <div className="space-y-3">
         {quizzes.map(quiz => {
           const status = getStatusInfo(quiz);
           const bestResult = results.filter(r => r.quizId === quiz.quizId).sort((a, b) => b.percentage - a.percentage)[0];
           return (
             <button key={quiz.quizId} onClick={() => handleSelectQuiz(quiz)} className="card p-4 w-full text-left flex items-center gap-4 hover:border-accent/50 transition-colors">
               <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                 <BookOpen className="w-6 h-6 text-accent" />
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-semibold text-primary">{quiz.title}</p>
                 <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{quiz.description}</p>
                 <div className="flex items-center gap-3 mt-1.5">
                   <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                     <BookOpen className="w-3 h-3" />{getQuizCategoryLabel(quiz.category)}
                   </span>
                   <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                     <HelpCircle className="w-3 h-3" />{quiz.questions.length} soal
                   </span>
                   <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                     <Zap className="w-3 h-3" />+{quiz.xpReward} XP
                   </span>
                   {quiz.timeLimitSeconds > 0 && (
                     <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                       <Clock className="w-3 h-3" />{formatTime(quiz.timeLimitSeconds)}
                     </span>
                   )}
                   {bestResult && (
                     <span className="text-[10px] text-muted-foreground">Terbaik: {bestResult.percentage}%</span>
                   )}
                 </div>
               </div>
               <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
             </button>
           );
         })}
       </div>
     )}
   </div>
 );
 }

 // ---- DETAIL VIEW ----
 if (view === 'detail' && selectedQuiz) {
 const canRetry = selectedQuiz.attemptsAllowed === 0 || attemptCount < selectedQuiz.attemptsAllowed;
 const bestResult = results.filter(r => r.quizId === selectedQuiz.quizId).sort((a, b) => b.percentage - a.percentage)[0];
 return (
   <div className="max-w-2xl mx-auto space-y-4 pb-20 lg:pb-6">
     <button onClick={() => setView('list')} className="text-sm text-accent hover:underline">← Kembali ke daftar</button>
     <div className="card p-5 space-y-4">
       <div className="flex items-start gap-4">
         <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
           <BookOpen className="w-7 h-7 text-accent" />
         </div>
         <div className="flex-1">
           <h3 className="text-lg font-bold text-primary">{selectedQuiz.title}</h3>
           <p className="text-sm text-muted-foreground mt-1">{selectedQuiz.description}</p>
         </div>
       </div>
       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
         <div className="bg-muted/50 rounded-lg p-3 text-center">
           <p className="text-lg font-bold text-primary">{selectedQuiz.questions.length}</p>
           <p className="text-[10px] text-muted-foreground">Soal</p>
         </div>
         <div className="bg-muted/50 rounded-lg p-3 text-center">
           <p className="text-lg font-bold text-primary">{selectedQuiz.passingScore}%</p>
           <p className="text-[10px] text-muted-foreground">Nilai Min.</p>
         </div>
         <div className="bg-muted/50 rounded-lg p-3 text-center">
           <p className="text-lg font-bold text-accent">+{selectedQuiz.xpReward}</p>
           <p className="text-[10px] text-muted-foreground">XP</p>
         </div>
         <div className="bg-muted/50 rounded-lg p-3 text-center">
           <p className="text-lg font-bold text-primary">{attemptCount}</p>
           <p className="text-[10px] text-muted-foreground">Percobaan</p>
         </div>
       </div>
       <div className="flex items-center gap-3 text-xs text-muted-foreground">
         <span className="bg-muted px-2 py-0.5 rounded-md">{getQuizCategoryLabel(selectedQuiz.category)}</span>
         {selectedQuiz.timeLimitSeconds > 0 && (
           <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime(selectedQuiz.timeLimitSeconds)}</span>
         )}
         {selectedQuiz.attemptsAllowed > 0 && (
           <span>Maks. {selectedQuiz.attemptsAllowed}x percobaan</span>
         )}
       </div>
       {bestResult && (
         <div className={`rounded-lg p-3 text-sm ${bestResult.passed ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'}`}>
           Hasil terbaik: {bestResult.score}/{bestResult.maxScore} ({bestResult.percentage}%)
           {bestResult.passed ? ' — Lulus!' : ' — Belum lulus'}
         </div>
       )}
       <button
         onClick={handleStartQuiz}
         disabled={!canRetry || submitting}
         className="btn-primary w-full flex items-center justify-center gap-2"
       >
         <Play className="w-4 h-4" />
         {canRetry ? (attemptCount > 0 ? 'Coba Lagi' : 'Mulai Kuis') : 'Percobaan Habis'}
       </button>
     </div>
   </div>
 );
 }

 // ---- TAKING QUIZ VIEW ----
 if (view === 'taking' && selectedQuiz) {
 const q = selectedQuiz.questions[currentQuestion];
 const progress = ((currentQuestion + 1) / selectedQuiz.questions.length) * 100;
 return (
   <div className="max-w-2xl mx-auto space-y-4 pb-20 lg:pb-6">
     {/* Header */}
     <div className="flex items-center justify-between">
       <p className="text-sm font-medium text-primary">{selectedQuiz.title}</p>
       <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-mono font-bold ${
         timeLeft <= 30 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-muted text-primary'
       }`}>
         <Clock className="w-4 h-4" />{formatTime(timeLeft)}
       </div>
     </div>

     {/* Progress */}
     <div className="space-y-1">
       <div className="flex justify-between text-xs text-muted-foreground">
         <span>Soal {currentQuestion + 1} dari {selectedQuiz.questions.length}</span>
         <span>{Math.round(progress)}%</span>
       </div>
       <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
         <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
       </div>
     </div>

     {/* Question */}
     <div className="card p-5 space-y-4">
       <p className="text-base font-semibold text-primary leading-relaxed">{q.question}</p>
       <div className="space-y-2.5">
         {q.options.map((opt, idx) => {
           const isSelected = selectedAnswer === idx;
           const isCorrect = idx === q.correctAnswer;
           let borderColor = 'border-border';
           let bgColor = '';
           if (showExplanation) {
             if (isCorrect) { borderColor = 'border-emerald-500'; bgColor = 'bg-emerald-50 dark:bg-emerald-900/20'; }
             else if (isSelected && !isCorrect) { borderColor = 'border-red-500'; bgColor = 'bg-red-50 dark:bg-red-900/20'; }
           } else if (isSelected) {
             borderColor = 'border-accent'; bgColor = 'bg-accent/5';
           }
           return (
             <button
               key={idx}
               onClick={() => !showExplanation && handleSelectAnswer(idx)}
               disabled={showExplanation}
               className={`w-full text-left p-3.5 rounded-xl border-2 ${borderColor} ${bgColor} transition-all flex items-center gap-3 ${!showExplanation ? 'hover:border-accent/50 active:scale-[0.99]' : ''}`}
             >
               <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                 showExplanation && isCorrect ? 'bg-emerald-500 text-white' :
                 showExplanation && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                 isSelected ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'
               }`}>
                 {String.fromCharCode(65 + idx)}
               </span>
               <span className="text-sm text-primary flex-1">{opt}</span>
               {showExplanation && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
               {showExplanation && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
             </button>
           );
         })}
       </div>

       {showExplanation && q.explanation && (
         <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-sm text-blue-800 dark:text-blue-200">
           <p className="font-medium mb-0.5">Penjelasan:</p>
           <p>{q.explanation}</p>
         </div>
       )}
     </div>

     {/* Navigation */}
     <div className="flex gap-3">
       {currentQuestion > 0 && (
         <button
           onClick={() => { setCurrentQuestion(prev => prev - 1); setSelectedAnswer(answers[currentQuestion - 1]); setShowExplanation(false); }}
           className="btn-outline flex-1"
         >← Sebelumnya</button>
       )}
       {currentQuestion < selectedQuiz.questions.length - 1 ? (
         <button
           onClick={() => { setCurrentQuestion(prev => prev + 1); setSelectedAnswer(answers[currentQuestion + 1]); setShowExplanation(false); }}
           disabled={selectedAnswer === null}
           className="btn-primary flex-1"
         >Selanjutnya →</button>
       ) : (
         <button
           onClick={handleSubmitQuiz}
           disabled={submitting || answers.includes(-1)}
           className="btn-primary flex-1 flex items-center justify-center gap-2"
         >
           {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
           {submitting ? 'Mengirim...' : 'Selesai & Lihat Hasil'}
         </button>
       )}
     </div>
   </div>
 );
 }

 // ---- RESULT VIEW ----
 if (view === 'result' && quizResult) {
 const { result, xpGained, leveledUp } = quizResult;
 return (
   <div className="max-w-2xl mx-auto space-y-4 pb-20 lg:pb-6">
     <div className={`card p-6 text-center space-y-4 ${
       result.passed ? 'border-emerald-200' : 'border-red-200'
     }`}>
       <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
         result.passed ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
       }`}>
         {result.passed
           ? <Trophy className="w-10 h-10 text-emerald-600" />
           : <RotateCcw className="w-10 h-10 text-red-500" />}
       </div>
       <h3 className="text-xl font-bold text-primary">
         {result.passed ? 'Selamat! Kuis Berhasil!' : 'Belum Berhasil'}
       </h3>
       <div className="grid grid-cols-3 gap-4">
         <div className="bg-muted/50 rounded-xl p-3">
           <p className="text-2xl font-bold text-primary">{result.score}/{result.maxScore}</p>
           <p className="text-[10px] text-muted-foreground">Skor</p>
         </div>
         <div className="bg-muted/50 rounded-xl p-3">
           <p className="text-2xl font-bold text-primary">{result.percentage}%</p>
           <p className="text-[10px] text-muted-foreground">Persentase</p>
         </div>
         <div className="bg-accent/10 rounded-xl p-3">
           <p className="text-2xl font-bold text-accent">+{xpGained}</p>
           <p className="text-[10px] text-muted-foreground">XP</p>
         </div>
       </div>
       {leveledUp && (
         <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center justify-center gap-2">
           <Star className="w-5 h-5 text-amber-500" />
           <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Level Up!</span>
         </div>
       )}
       {!result.passed && (
         <p className="text-sm text-muted-foreground">
           Nilai minimum kelulusan: {selectedQuiz?.passingScore}%. Coba lagi!
         </p>
       )}
     </div>

     {/* Answer Review */}
     {selectedQuiz && (
       <div className="card p-5 space-y-3">
         <h4 className="text-sm font-semibold text-primary">Review Jawaban</h4>
         {selectedQuiz.questions.map((q, idx) => {
           const userAnswer = result.answers[idx];
           const isCorrect = userAnswer === q.correctAnswer;
           return (
             <div key={idx} className="flex items-start gap-3 p-2 rounded-lg">
               <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                 isCorrect ? 'bg-emerald-500/10' : 'bg-red-500/10'
               }`}>
                 {isCorrect
                   ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                   : <XCircle className="w-4 h-4 text-red-500" />}
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-xs text-primary">{q.question}</p>
                 {!isCorrect && userAnswer >= 0 && (
                   <p className="text-[10px] text-red-500 mt-0.5">Jawaban Anda: {q.options[userAnswer]}</p>
                 )}
                 <p className="text-[10px] text-emerald-600 mt-0.5">Jawaban benar: {q.options[q.correctAnswer]}</p>
               </div>
             </div>
           );
         })}
       </div>
     )}

     <div className="flex gap-3">
       <button onClick={() => { setView('list'); loadQuizzes(); loadResults(); }} className="btn-outline flex-1">Kembali</button>
       {selectedQuiz && (selectedQuiz.attemptsAllowed === 0 || attemptCount + 1 < selectedQuiz.attemptsAllowed) && !result.passed && (
         <button onClick={handleStartQuiz} className="btn-primary flex-1">Coba Lagi</button>
       )}
     </div>
   </div>
 );
 }

 return null;
}


