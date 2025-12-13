import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Flag, X, Loader2, Eye, EyeOff, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [questionTimes, setQuestionTimes] = useState({});
  const [aiExplanations, setAiExplanations] = useState({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const isReviewMode = urlParams.get('review') === 'true';

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

  const { data: userAttempts = [] } = useQuery({
    queryKey: ['quizAttempts', quizId, user?.email],
    queryFn: () => base44.entities.QuizAttempt.filter({ quiz_id: quizId, user_email: user?.email }),
    enabled: !!quizId && !!user?.email
  });

  // Skip pre-start screen if in review mode
  React.useEffect(() => {
    if (isReviewMode && userAttempts.length > 0) {
      setQuizStarted(true);
      setSubmitted(true);
      setReviewMode(true);
    }
  }, [isReviewMode, userAttempts]);

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
    // Track time spent on current question
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    setQuestionTimes(prev => ({
      ...prev,
      [currentIndex]: (prev[currentIndex] || 0) + timeSpent
    }));
    
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePrev = () => {
    // Track time spent on current question
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    setQuestionTimes(prev => ({
      ...prev,
      [currentIndex]: (prev[currentIndex] || 0) + timeSpent
    }));
    
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handleSubmitClick = () => {
    setConfirmSubmitOpen(true);
  };

  const handleStartQuiz = async () => {
    setQuizStarted(true);
    
    // Create attempt record when quiz starts
    try {
      await base44.entities.QuizAttempt.create({
        user_email: user.email,
        quiz_id: quizId,
        course_id: urlParams.get('courseId'),
        score: 0,
        total: getTotalPoints(),
        percentage: 0,
        time_taken: 0
      });
    } catch (e) {
      console.error('Failed to create attempt:', e);
    }
  };

  const handleConfirmSubmit = async () => {
    // Track time for last question
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    const finalQuestionTimes = {
      ...questionTimes,
      [currentIndex]: (questionTimes[currentIndex] || 0) + timeSpent
    };
    setQuestionTimes(finalQuestionTimes);
    
    setConfirmSubmitOpen(false);
    setSubmitted(true);
    setShowResults(true);

    // Update the most recent attempt with final score
    try {
      const score = calculateScore();
      const total = getTotalPoints();
      const percentage = Math.round((score / total) * 100);

      // Get the most recent attempt
      const recentAttempt = userAttempts[userAttempts.length - 1];
      if (recentAttempt) {
        await base44.entities.QuizAttempt.update(recentAttempt.id, {
          score,
          total,
          percentage,
          time_taken: quiz?.timer_enabled ? (quiz.timer_duration * 60 - timeLeft) : Object.values(finalQuestionTimes).reduce((a, b) => a + b, 0)
        });
      }

      // Generate AI explanations for wrong answers
      generateAIExplanations(finalQuestionTimes);
    } catch (e) {
      console.error('Failed to update attempt:', e);
    }
  };

  const handleExitQuiz = () => {
    setConfirmExitOpen(true);
  };

  const handleConfirmExit = () => {
    handleConfirmSubmit();
  };

  const generateAIExplanations = async (times) => {
    // Set loading state for all incorrect answers
    const loadingExplanations = {};
    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      const answer = answers[idx];
      let isCorrect = false;

      if (q.isSubQuestion) {
        isCorrect = answer === q.subQuestion.correctAnswer;
      } else if (q.type === 'multiple_choice') {
        isCorrect = answer === q.correctAnswer;
      } else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
        isCorrect = (q.dropZones || []).every(zone => answer?.[zone.id] === zone.correctAnswer);
      } else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
        isCorrect = (q.blanks || []).every(blank => answer?.[blank.id] === blank.correctAnswer);
      } else if (q.type === 'matching_list_dual') {
        isCorrect = (q.matchingQuestions || []).every(mq => answer?.[mq.id] === mq.correctAnswer);
      }

      if (!isCorrect) {
        loadingExplanations[idx] = "Explanation loading...";
      }
    }
    setAiExplanations(loadingExplanations);
    
    // Generate explanations
    const explanations = {};
    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      const answer = answers[idx];
      let isCorrect = false;

      if (q.isSubQuestion) {
        isCorrect = answer === q.subQuestion.correctAnswer;
      } else if (q.type === 'multiple_choice') {
        isCorrect = answer === q.correctAnswer;
      } else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
        isCorrect = (q.dropZones || []).every(zone => answer?.[zone.id] === zone.correctAnswer);
      } else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
        isCorrect = (q.blanks || []).every(blank => answer?.[blank.id] === blank.correctAnswer);
      } else if (q.type === 'matching_list_dual') {
        isCorrect = (q.matchingQuestions || []).every(mq => answer?.[mq.id] === mq.correctAnswer);
      }

      if (!isCorrect) {
        try {
          const questionText = q.isSubQuestion ? q.subQuestion.question : q.question;
          let passageContext = '';

          // Include passage text for reading-based questions
          if (q.passage || q.passages?.length > 0) {
            if (q.passages?.length > 0) {
              passageContext = '\n\nReading Passages:\n' + q.passages.map(p => 
                `${p.title}:\n${p.content?.replace(/<[^>]*>/g, '')}`
              ).join('\n\n');
            } else {
              passageContext = '\n\nReading Passage:\n' + q.passage?.replace(/<[^>]*>/g, '');
            }
          }

          const prompt = `You are explaining to a student why their answer is incorrect. Use first person ("Your answer is incorrect because..."). Then explain how to find the correct answer. Keep it concise (3-4 sentences).
          ${passageContext ? 'Quote specific sentences from the passage where applicable to support your explanation.' : ''}

          Question: ${questionText?.replace(/<[^>]*>/g, '')}
          Student's Answer: ${JSON.stringify(answer)}
          Correct Answer: ${q.isSubQuestion ? q.subQuestion.correctAnswer : (q.correctAnswer || 'See correct answers')}${passageContext}

          Provide a helpful first-person explanation:`;

          const genAI = new GoogleGenerativeAI('AIzaSyAF6MLByaemR1D8Zh1Ujz4lBfU_rcmMu98');
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          explanations[idx] = text;
          // Update immediately for this question
          setAiExplanations(prev => ({...prev, [idx]: text}));
        } catch (e) {
          explanations[idx] = "Unable to generate explanation at this time.";
          setAiExplanations(prev => ({...prev, [idx]: "Unable to generate explanation at this time."}));
        }
      }
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
    // Review mode will show all questions at once, no need to change these
    setReviewMode(true);
    setShowResults(false);
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

  // Pre-start screen
  if (!quizStarted && !showResults && !isReviewMode) {
    const attemptsAllowed = quiz.attempts_allowed || 999;
    const attemptsUsed = userAttempts.length;
    const attemptsLeft = attemptsAllowed - attemptsUsed;
    const isAdmin = user?.role === 'admin';
    const canTakeQuiz = isAdmin || attemptsLeft > 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-3">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-slate-600 text-lg">{quiz.description}</p>
            )}
          </div>

          <div className="space-y-4 mb-8">
            {quiz.timer_enabled && quiz.timer_duration && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
                <div>
                  <div className="font-semibold text-slate-800">Time Limit</div>
                  <div className="text-slate-600">{quiz.timer_duration} minutes</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-indigo-600" />
              <div>
                <div className="font-semibold text-slate-800">Total Questions</div>
                <div className="text-slate-600">{totalQuestions} questions</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Flag className="w-6 h-6 text-emerald-600" />
              <div>
                <div className="font-semibold text-slate-800">Attempts</div>
                <div className="text-slate-600">
                  {isAdmin ? (
                    'Unlimited (Admin)'
                  ) : attemptsAllowed >= 999 ? (
                    'Unlimited attempts'
                  ) : (
                    `${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining`
                  )}
                </div>
              </div>
            </div>
          </div>

          {canTakeQuiz ? (
            <Button
              onClick={handleStartQuiz}
              size="lg"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-lg py-6"
            >
              Start Quiz
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <div className="text-center">
              <p className="text-red-600 font-semibold mb-4">No attempts remaining</p>
              <Link to={createPageUrl('Home')}>
                <Button variant="outline">Back to Courses</Button>
              </Link>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to={urlParams.get('courseId') ? createPageUrl(`CourseDetail?id=${urlParams.get('courseId')}`) : createPageUrl('Home')}>
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showResults && submitted && !reviewMode) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 py-12 px-4">
          <QuizResults
            score={calculateScore()}
            total={getTotalPoints()}
            onRetry={handleRetry}
            onReview={handleReview}
            quizTitle={quiz.title}
            courseId={urlParams.get('courseId')}
          />
        </div>
      );
    }

  if (reviewMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">{quiz.title}</h1>
                <p className="text-slate-600 mt-2">Detailed Review</p>
              </div>
              <Button onClick={() => { setReviewMode(false); setShowResults(true); }} variant="outline">
                Back to Results
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="text-sm text-emerald-600 font-medium">Score</div>
                <div className="text-2xl font-bold text-emerald-700">{calculateScore()} / {getTotalPoints()}</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-sm text-blue-600 font-medium">Accuracy</div>
                <div className="text-2xl font-bold text-blue-700">
                  {Math.round((calculateScore() / getTotalPoints()) * 100)}%
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="text-sm text-amber-600 font-medium">Total Time</div>
                <div className="text-2xl font-bold text-amber-700">
                  {Math.floor(Object.values(questionTimes).reduce((a, b) => a + b, 0) / 60)}m {Object.values(questionTimes).reduce((a, b) => a + b, 0) % 60}s
                </div>
              </div>
            </div>
            </div>

            {/* Reading Passages - shown once at top for reading comprehension */}
            {quiz.questions?.[0]?.type === 'reading_comprehension' && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
              <div className="font-semibold text-slate-800 text-lg mb-4">Reading Passage{quiz.questions[0].passages?.length > 1 ? 's' : ''}</div>
              {quiz.questions[0].passages?.length > 0 ? (
                <div className="space-y-4">
                  {quiz.questions[0].passages.map((passage, pIdx) => (
                    <div key={pIdx}>
                      <div className="font-medium text-slate-700 mb-2">{passage.title}</div>
                      <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{
                        __html: passage.content
                      }} />
                    </div>
                  ))}
                </div>
              ) : quiz.questions[0].passage && (
                <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{
                  __html: quiz.questions[0].passage
                }} />
              )}
            </div>
            )}

            <div className="space-y-6">
            {questions.map((q, idx) => {
              const answer = answers[idx];
              let isCorrect = false;
              let correctAnswer = '';

              if (q.isSubQuestion) {
                isCorrect = answer === q.subQuestion.correctAnswer;
                correctAnswer = q.subQuestion.correctAnswer;
              } else if (q.type === 'multiple_choice') {
                isCorrect = answer === q.correctAnswer;
                correctAnswer = q.correctAnswer;
              } else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
                isCorrect = (q.dropZones || []).every(zone => answer?.[zone.id] === zone.correctAnswer);
              } else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
                isCorrect = (q.blanks || []).every(blank => answer?.[blank.id] === blank.correctAnswer);
              } else if (q.type === 'matching_list_dual') {
                isCorrect = (q.matchingQuestions || []).every(mq => answer?.[mq.id] === mq.correctAnswer);
              }

              return (
                <div key={idx} className={cn(
                  "bg-white rounded-2xl shadow-lg border-2 p-6",
                  isCorrect ? "border-emerald-300" : "border-red-300"
                )}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                        isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className={cn(
                          "text-sm font-semibold",
                          isCorrect ? "text-emerald-700" : "text-red-700"
                        )}>
                          {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Time spent: {questionTimes[idx] || 0}s
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="font-semibold text-slate-800 mb-3" dangerouslySetInnerHTML={{
                      __html: q.isSubQuestion ? q.subQuestion.question : q.question
                    }} />

                    {q.type === 'multiple_choice' && (
                      <div className="space-y-2">
                        {q.options?.map((opt, i) => {
                          const isSelected = answer === opt;
                          const isCorrectOption = opt === q.correctAnswer;

                          return (
                            <div key={i} className={cn(
                              "p-3 rounded-lg border-2 flex items-center gap-3",
                              isSelected && isCorrectOption && "bg-emerald-50 border-emerald-400",
                              isSelected && !isCorrectOption && "bg-red-50 border-red-400",
                              !isSelected && isCorrectOption && "bg-emerald-50 border-emerald-300",
                              !isSelected && !isCorrectOption && "border-slate-200"
                            )}>
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                isSelected && "border-slate-600",
                                !isSelected && "border-slate-300"
                              )}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />}
                              </div>
                              <span dangerouslySetInnerHTML={{ __html: opt }} />
                              {isCorrectOption && <CheckCircle2 className="w-5 h-5 text-emerald-600 ml-auto" />}
                              {isSelected && !isCorrectOption && <X className="w-5 h-5 text-red-600 ml-auto" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.isSubQuestion && q.subQuestion?.options && (
                      <div className="space-y-2">
                        {q.subQuestion.options.map((opt, i) => {
                          const isSelected = answer === opt;
                          const isCorrectOption = opt === q.subQuestion.correctAnswer;

                          return (
                            <div key={i} className={cn(
                              "p-3 rounded-lg border-2 flex items-center gap-3",
                              isSelected && isCorrectOption && "bg-emerald-50 border-emerald-400",
                              isSelected && !isCorrectOption && "bg-red-50 border-red-400",
                              !isSelected && isCorrectOption && "bg-emerald-50 border-emerald-300",
                              !isSelected && !isCorrectOption && "border-slate-200"
                            )}>
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                isSelected && "border-slate-600",
                                !isSelected && "border-slate-300"
                              )}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />}
                              </div>
                              <span>{opt}</span>
                              {isCorrectOption && <CheckCircle2 className="w-5 h-5 text-emerald-600 ml-auto" />}
                              {isSelected && !isCorrectOption && <X className="w-5 h-5 text-red-600 ml-auto" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {(q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') && (
                      <div className="space-y-3">
                        <div className="text-sm text-slate-700 leading-relaxed">
                          {(() => {
                            const text = q.textWithBlanks || '';
                            const parts = [];
                            let lastIndex = 0;

                            const blankRegex = /\{\{(blank_\d+)\}\}/g;
                            let match;

                            while ((match = blankRegex.exec(text)) !== null) {
                              if (match.index > lastIndex) {
                                parts.push({
                                  type: 'text',
                                  content: text.substring(lastIndex, match.index)
                                });
                              }

                              const blankId = match[1];
                              const blank = q.blanks?.find(b => b.id === blankId);
                              const userAnswer = answer?.[blankId];
                              const correctAnswer = blank?.correctAnswer;
                              const isCorrectBlank = userAnswer === correctAnswer;

                              parts.push({
                                type: 'blank',
                                blankId,
                                blank,
                                userAnswer,
                                correctAnswer,
                                isCorrect: isCorrectBlank
                              });

                              lastIndex = match.index + match[0].length;
                            }

                            if (lastIndex < text.length) {
                              parts.push({
                                type: 'text',
                                content: text.substring(lastIndex)
                              });
                            }

                            return (
                              <div className="inline">
                                {parts.map((part, i) => {
                                  if (part.type === 'text') {
                                    return <span key={i} dangerouslySetInnerHTML={{ __html: part.content }} />;
                                  } else {
                                    return (
                                      <span key={i} className="inline-flex items-center gap-2 mx-1">
                                        <span className={cn(
                                          "px-3 py-1 rounded border-2 font-medium",
                                          part.isCorrect ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-red-50 border-red-300 text-red-700"
                                        )}>
                                          {part.userAnswer || '(not answered)'}
                                        </span>
                                        {part.isCorrect ? (
                                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        ) : (
                                          <>
                                            <X className="w-5 h-5 text-red-600" />
                                            <span className="text-emerald-700 font-medium">→ {part.correctAnswer}</span>
                                          </>
                                        )}
                                      </span>
                                    );
                                  }
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {(q.type === 'drag_drop_dual') && (
                      <div className="space-y-4">
                        {/* Left Pane - Passage */}
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="font-semibold text-slate-700 mb-2">Reading Passage</div>
                          {q.passages?.length > 0 ? (
                            <div className="space-y-3">
                              {q.passages.map((passage, pIdx) => (
                                <div key={pIdx}>
                                  <div className="font-medium text-slate-600 text-sm mb-1">{passage.title}</div>
                                  <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{
                                    __html: passage.content
                                  }} />
                                </div>
                              ))}
                            </div>
                          ) : q.passage && (
                            <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{
                              __html: q.passage
                            }} />
                          )}
                        </div>

                        {/* Right Pane - Drop Zones Table */}
                        <div>
                          <div className="font-semibold text-slate-700 mb-2">Your Answers</div>
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold text-slate-700">Drop Zone</th>
                                <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold text-slate-700">Selected Answer</th>
                              </tr>
                            </thead>
                            <tbody>
                              {q.dropZones?.map((zone, zIdx) => {
                                const userAnswer = answer?.[zone.id];
                                const isCorrectZone = userAnswer === zone.correctAnswer;
                                return (
                                  <tr key={zIdx} className={cn(
                                    isCorrectZone ? "bg-emerald-50" : "bg-red-50"
                                  )}>
                                    <td className="border border-slate-300 px-4 py-2 text-sm text-slate-700">{zone.label}</td>
                                    <td className="border border-slate-300 px-4 py-2 text-sm">
                                      <div className="flex items-center gap-2">
                                        <span className={cn(
                                          "font-medium",
                                          isCorrectZone ? "text-emerald-700" : "text-red-700"
                                        )}>
                                          {userAnswer || '(not answered)'}
                                        </span>
                                        {isCorrectZone ? (
                                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        ) : (
                                          <>
                                            <X className="w-5 h-5 text-red-600" />
                                            <span className="text-emerald-700 font-medium">→ {zone.correctAnswer}</span>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {q.type === 'matching_list_dual' && (
                      <div className="space-y-4">
                        {/* Left Pane - Passages */}
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="font-semibold text-slate-700 mb-2">Reading Passage{q.passages?.length > 1 ? 's' : ''}</div>
                          {q.passages?.length > 0 ? (
                            <div className="space-y-3">
                              {q.passages.map((passage, pIdx) => (
                                <div key={pIdx}>
                                  <div className="font-medium text-slate-600 text-sm mb-1">{passage.title}</div>
                                  <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{
                                    __html: passage.content
                                  }} />
                                </div>
                              ))}
                            </div>
                          ) : q.passage && (
                            <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{
                              __html: q.passage
                            }} />
                          )}
                        </div>

                        {/* Right Pane - Matching Questions Table */}
                        <div>
                          <div className="font-semibold text-slate-700 mb-2">Your Answers</div>
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold text-slate-700">Question</th>
                                <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold text-slate-700">Selected Answer</th>
                              </tr>
                            </thead>
                            <tbody>
                              {q.matchingQuestions?.map((mq, mqIdx) => {
                                const userAnswer = answer?.[mq.id];
                                const isCorrectMatch = userAnswer === mq.correctAnswer;
                                return (
                                  <tr key={mqIdx} className={cn(
                                    isCorrectMatch ? "bg-emerald-50" : "bg-red-50"
                                  )}>
                                    <td className="border border-slate-300 px-4 py-2 text-sm text-slate-700" dangerouslySetInnerHTML={{
                                      __html: mq.question
                                    }} />
                                    <td className="border border-slate-300 px-4 py-2 text-sm">
                                      <div className="flex items-center gap-2">
                                        <span className={cn(
                                          "font-medium",
                                          isCorrectMatch ? "text-emerald-700" : "text-red-700"
                                        )}>
                                          {userAnswer || '(not answered)'}
                                        </span>
                                        {isCorrectMatch ? (
                                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        ) : (
                                          <>
                                            <X className="w-5 h-5 text-red-600" />
                                            <span className="text-emerald-700 font-medium">→ {mq.correctAnswer}</span>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    </div>

                  {!isCorrect && aiExplanations[idx] && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-blue-900 mb-1">AI Explanation</div>
                          <div className="text-sm text-blue-800 leading-relaxed">{aiExplanations[idx]}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {(q.explanation || q.subQuestion?.explanation) && (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="font-semibold text-slate-700 mb-1">Explanation</div>
                      <div className="text-sm text-slate-600" dangerouslySetInnerHTML={{
                        __html: q.explanation || q.subQuestion?.explanation
                      }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <Button onClick={() => { setReviewMode(false); setShowResults(true); }} size="lg">
              Back to Results
            </Button>
          </div>
        </div>
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
          <button
            onClick={handleExitQuiz}
            className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

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

          {/* Exit Confirmation Dialog */}
          <Dialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
          <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Leave Quiz?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-base font-medium text-slate-800">
              Are you sure you want to leave this quiz?
            </p>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                ⚠️ <strong>Warning:</strong> You cannot come back to this quiz. Quitting now will abandon and submit your quiz early with your current answers.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmExitOpen(false)}
              className="px-6"
            >
              Continue Quiz
            </Button>
            <Button
              onClick={handleConfirmExit}
              className="bg-red-600 hover:bg-red-700 px-6"
            >
              Exit & Submit
            </Button>
          </div>
          </DialogContent>
          </Dialog>
          </div>
          );
          }