import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Flag, X, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

import MultipleChoiceQuestion from '@/components/quiz/MultipleChoiceQuestion';
import ReadingComprehensionQuestion from '@/components/quiz/ReadingComprehensionQuestion';
import DragDropQuestion from '@/components/quiz/DragDropQuestion';
import DragDropDualQuestion from '@/components/quiz/DragDropDualQuestion';
import InlineDropdownQuestion from '@/components/quiz/InlineDropdownQuestion';
import InlineDropdownSameQuestion from '@/components/quiz/InlineDropdownSameQuestion';
import MatchingListQuestion from '@/components/quiz/MatchingListQuestion';
import QuizResults from '@/components/quiz/QuizResults';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { List } from 'lucide-react';

export default function TakeQuiz() {
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('id');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [timerVisible, setTimerVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (e) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return null;
      }
    },
  });

  const { data: quiz, isLoading } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => base44.entities.Quiz.filter({ id: quizId }),
    enabled: !!quizId,
    select: (data) => data[0]
  });

  // Flatten questions - expand comprehension questions into individual questions
  const flattenedQuestions = React.useMemo(() => {
    if (!quiz?.questions) return [];
    
    const flattened = [];
    quiz.questions.forEach((q) => {
      if (q.type === 'reading_comprehension') {
        // Add each comprehension question as a separate item
        (q.comprehensionQuestions || []).forEach((cq, idx) => {
          flattened.push({
            ...q,
            subQuestionIndex: idx,
            subQuestion: cq,
            isSubQuestion: true,
            parentId: q.id
          });
        });
      } else {
        flattened.push(q);
      }
    });
    
    return flattened;
  }, [quiz?.questions]);

  const questions = flattenedQuestions;
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  // Initialize timer
  useEffect(() => {
    if (quiz?.timer_enabled && quiz?.timer_duration) {
      setTimeLeft(quiz.timer_duration * 60);
    }
  }, [quiz]);

  // Timer countdown
  useEffect(() => {
    if (!quiz?.timer_enabled || submitted || showResults || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quiz?.timer_enabled, submitted, showResults, timeLeft]);

  const handleAnswer = (answer) => {
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: answer
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmitClick = () => {
    setConfirmSubmitOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmSubmitOpen(false);
    setSubmitted(true);
    setShowResults(true);

    // Save quiz attempt
    try {
      const score = calculateScore();
      const total = getTotalPoints();
      const percentage = Math.round((score / total) * 100);

      await base44.entities.QuizAttempt.create({
        user_email: user.email,
        quiz_id: quizId,
        course_id: urlParams.get('courseId'),
        score,
        total,
        percentage,
        time_taken: quiz?.timer_enabled ? (quiz.timer_duration * 60 - timeLeft) : 0
      });
    } catch (e) {
      console.error('Failed to save attempt:', e);
    }
  };

  const handleTimeUp = () => {
    if (!submitted) {
      handleConfirmSubmit();
    }
  };

  const calculateScore = () => {
    let correct = 0;
    
    questions.forEach((q, idx) => {
      const answer = answers[idx];

      if (q.isSubQuestion) {
        // For flattened sub-questions
        if (answer === q.subQuestion.correctAnswer) correct++;
      } else if (q.type === 'multiple_choice') {
        if (answer === q.correctAnswer) correct++;
      } else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
        const zones = q.dropZones || [];
        zones.forEach(zone => {
          if (answer?.[zone.id] === zone.correctAnswer) correct++;
        });
      } else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
        const blanks = q.blanks || [];
        blanks.forEach(blank => {
          if (answer?.[blank.id] === blank.correctAnswer) correct++;
        });
      } else if (q.type === 'matching_list_dual') {
        const matchingQuestions = q.matchingQuestions || [];
        matchingQuestions.forEach(mq => {
          if (answer?.[mq.id] === mq.correctAnswer) correct++;
        });
      }
    });
    
    return correct;
  };

  const getTotalPoints = () => {
    let total = 0;
    questions.forEach(q => {
      if (q.isSubQuestion) {
        total++;
      } else if (q.type === 'multiple_choice') {
        total++;
      } else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
        total += (q.dropZones?.length || 0);
      } else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
        total += (q.blanks?.length || 0);
      } else if (q.type === 'matching_list_dual') {
        total += (q.matchingQuestions?.length || 0);
      }
    });
    return total;
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowResults(false);
    setSubmitted(false);
    setReviewMode(false);
    setFlaggedQuestions(new Set());
    if (quiz?.timer_enabled && quiz?.timer_duration) {
      setTimeLeft(quiz.timer_duration * 60);
    }
  };

  const handleReview = () => {
    setReviewMode(true);
    setShowResults(false);
    setCurrentIndex(0);
  };

  const toggleFlag = () => {
    const newFlags = new Set(flaggedQuestions);
    if (newFlags.has(currentIndex)) {
      newFlags.delete(currentIndex);
    } else {
      newFlags.add(currentIndex);
    }
    setFlaggedQuestions(newFlags);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return {
      hours: String(hrs).padStart(2, '0'),
      minutes: String(mins).padStart(2, '0'),
      seconds: String(secs).padStart(2, '0')
    };
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    // For reading comprehension sub-questions
    if (currentQuestion.isSubQuestion && currentQuestion.type === 'reading_comprehension') {
      return (
        <ReadingComprehensionQuestion
          question={currentQuestion}
          selectedAnswer={answers[currentIndex]}
          onAnswer={handleAnswer}
          showResults={submitted || reviewMode}
          singleQuestion={true}
          subQuestion={currentQuestion.subQuestion}
        />
      );
    }

    const commonProps = {
      question: currentQuestion,
      showResults: submitted || reviewMode,
    };

    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            {...commonProps}
            selectedAnswer={answers[currentIndex]}
            onAnswer={handleAnswer}
          />
        );
      case 'drag_drop_single':
        return (
          <DragDropQuestion
            {...commonProps}
            selectedAnswers={answers[currentIndex] || {}}
            onAnswer={handleAnswer}
          />
        );
      case 'drag_drop_dual':
        return (
          <DragDropDualQuestion
            {...commonProps}
            selectedAnswers={answers[currentIndex] || {}}
            onAnswer={handleAnswer}
          />
        );
      case 'inline_dropdown_separate':
        return (
          <InlineDropdownQuestion
            {...commonProps}
            selectedAnswers={answers[currentIndex] || {}}
            onAnswer={handleAnswer}
          />
        );
      case 'inline_dropdown_same':
        return (
          <InlineDropdownSameQuestion
            {...commonProps}
            selectedAnswers={answers[currentIndex] || {}}
            onAnswer={handleAnswer}
          />
        );
      case 'matching_list_dual':
        return (
          <MatchingListQuestion
            {...commonProps}
            selectedAnswers={answers[currentIndex] || {}}
            onAnswer={handleAnswer}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading || userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Quiz not found</h2>
          <Link to={createPageUrl('ManageQuizzes')}>
            <Button>Back to Quizzes</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (showResults && submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 py-12 px-4">
        <QuizResults
          score={calculateScore()}
          total={getTotalPoints()}
          onRetry={handleRetry}
          onReview={handleReview}
          quizTitle={quiz.title}
        />
      </div>
    );
  }

  const time = formatTime(timeLeft);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4">
          {/* Close Button */}
          <Link to={createPageUrl('ManageQuizzes')}>
            <button className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </Link>

          {/* Timer */}
          {quiz.timer_enabled && quiz.timer_duration && !showResults && timerVisible && (
            <div className="flex items-center gap-3 px-4 py-2 border border-slate-300 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-800 tabular-nums">{time.hours}:{time.minutes}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <span>Hours</span>
                  <span>Mins</span>
                </div>
              </div>
              <button
                onClick={() => setTimerVisible(false)}
                className="px-3 py-1 bg-slate-800 text-white text-sm rounded-full hover:bg-slate-700 transition-colors"
              >
                Hide timer
              </button>
            </div>
          )}

          {quiz.timer_enabled && !timerVisible && !showResults && (
            <button
              onClick={() => setTimerVisible(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800"
            >
              <Eye className="w-4 h-4" />
              Show timer
            </button>
          )}
        </div>

        {/* Question Counter */}
        <div className="text-center flex items-center justify-center gap-3">
          <h2 className="text-xl font-semibold text-slate-800">
            Question {currentIndex + 1} of {totalQuestions}
          </h2>
          <Dialog open={overviewOpen} onOpenChange={setOverviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <List className="w-4 h-4" />
                Overview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Quiz Overview</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 mt-4">
                {questions.map((q, idx) => {
                  const isAnswered = answers[idx] !== undefined;
                  const isFlagged = flaggedQuestions.has(idx);
                  const isCurrent = idx === currentIndex;

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setOverviewOpen(false);
                      }}
                      className={cn(
                        "w-full p-4 rounded-lg border-2 text-left transition-all flex items-center justify-between group",
                        isCurrent && "border-indigo-500 bg-indigo-50",
                        !isCurrent && isAnswered && "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300",
                        !isCurrent && !isAnswered && "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm",
                          isCurrent && "bg-indigo-600 text-white",
                          !isCurrent && isAnswered && "bg-emerald-500 text-white",
                          !isCurrent && !isAnswered && "bg-slate-200 text-slate-600"
                        )}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 text-sm line-clamp-1">
                            {q.isSubQuestion 
                              ? q.subQuestion.question?.replace(/<[^>]*>/g, '').substring(0, 60) + '...'
                              : q.question?.replace(/<[^>]*>/g, '').substring(0, 60) + '...'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {q.type === 'reading_comprehension' && 'Reading Comprehension'}
                            {q.type === 'multiple_choice' && 'Multiple Choice'}
                            {q.type === 'drag_drop_single' && 'Drag & Drop'}
                            {q.type === 'drag_drop_dual' && 'Drag & Drop (Dual Pane)'}
                            {q.type === 'inline_dropdown_separate' && 'Fill in the Blanks'}
                            {q.type === 'inline_dropdown_same' && 'Fill in the Blanks'}
                            {q.type === 'matching_list_dual' && 'Matching List'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isFlagged && (
                          <Flag className="w-5 h-5 text-amber-500 fill-current" />
                        )}
                        {isAnswered && !isCurrent && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Logo/Brand Space */}
        <div className="w-20"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {!showResults && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderQuestion()}
            </motion.div>
          )}
        </AnimatePresence>

        {showResults && submitted && !reviewMode && (
          <div className="h-full overflow-auto py-12 px-4">
            <QuizResults
              score={calculateScore()}
              total={getTotalPoints()}
              onRetry={handleRetry}
              onReview={handleReview}
              quizTitle={quiz.title}
            />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      {(!showResults || reviewMode) && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={cn(
              "px-8 py-6 text-base font-semibold",
              currentIndex === 0 
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-slate-800 text-white hover:bg-slate-700"
            )}
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Back
          </Button>

          {reviewMode ? (
            <Button
              onClick={() => {
                setReviewMode(false);
                setShowResults(true);
              }}
              variant="outline"
              className="px-6 py-3"
            >
              Back to Results
            </Button>
          ) : (
            <button
              onClick={toggleFlag}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all",
                flaggedQuestions.has(currentIndex)
                  ? "bg-amber-50 border-amber-400 text-amber-700"
                  : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
              )}
            >
              <Flag className={cn("w-5 h-5", flaggedQuestions.has(currentIndex) && "fill-current")} />
              <span className="font-medium">Flag</span>
            </button>
          )}

          {currentIndex < totalQuestions - 1 ? (
            <Button
              onClick={handleNext}
              className="bg-slate-800 text-white hover:bg-slate-700 px-8 py-6 text-base font-semibold"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : reviewMode ? (
            <Button
              onClick={() => {
                setReviewMode(false);
                setShowResults(true);
              }}
              className="bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-6 text-base font-semibold"
            >
              Finish Review
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmitClick}
              className="bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-6 text-base font-semibold"
              disabled={submitted}
            >
              Submit
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          )}
          </div>
          )}

          {/* Submit Confirmation Dialog */}
          <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
          <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Confirm Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-base font-medium text-slate-800">
              Are you sure you want to finish the test?
            </p>

            <div className="space-y-2 text-sm text-slate-600">
              <p>• Have you completed all questions?</p>
              <p>• Have you reviewed all your answers?</p>
            </div>

            {quiz?.timer_enabled && quiz?.timer_duration && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">Time Remaining:</span>
                </div>
                <p className="text-2xl font-bold text-amber-900 mt-2">
                  {formatTime(timeLeft).hours}:{formatTime(timeLeft).minutes}:{formatTime(timeLeft).seconds}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmSubmitOpen(false)}
              className="px-6"
            >
              No, Go Back
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 px-6"
            >
              Yes, Submit
            </Button>
          </div>
          </DialogContent>
          </Dialog>
          </div>
          );
          }