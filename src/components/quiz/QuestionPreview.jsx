import React from 'react';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import ReadingComprehensionQuestion from './ReadingComprehensionQuestion';
import DragDropQuestion from './DragDropQuestion';
import DragDropDualQuestion from './DragDropDualQuestion';
import InlineDropdownQuestion from './InlineDropdownQuestion';
import InlineDropdownSameQuestion from './InlineDropdownSameQuestion';
import InlineDropdownTypedQuestion from './InlineDropdownTypedQuestion';
import MatchingListQuestion from './MatchingListQuestion';
import LongResponseDualQuestion from './LongResponseDualQuestion';

export default function QuestionPreview({ question, index }) {
  // Dummy handlers for preview interaction
  const handleAnswer = () => {};

  const renderQuestion = () => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            question={question}
            selectedAnswer={null}
            onAnswer={handleAnswer}
          />
        );
      case 'reading_comprehension':
        return (
          <div className="h-[600px] border rounded-lg overflow-hidden">
            <ReadingComprehensionQuestion
              question={question}
              selectedAnswers={{}}
              onAnswer={handleAnswer}
            />
          </div>
        );
      case 'drag_drop_single':
        return (
          <DragDropQuestion
            question={question}
            selectedAnswers={{}}
            onAnswer={handleAnswer}
          />
        );
      case 'drag_drop_dual':
        return (
          <div className="h-[600px] border rounded-lg overflow-hidden">
            <DragDropDualQuestion
              question={question}
              selectedAnswers={{}}
              onAnswer={handleAnswer}
            />
          </div>
        );
      case 'inline_dropdown_separate':
        return (
          <InlineDropdownQuestion
            question={question}
            selectedAnswers={{}}
            onAnswer={handleAnswer}
          />
        );
      case 'inline_dropdown_same':
        return (
          <InlineDropdownSameQuestion
            question={question}
            selectedAnswers={{}}
            onAnswer={handleAnswer}
          />
        );
      case 'inline_dropdown_typed':
        return (
          <InlineDropdownTypedQuestion
            question={question}
            selectedAnswers={{}}
            onAnswer={handleAnswer}
          />
        );
      case 'matching_list_dual':
        return (
          <div className="h-[600px] border rounded-lg overflow-hidden">
            <MatchingListQuestion
              question={question}
              selectedAnswers={{}}
              onAnswer={handleAnswer}
            />
          </div>
        );
      case 'long_response_dual':
        return (
          <div className="h-[600px] border rounded-lg overflow-hidden">
            <LongResponseDualQuestion
              question={question}
              selectedAnswer=""
              onAnswer={handleAnswer}
            />
          </div>
        );
      default:
        return <div className="p-4 text-slate-500">Unsupported question type in preview</div>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider">
          Question {index + 1}
        </span>
        <span className="text-xs text-slate-400 uppercase tracking-wider">
          {question.type?.replace(/_/g, ' ')}
        </span>
      </div>
      {renderQuestion()}
    </div>
  );
}