import React from 'react';
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
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function QuestionEditor({ question, onChange, onDelete }) {
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
    const blankId = `blank_${blanks.length + 1}`;
    blanks.push({
      id: blankId,
      options: ['', '', ''],
      correctAnswer: ''
    });
    updateField('blanks', blanks);
    
    // Add placeholder to text
    const text = question.textWithBlanks || '';
    updateField('textWithBlanks', text + ` {{${blankId}}}`);
  };

  const updateBlank = (index, field, value) => {
    const blanks = [...(question.blanks || [])];
    blanks[index] = { ...blanks[index], [field]: value };
    updateField('blanks', blanks);
  };

  const removeBlank = (index) => {
    const blank = question.blanks[index];
    const blanks = question.blanks.filter((_, i) => i !== index);
    updateField('blanks', blanks);
    
    // Remove placeholder from text
    const text = question.textWithBlanks?.replace(`{{${blank.id}}}`, '') || '';
    updateField('textWithBlanks', text);
  };

  const typeLabels = {
    multiple_choice: 'Multiple Choice',
    reading_comprehension: 'Reading Comprehension',
    drag_drop: 'Drag & Drop',
    inline_dropdown: 'Fill in the Blanks'
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={question.type || 'multiple_choice'}
                onValueChange={(value) => updateField('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Question</Label>
            <Textarea
              value={question.question || ''}
              onChange={(e) => updateField('question', e.target.value)}
              placeholder="Enter your question..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Explanation (shown when answer is wrong)</Label>
            <Textarea
              value={question.explanation || ''}
              onChange={(e) => updateField('explanation', e.target.value)}
              placeholder="Explain the correct answer..."
              className="min-h-[60px]"
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Multiple Choice Options */}
      {question.type === 'multiple_choice' && (
        <div className="space-y-4">
          <Label>Answer Options</Label>
          {question.options?.map((option, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input
                type="radio"
                name={`correct_${question.id}`}
                checked={question.correctAnswer === option && option !== ''}
                onChange={() => updateField('correctAnswer', option)}
                className="w-4 h-4 text-indigo-600"
              />
              <Textarea
                value={option}
                onChange={(e) => updateOption(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                className="flex-1 min-h-[60px]"
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
                <Textarea
                  value={question.passage || ''}
                  onChange={(e) => updateField('passage', e.target.value)}
                  placeholder="Enter the reading passage..."
                  className="min-h-[150px]"
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
                <Textarea
                  value={passage.content || ''}
                  onChange={(e) => {
                    const updated = [...question.passages];
                    updated[idx] = { ...passage, content: e.target.value };
                    updateField('passages', updated);
                  }}
                  placeholder="Enter the reading passage..."
                  className="min-h-[120px]"
                />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Label>Comprehension Questions</Label>
            {question.comprehensionQuestions?.map((cq, qIdx) => (
              <div key={cq.id} className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">Question {qIdx + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeComprehensionQuestion(qIdx)}
                    className="text-red-500 h-8"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                
                <Input
                  value={cq.question}
                  onChange={(e) => updateComprehensionQuestion(qIdx, 'question', e.target.value)}
                  placeholder="Enter question..."
                />
                
                <div className="grid grid-cols-2 gap-2">
                  {cq.options?.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct_${cq.id}`}
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
                        className="text-sm h-9"
                      />
                    </div>
                  ))}
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

      {/* Drag & Drop */}
      {question.type === 'drag_drop' && (
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

      {/* Inline Dropdown */}
      {question.type === 'inline_dropdown' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Text with Blanks</Label>
            <p className="text-xs text-slate-500">
              Use {"{{blank_1}}"}, {"{{blank_2}}"}, etc. to mark where dropdowns should appear
            </p>
            <Textarea
              value={question.textWithBlanks || ''}
              onChange={(e) => updateField('textWithBlanks', e.target.value)}
              placeholder="The {{blank_1}} is a type of {{blank_2}}..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Blank Options</Label>
            </div>
            <Button type="button" variant="outline" onClick={addBlank} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Blank
            </Button>
            {question.blanks?.map((blank, idx) => (
              <div key={blank.id} className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm bg-slate-200 px-2 py-1 rounded">
                    {`{{${blank.id}}}`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBlank(idx)}
                    className="text-red-500 h-8"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {blank.options?.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct_blank_${blank.id}`}
                        checked={blank.correctAnswer === opt && opt !== ''}
                        onChange={() => updateBlank(idx, 'correctAnswer', opt)}
                        className="w-3 h-3 text-indigo-600"
                      />
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
                  ))}
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addBlank} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Blank
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}