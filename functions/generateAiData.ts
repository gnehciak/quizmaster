import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  // AI data pre-generation function
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch AI config
    const aiConfigs = await base44.asServiceRole.entities.AIAPIConfig.filter({ key: 'default' });
    const aiConfig = aiConfigs[0];
    if (!aiConfig?.api_key || !aiConfig?.model_name) {
      return Response.json({ error: 'AI API config not found' }, { status: 400 });
    }

    // Fetch global prompts
    const globalPrompts = await base44.asServiceRole.entities.AIPrompt.list();

    // Fetch all published quizzes
    const allQuizzes = await base44.asServiceRole.entities.Quiz.filter({ status: 'published' });

    const stats = { quizzesProcessed: 0, explanationsGenerated: 0, tipsGenerated: 0, skipped: 0, errors: [] };

    for (const quiz of allQuizzes) {
      const needsExplanations = quiz.ai_explanation_enabled !== false;
      const needsTips = quiz.allow_tips === true;

      if (!needsExplanations && !needsTips) {
        stats.skipped++;
        continue;
      }

      if (!quiz.questions || quiz.questions.length === 0) {
        stats.skipped++;
        continue;
      }

      let updated = false;
      const questions = JSON.parse(JSON.stringify(quiz.questions));

      for (let qIdx = 0; qIdx < questions.length; qIdx++) {
        const q = questions[qIdx];

        try {
          if (q.type === 'reading_comprehension') {
            for (let cIdx = 0; cIdx < (q.comprehensionQuestions || []).length; cIdx++) {
              const cq = q.comprehensionQuestions[cIdx];
              if (needsExplanations && !cq.ai_data?.explanation) {
                const result = await generateRCExplanation(aiConfig, globalPrompts, q, cq);
                if (result) {
                  questions[qIdx].comprehensionQuestions[cIdx] = { ...cq, ai_data: { ...cq.ai_data, explanation: result } };
                  updated = true;
                  stats.explanationsGenerated++;
                }
              }
              if (needsTips && !cq.ai_data?.helper_tip) {
                const result = await generateRCTip(aiConfig, globalPrompts, q, cq);
                if (result) {
                  questions[qIdx].comprehensionQuestions[cIdx] = { ...questions[qIdx].comprehensionQuestions[cIdx], ai_data: { ...questions[qIdx].comprehensionQuestions[cIdx].ai_data, helper_tip: result } };
                  updated = true;
                  stats.tipsGenerated++;
                }
              }
            }
          } else if (q.type === 'multiple_choice') {
            if (needsExplanations && !q.ai_data?.explanation) {
              const result = await generateMCExplanation(aiConfig, q);
              if (result) { questions[qIdx] = { ...q, ai_data: { ...q.ai_data, explanation: result } }; updated = true; stats.explanationsGenerated++; }
            }
            if (needsTips && !q.ai_data?.helper_tip) {
              const result = await generateMCTip(aiConfig, q);
              if (result) { questions[qIdx] = { ...questions[qIdx], ai_data: { ...questions[qIdx].ai_data, helper_tip: result } }; updated = true; stats.tipsGenerated++; }
            }
          } else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
            for (let zIdx = 0; zIdx < (q.dropZones || []).length; zIdx++) {
              const zone = q.dropZones[zIdx];
              if (needsExplanations && !zone.ai_data?.explanation) {
                const result = await generateDropZoneExplanation(aiConfig, q, zone);
                if (result) { questions[qIdx].dropZones[zIdx] = { ...zone, ai_data: { ...zone.ai_data, explanation: { advice: result } } }; updated = true; stats.explanationsGenerated++; }
              }
              if (needsTips && !zone.ai_data?.helper_tip) {
                const result = await generateDropZoneTip(aiConfig, q, zone);
                if (result) { questions[qIdx].dropZones[zIdx] = { ...questions[qIdx].dropZones[zIdx], ai_data: { ...questions[qIdx].dropZones[zIdx].ai_data, helper_tip: { advice: result } } }; updated = true; stats.tipsGenerated++; }
              }
            }
          } else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
            for (let bIdx = 0; bIdx < (q.blanks || []).length; bIdx++) {
              const blank = q.blanks[bIdx];
              if (needsExplanations && !blank.ai_data?.explanation) {
                const result = await generateBlankExplanation(aiConfig, globalPrompts, q, blank, bIdx);
                if (result) { questions[qIdx].blanks[bIdx] = { ...blank, ai_data: { ...blank.ai_data, explanation: { advice: result } } }; updated = true; stats.explanationsGenerated++; }
              }
              if (needsTips && !blank.ai_data?.helper_tip) {
                const result = await generateBlankTip(aiConfig, q, blank, bIdx);
                if (result) { questions[qIdx].blanks[bIdx] = { ...questions[qIdx].blanks[bIdx], ai_data: { ...questions[qIdx].blanks[bIdx].ai_data, helper_tip: { advice: result } } }; updated = true; stats.tipsGenerated++; }
              }
            }
          } else if (q.type === 'matching_list_dual') {
            for (let mIdx = 0; mIdx < (q.matchingQuestions || []).length; mIdx++) {
              const mq = q.matchingQuestions[mIdx];
              if (needsExplanations && !mq.ai_data?.explanation) {
                const result = await generateMatchingExplanation(aiConfig, q, mq);
                if (result) { questions[qIdx].matchingQuestions[mIdx] = { ...mq, ai_data: { ...mq.ai_data, explanation: { advice: result } } }; updated = true; stats.explanationsGenerated++; }
              }
              if (needsTips && !mq.ai_data?.helper_tip) {
                const result = await generateMatchingTip(aiConfig, q, mq);
                if (result) { questions[qIdx].matchingQuestions[mIdx] = { ...questions[qIdx].matchingQuestions[mIdx], ai_data: { ...questions[qIdx].matchingQuestions[mIdx].ai_data, helper_tip: { advice: result } } }; updated = true; stats.tipsGenerated++; }
              }
            }
          }
        } catch (err) {
          stats.errors.push(`Quiz ${quiz.id} Q${qIdx + 1}: ${err.message}`);
        }
      }

      if (updated) {
        await base44.asServiceRole.entities.Quiz.update(quiz.id, { questions });
        stats.quizzesProcessed++;
      }
    }

    return Response.json({ success: true, stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ========== Gemini API via fetch ==========
async function callGemini(aiConfig, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model_name}:generateContent?key=${aiConfig.api_key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${errText}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ========== EXPLANATION GENERATORS ==========

async function generateRCExplanation(aiConfig, globalPrompts, q, cq) {
  const passagesForPrompt = q.passages?.length > 0
    ? q.passages.map(p => ({ id: p.id, title: p.title, content: p.content }))
    : [{ id: 'main', title: 'Passage', content: q.passage }];
  const passagesList = passagesForPrompt.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');

  const globalPrompt = globalPrompts.find(p => p.key === 'reading_comprehension_explanation');
  const defaultPrompt = `You are a Year 6 teacher helping a student understand a reading comprehension question.
Tone: Encouraging, simple, and direct. Do NOT start with conversational phrases.

**CRITICAL RULES:**
1. **Highlighting:** Locate ALL evidence. Wrap in: <mark class="bg-yellow-200 px-1 rounded">EVIDENCE</mark>.
2. **Text Integrity:** Return ENTIRE passage text, preserving all HTML.
3. **Advice:** State the correct answer first. Then explain EACH option individually.
4. Return valid raw JSON only.

Question: {{QUESTION}}
Passage(s): {{PASSAGES}}
Options: {{OPTIONS}}
Correct Answer: {{CORRECT_ANSWER}}

**OUTPUT FORMAT (JSON):**
${passagesForPrompt.length > 1 ? `{
  "advice": "HTML formatted advice",
  "passages": [${passagesForPrompt.map(p => `{"passageId": "${p.id}", "highlightedContent": "Full passage with highlights"}`).join(', ')}]
}` : `{
  "advice": "HTML formatted advice",
  "highlightedContent": "Full passage with highlights"
}`}`;

  let prompt = globalPrompt?.template || defaultPrompt;
  prompt = prompt.replace(/\{\{QUESTION\}\}/g, cq.question?.replace(/<[^>]*>/g, '') || '');
  prompt = prompt.replace('{{PASSAGES}}', passagesList);
  prompt = prompt.replace('{{OPTIONS}}', cq.options?.join(', ') || '');
  prompt = prompt.replace('{{CORRECT_ANSWER}}', cq.correctAnswer || '');

  const text = await callGemini(aiConfig, prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    let cleanedPassages = {};
    if (parsed.passages) {
      if (Array.isArray(parsed.passages)) {
        parsed.passages.forEach(p => { if (p.passageId && p.highlightedContent) cleanedPassages[p.passageId] = p.highlightedContent; });
      } else {
        Object.keys(parsed.passages).forEach(key => { cleanedPassages[key] = parsed.passages[key]; });
      }
    } else if (parsed.highlightedContent) {
      cleanedPassages[passagesForPrompt[0]?.id || 'main'] = parsed.highlightedContent;
    }
    return { advice: parsed.advice, passages: cleanedPassages };
  }
  return null;
}

async function generateRCTip(aiConfig, globalPrompts, q, cq) {
  const passagesForPrompt = q.passages?.length > 0
    ? q.passages.map(p => ({ id: p.id, title: p.title, content: p.content }))
    : [{ id: 'main', title: 'Passage', content: q.passage }];
  const passagesList = passagesForPrompt.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');

  const globalPrompt = globalPrompts.find(p => p.key === 'reading_comprehension_tip');
  const defaultPrompt = `You are a Year 6 teacher giving a helpful hint for a reading comprehension question.
Do NOT reveal the answer. Guide them to find it themselves.
Highlight relevant parts using <mark class="bg-yellow-200 px-1 rounded">...</mark>.
Return valid JSON only.

Question: ${cq.question?.replace(/<[^>]*>/g, '')}
Passage(s): ${passagesList}
Options: ${cq.options?.join(', ')}

OUTPUT FORMAT (JSON):
${passagesForPrompt.length > 1 ? `{
  "advice": "HTML formatted hint",
  "passages": [${passagesForPrompt.map(p => `{"passageId": "${p.id}", "highlightedContent": "Full passage with highlights"}`).join(', ')}]
}` : `{
  "advice": "HTML formatted hint",
  "highlightedContent": "Full passage with highlights"
}`}`;

  const prompt = globalPrompt?.template || defaultPrompt;
  const text = await callGemini(aiConfig, prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    let cleanedPassages = {};
    if (parsed.passages) {
      if (Array.isArray(parsed.passages)) {
        parsed.passages.forEach(p => { if (p.passageId && p.highlightedContent) cleanedPassages[p.passageId] = p.highlightedContent; });
      } else {
        Object.keys(parsed.passages).forEach(key => { cleanedPassages[key] = parsed.passages[key]; });
      }
    } else if (parsed.highlightedContent) {
      cleanedPassages[passagesForPrompt[0]?.id || 'main'] = parsed.highlightedContent;
    }
    return { advice: parsed.advice, passages: cleanedPassages };
  }
  return null;
}

async function generateMCExplanation(aiConfig, q) {
  const prompt = `You are a Year 6 teacher helping a student understand a multiple choice question.
Do NOT start with conversational phrases.
State the correct answer first, then explain why each option is correct or incorrect.
Format using HTML tags: <p>, <strong>, <br>.

Question: ${q.question?.replace(/<[^>]*>/g, '')}
Options: ${q.options?.join(', ')}
Correct Answer: ${q.correctAnswer}

Provide HTML formatted explanation:`;

  const text = await callGemini(aiConfig, prompt);
  return { advice: text };
}

async function generateMCTip(aiConfig, q) {
  const prompt = `You are a Year 6 teacher giving a helpful hint for a multiple choice question.
Do NOT reveal the answer. Guide them to think about it.
Format using HTML: <p>, <strong>, <br>.

Question: ${q.question?.replace(/<[^>]*>/g, '')}
Options: ${q.options?.join(', ')}

Provide HTML formatted hint (do NOT reveal the answer):`;

  const text = await callGemini(aiConfig, prompt);
  return { advice: text };
}

async function generateDropZoneExplanation(aiConfig, q, zone) {
  let passageContext = '';
  if (q.passages?.length > 0) passageContext = '\n\nPassages:\n' + q.passages.map(p => `${p.title}:\n${p.content}`).join('\n\n');
  else if (q.passage) passageContext = '\n\nPassage:\n' + q.passage;

  const prompt = `You are a Year 6 teacher explaining a drag-and-drop answer.
Do NOT start with conversational phrases.
1. State the correct answer for "${zone.label}".
2. Explain why the correct answer fits${passageContext ? ', quoting from the passage' : ''}.
Format using HTML: <p>, <strong>, <br>.

Gap Label: ${zone.label}
Correct Answer: ${zone.correctAnswer}${passageContext}

Provide HTML formatted explanation:`;

  return await callGemini(aiConfig, prompt);
}

async function generateDropZoneTip(aiConfig, q, zone) {
  let passageContext = '';
  if (q.passages?.length > 0) passageContext = '\n\nPassages:\n' + q.passages.map(p => `${p.title}:\n${p.content}`).join('\n\n');
  else if (q.passage) passageContext = '\n\nPassage:\n' + q.passage;

  const prompt = `You are a Year 6 teacher giving a hint for a drag-and-drop question.
Do NOT reveal the answer. Guide the student.
Format using HTML: <p>, <strong>, <br>.

Gap Label: ${zone.label}
Available Options: ${q.options?.join(', ')}${passageContext}

Provide HTML formatted hint (do NOT reveal the answer):`;

  return await callGemini(aiConfig, prompt);
}

async function generateBlankExplanation(aiConfig, globalPrompts, q, blank, blankIndex) {
  let passageText = '';
  if (q.textWithBlanks) passageText = q.textWithBlanks?.replace(/<[^>]*>/g, '');
  else if (q.passages?.length > 0) passageText = q.passages.map(p => `${p.title}:\n${p.content?.replace(/<[^>]*>/g, '')}`).join('\n\n');
  else if (q.passage) passageText = q.passage?.replace(/<[^>]*>/g, '');

  const globalPrompt = globalPrompts.find(p => p.key === 'dropdown_blanks_explanation');
  const defaultPrompt = `You are a Year 6 teacher helping a student understand a fill-in-the-blank question.
Do NOT start with conversational phrases.
1. State the correct answer.
2. Explain EACH option individually.
Format using HTML: <p>, <strong>, <br>.

Blank Number: {{BLANK_NUMBER}}
Correct Answer: {{CORRECT_ANSWER}}
Options: {{OPTIONS}}

Passage:
{{PASSAGE}}

Provide HTML formatted explanation:`;

  let prompt = globalPrompt?.template || defaultPrompt;
  prompt = prompt.replaceAll('{{BLANK_NUMBER}}', (blankIndex + 1).toString());
  prompt = prompt.replaceAll('{{USER_ANSWER}}', 'Not answered');
  prompt = prompt.replaceAll('{{CORRECT_ANSWER}}', blank.correctAnswer);
  prompt = prompt.replaceAll('{{OPTIONS}}', blank.options.join(', '));
  prompt = prompt.replaceAll('{{PASSAGE}}', passageText || 'No passage provided');

  return await callGemini(aiConfig, prompt);
}

async function generateBlankTip(aiConfig, q, blank, blankIndex) {
  let passageText = '';
  if (q.textWithBlanks) passageText = q.textWithBlanks?.replace(/<[^>]*>/g, '');
  else if (q.passages?.length > 0) passageText = q.passages.map(p => `${p.title}:\n${p.content?.replace(/<[^>]*>/g, '')}`).join('\n\n');
  else if (q.passage) passageText = q.passage?.replace(/<[^>]*>/g, '');

  const prompt = `You are a Year 6 teacher giving a hint for a fill-in-the-blank question.
Do NOT reveal the answer. Guide the student.
Format using HTML: <p>, <strong>, <br>.

Blank Number: ${blankIndex + 1}
Options: ${blank.options.join(', ')}

Passage:
${passageText || 'No passage provided'}

Provide HTML formatted hint (do NOT reveal the answer):`;

  return await callGemini(aiConfig, prompt);
}

async function generateMatchingExplanation(aiConfig, q, mq) {
  let passageContext = '';
  if (q.passages?.length > 0) passageContext = '\n\nPassages:\n' + q.passages.map(p => `${p.title}:\n${p.content}`).join('\n\n');
  else if (q.passage) passageContext = '\n\nPassage:\n' + q.passage;

  const prompt = `You are a Year 6 teacher explaining a matching question answer.
Do NOT start with conversational phrases.
1. State the correct match.
2. Explain why it is the correct match${passageContext ? ', quoting from the passage' : ''}.
Format using HTML: <p>, <strong>, <br>.

Question: ${mq.question}
Correct Answer: ${mq.correctAnswer}${passageContext}

Provide HTML formatted explanation:`;

  return await callGemini(aiConfig, prompt);
}

async function generateMatchingTip(aiConfig, q, mq) {
  let passageContext = '';
  if (q.passages?.length > 0) passageContext = '\n\nPassages:\n' + q.passages.map(p => `${p.title}:\n${p.content}`).join('\n\n');
  else if (q.passage) passageContext = '\n\nPassage:\n' + q.passage;

  const prompt = `You are a Year 6 teacher giving a hint for a matching question.
Do NOT reveal the answer. Guide the student.
Format using HTML: <p>, <strong>, <br>.

Question: ${mq.question}${passageContext}

Provide HTML formatted hint (do NOT reveal the answer):`;

  return await callGemini(aiConfig, prompt);
}