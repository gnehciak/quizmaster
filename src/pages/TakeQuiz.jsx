import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const [loadingExplanations, setLoadingExplanations] = useState({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState(null);
  const [aiHelperOpen, setAiHelperOpen] = useState(false);
  const [aiHelperStage, setAiHelperStage] = useState(1);
  const [aiHelperContent, setAiHelperContent] = useState('');
  const [aiHelperLoading, setAiHelperLoading] = useState(false);
  const [stageUnlockTime, setStageUnlockTime] = useState(null);
  const [secondsUntilUnlock, setSecondsUntilUnlock] = useState(0);
  const [highlightedText, setHighlightedText] = useState('');
  const [highlightedTexts, setHighlightedTexts] = useState({});
  const [aiHelperCache, setAiHelperCache] = useState({});
  const isReviewMode = urlParams.get('review') === 'true';
  const queryClient = useQueryClient();

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

  // Redirect to review page if in review mode
  React.useEffect(() => {
    if (isReviewMode && userAttempts.length > 0) {
      const sortedAttempts = [...userAttempts].sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
      const latestAttempt = sortedAttempts[0];
      
      if (latestAttempt) {
        window.location.href = createPageUrl(`ReviewAnswers?id=${quizId}&courseId=${urlParams.get('courseId')}&attemptId=${latestAttempt.id}`);
      }
    }
  }, [isReviewMode, userAttempts, quizId]);

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

    // Save current AI helper state to cache
    if (aiHelperContent) {
      setAiHelperCache(prev => ({
        ...prev,
        [currentIndex]: {
          stage: aiHelperStage,
          content: aiHelperContent,
          highlightedText,
          highlightedTexts
        }
      }));
    }

    // Reset AI helper when navigating
    setAiHelperOpen(false);
    setStageUnlockTime(null);

    if (currentIndex < totalQuestions - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setQuestionStartTime(Date.now());

      // Restore cached AI helper state for next question
      const cached = aiHelperCache[nextIndex];
      if (cached) {
        setAiHelperStage(cached.stage);
        setAiHelperContent(cached.content);
        setHighlightedText(cached.highlightedText || '');
        setHighlightedTexts(cached.highlightedTexts || {});
      } else {
        setAiHelperStage(1);
        setAiHelperContent('');
        setHighlightedText('');
        setHighlightedTexts({});
      }
    }
  };

  const handlePrev = () => {
    // Track time spent on current question
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    setQuestionTimes(prev => ({
      ...prev,
      [currentIndex]: (prev[currentIndex] || 0) + timeSpent
    }));

    // Save current AI helper state to cache
    if (aiHelperContent) {
      setAiHelperCache(prev => ({
        ...prev,
        [currentIndex]: {
          stage: aiHelperStage,
          content: aiHelperContent,
          highlightedText,
          highlightedTexts
        }
      }));
    }

    // Reset AI helper when navigating
    setAiHelperOpen(false);
    setStageUnlockTime(null);

    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setQuestionStartTime(Date.now());

      // Restore cached AI helper state for previous question
      const cached = aiHelperCache[prevIndex];
      if (cached) {
        setAiHelperStage(cached.stage);
        setAiHelperContent(cached.content);
        setHighlightedText(cached.highlightedText || '');
        setHighlightedTexts(cached.highlightedTexts || {});
      } else {
        setAiHelperStage(1);
        setAiHelperContent('');
        setHighlightedText('');
        setHighlightedTexts({});
      }
    }
  };

  const handleSubmitClick = () => {
    setConfirmSubmitOpen(true);
  };

  const handleStartQuiz = async () => {
    setQuizStarted(true);
    
    // Create attempt record when quiz starts
    try {
      const newAttempt = await base44.entities.QuizAttempt.create({
        user_email: user.email,
        quiz_id: quizId,
        course_id: urlParams.get('courseId'),
        score: 0,
        total: getTotalPoints(),
        percentage: 0,
        time_taken: 0
      });
      setCurrentAttemptId(newAttempt.id);
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

    // Update the current attempt with final score
    try {
      const score = calculateScore();
      const total = getTotalPoints();
      const percentage = Math.round((score / total) * 100);

      if (currentAttemptId) {
        await base44.entities.QuizAttempt.update(currentAttemptId, {
          score,
          total,
          percentage,
          answers,
          time_taken: quiz?.timer_enabled ? (quiz.timer_duration * 60 - timeLeft) : Object.values(finalQuestionTimes).reduce((a, b) => a + b, 0)
        });

        // Invalidate queries to refresh data across all pages
        queryClient.invalidateQueries({ queryKey: ['quizAttempts'] });
        queryClient.invalidateQueries({ queryKey: ['allQuizAttempts'] });
      }

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

  const generateSingleExplanation = async (idx) => {
    const q = questions[idx];
    const answer = answers[idx];
    
    setLoadingExplanations(prev => ({ ...prev, [idx]: true }));
    
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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setAiExplanations(prev => ({...prev, [idx]: text}));
    } catch (e) {
      setAiExplanations(prev => ({...prev, [idx]: "Unable to generate explanation at this time."}));
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [idx]: false }));
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
    // Navigate to dedicated review page
    window.location.href = createPageUrl(`ReviewAnswers?id=${quizId}&courseId=${urlParams.get('courseId')}&attemptId=${currentAttemptId}`);
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

  // Stage unlock timer
  useEffect(() => {
    if (!stageUnlockTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((stageUnlockTime - now) / 1000));
      setSecondsUntilUnlock(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        setStageUnlockTime(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [stageUnlockTime]);

  const getAiHelp = async (stage) => {
    setAiHelperLoading(true);

    try {
      const q = currentQuestion;
      let questionText = q.isSubQuestion ? q.subQuestion.question : q.question;
      questionText = questionText?.replace(/<[^>]*>/g, '');

      const hasMultiplePassages = q.passages?.length > 1;
      let passageContext = '';
      if (q.passage || q.passages?.length > 0) {
        if (q.passages?.length > 0) {
          passageContext = '\n\nPassages:\n' + q.passages.map(p => 
            `[${p.id}] ${p.title}:\n${p.content?.replace(/<[^>]*>/g, '')}`
          ).join('\n\n');
        } else {
          passageContext = '\n\nPassage:\n' + q.passage?.replace(/<[^>]*>/g, '');
        }
      }

      // Get options and correct answer
      const options = q.isSubQuestion ? q.subQuestion.options : q.options;
      const correctAnswer = q.isSubQuestion ? q.subQuestion.correctAnswer : q.correctAnswer;
      const optionsContext = options ? '\n\nOptions:\n' + options.map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`).join('\n') : '';
      const answerContext = correctAnswer ? `\n\nCorrect Answer: ${correctAnswer}` : '';

      console.log('=== AI Helper Stage', stage, '===');
      let prompt = '';
      if (stage === 1) {
        prompt = `You are a Year 6 teacher helping a student find evidence.
Tone: Simple, direct.
Rules:
1. Identify the specific paragraph or section (3-5 sentences) that contains the answer.
2. The highlighted text must be an EXACT copy-paste from the passage(s). Do not summarize or alter it.
3. The 'advice' should tell them what to look for within this section.
4. ${hasMultiplePassages ? 'If the answer requires evidence from BOTH passages, provide highlights for both. Use passage IDs like [passage_123].' : ''}
5. Return valid JSON only. Do not use markdown formatting.

Input Data:
Question: ${questionText}
Passage: ${passageContext}
Options: ${optionsContext}

Output Format (JSON):${hasMultiplePassages ? `
{
  "advice": "Teaching guidance about what to scan for in the texts (2-3 sentences).",
  "highlights": [
    {"passageId": "passage_123", "text": "The exact broad section from first passage"},
    {"passageId": "passage_456", "text": "The exact broad section from second passage (if needed)"}
  ]
}` : `
{
  "advice": "Teaching guidance about what to scan for in the text below (2-3 sentences).",
  "highlightText": "The exact broad section text from the passage."
}`}`;
      } else if (stage === 2) {
        prompt = `You are a Year 6 teacher revealing the answer.
Tone: Simple, direct.
Rules:
1. State the correct answer clearly.
2. Identify the SPECIFIC sentence or phrase that proves the answer.
3. The highlighted text must be an EXACT copy-paste of that specific sentence/phrase from the passage(s).
4. The 'advice' must explain the link between the text and the correct option.
5. ${hasMultiplePassages ? 'If evidence is needed from BOTH passages, provide highlights for both. Use passage IDs like [passage_123].' : ''}
6. Return valid JSON only. Do not use markdown formatting.

Input Data:
Question: ${questionText}
Passage: ${passageContext}
Options: ${optionsContext}
Correct Answer: ${answerContext}

Output Format (JSON):${hasMultiplePassages ? `
{
  "advice": "The correct answer is [Option]. Explain simply why these sentences prove the answer (2-3 sentences).",
  "highlights": [
    {"passageId": "passage_123", "text": "The specific sentence from first passage"},
    {"passageId": "passage_456", "text": "The specific sentence from second passage (if needed)"}
  ]
}` : `
{
  "advice": "The correct answer is [Option]. Explain simply why this sentence proves the answer (2-3 sentences).",
  "highlightText": "The specific sentence or phrase from the text."
}`}`;
      }

      console.log('AI Helper Prompt:', prompt);
      
      const genAI = new GoogleGenerativeAI('AIzaSyAF6MLByaemR1D8Zh1Ujz4lBfU_rcmMu98');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('AI Helper Response:', text);

      // Parse JSON for stages 1 and 2 with passages
      if (stage >= 1 && passageContext) {
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setAiHelperContent(parsed.advice || text);
            
            // Helper function to match AI text to original passage using AI
            const matchTextToPassage = async (aiText, originalPassage) => {
              console.log('Using AI to match text to original passage...');

              // Always use AI to match and preserve HTML formatting
              const matchPrompt = `You are matching selected text to an original passage.

            Original Passage (with HTML formatting):
            ${originalPassage}

            Selected Text (without formatting):
            ${aiText}

            Find the exact matching part in the original passage and return it WITH all the original HTML tags and formatting preserved.
            Return ONLY the matched text portion, nothing else. Do not add any explanation.`;

              console.log('AI Match Prompt:', matchPrompt);

              const matchModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
              const matchResult = await matchModel.generateContent(matchPrompt);
              const matchResponse = await matchResult.response;
              const matchedText = matchResponse.text().trim();

              console.log('AI Match Response:', matchedText);

              return matchedText;
            };
            
            // Handle multiple highlights for multiple passages
            if (parsed.highlights && Array.isArray(parsed.highlights)) {
              const highlightMap = {};
              
              for (const h of parsed.highlights) {
                if (h.passageId && h.text) {
                  const passage = q.passages?.find(p => p.id === h.passageId);
                  if (passage) {
                    const matchedText = await matchTextToPassage(h.text, passage.content);
                    highlightMap[h.passageId] = matchedText;
                  } else {
                    highlightMap[h.passageId] = h.text;
                  }
                }
              }
              
              setHighlightedTexts(highlightMap);
              setHighlightedText('');
            } else if (parsed.highlightText) {
              const originalPassage = q.passages?.length > 0 ? q.passages[0].content : q.passage;
              const matchedText = await matchTextToPassage(parsed.highlightText, originalPassage);
              setHighlightedText(matchedText);
              setHighlightedTexts({});
            } else {
              setHighlightedText('');
              setHighlightedTexts({});
            }
          } else {
            setAiHelperContent(text);
            setHighlightedText('');
            setHighlightedTexts({});
          }
        } catch (e) {
          console.error('Error parsing AI response:', e);
          setAiHelperContent(text);
          setHighlightedText('');
          setHighlightedTexts({});
        }
      } else {
        setAiHelperContent(text);
        setHighlightedText('');
        setHighlightedTexts({});
      }
      
      setAiHelperStage(stage);

      // Start 10 second timer if not at stage 2
      if (stage < 2) {
        setStageUnlockTime(Date.now() + 10000);
        setSecondsUntilUnlock(10);
      }
    } catch (e) {
      setAiHelperContent("Unable to generate help at this time. Please try again.");
    } finally {
      setAiHelperLoading(false);
    }
  };

  const handleAiHelperOpen = () => {
    setAiHelperOpen(true);
    // Check if we have cached content for this question
    const cached = aiHelperCache[currentIndex];
    if (cached) {
      setAiHelperStage(cached.stage);
      setAiHelperContent(cached.content);
      setHighlightedText(cached.highlightedText || '');
      setHighlightedTexts(cached.highlightedTexts || {});
    } else if (!aiHelperContent) {
      getAiHelp(1);
    }
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
          highlightedText={highlightedText}
          highlightedTexts={highlightedTexts}
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
              <div 
                className="text-slate-600 text-lg prose prose-slate max-w-none prose-p:my-1"
                dangerouslySetInnerHTML={{ __html: quiz.description }}
              />
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
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Quiz Overview</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {(() => {
                  // Group questions by type
                  const groupedQuestions = {};
                  const typeLabels = {
                    'reading_comprehension': 'Reading Comprehension',
                    'multiple_choice': 'Multiple Choice',
                    'drag_drop_single': 'Drag & Drop',
                    'drag_drop_dual': 'Drag & Drop (Dual Pane)',
                    'inline_dropdown_separate': 'Fill in the Blanks',
                    'inline_dropdown_same': 'Fill in the Blanks',
                    'matching_list_dual': 'Matching List'
                  };

                  questions.forEach((q, idx) => {
                    const type = q.type;
                    if (!groupedQuestions[type]) {
                      groupedQuestions[type] = [];
                    }
                    groupedQuestions[type].push({ question: q, index: idx });
                  });

                  return Object.entries(groupedQuestions).map(([type, items]) => {
                    // Check if this is a reading comp group
                    const isReadingComp = type === 'reading_comprehension';
                    let parentGroups = {};
                    
                    if (isReadingComp) {
                      // Group by parent ID
                      items.forEach(item => {
                        const parentId = item.question.parentId || 'standalone';
                        if (!parentGroups[parentId]) {
                          parentGroups[parentId] = [];
                        }
                        parentGroups[parentId].push(item);
                      });
                    }

                    return (
                      <div key={type} className="space-y-2">
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                          {typeLabels[type]}
                        </h3>
                        
                        {isReadingComp ? (
                          // Show grouped reading comp questions
                          Object.entries(parentGroups).map(([parentId, parentItems]) => (
                            <div key={parentId} className="flex flex-wrap gap-2">
                              {parentItems.map(({ question: q, index: idx }) => {
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
                                      "w-12 h-12 rounded-lg font-semibold text-sm transition-all border-2 relative",
                                      isCurrent && "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300",
                                      !isCurrent && isAnswered && isFlagged && "bg-emerald-500 text-white border-emerald-500",
                                      !isCurrent && isAnswered && !isFlagged && "bg-emerald-500 text-white border-emerald-500",
                                      !isCurrent && !isAnswered && isFlagged && "bg-amber-400 text-white border-amber-400",
                                      !isCurrent && !isAnswered && !isFlagged && "bg-slate-200 text-slate-600 border-slate-300"
                                    )}
                                  >
                                    {idx + 1}
                                    {isFlagged && (
                                      <Flag className="w-3 h-3 absolute -top-1 -right-1 text-amber-500 fill-current" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ))
                        ) : (
                          // Show questions horizontally for other types
                          <div className="flex flex-wrap gap-2">
                            {items.map(({ question: q, index: idx }) => {
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
                                    "w-12 h-12 rounded-lg font-semibold text-sm transition-all border-2 relative",
                                    isCurrent && "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300",
                                    !isCurrent && isAnswered && isFlagged && "bg-emerald-500 text-white border-emerald-500",
                                    !isCurrent && isAnswered && !isFlagged && "bg-emerald-500 text-white border-emerald-500",
                                    !isCurrent && !isAnswered && isFlagged && "bg-amber-400 text-white border-amber-400",
                                    !isCurrent && !isAnswered && !isFlagged && "bg-slate-200 text-slate-600 border-slate-300"
                                  )}
                                >
                                  {idx + 1}
                                  {isFlagged && (
                                    <Flag className="w-3 h-3 absolute -top-1 -right-1 text-amber-500 fill-current" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
                
                <div className="flex items-center gap-4 text-xs text-slate-600 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-indigo-600"></div>
                    <span>Current</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-500"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-amber-400"></div>
                    <span>Flagged</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-slate-200"></div>
                    <span>Not Started</span>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* AI Helper Button - Only for reading comprehension */}
          {!showResults && !submitted && currentQuestion?.type === 'reading_comprehension' && (
            <Button
              onClick={handleAiHelperOpen}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              I need help
            </Button>
          )}
        </div>

        {/* Logo/Brand Space */}
        <div className="w-20"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
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

        {/* AI Helper Popup */}
        <AnimatePresence>
          {aiHelperOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAiHelperOpen(false)}
                className="fixed inset-0 bg-black/20 z-30"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed right-24 top-1/2 -translate-y-1/2 w-96 max-h-[80vh] bg-white rounded-2xl shadow-2xl z-40 flex flex-col border border-slate-200"
              >
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      AI Helper
                    </h3>
                    <button
                      onClick={() => setAiHelperOpen(false)}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-600" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                        aiHelperStage >= 1 ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        {aiHelperStage >= 1 ? <CheckCircle2 className="w-5 h-5" /> : "1"}
                      </div>
                      <span className="text-xs font-medium text-slate-600">Hint</span>
                    </div>
                    <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className={cn(
                        "h-full bg-purple-600 transition-all",
                        aiHelperStage >= 2 ? "w-full" : "w-0"
                      )} />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                        aiHelperStage >= 2 ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        {aiHelperStage >= 2 ? <CheckCircle2 className="w-5 h-5" /> : "2"}
                      </div>
                      <span className="text-xs font-medium text-slate-600">Answer</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {aiHelperLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                    </div>
                  ) : aiHelperContent ? (
                    <div className="space-y-4">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {aiHelperContent}
                        </p>
                      </div>

                      {aiHelperStage < 2 && (
                        <div className="text-center">
                          {stageUnlockTime && secondsUntilUnlock > 0 ? (
                            <div className="text-sm text-slate-500">
                              <Clock className="w-4 h-4 inline-block mr-1" />
                              Next help available in {secondsUntilUnlock}s
                            </div>
                          ) : (
                            <Button
                              onClick={() => getAiHelp(aiHelperStage + 1)}
                              variant="outline"
                              className="gap-2"
                            >
                              <Sparkles className="w-4 h-4" />
                              Reveal Answer
                            </Button>
                          )}
                        </div>
                      )}

                      {aiHelperStage === 2 && (
                        <div className="text-center text-sm text-slate-500">
                          This is the maximum level of help available.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            </>
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