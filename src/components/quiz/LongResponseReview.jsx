import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, RefreshCw, CheckCircle2, AlertCircle, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { toast } from 'sonner';

export default function LongResponseReview({ 
  question, 
  answer, 
  questionIndex,
  savedMarks,
  onMarkingComplete,
  aiConfig,
  isAdmin 
}) {
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [markingResult, setMarkingResult] = useState(savedMarks || null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (savedMarks) {
      setMarkingResult(savedMarks);
    }
  }, [savedMarks]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(Math.max(newWidth, 30), 70));
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMarkAnswer = async () => {
    if (!aiConfig?.api_key || !aiConfig?.model_name) {
      toast.error('AI configuration not found');
      return;
    }

    setIsMarking(true);
    try {
      const genAI = new GoogleGenerativeAI(aiConfig.api_key);
      const model = genAI.getGenerativeModel({ model: aiConfig.model_name });

      const totalMarks = question.marks || 10;
      const prompt = `You are an experienced teacher marking a student's long-form written response. 
      
QUESTION (Left Pane):
${question.question?.replace(/<[^>]*>/g, '') || 'No question provided'}

${question.rightPaneQuestion ? `TASK (Right Pane):
${question.rightPaneQuestion.replace(/<[^>]*>/g, '')}` : ''}

MARKING CRITERIA:
${question.marking_criteria || 'Mark based on relevance, clarity, and completeness.'}

TOTAL MARKS AVAILABLE: ${totalMarks}

STUDENT'S RESPONSE:
${answer?.replace(/<[^>]*>/g, '') || '(No response provided)'}

TASK: Mark the student's response according to the marking criteria.

Return a JSON response in this exact format:
{
  "marks_awarded": <number between 0 and ${totalMarks}>,
  "feedback": "<constructive feedback explaining the mark, what was done well, and areas for improvement. Use HTML formatting with <p>, <strong>, <ul>, <li> tags for clarity.>"
}

Be fair but rigorous in your marking. Consider:
1. How well the response addresses the question/task
2. Quality of evidence/examples used
3. Clarity of expression and structure
4. Completeness of the response

Return ONLY the JSON object, no other text.`;

      console.log('=== LONG RESPONSE MARKING PROMPT ===');
      console.log(prompt);
      console.log('====================================');

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('=== LONG RESPONSE MARKING RESPONSE ===');
      console.log(text);
      console.log('======================================');

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const markingData = {
        marks_awarded: Math.min(Math.max(parsed.marks_awarded || 0, 0), totalMarks),
        total_marks: totalMarks,
        feedback: parsed.feedback || 'No feedback provided.',
        marked_at: new Date().toISOString()
      };

      setMarkingResult(markingData);
      
      // Save to attempt
      if (onMarkingComplete) {
        onMarkingComplete(questionIndex, markingData);
      }

      toast.success('Answer marked successfully');
    } catch (error) {
      console.error('Error marking answer:', error);
      toast.error('Failed to mark answer: ' + error.message);
    } finally {
      setIsMarking(false);
    }
  };

  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  };

  return (
    <div ref={containerRef} className="h-full flex select-none">
      {/* Left Pane - Question */}
      <div 
        className="overflow-y-auto bg-slate-50 border-r border-slate-200 flex flex-col"
        style={{ width: `${leftWidth}%` }}
      >
        <div className="p-6 flex-1">
          <div 
            className="prose prose-sm max-w-none prose-p:my-2 prose-headings:mb-2 prose-img:my-2"
            dangerouslySetInnerHTML={{ __html: question.question || '<p class="text-slate-400">No question provided</p>' }} 
          />
        </div>
      </div>

      {/* Draggable Divider */}
      <div
        className={cn(
          "w-2 bg-slate-200 hover:bg-indigo-300 cursor-col-resize flex items-center justify-center transition-colors",
          isDragging && "bg-indigo-400"
        )}
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>

      {/* Right Pane - Answer & Marking */}
      <div 
        className="overflow-y-auto bg-white flex flex-col"
        style={{ width: `${100 - leftWidth}%` }}
      >
        <div className="p-6 flex-1 space-y-6">
          {/* Right Pane Question */}
          {question.rightPaneQuestion && (
            <div className="pb-4 border-b border-slate-200">
              <div 
                className="prose prose-sm max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: question.rightPaneQuestion }}
              />
            </div>
          )}

          {/* Marking Info */}
          {question.marks && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-slate-600">Total Marks:</span>
              <span className="bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
              </span>
            </div>
          )}

          {/* Student's Answer */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Student's Response:</label>
            <div 
              className={cn(
                "min-h-[200px] p-4 border rounded-lg bg-slate-50",
                !answer && "text-slate-400 italic"
              )}
            >
              {answer ? (
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: answer }}
                />
              ) : (
                <p>No response provided</p>
              )}
            </div>
          </div>

          {/* Marking Section */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            {!markingResult && !isMarking && isAdmin && (
              <Button
                onClick={handleMarkAnswer}
                className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                size="lg"
              >
                <Sparkles className="w-4 h-4" />
                Mark Answer with AI
              </Button>
            )}
            
            {!markingResult && !isMarking && !isAdmin && (
              <div className="text-center text-slate-500 text-sm p-4 bg-slate-50 rounded-lg">
                This response has not been marked yet.
              </div>
            )}

            {isMarking && (
              <div className="flex items-center justify-center gap-3 p-8 bg-slate-50 rounded-xl border border-slate-200">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="text-slate-600 font-medium">AI is marking your response...</span>
              </div>
            )}

            {markingResult && (
              <div className="space-y-4">
                {/* Score Display */}
                <div className={cn(
                  "p-4 rounded-xl border-2",
                  markingResult.marks_awarded >= markingResult.total_marks * 0.7 
                    ? "bg-emerald-50 border-emerald-200" 
                    : markingResult.marks_awarded >= markingResult.total_marks * 0.5
                    ? "bg-amber-50 border-amber-200"
                    : "bg-red-50 border-red-200"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {markingResult.marks_awarded >= markingResult.total_marks * 0.7 ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                      )}
                      <span className="font-semibold text-slate-800">AI Marking Result</span>
                    </div>
                    <div className="text-2xl font-bold">
                      <span className={cn(
                        markingResult.marks_awarded >= markingResult.total_marks * 0.7 
                          ? "text-emerald-600" 
                          : markingResult.marks_awarded >= markingResult.total_marks * 0.5
                          ? "text-amber-600"
                          : "text-red-600"
                      )}>
                        {markingResult.marks_awarded}
                      </span>
                      <span className="text-slate-400 text-lg"> / {markingResult.total_marks}</span>
                    </div>
                  </div>
                </div>

                {/* Feedback */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-800 mb-2">Feedback:</h4>
                  <div 
                    className="prose prose-sm max-w-none text-slate-700"
                    dangerouslySetInnerHTML={{ __html: markingResult.feedback }}
                  />
                </div>

                {/* Regenerate Button */}
                {isAdmin && (
                  <Button
                    onClick={handleMarkAnswer}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isMarking}
                  >
                    {isMarking ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Re-mark Answer
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}