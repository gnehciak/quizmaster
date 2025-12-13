import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle2, X, Sparkles, Loader2, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function ReviewAnswers() {
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('id');
  const courseId = urlParams.get('courseId');
  const attemptId = urlParams.get('attemptId');

  const [aiExplanations, setAiExplanations] = useState({});
  const [loadingExplanations, setLoadingExplanations] = useState({});
  const [performanceAnalysis, setPerformanceAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

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
  }, [quiz?.questions]);

  const questions = flattenedQuestions;
  const answers = attempt?.answers || {};

  // Load saved AI data on mount
  React.useEffect(() => {
    if (attempt?.ai_performance_analysis) {
      setPerformanceAnalysis(attempt.ai_performance_analysis);
    }
    if (attempt?.ai_explanations) {
      setAiExplanations(attempt.ai_explanations);
    }
  }, [attempt]);

  // Save AI explanations before leaving page
  React.useEffect(() => {
    return () => {
      if (Object.keys(aiExplanations).length > 0) {
        base44.entities.QuizAttempt.update(attemptId, {
          ai_explanations: aiExplanations
        }).catch(e => console.error('Failed to save explanations on unmount:', e));
      }
    };
  }, [aiExplanations, attemptId]);

  const generateSingleExplanation = async (idx) => {
    const q = questions[idx];
    const answer = answers[idx];
    
    setLoadingExplanations(prev => ({ ...prev, [idx]: true }));
    
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

      const genAI = new GoogleGenerativeAI('AIzaSyAF6MLByaemR1D8Zh1Ujz4lBfU_rcmMu98');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Update local state
      setAiExplanations(prev => {
        const newExplanations = {...prev, [idx]: text};
        
        // Save to attempt immediately
        base44.entities.QuizAttempt.update(attemptId, {
          ai_explanations: newExplanations
        }).catch(e => console.error('Failed to save explanation:', e));
        
        return newExplanations;
      });
    } catch (e) {
      setAiExplanations(prev => ({...prev, [idx]: "Unable to generate explanation at this time."}));
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [idx]: false }));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{quiz.title}</h1>
              <p className="text-slate-600 mt-2">Detailed Review & Performance Analysis</p>
            </div>
            <Link to={courseId ? createPageUrl(`CourseDetail?id=${courseId}`) : createPageUrl('Home')}>
              <Button variant="outline" className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Back to Course
              </Button>
            </Link>
          </div>

          {/* Score Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
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

          {/* Quick Jump Buttons */}
          <div className="mb-8">
            <div className="text-sm font-medium text-slate-600 mb-3">Jump to Question</div>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, idx) => {
                const answer = answers[idx];
                let isCorrect = false;
                let isPartial = false;

                if (q.isSubQuestion) {
                  isCorrect = answer === q.subQuestion.correctAnswer;
                } else if (q.type === 'multiple_choice') {
                  isCorrect = answer === q.correctAnswer;
                } else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
                  const zones = q.dropZones || [];
                  const correctCount = zones.filter(zone => answer?.[zone.id] === zone.correctAnswer).length;
                  isCorrect = correctCount === zones.length;
                  isPartial = correctCount > 0 && correctCount < zones.length;
                } else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
                  const blanks = q.blanks || [];
                  const correctCount = blanks.filter(blank => answer?.[blank.id] === blank.correctAnswer).length;
                  isCorrect = correctCount === blanks.length;
                  isPartial = correctCount > 0 && correctCount < blanks.length;
                } else if (q.type === 'matching_list_dual') {
                  const matchingQs = q.matchingQuestions || [];
                  const correctCount = matchingQs.filter(mq => answer?.[mq.id] === mq.correctAnswer).length;
                  isCorrect = correctCount === matchingQs.length;
                  isPartial = correctCount > 0 && correctCount < matchingQs.length;
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      document.getElementById(`question-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={cn(
                      "w-10 h-10 rounded-lg font-semibold text-sm transition-all hover:scale-110",
                      isCorrect && "bg-emerald-500 text-white hover:bg-emerald-600",
                      isPartial && "bg-amber-500 text-white hover:bg-amber-600",
                      !isCorrect && !isPartial && "bg-red-500 text-white hover:bg-red-600"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
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

        {/* Reading Passages */}
        {quiz.questions?.[0]?.type === 'reading_comprehension' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
            <div className="font-semibold text-slate-800 text-lg mb-4">
              Reading Passage{quiz.questions[0].passages?.length > 1 ? 's' : ''}
            </div>
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

        {/* Questions Review */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const answer = answers[idx];
            let isCorrect = false;
            
            // Check if answer exists
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

            return (
              <div 
                key={idx} 
                id={`question-${idx}`}
                className={cn(
                  "bg-white rounded-2xl shadow-lg border-2 p-6 scroll-mt-24",
                  isCorrect ? "border-emerald-300" : "border-red-300"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                      isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}>
                      {idx + 1}
                    </div>
                    <div className={cn(
                      "text-sm font-semibold",
                      isCorrect ? "text-emerald-700" : "text-red-700"
                    )}>
                      {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="font-semibold text-slate-800 mb-3" dangerouslySetInnerHTML={{
                    __html: q.isSubQuestion ? q.subQuestion.question : q.question
                  }} />

                  {/* Multiple Choice Display */}
                  {(q.type === 'multiple_choice' || q.isSubQuestion) && (
                    <div className="space-y-2">
                      {(q.isSubQuestion ? q.subQuestion.options : q.options)?.map((opt, i) => {
                        const isSelected = answer === opt;
                        const isCorrectOption = opt === (q.isSubQuestion ? q.subQuestion.correctAnswer : q.correctAnswer);

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

                  {/* Drag & Drop Display */}
                  {(q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') && (
                    <div className="space-y-4">
                      <div className="text-sm font-medium text-slate-600 mb-2">Drop Zones:</div>
                      {q.dropZones?.map((zone) => {
                        const userAnswer = answer?.[zone.id];
                        const isZoneCorrect = userAnswer === zone.correctAnswer;
                        
                        return (
                          <div key={zone.id} className={cn(
                            "p-4 rounded-lg border-2",
                            isZoneCorrect ? "bg-emerald-50 border-emerald-400" : "bg-red-50 border-red-400"
                          )}>
                            <div className="font-medium text-slate-800 mb-2">{zone.label}</div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="text-sm text-slate-600 mb-1">Your answer:</div>
                                <div className={cn(
                                  "font-medium",
                                  isZoneCorrect ? "text-emerald-700" : "text-red-700"
                                )}>
                                  {userAnswer || '(not answered)'}
                                </div>
                              </div>
                              {!isZoneCorrect && (
                                <div className="flex-1">
                                  <div className="text-sm text-slate-600 mb-1">Correct answer:</div>
                                  <div className="font-medium text-emerald-700">{zone.correctAnswer}</div>
                                </div>
                              )}
                              {isZoneCorrect ? (
                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                              ) : (
                                <X className="w-6 h-6 text-red-600" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Fill in the Blanks Display */}
                  {(q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') && (
                    <div className="space-y-4">
                      <div className="text-sm font-medium text-slate-600 mb-2">Fill in the blanks:</div>
                      {/* Show text with blanks color coded */}
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="text-slate-800 leading-relaxed">
                          {(() => {
                            let text = q.textWithBlanks || '';
                            const blanks = q.blanks || [];
                            
                            // Replace each blank placeholder with colored answer
                            blanks.forEach((blank, idx) => {
                              const userAnswer = answer?.[blank.id];
                              const isBlankCorrect = userAnswer === blank.correctAnswer;
                              const displayText = userAnswer || '___';
                              
                              const colorClass = isBlankCorrect ? 'text-emerald-700 font-bold bg-emerald-100' : 'text-red-700 font-bold bg-red-100';
                              const replacement = `<span class="px-2 py-1 rounded ${colorClass}">${displayText}</span>`;
                              
                              text = text.replace(`[blank${idx + 1}]`, replacement);
                            });
                            
                            return <div dangerouslySetInnerHTML={{ __html: text }} />;
                          })()}
                        </div>
                      </div>
                      
                      {/* Show detailed breakdown */}
                      <div className="space-y-2">
                        {q.blanks?.map((blank, idx) => {
                          const userAnswer = answer?.[blank.id];
                          const isBlankCorrect = userAnswer === blank.correctAnswer;
                          
                          return (
                            <div key={blank.id} className={cn(
                              "p-3 rounded-lg border-2 flex items-center gap-3",
                              isBlankCorrect ? "bg-emerald-50 border-emerald-400" : "bg-red-50 border-red-400"
                            )}>
                              <div className="font-medium text-slate-600">Blank {idx + 1}:</div>
                              <div className="flex-1 flex items-center gap-3">
                                <div>
                                  <span className="text-sm text-slate-600">Your answer: </span>
                                  <span className={cn(
                                    "font-medium",
                                    isBlankCorrect ? "text-emerald-700" : "text-red-700"
                                  )}>
                                    {userAnswer || '(not answered)'}
                                  </span>
                                </div>
                                {!isBlankCorrect && (
                                  <div>
                                    <span className="text-sm text-slate-600">Correct: </span>
                                    <span className="font-medium text-emerald-700">{blank.correctAnswer}</span>
                                  </div>
                                )}
                              </div>
                              {isBlankCorrect ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <X className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Matching List Display */}
                  {q.type === 'matching_list_dual' && (
                    <div className="space-y-4">
                      <div className="text-sm font-medium text-slate-600 mb-2">Matching:</div>
                      {q.matchingQuestions?.map((mq) => {
                        const userAnswer = answer?.[mq.id];
                        const isMatchCorrect = userAnswer === mq.correctAnswer;
                        
                        return (
                          <div key={mq.id} className={cn(
                            "p-4 rounded-lg border-2",
                            isMatchCorrect ? "bg-emerald-50 border-emerald-400" : "bg-red-50 border-red-400"
                          )}>
                            <div className="font-medium text-slate-800 mb-2" dangerouslySetInnerHTML={{ __html: mq.question }} />
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="text-sm text-slate-600 mb-1">Your answer:</div>
                                <div className={cn(
                                  "font-medium",
                                  isMatchCorrect ? "text-emerald-700" : "text-red-700"
                                )}>
                                  {userAnswer || '(not answered)'}
                                </div>
                              </div>
                              {!isMatchCorrect && (
                                <div className="flex-1">
                                  <div className="text-sm text-slate-600 mb-1">Correct answer:</div>
                                  <div className="font-medium text-emerald-700">{mq.correctAnswer}</div>
                                </div>
                              )}
                              {isMatchCorrect ? (
                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                              ) : (
                                <X className="w-6 h-6 text-red-600" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* AI Explanation for Wrong Answers */}
                {!isCorrect && (
                  <div className="mt-4">
                    {aiExplanations[idx] ? (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-blue-900 mb-1">AI Explanation</div>
                            <div className="text-sm text-blue-800 leading-relaxed">{aiExplanations[idx]}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => generateSingleExplanation(idx)}
                        disabled={loadingExplanations[idx]}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        {loadingExplanations[idx] ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate AI Explanation
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {/* Manual Explanation */}
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
          <Link to={courseId ? createPageUrl(`CourseDetail?id=${courseId}`) : createPageUrl('Home')}>
            <Button size="lg" className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back to Course
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}