import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Send, BookOpen, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import MultipleChoiceQuestion from '@/components/quiz/MultipleChoiceQuestion';
import ReadingComprehensionQuestion from '@/components/quiz/ReadingComprehensionQuestion';
import DragDropQuestion from '@/components/quiz/DragDropQuestion';
import InlineDropdownQuestion from '@/components/quiz/InlineDropdownQuestion';
import QuizProgress from '@/components/quiz/QuizProgress';
import QuizResults from '@/components/quiz/QuizResults';

export default function TakeQuiz() {
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('id');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => base44.entities.Quiz.filter({ id: quizId }),
    enabled: !!quizId,
    select: (data) => data[0]
  });

  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

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

  const handleSubmit = () => {
    setSubmitted(true);
    setShowResults(true);
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
      } else if (q.type === 'drag_drop') {
        const zones = q.dropZones || [];
        zones.forEach(zone => {
          if (answer?.[zone.id] === zone.correctAnswer) correct++;
        });
      } else if (q.type === 'inline_dropdown') {
        const blanks = q.blanks || [];
        blanks.forEach(blank => {
          if (answer?.[blank.id] === blank.correctAnswer) correct++;
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
      else if (q.type === 'drag_drop') total += (q.dropZones?.length || 0);
      else if (q.type === 'inline_dropdown') total += (q.blanks?.length || 0);
    });
    return total;
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowResults(false);
    setSubmitted(false);
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const commonProps = {
      question: currentQuestion,
      showResults: submitted,
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
      case 'drag_drop':
        return (
          <DragDropQuestion
            {...commonProps}
            selectedAnswers={answers[currentIndex] || {}}
            onAnswer={handleAnswer}
          />
        );
      case 'inline_dropdown':
        return (
          <InlineDropdownQuestion
            {...commonProps}
            selectedAnswers={answers[currentIndex] || {}}
            onAnswer={handleAnswer}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Quiz not found</h2>
          <Link to={createPageUrl('Quizzes')}>
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
          quizTitle={quiz.title}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link to={createPageUrl('Quizzes')}>
              <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <h1 className="text-lg font-semibold text-slate-800">{quiz.title}</h1>
            </div>
          </div>
          
          <QuizProgress 
            current={currentIndex} 
            total={totalQuestions}
            answers={answers}
          />
        </div>
      </div>

      {/* Question Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/60 p-6 sm:p-8"
          >
            {renderQuestion()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex gap-3">
            {currentIndex < totalQuestions - 1 ? (
              <Button
                onClick={handleNext}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="w-4 h-4" />
                Submit Quiz
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}