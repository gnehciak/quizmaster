import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle2, X, Sparkles, Loader2, TrendingUp, TrendingDown, Target, ChevronRight, List, BarChart3 } from 'lucide-react';
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

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

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

  // Load saved AI data on mount and load helper content for current question
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

  // Load AI helper content when question changes
  React.useEffect(() => {
    if (!quiz || !currentQuestion) return;

    // Load reading comprehension help
    if ((currentQuestion.type === 'reading_comprehension' || currentQuestion.isSubQuestion) && quiz.ai_helper_tips?.[currentIndex]) {
      const tipData = quiz.ai_helper_tips[currentIndex];
      setAiHelperContent(tipData.advice || '');
      setHighlightedPassages(tipData.passages || {});
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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
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
          aiHelperLoading={false}
          onRequestHelp={null}
          isAdmin={true}
          tipsAllowed={999}
          tipsUsed={0}
          tipOpened={true}
          autoExpandTip={true}
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
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
                <DialogTitle>Question Overview</DialogTitle>
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
                              onClick={() => {
                                setCurrentIndex(idx);
                                setOverviewOpen(false);
                              }}
                              className={cn(
                                "w-12 h-12 rounded-lg font-semibold text-sm transition-all border-2 relative",
                                isCurrent && "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300",
                                !isCurrent && isCorrect && "bg-emerald-500 text-white border-emerald-500",
                                !isCurrent && !isCorrect && "bg-red-500 text-white border-red-500"
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
                
                <div className="flex items-center gap-4 text-xs text-slate-600 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-indigo-600"></div>
                    <span>Current</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-500"></div>
                    <span>Correct</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-red-500"></div>
                    <span>Incorrect</span>
                  </div>
                </div>
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