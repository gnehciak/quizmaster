import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get AI config
    const cfgs = await base44.asServiceRole.entities.AIAPIConfig.filter({ key: 'default' });
    const cfg = cfgs[0];
    if (!cfg?.api_key) {
      return Response.json({ error: 'No AI config found' }, { status: 400 });
    }

    // Get global prompts
    const globalPrompts = await base44.asServiceRole.entities.AIPrompt.list();

    // Get all published quizzes
    const quizzes = await base44.asServiceRole.entities.Quiz.filter({ status: 'published' });

    const stats = { processed: 0, explanations: 0, tips: 0, skipped: 0, errors: [] };

    for (const quiz of quizzes) {
      const wantExplanations = quiz.ai_explanation_enabled !== false;
      const wantTips = quiz.allow_tips === true;

      if ((!wantExplanations && !wantTips) || !quiz.questions?.length) {
        stats.skipped++;
        continue;
      }

      let changed = false;
      const questions = JSON.parse(JSON.stringify(quiz.questions));

      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];

        try {
          if (q.type === 'reading_comprehension') {
            for (let ci = 0; ci < (q.comprehensionQuestions || []).length; ci++) {
              const cq = q.comprehensionQuestions[ci];

              // Generate explanation
              if (wantExplanations && !cq.ai_data?.explanation) {
                const result = await generateRCExplanation(cfg, globalPrompts, q, cq);
                if (result) {
                  questions[qi].comprehensionQuestions[ci] = {
                    ...questions[qi].comprehensionQuestions[ci],
                    ai_data: { ...questions[qi].comprehensionQuestions[ci].ai_data, explanation: result }
                  };
                  changed = true;
                  stats.explanations++;
                }
              }

              // Generate tip
              if (wantTips && !cq.ai_data?.helper_tip) {
                const result = await generateRCTip(cfg, globalPrompts, q, cq);
                if (result) {
                  questions[qi].comprehensionQuestions[ci] = {
                    ...questions[qi].comprehensionQuestions[ci],
                    ai_data: { ...questions[qi].comprehensionQuestions[ci].ai_data, helper_tip: result }
                  };
                  changed = true;
                  stats.tips++;
                }
              }
            }
          } else if (q.type === 'multiple_choice') {
            if (wantExplanations && !q.ai_data?.explanation) {
              const text = await callGemini(cfg, buildMCExplanationPrompt(q));
              questions[qi] = { ...questions[qi], ai_data: { ...questions[qi].ai_data, explanation: { advice: text } } };
              changed = true;
              stats.explanations++;
            }
            if (wantTips && !q.ai_data?.helper_tip) {
              const text = await callGemini(cfg, buildMCTipPrompt(q));
              questions[qi] = { ...questions[qi], ai_data: { ...questions[qi].ai_data, helper_tip: { advice: text } } };
              changed = true;
              stats.tips++;
            }
          } else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
            for (let zi = 0; zi < (q.dropZones || []).length; zi++) {
              const zone = q.dropZones[zi];
              if (wantExplanations && !zone.ai_data?.explanation) {
                const text = await callGemini(cfg, buildDropZoneExplanationPrompt(q, zone));
                questions[qi].dropZones[zi] = { ...questions[qi].dropZones[zi], ai_data: { ...questions[qi].dropZones[zi].ai_data, explanation: { advice: text } } };
                changed = true;
                stats.explanations++;
              }
              if (wantTips && !zone.ai_data?.helper_tip) {
                const result = await generateDropZoneTip(cfg, globalPrompts, q, zone);
                if (result) {
                  questions[qi].dropZones[zi] = { ...questions[qi].dropZones[zi], ai_data: { ...questions[qi].dropZones[zi].ai_data, helper_tip: result } };
                  changed = true;
                  stats.tips++;
                }
              }
            }
          } else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
            for (let bi = 0; bi < (q.blanks || []).length; bi++) {
              const blank = q.blanks[bi];
              if (wantExplanations && !blank.ai_data?.explanation) {
                const text = await generateBlankExplanation(cfg, globalPrompts, q, blank, bi);
                if (text) {
                  questions[qi].blanks[bi] = { ...questions[qi].blanks[bi], ai_data: { ...questions[qi].blanks[bi].ai_data, explanation: { advice: text } } };
                  changed = true;
                  stats.explanations++;
                }
              }
              if (wantTips && !blank.ai_data?.helper_tip) {
                const text = await generateBlankTip(cfg, globalPrompts, q, blank, bi);
                if (text) {
                  questions[qi].blanks[bi] = { ...questions[qi].blanks[bi], ai_data: { ...questions[qi].blanks[bi].ai_data, helper_tip: text } };
                  changed = true;
                  stats.tips++;
                }
              }
            }
          } else if (q.type === 'matching_list_dual') {
            for (let mi = 0; mi < (q.matchingQuestions || []).length; mi++) {
              const mq = q.matchingQuestions[mi];
              if (wantExplanations && !mq.ai_data?.explanation) {
                const text = await callGemini(cfg, buildMatchingExplanationPrompt(q, mq));
                questions[qi].matchingQuestions[mi] = { ...questions[qi].matchingQuestions[mi], ai_data: { ...questions[qi].matchingQuestions[mi].ai_data, explanation: { advice: text } } };
                changed = true;
                stats.explanations++;
              }
              if (wantTips && !mq.ai_data?.helper_tip) {
                const text = await generateMatchingTip(cfg, globalPrompts, q, mq);
                if (text) {
                  questions[qi].matchingQuestions[mi] = { ...questions[qi].matchingQuestions[mi], ai_data: { ...questions[qi].matchingQuestions[mi].ai_data, helper_tip: text } };
                  changed = true;
                  stats.tips++;
                }
              }
            }
          }
        } catch (err) {
          stats.errors.push(quiz.id + ' Q' + (qi + 1) + ': ' + err.message);
        }
      }

      if (changed) {
        await base44.asServiceRole.entities.Quiz.update(quiz.id, { questions });
        stats.processed++;
      }
    }

    return Response.json({ success: true, stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ---- Gemini API call ----
async function callGemini(cfg, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model_name}:generateContent?key=${cfg.api_key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  if (!res.ok) throw new Error('Gemini API error: ' + res.status);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function stripHtml(s) {
  return (s || '').replace(/<[^>]*>/g, '');
}

function getPassageContext(q) {
  if (q.passages?.length > 0) return '\n\nPassages:\n' + q.passages.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');
  if (q.passage) return '\n\nPassage:\n' + q.passage;
  return '';
}

// ---- RC Explanation (matches ReviewAnswers generateRCExplanation) ----
async function generateRCExplanation(cfg, globalPrompts, q, cq) {
  const passagesList = (q.passages?.length > 0 ? q.passages : [{ id: 'main', title: 'Passage', content: q.passage }]);
  const passagesText = passagesList.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');

  const promptTemplate = globalPrompts.find(p => p.key === 'reading_comprehension_explanation');
  let prompt = promptTemplate?.template || `You are a Year 6 teacher helping a student understand a reading comprehension question.
Tone: Encouraging, simple, and direct.
IMPORTANT: Do NOT start with conversational phrases like "That is a great question!" or similar. Get straight to the explanation.

**CRITICAL RULES:**
1. **Highlighting:** Locate ALL specific sentences or phrases in the text that prove the Correct Answer. Wrap EACH distinct piece of evidence in this exact tag: <mark class="bg-yellow-200 px-1 rounded">EVIDENCE HERE</mark>.
2. **Text Integrity:** Return the ENTIRE passage text exactly as provided, preserving all original HTML tags.
3. **Advice Strategy:** State the Correct Answer. Explain Each Option Individually. Quote directly from the passage.
4. **JSON Logic:** Return valid raw JSON only.

**INPUT DATA:**
Question: {{QUESTION}}
Passage(s): {{PASSAGES}}
Options: {{OPTIONS}}
Correct Answer: {{CORRECT_ANSWER}}

**OUTPUT FORMAT (JSON):**
{
  "advice": "HTML formatted advice",
  "passages": [{"passageId": "id", "highlightedContent": "Full passage with <mark> tags"}]
}`;

  prompt = prompt.replace(/\{\{QUESTION\}\}/g, stripHtml(cq.question));
  prompt = prompt.replace('{{PASSAGES}}', passagesText);
  prompt = prompt.replace('{{OPTIONS}}', (cq.options || []).join(', '));
  prompt = prompt.replace('{{CORRECT_ANSWER}}', cq.correctAnswer || '');

  const text = await callGemini(cfg, prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]);
  const passages = {};
  if (parsed.passages && Array.isArray(parsed.passages)) {
    parsed.passages.forEach(p => { if (p.passageId) passages[p.passageId] = p.highlightedContent; });
  } else if (parsed.highlightedContent) {
    passages[passagesList[0]?.id || 'main'] = parsed.highlightedContent;
  }
  return { advice: parsed.advice, passages };
}

// ---- RC Tip (matches TakeQuiz getAiHelp) ----
async function generateRCTip(cfg, globalPrompts, q, cq) {
  const passagesList = (q.passages?.length > 0 ? q.passages : [{ id: 'main', title: 'Passage', content: q.passage }]);
  const passagesText = passagesList.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');

  const promptTemplate = globalPrompts.find(p => p.key === 'reading_comprehension');
  let prompt = promptTemplate?.template || `You are a Year 6 teacher helping a student find evidence in a text.
Tone: Simple, direct.

**CRITICAL RULES:**
1. **Highlighting:** Locate ALL specific sentences or phrases that prove the Correct Answer. Wrap EACH distinct piece of evidence in: <mark class="bg-yellow-200 px-1 rounded">EVIDENCE HERE</mark>.
2. **Text Integrity:** Return the ENTIRE passage text exactly as provided.
3. **Advice Strategy:** Explain the connection between highlighted text and the question. Do NOT explicitly state the Correct Answer.
4. Return valid raw JSON only.

**INPUT DATA:**
Question: {{QUESTION}}
Passage(s): {{PASSAGE}}
Options: {{OPTIONS}}
Correct Answer: {{CORRECT_ANSWER}}

**OUTPUT FORMAT (JSON):**
{
  "advice": "Explain simply why the highlighted text supports the correct answer. Do not state the answer.",
  "passages": [{"passageId": "id", "highlightedContent": "Full passage with <mark> tags"}]
}`;

  prompt = prompt.replace('{{QUESTION}}', stripHtml(cq.question));
  prompt = prompt.replace('{{PASSAGE}}', '\n\nPassages:\n' + passagesText);
  prompt = prompt.replace('{{OPTIONS}}', '\n\nOptions:\n' + (cq.options || []).map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n'));
  prompt = prompt.replace('{{CORRECT_ANSWER}}', '\n\nCorrect Answer: ' + (cq.correctAnswer || ''));

  const text = await callGemini(cfg, prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]);
  const passages = {};
  if (parsed.passages && Array.isArray(parsed.passages)) {
    parsed.passages.forEach(p => { if (p.passageId) passages[p.passageId] = p.highlightedContent; });
  } else if (parsed.highlightedContent) {
    passages[passagesList[0]?.id || 'main'] = parsed.highlightedContent;
  }
  return { advice: parsed.advice, passages };
}

// ---- MC prompts ----
function buildMCExplanationPrompt(q) {
  return `You are a Year 6 teacher helping a student understand a multiple choice question.
Tone: Encouraging, simple, and direct.
IMPORTANT: Do NOT start with conversational phrases. Get straight to the explanation.

**CRITICAL RULES:**
1. State the Correct Answer.
2. Explain Each Option Individually - why it's right or wrong.
3. Format using HTML tags: <p>, <strong>, <br>.

Question: ${stripHtml(q.question)}
Options: ${(q.options || []).join(', ')}
Correct Answer: ${q.correctAnswer}

Provide HTML formatted explanation:`;
}

function buildMCTipPrompt(q) {
  return `You are a Year 6 teacher. Give a brief hint for this multiple choice question.
Do NOT reveal the answer. Give clues about what to look for.
Format using HTML tags.

Question: ${stripHtml(q.question)}
Options: ${(q.options || []).join(', ')}

Provide a helpful hint (2-3 sentences):`;
}

// ---- Drop Zone Explanation ----
function buildDropZoneExplanationPrompt(q, zone) {
  const passageCtx = getPassageContext(q);
  return `You are a Year 6 teacher helping a student understand why a drag-and-drop answer is correct.
Tone: Encouraging, simple, and direct.

**CRITICAL RULES:**
1. State the Correct Answer for "${zone.label}".
2. Explain why it is the right choice${passageCtx ? ', using specific quotes from the passage' : ''}.
3. Format using HTML tags: <p>, <strong>, <br>.

Gap Label: ${zone.label}
Correct Answer: ${zone.correctAnswer}${passageCtx}

Provide HTML formatted explanation:`;
}

// ---- Drop Zone Tip (matches TakeQuiz handleDropZoneHelp) ----
async function generateDropZoneTip(cfg, globalPrompts, q, zone) {
  const hasPassages = q.passages?.length > 0 || q.passage;
  const passagesList = q.passages?.length > 0 ? q.passages : (q.passage ? [{ id: 'main', title: 'Passage', content: q.passage }] : []);
  const passagesText = passagesList.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');

  const promptTemplate = globalPrompts.find(p => p.key === 'drag_drop_dual');
  let prompt = promptTemplate?.template || `You are a Year 6 teacher helping a student with a drag-and-drop exercise.

**CRITICAL RULES:**
1. Highlight clues in the passage with <mark class="bg-yellow-200 px-1 rounded">EVIDENCE</mark>.
2. Return ENTIRE passage text preserving all HTML.
3. Advice (2-3 sentences): Explain what type of content fits. Do NOT reveal the answer.
4. Return valid raw JSON only.

Zone Label: {{ZONE_LABEL}}
Correct Answer (DO NOT REVEAL): {{CORRECT_ANSWER}}
Available Options: {{OPTIONS}}
{{PASSAGES}}

{
  "clue": "A brief 1-2 sentence hint",
  "passages": [{"passageId": "...", "highlightedContent": "Full passage with <mark> tags"}]
}`;

  prompt = prompt.replace('{{ZONE_LABEL}}', zone.label);
  prompt = prompt.replace('{{CORRECT_ANSWER}}', zone.correctAnswer);
  prompt = prompt.replace('{{OPTIONS}}', (q.options || []).join(', '));
  prompt = prompt.replace('{{PASSAGES}}', hasPassages ? '\n\nPassages:\n' + passagesText : '');

  const text = await callGemini(cfg, prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    const passages = {};
    if (parsed.passages && Array.isArray(parsed.passages)) {
      parsed.passages.forEach(p => { if (p.passageId) passages[p.passageId] = p.highlightedContent; });
    } else if (parsed.highlightedContent) {
      passages[passagesList[0]?.id || 'main'] = parsed.highlightedContent;
    }
    return { advice: parsed.advice || parsed.clue, passages };
  }
  return { advice: text, passages: {} };
}

// ---- Blank Explanation (matches ReviewAnswers handleBlankExplanation) ----
async function generateBlankExplanation(cfg, globalPrompts, q, blank, index) {
  let passageText = '';
  if (q.textWithBlanks) passageText = stripHtml(q.textWithBlanks);
  else if (q.passages?.length > 0) passageText = q.passages.map(p => `${p.title}:\n${stripHtml(p.content)}`).join('\n\n');
  else if (q.passage) passageText = stripHtml(q.passage);

  const promptTemplate = globalPrompts.find(p => p.key === 'dropdown_blanks_explanation');
  let prompt = promptTemplate?.template || `You are a Year 6 teacher helping a student understand a fill-in-the-blank question.
Tone: Encouraging, simple, and direct.

**CRITICAL RULES:**
1. State the Correct Answer.
2. Explain Each Option Individually.
3. Format using HTML tags: <p>, <strong>, <br>.

Blank Number: {{BLANK_NUMBER}}
Student's Answer: {{USER_ANSWER}}
Correct Answer: {{CORRECT_ANSWER}}
Options: {{OPTIONS}}

Passage:
{{PASSAGE}}

Provide HTML formatted explanation:`;

  prompt = prompt.replaceAll('{{BLANK_NUMBER}}', String(index + 1));
  prompt = prompt.replaceAll('{{USER_ANSWER}}', 'Not answered');
  prompt = prompt.replaceAll('{{CORRECT_ANSWER}}', blank.correctAnswer);
  prompt = prompt.replaceAll('{{OPTIONS}}', blank.options.join(', '));
  prompt = prompt.replaceAll('{{PASSAGE}}', passageText || 'No passage provided');

  return await callGemini(cfg, prompt);
}

// ---- Blank Tip (matches TakeQuiz handleBlankHelp) ----
async function generateBlankTip(cfg, globalPrompts, q, blank, index) {
  const passageText = stripHtml(q.passage || q.textWithBlanks || '');
  const totalBlanks = (q.blanks || []).length;

  const promptTemplate = globalPrompts.find(p => p.key === 'dropdown_blanks');
  let prompt = promptTemplate?.template || `You are a Year 6 teacher helping a student understand vocabulary words.

For each of these words, provide:
1. A very brief definition aligning with the context (one short sentence)
2. An example sentence using the word

Passage: {{PASSAGE}}

This is for blank {{BLANK_NUMBER}} of {{TOTAL_BLANKS}}.

Words: {{OPTIONS}}

Format your response as HTML. Keep it simple and clear. Do NOT indicate which word is correct.`;

  prompt = prompt.replace('{{PASSAGE}}', passageText);
  prompt = prompt.replace('{{BLANK_NUMBER}}', String(index + 1));
  prompt = prompt.replace('{{TOTAL_BLANKS}}', String(totalBlanks));
  prompt = prompt.replace('{{OPTIONS}}', blank.options.join(', '));

  return await callGemini(cfg, prompt);
}

// ---- Matching Explanation ----
function buildMatchingExplanationPrompt(q, mq) {
  const passageCtx = getPassageContext(q);
  return `You are a Year 6 teacher helping a student understand why a matching answer is correct.
Tone: Encouraging, simple, and direct.

**CRITICAL RULES:**
1. State the Correct match.
2. Explain why it's the correct match${passageCtx ? ', using specific quotes from the passage' : ''}.
3. Format using HTML tags: <p>, <strong>, <br>.

Question: ${mq.question}
Correct Answer: ${mq.correctAnswer}${passageCtx}

Provide HTML formatted explanation:`;
}

// ---- Matching Tip (matches TakeQuiz handleMatchingHelp) ----
async function generateMatchingTip(cfg, globalPrompts, q, mq) {
  const passageCtx = getPassageContext(q);

  const promptTemplate = globalPrompts.find(p => p.key === 'matching_list_dual');
  let prompt = promptTemplate?.template || `You are a Year 6 teacher helping a student with a matching question.

**TASK:**
Help the student answer: "{{QUESTION}}"
Quote specific sentences from the passage that give clues.

**CRITICAL RULES:**
1. Quote 2-3 relevant sentences from the passage.
2. Use guiding language like "One extract says...", "Another part mentions..."
3. Do NOT state the correct answer: "{{CORRECT_ANSWER}}"
4. Keep it brief: 2-3 sentences.

Question: {{QUESTION}}
Correct Answer (DO NOT REVEAL): {{CORRECT_ANSWER}}
{{PASSAGES}}

Provide a helpful hint with quoted sentences.`;

  prompt = prompt.replace(/\{\{QUESTION\}\}/g, mq.question);
  prompt = prompt.replace(/\{\{CORRECT_ANSWER\}\}/g, mq.correctAnswer);
  prompt = prompt.replace('{{PASSAGES}}', passageCtx);

  return await callGemini(cfg, prompt);
}