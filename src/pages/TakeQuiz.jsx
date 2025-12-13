import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Flag, X, Loader2, Eye, EyeOff } from 'lucide-react';
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

  const questions = quiz?.questions || [];
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

  const handleSubmit = async () => {
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
      handleSubmit();
    }
  };

  const calculateScore = () => {
    let correct = 0;
    
    questions.forEach((q, idx) => {
      const answer = answers[idx];

      if (q.type === 'multiple_choice') {
        if (answer === q.correctAnswer) correct++;
      } else if (q.type === 'reading_comprehension') {
        const compQuestions = q.comprehensionQuestions || [];
        compQuestions.forEach(cq => {
          if (answer?.[cq.id] === cq.correctAnswer) correct++;
        });
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
      if (q.type === 'multiple_choice') total++;
      else if (q.type === 'reading_comprehension') total += (q.comprehensionQuestions?.length || 0);
      else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') total += (q.dropZones?.length || 0);
      else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') total += (q.blanks?.length || 0);
      else if (q.type === 'matching_list_dual') total += (q.matchingQuestions?.length || 0);
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
      case 'reading_comprehension':
        return (
          <ReadingComprehensionQuestion
            {...commonProps}
            selectedAnswers={answers[currentIndex] || {}}
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
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">
            Question {currentIndex + 1} of {totalQuestions}
          </h2>
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
              onClick={handleSubmit}
              className="bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-6 text-base font-semibold"
              disabled={submitted}
            >
              Submit
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}