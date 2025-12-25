import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle2, X, Sparkles, Loader2, TrendingUp, TrendingDown, Target, ChevronRight, BarChart3, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import MultipleChoiceQuestion from '@/components/quiz/MultipleChoiceQuestion';
import ReadingComprehensionQuestion from '@/components/quiz/ReadingComprehensionQuestion';
import DragDropQuestion from '@/components/quiz/DragDropQuestion';
import DragDropDualQuestion from '@/components/quiz/DragDropDualQuestion';
import InlineDropdownQuestion from '@/components/quiz/InlineDropdownQuestion';
import InlineDropdownSameQuestion from '@/components/quiz/InlineDropdownSameQuestion';
import MatchingListQuestion from '@/components/quiz/MatchingListQuestion';

export default function ReviewAnswers() {
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('id');
  const courseId = urlParams.get('courseId');
  const attemptId = urlParams.get('attemptId');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [aiExplanations, setAiExplanations] = useState({});
  const [loadingExplanations, setLoadingExplanations] = useState(false);
  const [blankExplanationContent, setBlankExplanationContent] = useState({});
  const [blankExplanationLoading, setBlankExplanationLoading] = useState({});
  const [dropZoneExplanationContent, setDropZoneExplanationContent] = useState({});
  const [dropZoneExplanationLoading, setDropZoneExplanationLoading] = useState({});
  const [dropZoneHighlightedExplanations, setDropZoneHighlightedExplanations] = useState({});
  const [matchingExplanationContent, setMatchingExplanationContent] = useState({});
  const [matchingExplanationLoading, setMatchingExplanationLoading] = useState({});
  const [aiHelperLoading, setAiHelperLoading] = useState(false);
  const [openedExplanations, setOpenedExplanations] = useState(new Set());
  const [performanceAnalysis, setPerformanceAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [aiHelperContent, setAiHelperContent] = useState('');
  const [highlightedPassages, setHighlightedPassages] = useState({});
  const [blankHelperContent, setBlankHelperContent] = useState({});
  const [dropZoneHelperContent, setDropZoneHelperContent] = useState({});
  const [dropZoneHighlightedPassages, setDropZoneHighlightedPassages] = useState({});
  const [matchingHelperContent, setMatchingHelperContent] = useState({});
  const [showNavBar, setShowNavBar] = useState(true);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const queryClient = useQueryClient();

  const { data: quiz } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => base44.entities.Quiz.filter({ id: quizId }),
    enabled: !!quizId,
    select: (data) => data[0]
  });

  const { data: attempt } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => base44.entities.QuizAttempt.filter({ id: attemptId }),
    enabled: !!attemptId,
    select: (data) => data[0]
  });

  // Flatten questions
  const flattenedQuestions = React.useMemo(() => {
    if (!quiz?.questions) return [];
    
    const flattened = [];
    quiz.questions.forEach((q) => {
      if (q.type === 'reading_comprehension') {
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
  }, [quiz]);

  const questions = flattenedQuestions;
  const answers = attempt?.answers || {};
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  // Load saved AI data on mount
  React.useEffect(() => {
    if (attempt?.ai_performance_analysis) {
      setPerformanceAnalysis(attempt.ai_performance_analysis);
    }
    if (attempt?.ai_explanations) {
      setAiExplanations(attempt.ai_explanations);
    } else if (attempt && questions.length > 0) {
      generateAllExplanations();
    }
  }, [attempt, questions]);

  // Load explanation content when question changes
  React.useEffect(() => {
    if (!quiz || !currentQuestion) return;

    // Load blank explanations
    if ((currentQuestion.type === 'inline_dropdown_separate' || currentQuestion.type === 'inline_dropdown_same') && quiz.ai_explanations?.[currentIndex]?.blanks) {
      setBlankExplanationContent(quiz.ai_explanations[currentIndex].blanks || {});
    } else {
      setBlankExplanationContent({});
    }

    // Load drop zone explanations
    if ((currentQuestion.type === 'drag_drop_single' || currentQuestion.type === 'drag_drop_dual') && quiz.ai_explanations?.[currentIndex]?.dropZones) {
      const dropZones = quiz.ai_explanations[currentIndex].dropZones || {};
      const content = {};
      const passages = {};
      Object.keys(dropZones).forEach(zoneId => {
        const data = dropZones[zoneId];
        if (typeof data === 'string') {
          content[zoneId] = data;
        } else if (data.advice) {
          content[zoneId] = data.advice;
          if (data.passages) {
            passages[zoneId] = data.passages;
          }
        }
      });
      setDropZoneExplanationContent(content);
      setDropZoneHighlightedExplanations(passages);
    } else {
      setDropZoneExplanationContent({});
      setDropZoneHighlightedExplanations({});
    }

    // Load matching explanations
    if (currentQuestion.type === 'matching_list_dual' && quiz.ai_explanations?.[currentIndex]?.matchingQuestions) {
      setMatchingExplanationContent(quiz.ai_explanations[currentIndex].matchingQuestions || {});
    } else {
      setMatchingExplanationContent({});
    }
  }, [currentIndex, quiz, currentQuestion]);

  // Load AI explanation content when question changes
  React.useEffect(() => {
    if (!quiz || !currentQuestion || isGeneratingExplanation) return;

    // Load reading comprehension explanation
    if (currentQuestion.type === 'reading_comprehension' || currentQuestion.isSubQuestion) {
      const explanation = quiz.ai_explanations?.[currentIndex];
      
      if (explanation) {
        // Load existing explanation from quiz data
        if (typeof explanation === 'string') {
          setAiHelperContent(explanation);
          setHighlightedPassages({});
        } else if (explanation?.advice) {
          setAiHelperContent(explanation.advice);
          setHighlightedPassages(explanation.passages || {});
        }
      } else {
        // Auto-generate if doesn't exist
        setAiHelperContent('');
        setHighlightedPassages({});
        generateRCExplanation(false);
      }
    } else {
      setAiHelperContent('');
      setHighlightedPassages({});
    }

    // Load blank helper content
    if ((currentQuestion.type === 'inline_dropdown_separate' || currentQuestion.type === 'inline_dropdown_same') && quiz.ai_helper_tips?.[currentIndex]?.blanks) {
      setBlankHelperContent(quiz.ai_helper_tips[currentIndex].blanks || {});
    } else {
      setBlankHelperContent({});
    }

    // Load drop zone helper content
    if ((currentQuestion.type === 'drag_drop_single' || currentQuestion.type === 'drag_drop_dual') && quiz.ai_helper_tips?.[currentIndex]?.dropZones) {
      const dropZones = quiz.ai_helper_tips[currentIndex].dropZones || {};
      const content = {};
      const passages = {};
      Object.keys(dropZones).forEach(zoneId => {
        const data = dropZones[zoneId];
        if (typeof data === 'string') {
          content[zoneId] = data;
        } else if (data.advice) {
          content[zoneId] = data.advice;
          if (data.passages) {
            passages[zoneId] = data.passages;
          }
        }
      });
      setDropZoneHelperContent(content);
      setDropZoneHighlightedPassages(passages);
    } else {
      setDropZoneHelperContent({});
      setDropZoneHighlightedPassages({});
    }

    // Load matching helper content
    if (currentQuestion.type === 'matching_list_dual' && quiz.ai_helper_tips?.[currentIndex]?.matchingQuestions) {
      setMatchingHelperContent(quiz.ai_helper_tips[currentIndex].matchingQuestions || {});
    } else {
      setMatchingHelperContent({});
    }
  }, [currentIndex, quiz, currentQuestion]);

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const generateAllExplanations = async () => {
    setLoadingExplanations(true);
    const incorrectQuestions = [];
    
    questions.forEach((q, idx) => {
      const answer = answers[idx];
      let isCorrect = false;
      const hasAnswer = answer !== undefined && answer !== null;

      if (hasAnswer) {
        if (q.isSubQuestion) {
          isCorrect = answer === q.subQuestion.correctAnswer;
        } else if (q.type === 'multiple_choice') {
          isCorrect = answer === q.correctAnswer;
        } else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
          const zones = q.dropZones || [];
          isCorrect = zones.length > 0 && zones.every(zone => answer?.[zone.id] === zone.correctAnswer);
        } else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
          const blanks = q.blanks || [];
          isCorrect = blanks.length > 0 && blanks.every(blank => answer?.[blank.id] === blank.correctAnswer);
        } else if (q.type === 'matching_list_dual') {
          const matchingQs = q.matchingQuestions || [];
          isCorrect = matchingQs.length > 0 && matchingQs.every(mq => answer?.[mq.id] === mq.correctAnswer);
        }
      }

      if (!isCorrect) {
        incorrectQuestions.push({ q, idx, answer });
      }
    });

    const genAI = new GoogleGenerativeAI('AIzaSyAF6MLByaemR1D8Zh1Ujz4lBfU_rcmMu98');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
    const newExplanations = {};

    for (const { q, idx, answer } of incorrectQuestions) {
      try {
        const questionText = q.isSubQuestion ? q.subQuestion.question : q.question;
        let passageContext = '';

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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        newExplanations[idx] = text;
      } catch (e) {
        newExplanations[idx] = "Unable to generate explanation at this time.";
      }
    }

    setAiExplanations(newExplanations);
    
    // Save all explanations at once
    if (Object.keys(newExplanations).length > 0) {
      base44.entities.QuizAttempt.update(attemptId, {
        ai_explanations: newExplanations
      }).catch(e => console.error('Failed to save explanations:', e));
    }
    
    setLoadingExplanations(false);
  };

  const handleBlankExplanation = async (blankId) => {
    const explanationId = `blank-${currentIndex}-${blankId}`;
    const wasAlreadyOpened = openedExplanations.has(explanationId);
    
    // Check if explanation already exists for this blank
    const existingExplanation = quiz?.ai_explanations?.[currentIndex]?.blanks?.[blankId];
    if (existingExplanation && !wasAlreadyOpened) {
      setBlankExplanationContent(prev => ({ ...prev, [blankId]: existingExplanation }));
      setOpenedExplanations(prev => new Set([...prev, explanationId]));
      return;
    }

    if (wasAlreadyOpened && existingExplanation) {
      return; // Already loaded and opened
    }

    setBlankExplanationLoading(prev => ({ ...prev, [blankId]: true }));

    try {
      const q = currentQuestion;
      const blank = q.blanks?.find(b => b.id === blankId);
      
      if (!blank) {
        throw new Error('Blank not found');
      }

      const userAnswer = answers[currentIndex]?.[blankId];
      const correctAnswer = blank.correctAnswer;

      const prompt = `You are explaining to a student why their answer is incorrect. Use first person ("Your answer is incorrect because..."). Then explain how to find the correct answer. Keep it concise (3-4 sentences).

Question: Fill in the blank
Student's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}
Options: ${blank.options.join(', ')}

Provide a helpful first-person explanation:`;

      const genAI = new GoogleGenerativeAI('AIzaSyAF6MLByaemR1D8Zh1Ujz4lBfU_rcmMu98');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setBlankExplanationContent(prev => ({ ...prev, [blankId]: text }));
      setOpenedExplanations(prev => new Set([...prev, explanationId]));

      // Save to quiz entity
      try {
        const existingExplanations = quiz?.ai_explanations || {};
        const questionExplanations = existingExplanations[currentIndex] || {};
        const blankExplanations = questionExplanations.blanks || {};
        
        await base44.entities.Quiz.update(quiz.id, {
          ai_explanations: {
            ...existingExplanations,
            [currentIndex]: {
              ...questionExplanations,
              blanks: {
                ...blankExplanations,
                [blankId]: text
              }
            }
          }
        });
        queryClient.invalidateQueries({ queryKey: ['quiz', quiz.id] });
      } catch (err) {
        console.error('Failed to save blank explanation:', err);
      }
    } catch (e) {
      console.error('Error generating blank explanation:', e);
      setBlankExplanationContent(prev => ({ ...prev, [blankId]: "Unable to generate explanation at this time." }));
    } finally {
      setBlankExplanationLoading(prev => ({ ...prev, [blankId]: false }));
    }
  };

  const handleDropZoneExplanation = async (zoneId) => {
    const explanationId = `dropzone-${currentIndex}-${zoneId}`;
    const wasAlreadyOpened = openedExplanations.has(explanationId);
    
    // Check if explanation already exists for this zone
    const existingExplanation = quiz?.ai_explanations?.[currentIndex]?.dropZones?.[zoneId];
    if (existingExplanation && !wasAlreadyOpened) {
      setDropZoneExplanationContent(prev => ({ ...prev, [zoneId]: existingExplanation.advice || existingExplanation }));
      if (existingExplanation.passages) {
        setDropZoneHighlightedExplanations(prev => ({ ...prev, [zoneId]: existingExplanation.passages }));
      }
      setOpenedExplanations(prev => new Set([...prev, explanationId]));
      return;
    }

    if (wasAlreadyOpened && existingExplanation) {
      return;
    }

    setDropZoneExplanationLoading(prev => ({ ...prev, [zoneId]: true }));

    try {
      const q = currentQuestion;
      const zone = q.dropZones?.find(z => z.id === zoneId);
      
      if (!zone) {
        throw new Error('Drop zone not found');
      }

      const userAnswer = answers[currentIndex]?.[zoneId];
      const correctAnswer = zone.correctAnswer;

      const hasPassages = q.passages?.length > 0 || q.passage;
      let passageContext = '';
      let passagesForPrompt = [];

      if (hasPassages) {
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

      const prompt = `You are explaining to a student why their answer is incorrect. Use first person ("Your answer is incorrect because..."). Then explain how to find the correct answer. Keep it concise (3-4 sentences).
${passageContext ? 'Quote specific sentences from the passage where applicable to support your explanation.' : ''}

Gap Label: ${zone.label}
Student's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}${passageContext}

Provide a helpful first-person explanation:`;

      const genAI = new GoogleGenerativeAI('AIzaSyAF6MLByaemR1D8Zh1Ujz4lBfU_rcmMu98');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setDropZoneExplanationContent(prev => ({ ...prev, [zoneId]: text }));
      setOpenedExplanations(prev => new Set([...prev, explanationId]));

      // Save to quiz entity
      try {
        const existingExplanations = quiz?.ai_explanations || {};
        const questionExplanations = existingExplanations[currentIndex] || {};
        const dropZoneExplanations = questionExplanations.dropZones || {};
        
        await base44.entities.Quiz.update(quiz.id, {
          ai_explanations: {
            ...existingExplanations,
            [currentIndex]: {
              ...questionExplanations,
              dropZones: {
                ...dropZoneExplanations,
                [zoneId]: text
              }
            }
          }
        });
        queryClient.invalidateQueries({ queryKey: ['quiz', quiz.id] });
      } catch (err) {
        console.error('Failed to save drop zone explanation:', err);
      }
    } catch (e) {
      console.error('Error generating drop zone explanation:', e);
      setDropZoneExplanationContent(prev => ({ ...prev, [zoneId]: "Unable to generate explanation at this time." }));
    } finally {
      setDropZoneExplanationLoading(prev => ({ ...prev, [zoneId]: false }));
    }
  };

  const generateRCExplanation = async (forceRegenerate = false) => {
    const explanationId = `rc-${currentIndex}`;

    setIsGeneratingExplanation(true);
    setAiHelperLoading(true);

    try {
      const q = currentQuestion;
      const userAnswer = answers[currentIndex];
      const correctAnswer = q.isSubQuestion ? q.subQuestion.correctAnswer : q.correctAnswer;

      let passageContext = '';
      if (q.passages?.length > 0) {
        passageContext = '\n\nReading Passages:\n' + q.passages.map(p => 
          `${p.title}:\n${p.content?.replace(/<[^>]*>/g, '')}`
        ).join('\n\n');
      } else if (q.passage) {
        passageContext = '\n\nReading Passage:\n' + q.passage?.replace(/<[^>]*>/g, '');
      }

      const questionText = q.isSubQuestion ? q.subQuestion.question : q.question;

      const passagesForPrompt = q.passages?.length > 0 
        ? q.passages.map(p => ({ id: p.id, title: p.title, content: p.content }))
        : [{ id: 'main', title: 'Passage', content: q.passage }];

      const passagesList = passagesForPrompt.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');

      const prompt = `You are a Year 6 teacher helping a student understand a reading comprehension question.
      Tone: Encouraging, simple, and direct.

      **CRITICAL RULES:**
      1. **Highlighting:** - Locate ALL specific sentences or phrases in the text that prove the Correct Answer. 
         - Wrap EACH distinct piece of evidence in this exact tag: <mark class="bg-yellow-200 px-1 rounded">EVIDENCE HERE</mark>.
         - Keep any existing formatting such as <strong> tags inside the highlighted sections.
         - You may highlight multiple separate sections if the proof is spread across the text.
      2. **Text Integrity:** - You must return the ENTIRE passage text exactly as provided, preserving all original HTML tags, line breaks, and structure. 
         - Do NOT summarize, truncate, or alter the non-highlighted text.
      3. **Advice Strategy (Tell & Explain Each Option):** 
         - **State the Correct Answer:** Start by clearly stating the correct answer (e.g., "The correct answer is Option A").
         - **Explain Each Option Individually:** Go through EACH option one by one and explain:
           * If it's the CORRECT option: Why it's right, using specific quotes from the passage.
           * If it's a WRONG option: Why it's incorrect, using specific quotes or reasoning from the passage.
         - Use clear transitions like "Option A is correct because...", "Option B is wrong because...", etc.
         - Quote directly from the passage to support your explanations.
      4. **JSON Logic:**
         - If the input Passage(s) is a single string, use the [For single passage] format.
         - If the input Passage(s) is an array/list, use the [For multiple passages] format.
         - Return valid raw JSON only.

      **INPUT DATA:**
      Question: ${questionText?.replace(/<[^>]*>/g, '')}
      Passage(s): ${passagesList}
      Options: ${q.isSubQuestion ? q.subQuestion.options?.join(', ') : q.options?.join(', ')}
      Correct Answer: ${correctAnswer}

      **OUTPUT FORMAT (JSON):**

      [For single passage]
      {
        "advice": "Start by stating the correct answer. Then, explain simply why the highlighted text supports it (2-3 sentences).",
        "highlightedContent": "Full passage with <mark class=\\"bg-yellow-200 px-1 rounded\\"> tags around the specific evidence"
      }

      [For multiple passages]
      {
        "advice": "Start by stating the correct answer. Then, explain simply why the highlighted text supports it (2-3 sentences).",
        "passages": [
          {"passageId": "${passagesForPrompt[0].id}", "highlightedContent": "Full passage with <mark class=\\"bg-yellow-200 px-1 rounded\\"> tags around specific evidence"}${passagesForPrompt.length > 1 ? `,\n          {"passageId": "${passagesForPrompt[1].id}", "highlightedContent": "Full passage with <mark class=\\"bg-yellow-200 px-1 rounded\\"> tags (only if evidence exists here)"}` : ''}
        ]
      }`;

      console.log('=== RC EXPLANATION PROMPT ===');
      console.log(prompt);
      console.log('===========================');

      const genAI = new GoogleGenerativeAI('AIzaSyAF6MLByaemR1D8Zh1Ujz4lBfU_rcmMu98');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('=== RC EXPLANATION RESPONSE ===');
      console.log(text);
      console.log('==============================');

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Handle passages - can be object or array
        let cleanedPassages = {};
        if (parsed.passages) {
          if (Array.isArray(parsed.passages)) {
            // Array format from new prompt
            parsed.passages.forEach(p => {
              if (p.passageId && p.highlightedContent) {
                cleanedPassages[p.passageId] = p.highlightedContent;
              }
            });
          } else {
            // Object format (legacy)
            Object.keys(parsed.passages).forEach(key => {
              const passage = parsed.passages[key];
              const firstLineBreak = passage.indexOf('\n');
              cleanedPassages[key] = firstLineBreak !== -1 ? passage.substring(firstLineBreak + 1) : passage;
            });
          }
        } else if (parsed.highlightedContent) {
          // Single passage format
          const passageId = passagesForPrompt[0]?.id || 'main';
          cleanedPassages[passageId] = parsed.highlightedContent;
        }
        
        const explanationData = {
          advice: parsed.advice,
          passages: cleanedPassages
        };

        // Save to quiz entity immediately
        try {
          const existingExplanations = quiz?.ai_explanations || {};
          const updatedExplanations = {
            ...existingExplanations,
            [currentIndex]: explanationData
          };

          await base44.entities.Quiz.update(quiz.id, {
            ai_explanations: updatedExplanations
          });

          // Immediately update the local cache
          queryClient.setQueryData(['quiz', quizId], (oldData) => {
            if (!oldData || !Array.isArray(oldData)) return oldData;
            return oldData.map(q => q.id === quiz.id ? { ...q, ai_explanations: updatedExplanations } : q);
          });

          // Force reload the explanation from updated cache
          setAiHelperContent(parsed.advice || text);
          setHighlightedPassages(cleanedPassages);
          setOpenedExplanations(prev => new Set([...prev, explanationId]));
        } catch (err) {
          console.error('Failed to save RC explanation:', err);
          // Still show the explanation even if save failed
          setAiHelperContent(parsed.advice || text);
          setHighlightedPassages(cleanedPassages);
          setOpenedExplanations(prev => new Set([...prev, explanationId]));
        }
        } else {
        // Fallback if JSON parsing fails
        setAiHelperContent(text);
        setOpenedExplanations(prev => new Set([...prev, explanationId]));
        }
        } catch (e) {
        console.error('Error generating RC explanation:', e);
        setAiHelperContent("Unable to generate explanation at this time.");
        } finally {
        setAiHelperLoading(false);
        setIsGeneratingExplanation(false);
        }
        };

    const handleRCExplanation = () => generateRCExplanation(false);

    const handleRegenerateRCExplanation = () => generateRCExplanation(true);

    const handleDeleteRCExplanation = async () => {
      try {
        const existingExplanations = quiz?.ai_explanations || {};
        const { [currentIndex]: _, ...remaining } = existingExplanations;

        await base44.entities.Quiz.update(quiz.id, {
          ai_explanations: remaining
        });

        // Immediately update the local cache
        queryClient.setQueryData(['quiz', quizId], (oldData) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          return oldData.map(q => q.id === quiz.id ? { ...q, ai_explanations: remaining } : q);
        });

        // Clear local state
        setAiHelperContent('');
        setHighlightedPassages({});

        // Remove from opened explanations set
        const explanationId = `rc-${currentIndex}`;
        setOpenedExplanations(prev => {
          const newSet = new Set(prev);
          newSet.delete(explanationId);
          return newSet;
        });
      } catch (err) {
        console.error('Failed to delete RC explanation:', err);
      }
    };

  const handleMatchingExplanation = async (questionId) => {
    const explanationId = `matching-${currentIndex}-${questionId}`;
    const wasAlreadyOpened = openedExplanations.has(explanationId);
    
    const existingExplanation = quiz?.ai_explanations?.[currentIndex]?.matchingQuestions?.[questionId];
    if (existingExplanation && !wasAlreadyOpened) {
      setMatchingExplanationContent(prev => ({ ...prev, [questionId]: existingExplanation }));
      setOpenedExplanations(prev => new Set([...prev, explanationId]));
      return;
    }

    if (wasAlreadyOpened && existingExplanation) {
      return;
    }

    setMatchingExplanationLoading(prev => ({ ...prev, [questionId]: true }));

    try {
      const q = currentQuestion;
      const matchingQ = q.matchingQuestions?.find(mq => mq.id === questionId);
      
      if (!matchingQ) {
        throw new Error('Matching question not found');
      }

      const userAnswer = answers[currentIndex]?.[questionId];
      const correctAnswer = matchingQ.correctAnswer;

      const hasPassages = q.passages?.length > 0 || q.passage;
      let passageContext = '';

      if (hasPassages) {
        if (q.passages?.length > 0) {
          passageContext = '\n\nPassages:\n' + q.passages.map(p => 
            `${p.title}:\n${p.content}`
          ).join('\n\n');
        } else {
          passageContext = '\n\nPassage:\n' + q.passage;
        }
      }

      const prompt = `You are explaining to a student why their answer is incorrect. Use first person ("Your answer is incorrect because..."). Then explain how to find the correct answer. Keep it concise (3-4 sentences).
${passageContext ? 'Quote specific sentences from the passage where applicable to support your explanation.' : ''}

Question: ${matchingQ.question}
Student's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}${passageContext}

Provide a helpful first-person explanation:`;

      const genAI = new GoogleGenerativeAI('AIzaSyAF6MLByaemR1D8Zh1Ujz4lBfU_rcmMu98');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setMatchingExplanationContent(prev => ({ ...prev, [questionId]: text }));
      setOpenedExplanations(prev => new Set([...prev, explanationId]));

      try {
        const existingExplanations = quiz?.ai_explanations || {};
        const questionExplanations = existingExplanations[currentIndex] || {};
        const matchingExplanations = questionExplanations.matchingQuestions || {};
        
        await base44.entities.Quiz.update(quiz.id, {
          ai_explanations: {
            ...existingExplanations,
            [currentIndex]: {
              ...questionExplanations,
              matchingQuestions: {
                ...matchingExplanations,
                [questionId]: text
              }
            }
          }
        });
        queryClient.invalidateQueries({ queryKey: ['quiz', quiz.id] });
      } catch (err) {
        console.error('Failed to save matching explanation:', err);
      }
    } catch (e) {
      console.error('Error generating matching explanation:', e);
      setMatchingExplanationContent(prev => ({ ...prev, [questionId]: "Unable to generate explanation at this time." }));
    } finally {
      setMatchingExplanationLoading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const generatePerformanceAnalysis = async () => {
    setLoadingAnalysis(true);
    
    try {
      // Collect all questions and answers
      const questionsData = questions.map((q, idx) => {
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

        return {
          question: (q.isSubQuestion ? q.subQuestion.question : q.question)?.replace(/<[^>]*>/g, ''),
          type: q.type,
          isCorrect
        };
      });

      const score = attempt?.score || 0;
      const total = attempt?.total || questions.length;
      const percentage = attempt?.percentage || 0;

      const prompt = `Analyze this quiz performance and provide constructive feedback.

Quiz: ${quiz.title}
Score: ${score}/${total} (${percentage}%)

Questions Performance:
${questionsData.map((q, i) => `${i + 1}. ${q.isCorrect ? '✓' : '✗'} ${q.question.substring(0, 80)}...`).join('\n')}

Provide a JSON response with:
{
  "summary": "Brief 2-3 sentence overall assessment of performance",
  "strongAreas": ["Area 1", "Area 2", "Area 3"],
  "weakAreas": ["Area 1", "Area 2", "Area 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}

Be specific and constructive. Focus on what the student did well and what needs improvement.`;

      const genAI = new GoogleGenerativeAI('AIzaSyAF6MLByaemR1D8Zh1Ujz4lBfU_rcmMu98');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-09-2025' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        setPerformanceAnalysis(analysis);
        
        // Save to attempt
        await base44.entities.QuizAttempt.update(attemptId, {
          ai_performance_analysis: analysis
        });
      }
    } catch (e) {
      console.error('Failed to generate analysis:', e);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const commonProps = {
      question: currentQuestion,
      showResults: true,
    };

    // For reading comprehension sub-questions
    if (currentQuestion.isSubQuestion && currentQuestion.type === 'reading_comprehension') {
      return (
        <ReadingComprehensionQuestion
          {...commonProps}
          selectedAnswer={answers[currentIndex]}
          onAnswer={() => {}}
          singleQuestion={true}
          subQuestion={currentQuestion.subQuestion}
          highlightedPassages={highlightedPassages}
          aiHelperContent={aiHelperContent}
          aiHelperLoading={aiHelperLoading}
          onRequestHelp={null}
          isAdmin={true}
          tipsAllowed={999}
          tipsUsed={0}
          tipOpened={true}
          autoExpandTip={true}
          autoExpandExplanation={true}
          onRegenerateExplanation={handleRegenerateRCExplanation}
          onDeleteExplanation={handleDeleteRCExplanation}
          openedExplanations={openedExplanations}
        />
      );
    }

    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            {...commonProps}
            selectedAnswer={answers[currentIndex]}
            onAnswer={() => {}}
          />
        );
      case 'drag_drop_single':
        return (
          <DragDropQuestion
            {...commonProps}
            selectedAnswers={answers[currentIndex] || {}}
            onAnswer={() => {}}
            aiHelperContent={dropZoneHelperContent}
            aiHelperLoading={{}}
            highlightedPassages={dropZoneHighlightedPassages}
            isAdmin={true}
            tipsAllowed={999}
            tipsUsed={0}
            openedTips={new Set()}
            currentIndex={currentIndex}
            autoExpandTips={true}
            onRequestExplanation={handleDropZoneExplanation}
            explanationContent={dropZoneExplanationContent}
            explanationLoading={dropZoneExplanationLoading}
            explanationHighlightedPassages={dropZoneHighlightedExplanations}
            openedExplanations={openedExplanations}
          />
        );
      case 'drag_drop_dual':
        return (
          <DragDropDualQuestion
            {...commonProps}
            selectedAnswers={answers[currentIndex] || {}}
            onAnswer={() => {}}
            aiHelperContent={dropZoneHelperContent}
            aiHelperLoading={{}}
            highlightedPassages={dropZoneHighlightedPassages}
            isAdmin={true}
            tipsAllowed={999}
            tipsUsed={0}
            openedTips={new Set()}
            currentIndex={currentIndex}
            autoExpandTips={true}
            onRequestExplanation={handleDropZoneExplanation}
            explanationContent={dropZoneExplanationContent}
            explanationLoading={dropZoneExplanationLoading}
            explanationHighlightedPassages={dropZoneHighlightedExplanations}
            openedExplanations={openedExplanations}
          />
        );
      case 'inline_dropdown_separate':
        return (
          <InlineDropdownQuestion
            {...commonProps}
            selectedAnswers={answers[currentIndex] || {}}
            onAnswer={() => {}}
            aiHelperContent={blankHelperContent}
            aiHelperLoading={{}}
            isAdmin={true}
            tipsAllowed={999}
            tipsUsed={0}
            openedTips={new Set()}
            currentIndex={currentIndex}
            autoExpandTips={true}
            onRequestExplanation={handleBlankExplanation}
            explanationContent={blankExplanationContent}
            explanationLoading={blankExplanationLoading}
            openedExplanations={openedExplanations}
          />
        );
      case 'inline_dropdown_same':
        return (
          <InlineDropdownSameQuestion
            {...commonProps}
            selectedAnswers={answers[currentIndex] || {}}
            onAnswer={() => {}}
            aiHelperContent={blankHelperContent}
            aiHelperLoading={{}}
            isAdmin={true}
            tipsAllowed={999}
            tipsUsed={0}
            openedTips={new Set()}
            currentIndex={currentIndex}
            autoExpandTips={true}
            onRequestExplanation={handleBlankExplanation}
            explanationContent={blankExplanationContent}
            explanationLoading={blankExplanationLoading}
            openedExplanations={openedExplanations}
          />
        );
      case 'matching_list_dual':
        return (
          <MatchingListQuestion
            {...commonProps}
            selectedAnswers={answers[currentIndex] || {}}
            onAnswer={() => {}}
            aiHelperContent={matchingHelperContent}
            aiHelperLoading={{}}
            isAdmin={true}
            tipsAllowed={999}
            tipsUsed={0}
            openedTips={new Set()}
            currentIndex={currentIndex}
            autoExpandTips={true}
            onRequestExplanation={handleMatchingExplanation}
            explanationContent={matchingExplanationContent}
            explanationLoading={matchingExplanationLoading}
            openedExplanations={openedExplanations}
          />
        );
      default:
        return null;
    }
  };

  if (!quiz || !attempt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const score = attempt.score || 0;
  const total = attempt.total || questions.length;
  const percentage = Math.round((score / total) * 100);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center gap-4">
          {/* Back Button */}
          <Link to={courseId ? createPageUrl(`CourseDetail?id=${courseId}`) : createPageUrl('Home')}>
            <button className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </Link>
        </div>

        {/* Question Counter & Stats Button */}
        <div className="flex-1 flex items-center justify-center gap-3">
          <h2 className="text-xl font-semibold text-slate-800">
            Question {currentIndex + 1} of {totalQuestions}
          </h2>
          
          <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Stats
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Performance Analysis</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {/* Score Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="text-sm text-emerald-600 font-medium">Score</div>
                    <div className="text-2xl font-bold text-emerald-700">{score} / {total}</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="text-sm text-blue-600 font-medium">Accuracy</div>
                    <div className="text-2xl font-bold text-blue-700">{percentage}%</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="text-sm text-amber-600 font-medium">Questions</div>
                    <div className="text-2xl font-bold text-amber-700">{questions.length}</div>
                  </div>
                </div>

                {/* AI Performance Analysis */}
                {!performanceAnalysis && !loadingAnalysis && (
                  <Button
                    onClick={generatePerformanceAnalysis}
                    className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate AI Performance Analysis
                  </Button>
                )}

                {loadingAnalysis && (
                  <div className="flex items-center justify-center gap-3 p-8 bg-slate-50 rounded-xl">
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    <span className="text-slate-600">Analyzing your performance...</span>
                  </div>
                )}

                {performanceAnalysis && (
                  <div className="space-y-6">
                    {/* Overall Summary */}
                    <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-indigo-900 mb-2">Overall Assessment</h3>
                          <p className="text-indigo-800 leading-relaxed">{performanceAnalysis.summary}</p>
                        </div>
                      </div>
                    </div>

                    {/* Strong & Weak Areas */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Strong Areas */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                          <h3 className="text-lg font-bold text-emerald-900">Strong Areas</h3>
                        </div>
                        <ul className="space-y-2">
                          {performanceAnalysis.strongAreas.map((area, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-emerald-800">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span>{area}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Weak Areas */}
                      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingDown className="w-5 h-5 text-red-600" />
                          <h3 className="text-lg font-bold text-red-900">Areas for Improvement</h3>
                        </div>
                        <ul className="space-y-2">
                          {performanceAnalysis.weakAreas.map((area, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-red-800">
                              <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <span>{area}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
                      <h3 className="text-lg font-bold text-amber-900 mb-3">Recommendations</h3>
                      <ul className="space-y-2">
                        {performanceAnalysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-amber-800">
                            <span className="text-amber-600 font-bold">{idx + 1}.</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Score Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold text-slate-800">{score}/{total}</span>
          <span className="text-slate-600">({percentage}%)</span>
        </div>
      </div>

      {/* Question Numbers Bar */}
      <div className="relative">
        <motion.div
          initial={false}
          animate={{ height: showNavBar ? 'auto' : 0, opacity: showNavBar ? 1 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="px-4 py-2 border-b border-slate-200 bg-white overflow-x-auto">
            <div className="flex gap-4 min-w-min justify-center">
          {(() => {
            const typeLabels = {
              'reading_comprehension': 'Reading Comprehension',
              'multiple_choice': 'Multiple Choice',
              'drag_drop_single': 'Drag & Drop',
              'drag_drop_dual': 'Drag & Drop (Dual)',
              'inline_dropdown_separate': 'Fill in Blanks',
              'inline_dropdown_same': 'Fill in Blanks',
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
              <div key={sectionIdx} className="flex flex-col gap-1">
                <div className="relative">
                  <div className="text-[10px] font-semibold text-slate-600 mb-0.5 text-center px-1">
                    {section.questions[0]?.question?.questionName || typeLabels[section.type] || section.type}
                  </div>
                  <div className="absolute left-0 right-0 top-full h-1.5 border-l-2 border-r-2 border-t-2 border-slate-300 rounded-t-md"></div>
                </div>
                <div className="flex gap-1.5 pt-1.5 justify-center">
                  {section.questions.map(({ question: q, index: idx }) => {
                    const answer = answers[idx];
                    let isCorrect = false;
                    const isCurrent = idx === currentIndex;

                    if (q.isSubQuestion) {
                      isCorrect = answer === q.subQuestion.correctAnswer;
                    } else if (q.type === 'multiple_choice') {
                      isCorrect = answer === q.correctAnswer;
                    } else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
                      const zones = q.dropZones || [];
                      isCorrect = zones.length > 0 && zones.every(zone => answer?.[zone.id] === zone.correctAnswer);
                    } else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
                      const blanks = q.blanks || [];
                      isCorrect = blanks.length > 0 && blanks.every(blank => answer?.[blank.id] === blank.correctAnswer);
                    } else if (q.type === 'matching_list_dual') {
                      const matchingQs = q.matchingQuestions || [];
                      isCorrect = matchingQs.length > 0 && matchingQs.every(mq => answer?.[mq.id] === mq.correctAnswer);
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={cn(
                          "w-8 h-8 rounded-md font-semibold text-xs transition-all flex-shrink-0",
                          isCurrent && "bg-indigo-600 text-white ring-2 ring-indigo-300",
                          !isCurrent && isCorrect && "bg-emerald-500 text-white hover:bg-emerald-600",
                          !isCurrent && !isCorrect && "bg-red-500 text-white hover:bg-red-600"
                        )}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
          </div>
          </div>
        </motion.div>

        {/* Toggle Button */}
        <button
          onClick={() => setShowNavBar(!showNavBar)}
          className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full z-50 px-3 py-1 rounded-b-md bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors shadow-sm border border-t-0 border-slate-200"
          title={showNavBar ? "Hide navigation bar" : "Show navigation bar"}
        >
          {showNavBar ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
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
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
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

        <div className="text-sm text-slate-600">
          Review Mode - Showing correct answers
        </div>

        {currentIndex < totalQuestions - 1 ? (
          <Button
            onClick={handleNext}
            className="bg-slate-800 text-white hover:bg-slate-700 px-8 py-6 text-base font-semibold"
          >
            Next
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        ) : (
          <Link to={courseId ? createPageUrl(`CourseDetail?id=${courseId}`) : createPageUrl('Home')}>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-6 text-base font-semibold">
              Finish Review
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}