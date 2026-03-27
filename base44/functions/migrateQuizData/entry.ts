import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { quizId, dryRun = true } = await req.json();

    // Helper function to check if a value is empty
    const isEmpty = (val) => {
      if (val === null || val === undefined || val === '') return true;
      if (Array.isArray(val)) {
        if (val.length === 0) return true;
        // Check if array of empty strings
        if (val.every(item => item === '' || item === null || item === undefined)) return true;
      }
      if (typeof val === 'object' && Object.keys(val).length === 0) return true;
      return false;
    };

    // Helper function to clean empty properties from an object
    const cleanObject = (obj) => {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        if (!isEmpty(value)) {
          cleaned[key] = value;
        }
      }
      return cleaned;
    };

    // Migrate a single quiz
    const migrateQuiz = (quiz) => {
      const aiHelperTips = quiz.ai_helper_tips || {};
      const aiExplanations = quiz.ai_explanations || {};
      
      // Check if already migrated (no root-level ai_helper_tips/ai_explanations with data)
      const hasLegacyData = Object.keys(aiHelperTips).length > 0 || Object.keys(aiExplanations).length > 0;
      
      if (!hasLegacyData) {
        return { migrated: false, reason: 'No legacy data to migrate', quiz };
      }

      const migratedQuestions = (quiz.questions || []).map((question, index) => {
        const indexKey = String(index);
        const helperTip = aiHelperTips[indexKey];
        const explanation = aiExplanations[indexKey];

        // Build ai_data object
        const aiData = {};
        if (helperTip && !isEmpty(helperTip)) {
          aiData.helper_tip = helperTip;
        }
        if (explanation && !isEmpty(explanation)) {
          // If explanation is a string, convert it to object format
          if (typeof explanation === 'string') {
            aiData.explanation = { advice: explanation, passages: {} };
          } else {
            aiData.explanation = explanation;
          }
        }

        // Clean the question object
        const cleanedQuestion = cleanObject(question);
        
        // Add ai_data if it has content
        if (Object.keys(aiData).length > 0) {
          cleanedQuestion.ai_data = aiData;
        }

        return cleanedQuestion;
      });

      // Build the migrated quiz without legacy fields
      const migratedQuiz = {
        ...quiz,
        questions: migratedQuestions
      };
      
      // Remove legacy fields
      delete migratedQuiz.ai_helper_tips;
      delete migratedQuiz.ai_explanations;

      return { migrated: true, quiz: migratedQuiz };
    };

    let results = [];

    if (quizId) {
      // Migrate single quiz
      const quizzes = await base44.asServiceRole.entities.Quiz.filter({ id: quizId });
      if (quizzes.length === 0) {
        return Response.json({ error: 'Quiz not found' }, { status: 404 });
      }

      const quiz = quizzes[0];
      const result = migrateQuiz(quiz);
      
      if (!dryRun && result.migrated) {
        await base44.asServiceRole.entities.Quiz.update(quizId, result.quiz);
        result.saved = true;
      }
      
      results.push({ id: quizId, title: quiz.title, ...result });
    } else {
      // Migrate all quizzes
      const allQuizzes = await base44.asServiceRole.entities.Quiz.list();
      
      for (const quiz of allQuizzes) {
        const result = migrateQuiz(quiz);
        
        if (!dryRun && result.migrated) {
          await base44.asServiceRole.entities.Quiz.update(quiz.id, result.quiz);
          result.saved = true;
        }
        
        results.push({ id: quiz.id, title: quiz.title, migrated: result.migrated, reason: result.reason });
      }
    }

    return Response.json({
      success: true,
      dryRun,
      message: dryRun ? 'Dry run complete - no changes saved' : 'Migration complete',
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});