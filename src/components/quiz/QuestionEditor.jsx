import React from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Copy, Sparkles, Loader2, Eye, Download, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import RichTextEditor from '@/components/quiz/RichTextEditor';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function QuestionEditor({ question, onChange, onDelete, isCollapsed, onToggleCollapse, existingQuestionNames = [], onPreview, onCopy, onExport, onEditSchema }) {
  const [aiInput, setAiInput] = React.useState('');
  const [aiLoading, setAiLoading] = React.useState(false);
  const [showAiInput, setShowAiInput] = React.useState(false);
  const [selectedAnswers, setSelectedAnswers] = React.useState(() => {
    // Initialize from question data
    const answers = {};
    (question.blanks || []).forEach((blank, idx) => {
      answers[idx] = blank.correctAnswer;
    });
    return answers;
  });
  const updateTimeoutRef = React.useRef(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    // Sync selected answers when question.blanks changes
    const answers = {};
    (question.blanks || []).forEach((blank, idx) => {
      answers[idx] = blank.correctAnswer;
    });
    // Only update if actually different to avoid unnecessary re-renders
    setSelectedAnswers(prev => {
      const isDifferent = Object.keys(answers).some(key => answers[key] !== prev[key]) || 
                          Object.keys(prev).length !== Object.keys(answers).length;
      return isDifferent ? answers : prev;
    });
  }, [question.id, JSON.stringify(question.blanks?.map(b => b.correctAnswer))]);

  const updateField = (field, value) => {
    onChange({ ...question, [field]: value });
  };

  const addOption = () => {
    const options = [...(question.options || []), ''];
    updateField('options', options);
  };

  const updateOption = (index, value) => {
    const options = [...(question.options || [])];
    options[index] = value;
    updateField('options', options);
  };

  const removeOption = (index) => {
    const options = question.options.filter((_, i) => i !== index);
    updateField('options', options);
  };

  // Reading Comprehension handlers
  const addComprehensionQuestion = () => {
    const questions = [...(question.comprehensionQuestions || [])];
    questions.push({
      id: `cq_${Date.now()}`,
      question: '',
      options: ['', '', '', ''],
      correctAnswer: ''
    });
    updateField('comprehensionQuestions', questions);
  };

  const updateComprehensionQuestion = (index, field, value) => {
    const questions = [...(question.comprehensionQuestions || [])];
    questions[index] = { ...questions[index], [field]: value };
    updateField('comprehensionQuestions', questions);
  };

  const removeComprehensionQuestion = (index) => {
    const questions = question.comprehensionQuestions.filter((_, i) => i !== index);
    updateField('comprehensionQuestions', questions);
  };

  const handleAiParse = async (qIdx) => {
    if (!aiInput.trim()) {
      toast.error('Please enter text to parse');
      return;
    }

    setAiLoading(true);
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI('AIzaSyAF6MLByaemR1D8Zh1Ujz4lBfU_rcmMu98');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      const prompt = `Parse the following unformatted text into a quiz question with options and correct answer. The text may contain the question, multiple choice options (A, B, C, D or 1, 2, 3, 4 or just listed), and the correct answer. Extract and separate these parts intelligently.

Return ONLY a JSON object with this exact structure:
{
  "question": "the question text",
  "options": ["option1", "option2", "option3", "option4"],
  "correctAnswer": "the correct option text (must match one of the options exactly)"
}

Text to parse:
${aiInput}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Create completely new question object with updated data
      const questions = [...(question.comprehensionQuestions || [])];
      const newQuestion = {
        id: `cq_${Date.now()}`,
        question: parsed.question,
        options: [...parsed.options],
        correctAnswer: parsed.correctAnswer
      };
      
      questions[qIdx] = newQuestion;
      
      // Call onChange and wait before any state updates
      onChange({
        ...question,
        comprehensionQuestions: questions
      });
      
      // Auto-close after successful parse
      setTimeout(() => {
        setAiLoading(false);
        setAiInput('');
        setShowAiInput(false);
        toast.success('Question auto-filled successfully!');
      }, 100);
    } catch (error) {
      toast.error('Failed to parse question: ' + error.message);
      setAiLoading(false);
    }
  };

  const handleMatchingBulkAiParse = async () => {
    if (!aiInput.trim()) {
      toast.error('Please enter text to parse');
      return;
    }

    setAiLoading(true);
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI('AIzaSyAF6MLByaemR1D8Zh1Ujz4lBfU_rcmMu98');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      const prompt = `Parse the following text into multiple matching questions with their correct answers. Extract each question and its corresponding correct answer. Keep the original sentences without rephrasing. Individual letters correspond to the correct answer for that line.

Return ONLY a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "question text 1",
      "correctAnswer": "correct answer 1"
    },
    {
      "question": "question text 2",
      "correctAnswer": "correct answer 2"
    }
  ]
}

Text to parse:
${aiInput}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      const newQuestions = parsed.questions.map(q => ({
        id: `mq_${Date.now()}_${Math.random()}`,
        question: q.question,
        correctAnswer: q.correctAnswer
      }));
      
      onChange({
        ...question,
        matchingQuestions: newQuestions
      });
      
      requestAnimationFrame(() => {
        toast.success(`${newQuestions.length} questions auto-filled successfully!`);
        setAiInput('');
        setShowAiInput(false);
        setAiLoading(false);
      });
    } catch (error) {
      toast.error('Failed to parse questions: ' + error.message);
      setAiLoading(false);
    }
  };

  const handleDragDropAiParse = async () => {
    if (!aiInput.trim()) {
      toast.error('Please enter text to parse');
      return;
    }

    setAiLoading(true);
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI('AIzaSyAF6MLByaemR1D8Zh1Ujz4lBfU_rcmMu98');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      const prompt = `Parse the following text to extract a list of draggable items/options for a drag and drop question. Extract all the items that should be draggable.

Return ONLY a JSON object with this exact structure:
{
  "options": ["item1", "item2", "item3", "item4"]
}

Text to parse:
${aiInput}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      onChange({
        ...question,
        options: parsed.options
      });
      
      requestAnimationFrame(() => {
        toast.success('Options auto-filled successfully!');
        setAiInput('');
        setShowAiInput(false);
        setAiLoading(false);
      });
    } catch (error) {
      toast.error('Failed to parse options: ' + error.message);
      setAiLoading(false);
    }
  };

  // Drop Zone handlers
  const addDropZone = () => {
    const zones = [...(question.dropZones || [])];
    zones.push({
      id: `zone_${Date.now()}`,
      label: '',
      correctAnswer: ''
    });
    updateField('dropZones', zones);
  };

  const updateDropZone = (index, field, value) => {
    const zones = [...(question.dropZones || [])];
    zones[index] = { ...zones[index], [field]: value };
    updateField('dropZones', zones);
  };

  const removeDropZone = (index) => {
    const zones = question.dropZones.filter((_, i) => i !== index);
    updateField('dropZones', zones);
  };

  // Inline Dropdown handlers
  const addBlank = () => {
    const blanks = [...(question.blanks || [])];
    // Find the next available blank number
    const existingNumbers = blanks.map(b => {
      const match = b.id.match(/blank_(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    const blankId = `blank_${nextNumber}`;
    
    blanks.push({
      id: blankId,
      options: ['', '', '', ''],
      correctAnswer: ''
    });
    
    updateField('blanks', blanks);
  };

  const updateBlank = (index, field, value) => {
    const blanks = [...(question.blanks || [])];
    blanks[index] = { ...blanks[index], [field]: value };
    updateField('blanks', blanks);
  };

  const removeBlank = (index) => {
    const blanks = question.blanks.filter((_, i) => i !== index);
    updateField('blanks', blanks);
  };

  const typeLabels = {
    multiple_choice: 'Multiple Choice',
    reading_comprehension: 'Reading Comprehension',
    drag_drop_single: 'Drag & Drop (Single Pane)',
    drag_drop_dual: 'Drag & Drop (Dual Pane)',
    inline_dropdown_separate: 'Fill in the Blanks (Separate Options)',
    inline_dropdown_same: 'Fill in the Blanks (Same Options)',
    matching_list_dual: 'Matching List (Dual Pane)',
    long_response_dual: 'Long Response (Dual Pane)'
  };

  // Matching List handlers
  const addMatchingQuestion = () => {
    const questions = [...(question.matchingQuestions || [])];
    questions.push({
      id: `mq_${Date.now()}`,
      question: '',
      correctAnswer: ''
    });
    updateField('matchingQuestions', questions);
  };

  const updateMatchingQuestion = (index, field, value) => {
    const questions = [...(question.matchingQuestions || [])];
    questions[index] = { ...questions[index], [field]: value };
    updateField('matchingQuestions', questions);
  };

  const removeMatchingQuestion = (index) => {
    const questions = question.matchingQuestions.filter((_, i) => i !== index);
    updateField('matchingQuestions', questions);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="gap-2 h-8"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-4 h-4" />
                Expand
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4" />
                Collapse
              </>
            )}
          </Button>

          {!isCollapsed && (
            <Select
              value={question.type || ''}
              onValueChange={(value) => updateField('type', value)}
            >
              <SelectTrigger className="w-56 h-8">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onPreview && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onPreview}
              className="text-slate-500 hover:text-indigo-600 h-8 w-8"
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
          {onCopy && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCopy}
              className="text-slate-500 hover:text-indigo-600 h-8 w-8"
              title="Copy as JSON"
            >
              <Copy className="w-4 h-4" />
            </Button>
          )}
          {onExport && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onExport}
              className="text-slate-500 hover:text-indigo-600 h-8 w-8"
              title="Export"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
          {onEditSchema && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onEditSchema}
              className="text-slate-500 hover:text-indigo-600 h-8 w-8"
              title="Edit Schema"
            >
              <Code className="w-4 h-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-red-500 hover:text-red-600 h-8 w-8"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="space-y-1 relative">
            <Label className="text-sm">Question Name (optional)</Label>
            <Input
              value={question.questionName || ''}
              onChange={(e) => updateField('questionName', e.target.value)}
              onBlur={async (e) => {
                const newName = e.target.value.trim();
                if (newName && !existingQuestionNames.includes(newName)) {
                  try {
                    await base44.entities.QuestionName.create({ name: newName });
                    queryClient.invalidateQueries({ queryKey: ['questionNames'] });
                  } catch (err) {
                    console.error('Failed to save question name:', err);
                  }
                }
              }}
              placeholder="e.g., 'Introduction', 'Main Analysis', 'Summary'..."
              list={`question-names-${question.id}`}
              className="h-8 text-sm"
            />
            <datalist id={`question-names-${question.id}`}>
              {existingQuestionNames.map((name, idx) => (
                <option key={idx} value={name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Question</Label>
            <RichTextEditor
              value={question.question || ''}
              onChange={(value) => updateField('question', value)}
              placeholder="Enter your question..."
              minHeight="80px"
            />
          </div>

          {/* Multiple Choice Options */}
          {question.type === 'multiple_choice' && (
        <div className="space-y-2">
          <Label className="text-sm">Answer Options</Label>
          {question.options?.map((option, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct_${question.id}`}
                checked={question.correctAnswer === option && option !== ''}
                onChange={() => updateField('correctAnswer', option)}
                className="w-4 h-4 text-indigo-600 flex-shrink-0"
              />
              <Input
                value={option}
                onChange={(e) => updateOption(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                className="flex-1 h-8 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeOption(idx)}
                className="text-slate-400 hover:text-red-500 h-8 w-8"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addOption} className="gap-2 h-8 text-xs">
            <Plus className="w-3 h-3" />
            Add Option
          </Button>
        </div>
      )}

      {/* Reading Comprehension */}
      {question.type === 'reading_comprehension' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <Label>Reading Passages</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const passages = question.passages || [];
                  updateField('passages', [
                    ...passages,
                    { id: `passage_${Date.now()}`, title: `Passage ${passages.length + 1}`, content: '' }
                  ]);
                }}
                className="gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Passage
              </Button>
            </div>
            
            {(!question.passages || question.passages.length === 0) && (
              <div className="space-y-2">
                <Input
                  placeholder="Passage title..."
                  value="Main Passage"
                  disabled
                  className="font-medium text-sm"
                />
                <RichTextEditor
                  value={question.passage || ''}
                  onChange={(value) => updateField('passage', value)}
                  placeholder="Enter the reading passage..."
                  minHeight="150px"
                />
              </div>
            )}
            
            {question.passages?.map((passage, idx) => (
              <div key={passage.id} className="space-y-2 p-4 bg-slate-50 rounded-lg mb-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Passage title..."
                    value={passage.title || ''}
                    onChange={(e) => {
                      const updated = [...question.passages];
                      updated[idx] = { ...passage, title: e.target.value };
                      updateField('passages', updated);
                    }}
                    className="font-medium text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const updated = question.passages.filter((_, i) => i !== idx);
                      updateField('passages', updated);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <RichTextEditor
                  value={passage.content || ''}
                  onChange={(value) => {
                    const updated = [...question.passages];
                    updated[idx] = { ...passage, content: value };
                    updateField('passages', updated);
                  }}
                  placeholder="Enter the reading passage..."
                  minHeight="120px"
                />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Comprehension Questions</Label>
            </div>
            {question.comprehensionQuestions?.map((cq, qIdx) => (
              <div key={cq.id} className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Question {qIdx + 1}</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAiInput(showAiInput === qIdx ? false : qIdx)}
                    className="gap-2 h-8"
                  >
                    <Sparkles className="w-3 h-3" />
                    AI Parse
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeComprehensionQuestion(qIdx)}
                    className="text-red-500 h-8"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                </div>

                {showAiInput === qIdx && (
                  <div className="space-y-2 p-3 bg-white rounded-lg border-2 border-indigo-200">
                    <Label className="text-xs text-indigo-700 font-semibold">AI Parse Input</Label>
                    <Textarea
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="Paste or type: Question text? A) Option 1 B) Option 2 C) Option 3 D) Option 4. Answer: B"
                      className="min-h-[100px] text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAiParse(qIdx)}
                        disabled={aiLoading}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                      >
                        {aiLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Parsing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            Auto-fill
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowAiInput(false);
                          setAiInput('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-xs">Question</Label>
                  <RichTextEditor
                    value={cq.question}
                    onChange={(value) => updateComprehensionQuestion(qIdx, 'question', value)}
                    placeholder="Enter comprehension question..."
                    minHeight="80px"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Options</Label>
                  {cq.options?.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct_cq_${cq.id}`}
                        checked={cq.correctAnswer === opt && opt !== ''}
                        onChange={() => updateComprehensionQuestion(qIdx, 'correctAnswer', opt)}
                        className="w-3 h-3 text-indigo-600"
                      />
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const options = [...cq.options];
                          options[optIdx] = e.target.value;
                          updateComprehensionQuestion(qIdx, 'options', options);
                        }}
                        placeholder={`Option ${optIdx + 1}`}
                        className="text-sm h-9 flex-1"
                      />
                      {cq.options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const options = cq.options.filter((_, i) => i !== optIdx);
                            updateComprehensionQuestion(qIdx, 'options', options);
                          }}
                          className="text-slate-400 hover:text-red-500 h-9 w-9"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const options = [...(cq.options || []), ''];
                      updateComprehensionQuestion(qIdx, 'options', options);
                    }}
                    className="gap-2 w-full"
                  >
                    <Plus className="w-3 h-3" />
                    Add Option
                  </Button>
                </div>
                

              </div>
            ))}
            <Button variant="outline" onClick={addComprehensionQuestion} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Question
            </Button>
          </div>
        </div>
      )}

      {/* Drag & Drop Single Pane */}
      {question.type === 'drag_drop_single' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Draggable Options</Label>
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-slate-400" />
                <Input
                  value={option}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Item ${idx + 1}`}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(idx)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addOption} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Draggable Item
            </Button>
          </div>

          <div className="space-y-4">
            <Label>Drop Zones</Label>
            {question.dropZones?.map((zone, idx) => (
              <div key={zone.id} className="flex items-center gap-3">
                <Input
                  value={zone.label}
                  onChange={(e) => updateDropZone(idx, 'label', e.target.value)}
                  placeholder="Zone label..."
                  className="flex-1"
                />
                <Select
                  value={zone.correctAnswer || ''}
                  onValueChange={(value) => updateDropZone(idx, 'correctAnswer', value)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Correct..." />
                  </SelectTrigger>
                  <SelectContent>
                    {question.options?.filter(o => o).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDropZone(idx)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addDropZone} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Drop Zone
            </Button>
          </div>
        </div>
      )}

      {/* Drag & Drop Dual Pane */}
      {question.type === 'drag_drop_dual' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Left Pane Question (shown with passage)</Label>
            <RichTextEditor
              value={question.question || ''}
              onChange={(value) => updateField('question', value)}
              placeholder="Enter question text for left pane..."
            />
          </div>

          <div className="space-y-2">
            <Label>Right Pane Question (shown above drag & drop activity)</Label>
            <RichTextEditor
              value={question.rightPaneQuestion || ''}
              onChange={(value) => updateField('rightPaneQuestion', value)}
              placeholder="Enter question text for right pane..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <Label>Reading Passage</Label>
            </div>
            
            {(!question.passages || question.passages.length === 0) && (
              <div className="space-y-2">
                <Input
                  placeholder="Passage title..."
                  value="Main Passage"
                  disabled
                  className="font-medium text-sm"
                />
                <RichTextEditor
                  value={question.passage || ''}
                  onChange={(value) => updateField('passage', value)}
                  placeholder="Enter the reading passage..."
                  minHeight="150px"
                />
              </div>
            )}
            
            {question.passages?.map((passage, idx) => (
              <div key={passage.id} className="space-y-2 p-4 bg-slate-50 rounded-lg mb-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Passage title..."
                    value={passage.title || ''}
                    onChange={(e) => {
                      const updated = [...question.passages];
                      updated[idx] = { ...passage, title: e.target.value };
                      updateField('passages', updated);
                    }}
                    className="font-medium text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const updated = question.passages.filter((_, i) => i !== idx);
                      updateField('passages', updated);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <RichTextEditor
                  value={passage.content || ''}
                  onChange={(value) => {
                    const updated = [...question.passages];
                    updated[idx] = { ...passage, content: value };
                    updateField('passages', updated);
                  }}
                  placeholder="Enter the reading passage..."
                  minHeight="120px"
                />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Draggable Options</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAiInput(showAiInput === 'dragdrop' ? false : 'dragdrop')}
                className="gap-2 h-8"
              >
                <Sparkles className="w-3 h-3" />
                AI Parse
              </Button>
            </div>

            {showAiInput === 'dragdrop' && (
              <div className="space-y-2 p-3 bg-white rounded-lg border-2 border-indigo-200 mb-3">
                <Label className="text-xs text-indigo-700 font-semibold">AI Parse Input</Label>
                <Textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Paste or type: Item A, Item B, Item C, Item D"
                  className="min-h-[100px] text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleDragDropAiParse()}
                    disabled={aiLoading}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        Auto-fill
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAiInput(false);
                      setAiInput('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-slate-400" />
                <Input
                  value={option}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Item ${idx + 1}`}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(idx)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addOption} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Draggable Item
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Drop Zones</Label>
            </div>
            <Button variant="outline" onClick={addDropZone} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Drop Zone
            </Button>
            {question.dropZones?.map((zone, idx) => (
              <div key={zone.id} className="flex items-center gap-3">
                <Input
                  value={zone.label}
                  onChange={(e) => updateDropZone(idx, 'label', e.target.value)}
                  placeholder="Zone label..."
                  className="flex-1"
                />
                <Select
                  value={zone.correctAnswer || ''}
                  onValueChange={(value) => updateDropZone(idx, 'correctAnswer', value)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Correct..." />
                  </SelectTrigger>
                  <SelectContent>
                    {question.options?.filter(o => o).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDropZone(idx)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inline Dropdown Separate */}
      {question.type === 'inline_dropdown_separate' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Question Text</Label>
            <RichTextEditor
              value={question.textWithBlanks || ''}
              onChange={(value) => updateField('textWithBlanks', value)}
              placeholder="The {{blank_1}} is a type of {{blank_2}}..."
              minHeight="100px"
            />
          </div>

          <div className="space-y-4">
            <Label>Blank Options</Label>
            
            {(question.blanks || []).map((blank, idx) => (
              <div key={blank.id} className="bg-slate-50 rounded-xl p-4 space-y-3 border-2 border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded font-semibold">
                      {`{{${blank.id}}}`}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`{{${blank.id}}}`);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBlank(idx)}
                    className="text-red-500 h-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    {blank.options?.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-slate-200">
                        <input
                            type="radio"
                            name={`correct_blank_${question.id}_${blank.id}`}
                            checked={(selectedAnswers[idx] !== undefined ? selectedAnswers[idx] : blank.correctAnswer) === opt && opt !== ''}
                            onChange={() => {
                                flushSync(() => {
                                  setSelectedAnswers(prev => ({ ...prev, [idx]: opt }));
                                });
                              updateBlank(idx, 'correctAnswer', opt);
                            }}
                            className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-1"
                          />
                        <div className="flex-1 min-w-0">
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const options = [...blank.options];
                              options[optIdx] = e.target.value;
                              updateBlank(idx, 'options', options);
                            }}
                            placeholder={`Option ${optIdx + 1}`}
                            className="text-sm h-9"
                          />
                        </div>
                        {blank.options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const options = blank.options.filter((_, i) => i !== optIdx);
                              updateBlank(idx, 'options', options);
                            }}
                            className="text-slate-400 hover:text-red-500 h-9 w-9 flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const options = [...(blank.options || []), ''];
                      updateBlank(idx, 'options', options);
                    }}
                    className="gap-2 w-full"
                  >
                    <Plus className="w-3 h-3" />
                    Add Option to {blank.id}
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addBlank} className="gap-2 w-full">
              <Plus className="w-4 h-4" />
              Add Blank
            </Button>
          </div>
        </div>
      )}

      {/* Matching List Dual Pane */}
      {question.type === 'matching_list_dual' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Left Pane Question (shown with passage)</Label>
            <RichTextEditor
              value={question.question || ''}
              onChange={(value) => updateField('question', value)}
              placeholder="Enter question text for left pane..."
            />
          </div>

          <div className="space-y-2">
            <Label>Right Pane Question (shown above matching list)</Label>
            <RichTextEditor
              value={question.rightPaneQuestion || ''}
              onChange={(value) => updateField('rightPaneQuestion', value)}
              placeholder="Enter question text for right pane..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <Label>Reading Passages</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const passages = question.passages || [];
                  updateField('passages', [
                    ...passages,
                    { id: `passage_${Date.now()}`, title: `Passage ${passages.length + 1}`, content: '' }
                  ]);
                }}
                className="gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Passage
              </Button>
            </div>
            
            {(!question.passages || question.passages.length === 0) && (
              <div className="space-y-2">
                <Input
                  placeholder="Passage title..."
                  value="Main Passage"
                  disabled
                  className="font-medium text-sm"
                />
                <RichTextEditor
                  value={question.passage || ''}
                  onChange={(value) => updateField('passage', value)}
                  placeholder="Enter the reading passage..."
                  minHeight="150px"
                />
              </div>
            )}
            
            {question.passages?.map((passage, idx) => (
              <div key={passage.id} className="space-y-2 p-4 bg-slate-50 rounded-lg mb-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Passage title..."
                    value={passage.title || ''}
                    onChange={(e) => {
                      const updated = [...question.passages];
                      updated[idx] = { ...passage, title: e.target.value };
                      updateField('passages', updated);
                    }}
                    className="font-medium text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const updated = question.passages.filter((_, i) => i !== idx);
                      updateField('passages', updated);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <RichTextEditor
                  value={passage.content || ''}
                  onChange={(value) => {
                    const updated = [...question.passages];
                    updated[idx] = { ...passage, content: value };
                    updateField('passages', updated);
                  }}
                  placeholder="Enter the reading passage..."
                  minHeight="120px"
                />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Label>Dropdown Options (shared across all matching questions)</Label>
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Input
                  value={option}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(idx)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addOption} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Option
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Matching Questions</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAiInput(showAiInput === 'matching_bulk' ? false : 'matching_bulk')}
                className="gap-2 h-8"
              >
                <Sparkles className="w-3 h-3" />
                AI Parse All
              </Button>
            </div>

            {showAiInput === 'matching_bulk' && (
              <div className="space-y-2 p-3 bg-white rounded-lg border-2 border-indigo-200 mb-3">
                <Label className="text-xs text-indigo-700 font-semibold">AI Parse Input</Label>
                <Textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Paste multiple questions with answers, e.g.: Q1. Question? Answer: A Q2. Question? Answer: B"
                  className="min-h-[120px] text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleMatchingBulkAiParse()}
                    disabled={aiLoading}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        Auto-fill All
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAiInput(false);
                      setAiInput('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {question.matchingQuestions?.map((mq, qIdx) => (
              <div key={mq.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <span className="text-xs font-medium text-slate-500 w-16">Q{qIdx + 1}</span>
                <Input
                  value={mq.question}
                  onChange={(e) => updateMatchingQuestion(qIdx, 'question', e.target.value)}
                  placeholder="Enter matching question..."
                  className="flex-1 h-9"
                />
                <Select
                  value={mq.correctAnswer || ''}
                  onValueChange={(value) => updateMatchingQuestion(qIdx, 'correctAnswer', value)}
                >
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue placeholder="Answer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {question.options?.filter(o => o).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMatchingQuestion(qIdx)}
                  className="text-slate-400 hover:text-red-500 h-9 w-9"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addMatchingQuestion} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Matching Question
            </Button>
          </div>
        </div>
      )}

      {/* Long Response Dual Pane */}
      {question.type === 'long_response_dual' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Question Text (Left Pane)</Label>
            <RichTextEditor
              value={question.question || ''}
              onChange={(value) => updateField('question', value)}
              placeholder="Enter the essay prompt or question here..."
              minHeight="200px"
            />
          </div>

          <div className="space-y-2">
            <Label>Marking Criteria (for AI Grading)</Label>
            <p className="text-xs text-slate-500">
              Describe how this question should be marked. Include key points, required structure, or specific vocabulary.
            </p>
            <Textarea
              value={question.marking_criteria || ''}
              onChange={(e) => updateField('marking_criteria', e.target.value)}
              placeholder="e.g. 1. Addresses the main argument (2 marks) 2. Uses evidence from text (3 marks)..."
              className="min-h-[150px]"
            />
          </div>
        </div>
      )}

      {/* Inline Dropdown Same */}
      {question.type === 'inline_dropdown_same' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Text with Blanks</Label>
            <p className="text-xs text-slate-500">
              Use {"{{blank_1}}"}, {"{{blank_2}}"}, etc. to mark where dropdowns should appear
            </p>
            <RichTextEditor
              value={question.textWithBlanks || ''}
              onChange={(value) => updateField('textWithBlanks', value)}
              placeholder="The {{blank_1}} is a type of {{blank_2}}..."
              minHeight="100px"
            />
          </div>

          <div className="space-y-4">
            <Label>Shared Options (for all blanks)</Label>
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Input
                  value={option}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(idx)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addOption} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Option
            </Button>
          </div>

          <div className="space-y-4">
            <Label>Correct Answers for Each Blank</Label>
            {question.blanks?.map((blank, idx) => (
              <div key={blank.id} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                <span className="font-mono text-sm bg-slate-200 px-2 py-1 rounded">
                  {`{{${blank.id}}}`}
                </span>
                <Select
                  value={blank.correctAnswer || ''}
                  onValueChange={(value) => updateBlank(idx, 'correctAnswer', value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select correct answer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {question.options?.filter(o => o).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBlank(idx)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => {
              const blanks = [...(question.blanks || [])];
              const blankId = `blank_${blanks.length + 1}`;
              blanks.push({
                id: blankId,
                correctAnswer: ''
              });
              const text = question.textWithBlanks || '';
              onChange({
                ...question,
                blanks: blanks,
                textWithBlanks: text + ` {{${blankId}}}`
              });
            }} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Blank
            </Button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}