import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Flag, X, Loader2, Eye, EyeOff, CheckCircle2, Clock, Sparkles, RefreshCw, Pencil } from 'lucide-react';
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
  const [aiHelperContent, setAiHelperContent] = useState('');
  const [aiHelperLoading, setAiHelperLoading] = useState(false);
  const [highlightedPassages, setHighlightedPassages] = useState({});
  const [tipsUsed, setTipsUsed] = useState(0);
  const [blankHelperContent, setBlankHelperContent] = useState({});
  const [blankHelperLoading, setBlankHelperLoading] = useState({});
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

    if (currentIndex < totalQuestions - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setQuestionStartTime(Date.now());

      // Reset AI helper state
      setAiHelperContent('');
      setHighlightedPassages({});
      setBlankHelperContent({});
      setBlankHelperLoading({});
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
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setQuestionStartTime(Date.now());

      // Reset AI helper state
      setAiHelperContent('');
      setHighlightedPassages({});
      setBlankHelperContent({});
      setBlankHelperLoading({});
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
        time_taken: 0,
        tips_used: 0
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



  const getAiHelp = async (forceRegenerate = false) => {
    // Check if we already have AI help stored for this question
    if (!forceRegenerate && quiz?.ai_helper_tips?.[currentIndex]) {
      const stored = quiz.ai_helper_tips[currentIndex];
      setAiHelperContent(stored.advice);
      setHighlightedPassages(stored.passages || {});
      return;
    }

    setAiHelperLoading(true);

    try {
      const q = currentQuestion;
      let questionText = q.isSubQuestion ? q.subQuestion.question : q.question;
      questionText = questionText?.replace(/<[^>]*>/g, '');

      const hasMultiplePassages = q.passages?.length > 1;
      let passageContext = '';
      let passagesForPrompt = [];

      if (q.passage || q.passages?.length > 0) {
        if (q.passages?.length > 0) {
          passagesForPrompt = q.passages.map(p => ({
            id: p.id,
            title: p.title,
            content: p.content
          }));
          passageContext = '\n\nPassages:\n' + passagesForPrompt.map(p => 
            `[${p.id}] ${p.title}:\n${p.content}`
          ).join('\n\n');
        } else {
          passagesForPrompt = [{ id: 'main', title: 'Passage', content: q.passage }];
          passageContext = '\n\nPassage:\n' + q.passage;
        }
      }

      // Get options and correct answer
      const options = q.isSubQuestion ? q.subQuestion.options : q.options;
      const correctAnswer = q.isSubQuestion ? q.subQuestion.correctAnswer : q.correctAnswer;
      const optionsContext = options ? '\n\nOptions:\n' + options.map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`).join('\n') : '';
      const answerContext = correctAnswer ? `\n\nCorrect Answer: ${correctAnswer}` : '';

      const prompt = `You are a Year 6 teacher helping a student find evidence in a text.
      Tone: Simple, direct.

      **CRITICAL RULES:**
      1. **Highlighting:** - Locate ALL specific sentences or phrases that prove the Correct Answer. 
         - Wrap EACH distinct piece of evidence in this exact tag: <mark class="bg-yellow-200 px-1 rounded">EVIDENCE HERE</mark>.
         - Keep any existing formatting such as <strong> tags inside the highlighted sections.
         - You may highlight multiple separate sections if the proof is spread across the text.
      2. **Text Integrity:** - You must return the ENTIRE passage text exactly as provided, preserving all original HTML tags, line breaks, and structure. 
         - Do NOT summarize, truncate, or alter the non-highlighted text.
      3. **Advice Strategy:** - The 'advice' must explain the connection between the highlighted text and the question. 
         - If multiple parts are highlighted, explain how they together support the conclusion.
         - Do NOT explicitly state the Correct Answer (e.g., do not say "The answer is A").
      4. **JSON Logic:**
         - If the input Passage(s) is a single string, use the [For single passage] format.
         - If the input Passage(s) is an array/list, use the [For multiple passages] format.
         - Return valid raw JSON only.

      **INPUT DATA:**
      Question: ${questionText}
      Passage(s): ${passageContext}
      Options: ${optionsContext}
      Correct Answer: ${answerContext}

      **OUTPUT FORMAT (JSON):**

      [For single passage]
      {
        "advice": "Explain simply why the highlighted text supports the correct answer (2-3 sentences). Do not state what the correct answer is.",
        "highlightedContent": "Full passage with <mark class=\\"bg-yellow-200 px-1 rounded\\"> tags around the specific evidence"
      }

      [For multiple passages]
      {
        "advice": "Explain simply why the highlighted text supports the correct answer (2-3 sentences). Do not state what the correct answer is.",
        "passages": [
          {"passageId": "passage_123", "highlightedContent": "Full passage with <mark class=\\"bg-yellow-200 px-1 rounded\\"> tags around specific evidence"},
          {"passageId": "passage_456", "highlightedContent": "Full passage with <mark class=\\"bg-yellow-200 px-1 rounded\\"> tags (only if evidence exists here)"}
        ]
      }`;

      const genAI = new GoogleGenerativeAI('AIzaSyAF6MLByaemR1D8Zh1Ujz4lBfU_rcmMu98');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      let advice = text;
      let passages = {};
      
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          advice = parsed.advice || text;

          // Handle highlighted passages
          if (parsed.passages && Array.isArray(parsed.passages)) {
            parsed.passages.forEach(p => {
              if (p.passageId && p.highlightedContent) {
                // Remove the first line (title) from multiple passages
                const lines = p.highlightedContent.split('\n');
                const contentWithoutTitle = lines.slice(1).join('\n');
                passages[p.passageId] = contentWithoutTitle;
              }
            });
          } else if (parsed.highlightedContent) {
            const passageId = passagesForPrompt[0]?.id || 'main';
            passages[passageId] = parsed.highlightedContent;
          }
        }
      } catch (e) {
        console.error('Error parsing AI response:', e);
      }

      setAiHelperContent(advice);
      setHighlightedPassages(passages);

      // Save to quiz entity
      const helperData = { advice, passages };
      try {
        const existingTips = quiz?.ai_helper_tips || {};
        await base44.entities.Quiz.update(quizId, {
          ai_helper_tips: {
            ...existingTips,
            [currentIndex]: helperData
          }
        });
        // Invalidate quiz query to refresh data
        queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
      } catch (err) {
        console.error('Failed to save AI helper data:', err);
      }
    } catch (e) {
      setAiHelperContent("Unable to generate help at this time. Please try again.");
    } finally {
      setAiHelperLoading(false);
    }
  };

  const handleAiHelperOpen = async () => {
    // Check if tip exists
    const tipData = quiz?.ai_helper_tips?.[currentIndex];
    if (tipData) {
      // Load existing tip
      setAiHelperContent(tipData.advice);
      setHighlightedPassages(tipData.passages || {});
    } else {
      // Generate new tip
      await getAiHelp(false);
    }
    
    // Increment tips used (only for non-admins)
    if (user?.role !== 'admin') {
      const newTipsUsed = tipsUsed + 1;
      setTipsUsed(newTipsUsed);
      
      // Save to attempt
      if (currentAttemptId) {
        try {
          await base44.entities.QuizAttempt.update(currentAttemptId, {
            tips_used: newTipsUsed
          });
        } catch (err) {
          console.error('Failed to update tips used:', err);
        }
      }
    }
  };

  const handleRegenerateAiHelp = () => {
    getAiHelp(true);
  };

  const handleDeleteAiHelp = async () => {
    try {
      const existingTips = quiz?.ai_helper_tips || {};
      const updatedTips = { ...existingTips };
      delete updatedTips[currentIndex];
      
      await base44.entities.Quiz.update(quizId, {
        ai_helper_tips: updatedTips
      });
      
      // Clear local state
      setAiHelperContent('');
      setHighlightedPassages({});
      
      // Invalidate quiz query to refresh data
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
    } catch (err) {
      console.error('Failed to delete AI helper data:', err);
    }
  };

  const handleBlankHelp = async (blankId) => {
    // Check if help already exists for this blank
    const existingHelp = quiz?.ai_helper_tips?.[currentIndex]?.blanks?.[blankId];
    if (existingHelp) {
      setBlankHelperContent(prev => ({ ...prev, [blankId]: existingHelp }));
      return;
    }

    setBlankHelperLoading(prev => ({ ...prev, [blankId]: true }));

    try {
      const q = currentQuestion;
      const blank = q.blanks?.find(b => b.id === blankId);
      
      if (!blank || !blank.options) {
        throw new Error('Blank not found or has no options');
      }

      const prompt = `You are a Year 6 teacher helping a student understand vocabulary words.

For each of these words, provide:
1. A very brief definition (one short sentence)
2. An example sentence using the word

Words: ${blank.options.join(', ')}

Format your response as HTML with this structure:
<div class="space-y-2">
  <div>
    <strong>word1:</strong> brief definition<br/>
    <em>Example: example sentence here</em>
  </div>
  <div>
    <strong>word2:</strong> brief definition<br/>
    <em>Example: example sentence here</em>
  </div>
</div>

Keep it simple and clear. Do NOT indicate which word is correct.`;

      const genAI = new GoogleGenerativeAI('AIzaSyAF6MLByaemR1D8Zh1Ujz4lBfU_rcmMu98');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setBlankHelperContent(prev => ({ ...prev, [blankId]: text }));

      // Save to quiz entity
      try {
        const existingTips = quiz?.ai_helper_tips || {};
        const questionTips = existingTips[currentIndex] || {};
        const blankTips = questionTips.blanks || {};
        
        await base44.entities.Quiz.update(quizId, {
          ai_helper_tips: {
            ...existingTips,
            [currentIndex]: {
              ...questionTips,
              blanks: {
                ...blankTips,
                [blankId]: text
              }
            }
          }
        });
        queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
      } catch (err) {
        console.error('Failed to save blank helper data:', err);
      }

      // Increment tips used (only for non-admins)
      if (user?.role !== 'admin') {
        const newTipsUsed = tipsUsed + 1;
        setTipsUsed(newTipsUsed);
        
        if (currentAttemptId) {
          try {
            await base44.entities.QuizAttempt.update(currentAttemptId, {
              tips_used: newTipsUsed
            });
          } catch (err) {
            console.error('Failed to update tips used:', err);
          }
        }
      }
    } catch (e) {
      console.error('Error generating blank help:', e);
      setBlankHelperContent(prev => ({ ...prev, [blankId]: "Unable to generate help at this time." }));
    } finally {
      setBlankHelperLoading(prev => ({ ...prev, [blankId]: false }));
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
          highlightedPassages={highlightedPassages}
          aiHelperContent={aiHelperContent}
          aiHelperLoading={aiHelperLoading}
          onRequestHelp={quiz?.allow_tips ? handleAiHelperOpen : null}
          onRegenerateHelp={handleRegenerateAiHelp}
          onDeleteHelp={handleDeleteAiHelp}
          isAdmin={user?.role === 'admin'}
          tipsAllowed={quiz?.tips_allowed || 999}
          tipsUsed={tipsUsed}
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
            onRequestHelp={quiz?.allow_tips ? handleBlankHelp : null}
            aiHelperContent={blankHelperContent}
            aiHelperLoading={blankHelperLoading}
            isAdmin={user?.role === 'admin'}
            tipsAllowed={quiz?.tips_allowed || 999}
            tipsUsed={tipsUsed}
          />
        );
      case 'inline_dropdown_same':
        return (
          <InlineDropdownSameQuestion
            {...commonProps}
            selectedAnswers={answers[currentIndex] || {}}
            onAnswer={handleAnswer}
            onRequestHelp={quiz?.allow_tips ? handleBlankHelp : null}
            aiHelperContent={blankHelperContent}
            aiHelperLoading={blankHelperLoading}
            isAdmin={user?.role === 'admin'}
            tipsAllowed={quiz?.tips_allowed || 999}
            tipsUsed={tipsUsed}
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
            <DialogContent className={cn(
              "max-h-[80vh] overflow-y-auto",
              totalQuestions <= 20 && "max-w-lg",
              totalQuestions > 20 && totalQuestions <= 40 && "max-w-2xl",
              totalQuestions > 40 && totalQuestions <= 60 && "max-w-3xl",
              totalQuestions > 60 && "max-w-4xl"
            )}>
              <DialogHeader>
                <DialogTitle>Quiz Overview</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {(() => {
                  const typeLabels = {
                    'reading_comprehension': 'Reading Comprehension',
                    'multiple_choice': 'Multiple Choice',
                    'drag_drop_single': 'Drag & Drop',
                    'drag_drop_dual': 'Drag & Drop (Dual Pane)',
                    'inline_dropdown_separate': 'Fill in the Blanks',
                    'inline_dropdown_same': 'Fill in the Blanks',
                    'matching_list_dual': 'Matching List'
                  };

                  const sections = [];
                  let currentType = null;
                  let currentSection = [];

                  questions.forEach((q, idx) => {
                    if (q.type !== currentType) {
                      if (currentSection.length > 0) {
                        sections.push({ type: currentType, questions: currentSection });
                      }
                      currentType = q.type;
                      currentSection = [{ question: q, index: idx }];
                    } else {
                      currentSection.push({ question: q, index: idx });
                    }
                  });

                  if (currentSection.length > 0) {
                    sections.push({ type: currentType, questions: currentSection });
                  }

                  return sections.map((section, sectionIdx) => (
                    <div key={sectionIdx} className="space-y-2">
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        {typeLabels[section.type] || section.type}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {section.questions.map(({ question: q, index: idx }) => {
                          const isAnswered = answers[idx] !== undefined;
                          const isFlagged = flaggedQuestions.has(idx);
                          const isCurrent = idx === currentIndex;

                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                setCurrentIndex(idx);
                                setOverviewOpen(false);
                                setAiHelperContent('');
                                setHighlightedPassages({});
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
                    </div>
                  ));
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
          </div>

        {/* Edit Quiz Button (Admin Only) */}
        {user?.role === 'admin' && (
          <Link to={createPageUrl(`CreateQuiz?id=${quizId}`)}>
            <Button variant="outline" size="sm" className="gap-2">
              <Pencil className="w-4 h-4" />
              Edit Quiz
            </Button>
          </Link>
        )}
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