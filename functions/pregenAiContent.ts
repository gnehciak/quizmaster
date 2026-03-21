import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const LITE_MODEL = 'gemini-3.1-flash-lite-preview';

async function callGemini(apiKey, modelName, prompt) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );
  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`Gemini ${r.status}: ${errText.substring(0, 200)}`);
  }
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function strip(s) { return (s || '').replace(/<[^>]*>/g, ''); }

// ==========================================
// RC EXPLANATION - matches ReviewAnswers exactly
// ==========================================
async function generateRCExplanation(apiKey, modelName, globalPrompts, parentQuestion, cq) {
  const passagesForPrompt = parentQuestion.passages?.length > 0
    ? parentQuestion.passages.map(p => ({ id: p.id, title: p.title, content: p.content }))
    : [{ id: 'main', title: 'Passage', content: parentQuestion.passage }];

  const passagesList = passagesForPrompt.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');

  const globalPrompt = globalPrompts.find(p => p.key === 'reading_comprehension_explanation');
  const defaultPrompt = `You are a Year 6 teacher helping a student understand a reading comprehension question.
      Tone: Encouraging, simple, and direct.
      IMPORTANT: Do NOT start with conversational phrases like "That is a great question!" or similar. Get straight to the explanation.

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
      Question: {{QUESTION}}
      Passage(s): {{PASSAGES}}
      Options: {{OPTIONS}}
      Correct Answer: {{CORRECT_ANSWER}}

      **OUTPUT FORMAT (JSON):**

      [For single passage]
      {
        "advice": "HTML formatted advice using <p> for paragraphs, <strong> for emphasis, and <br> for line breaks where needed. Follow the 'Explain Each Option Individually' strategy from rule 3.",
        "highlightedContent": "Full passage with <mark class=\\"bg-yellow-200 px-1 rounded\\"> tags around the specific evidence"
      }

      [For multiple passages]
      {
        "advice": "HTML formatted advice using <p> for paragraphs, <strong> for emphasis, and <br> for line breaks where needed. Follow the 'Explain Each Option Individually' strategy from rule 3.",
        "passages": [
          {"passageId": "${passagesForPrompt[0].id}", "highlightedContent": "Full passage with <mark class=\\"bg-yellow-200 px-1 rounded\\"> tags around specific evidence"}${passagesForPrompt.length > 1 ? `,\n          {"passageId": "${passagesForPrompt[1].id}", "highlightedContent": "Full passage with <mark class=\\"bg-yellow-200 px-1 rounded\\"> tags (only if evidence exists here)"}` : ''}
        ]
      }`;

  let prompt = globalPrompt?.template || defaultPrompt;
  prompt = prompt.replace(/\{\{QUESTION\}\}/g, strip(cq.question));
  prompt = prompt.replace('{{PASSAGES}}', passagesList);
  prompt = prompt.replace('{{OPTIONS}}', (cq.options || []).join(', '));
  prompt = prompt.replace('{{CORRECT_ANSWER}}', cq.correctAnswer || '');

  const text = await callGemini(apiKey, modelName, prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]);
  const passages = {};
  if (parsed.passages && Array.isArray(parsed.passages)) {
    parsed.passages.forEach(p => {
      if (p.passageId && p.highlightedContent) {
        passages[p.passageId] = p.highlightedContent;
      }
    });
  } else if (parsed.highlightedContent) {
    passages[passagesForPrompt[0]?.id || 'main'] = parsed.highlightedContent;
  }

  return { advice: parsed.advice, passages };
}

// ==========================================
// RC TIP - matches TakeQuiz helper tip logic
// ==========================================
async function generateRCTip(apiKey, modelName, globalPrompts, parentQuestion, cq) {
  const passagesForPrompt = parentQuestion.passages?.length > 0
    ? parentQuestion.passages.map(p => ({ id: p.id, title: p.title, content: p.content }))
    : [{ id: 'main', title: 'Passage', content: parentQuestion.passage }];

  const passagesList = passagesForPrompt.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');

  const globalPrompt = globalPrompts.find(p => p.key === 'reading_comprehension_tip');
  const defaultPrompt = `You are a Year 6 teacher helping a student with a reading comprehension question. Do NOT reveal the correct answer.
      Tone: Encouraging, simple, and direct.
      IMPORTANT: Do NOT start with conversational phrases. Get straight to the hint.

      **CRITICAL RULES:**
      1. **Highlighting:** Locate sentences in the text that contain clues. Wrap with <mark class="bg-yellow-200 px-1 rounded">CLUE HERE</mark>.
      2. **Text Integrity:** Return the ENTIRE passage text exactly as provided.
      3. **Advice Strategy:** Give a helpful hint that guides the student to the right answer WITHOUT revealing it.
      4. **JSON Logic:** Return valid raw JSON only.

      **INPUT DATA:**
      Question: {{QUESTION}}
      Passage(s): {{PASSAGES}}
      Options: {{OPTIONS}}

      **OUTPUT FORMAT (JSON):**
      {
        "advice": "HTML formatted hint",
        "highlightedContent": "Full passage with <mark> tags around clues"
      }`;

  let prompt = globalPrompt?.template || defaultPrompt;
  prompt = prompt.replace(/\{\{QUESTION\}\}/g, strip(cq.question));
  prompt = prompt.replace('{{PASSAGES}}', passagesList);
  prompt = prompt.replace('{{OPTIONS}}', (cq.options || []).join(', '));

  const text = await callGemini(apiKey, modelName, prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]);
  const passages = {};
  if (parsed.passages && Array.isArray(parsed.passages)) {
    parsed.passages.forEach(p => {
      if (p.passageId && p.highlightedContent) passages[p.passageId] = p.highlightedContent;
    });
  } else if (parsed.highlightedContent) {
    passages[passagesForPrompt[0]?.id || 'main'] = parsed.highlightedContent;
  }
  return { advice: parsed.advice, passages };
}

// ==========================================
// BLANK EXPLANATION - matches ReviewAnswers exactly
// ==========================================
async function generateBlankExplanation(apiKey, modelName, globalPrompts, q, blank, blankIndex) {
  let passageText = '';
  if (q.textWithBlanks) passageText = strip(q.textWithBlanks);
  else if (q.passages?.length > 0) passageText = q.passages.map(p => `${p.title}:\n${strip(p.content)}`).join('\n\n');
  else if (q.passage) passageText = strip(q.passage);

  const globalPrompt = globalPrompts.find(p => p.key === 'dropdown_blanks_explanation');
  const defaultPrompt = `You are a Year 6 teacher helping a student understand a fill-in-the-blank question.
Tone: Encouraging, simple, and direct.
IMPORTANT: Do NOT start with conversational phrases like "That is a great question!" or similar. Get straight to the explanation.

**CRITICAL RULES:**
1. **State the Correct Answer:** Start by clearly stating the correct answer.
2. **Explain Each Option Individually:** Go through EACH option one by one and explain:
   * If it's the CORRECT option: Why it's right, using specific quotes from the passage if available.
   * If it's a WRONG option: Why it's incorrect, using specific quotes or reasoning from the passage if available.
3. Use clear transitions like "Option A is correct because...", "Option B is wrong because...", etc.
4. Format your response using HTML tags: Use <p> for paragraphs, <strong> for emphasis, and <br> for line breaks where needed.

Blank Number: {{BLANK_NUMBER}}
Student's Answer: {{USER_ANSWER}}
Correct Answer: {{CORRECT_ANSWER}}
Options: {{OPTIONS}}

Passage:
{{PASSAGE}}

Provide HTML formatted explanation:`;

  let prompt = globalPrompt?.template || defaultPrompt;
  prompt = prompt.replaceAll('{{BLANK_NUMBER}}', String(blankIndex + 1));
  prompt = prompt.replaceAll('{{USER_ANSWER}}', 'Not answered');
  prompt = prompt.replaceAll('{{CORRECT_ANSWER}}', blank.correctAnswer);
  prompt = prompt.replaceAll('{{OPTIONS}}', blank.options.join(', '));
  prompt = prompt.replaceAll('{{PASSAGE}}', passageText || 'No passage provided');

  const text = await callGemini(apiKey, modelName, prompt);
  return { advice: text };
}

// ==========================================
// BLANK TIP
// ==========================================
async function generateBlankTip(apiKey, modelName, globalPrompts, q, blank, blankIndex) {
  let passageText = '';
  if (q.textWithBlanks) passageText = strip(q.textWithBlanks);
  else if (q.passages?.length > 0) passageText = q.passages.map(p => `${p.title}:\n${strip(p.content)}`).join('\n\n');
  else if (q.passage) passageText = strip(q.passage);

  const prompt = `You are a Year 6 teacher giving a hint for a fill-in-the-blank question. Do NOT reveal the correct answer.
Tone: Encouraging, simple, and direct.
IMPORTANT: Do NOT start with conversational phrases. Get straight to the hint.

Give a helpful hint that guides the student toward the right answer WITHOUT revealing it.
Format your response using HTML tags.

Blank ${blankIndex + 1}
Options: ${blank.options.join(', ')}

Passage:
${passageText || 'No passage'}

Provide HTML formatted hint:`;

  const text = await callGemini(apiKey, modelName, prompt);
  return { advice: text };
}

// ==========================================
// DROP ZONE EXPLANATION - matches ReviewAnswers exactly
// ==========================================
async function generateDropZoneExplanation(apiKey, modelName, globalPrompts, q, zone) {
  let passageContext = '';
  if (q.passages?.length > 0) {
    passageContext = '\n\nPassages:\n' + q.passages.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');
  } else if (q.passage) {
    passageContext = '\n\nPassage:\n' + q.passage;
  }

  const prompt = `You are a Year 6 teacher helping a student understand why their drag-and-drop answer is incorrect.
Tone: Encouraging, simple, and direct.
IMPORTANT: Do NOT start with conversational phrases like "That is a great question!" or similar. Get straight to the explanation.

**CRITICAL RULES:**
1. **State the Correct Answer:** Start by clearly stating the correct answer for "${zone.label}".
2. **Explain Why Correct Answer is Right:** Explain why "${zone.correctAnswer}" is the right choice${passageContext ? ', using specific quotes from the passage to prove it fits perfectly' : ''}.
${passageContext ? '3. Quote directly from the passage to support your explanations.' : ''}
${passageContext ? '4.' : '3.'} Format your response using HTML tags: Use <p> for paragraphs, <strong> for emphasis, and <br> for line breaks where needed.

Gap Label: ${zone.label}
Correct Answer: ${zone.correctAnswer}${passageContext}

Provide HTML formatted explanation:`;

  const text = await callGemini(apiKey, modelName, prompt);
  return { advice: text };
}

// ==========================================
// DROP ZONE TIP
// ==========================================
async function generateDropZoneTip(apiKey, modelName, globalPrompts, q, zone) {
  let passageContext = '';
  if (q.passages?.length > 0) {
    passageContext = '\n\nPassages:\n' + q.passages.map(p => `${p.title}:\n${p.content}`).join('\n\n');
  } else if (q.passage) {
    passageContext = '\n\nPassage:\n' + q.passage;
  }

  const prompt = `You are a Year 6 teacher giving a hint for a drag-and-drop question. Do NOT reveal the correct answer.
Tone: Encouraging, simple, and direct. Get straight to the hint.
Format your response using HTML tags.

Gap: ${zone.label}
Available Options: ${(q.options || []).join(', ')}${passageContext}

Provide HTML formatted hint:`;

  const text = await callGemini(apiKey, modelName, prompt);
  return { advice: text };
}

// ==========================================
// MATCHING EXPLANATION - matches ReviewAnswers exactly
// ==========================================
async function generateMatchingExplanation(apiKey, modelName, globalPrompts, q, mq) {
  let passageContext = '';
  if (q.passages?.length > 0) {
    passageContext = '\n\nPassages:\n' + q.passages.map(p => `${p.title}:\n${p.content}`).join('\n\n');
  } else if (q.passage) {
    passageContext = '\n\nPassage:\n' + q.passage;
  }

  const prompt = `You are a Year 6 teacher helping a student understand why their matching answer is incorrect.
Tone: Encouraging, simple, and direct.
IMPORTANT: Do NOT start with conversational phrases like "That is a great question!" or similar. Get straight to the explanation.

**CRITICAL RULES:**
1. **State the Correct Answer:** Start by clearly stating the correct match for this question.
2. **Explain Why Correct Answer is Right:** Explain why "${mq.correctAnswer}" is the correct match${passageContext ? ', using specific quotes from the passage to prove it matches perfectly' : ''}.
${passageContext ? '3. Quote directly from the passage to support your explanations.' : ''}
${passageContext ? '4.' : '3.'} Format your response using HTML tags: Use <p> for paragraphs, <strong> for emphasis, and <br> for line breaks where needed.

Question: ${mq.question}
Correct Answer: ${mq.correctAnswer}${passageContext}

Provide HTML formatted explanation:`;

  const text = await callGemini(apiKey, modelName, prompt);
  return { advice: text };
}

// ==========================================
// MATCHING TIP
// ==========================================
async function generateMatchingTip(apiKey, modelName, globalPrompts, q, mq) {
  let passageContext = '';
  if (q.passages?.length > 0) {
    passageContext = '\n\nPassages:\n' + q.passages.map(p => `${p.title}:\n${p.content}`).join('\n\n');
  } else if (q.passage) {
    passageContext = '\n\nPassage:\n' + q.passage;
  }

  const prompt = `You are a Year 6 teacher giving a hint for a matching question. Do NOT reveal the correct answer.
Tone: Encouraging, simple, and direct. Get straight to the hint.
Format your response using HTML tags.

Question: ${mq.question}${passageContext}

Provide HTML formatted hint:`;

  const text = await callGemini(apiKey, modelName, prompt);
  return { advice: text };
}

// ==========================================
// MC EXPLANATION
// ==========================================
async function generateMCExplanation(apiKey, modelName, globalPrompts, q) {
  const prompt = `You are a Year 6 teacher helping a student understand a multiple choice question.
Tone: Encouraging, simple, and direct.
IMPORTANT: Do NOT start with conversational phrases. Get straight to the explanation.

**CRITICAL RULES:**
1. **State the Correct Answer:** Start by clearly stating the correct answer.
2. **Explain Each Option Individually:** Go through EACH option and explain why it's correct or incorrect.
3. Format your response using HTML tags: Use <p> for paragraphs, <strong> for emphasis.

Question: ${strip(q.question)}
Options: ${(q.options || []).join(', ')}
Correct Answer: ${q.correctAnswer}

Provide HTML formatted explanation:`;

  const text = await callGemini(apiKey, modelName, prompt);
  return { advice: text };
}

// ==========================================
// MC TIP
// ==========================================
async function generateMCTip(apiKey, modelName, globalPrompts, q) {
  const prompt = `You are a Year 6 teacher giving a hint for a multiple choice question. Do NOT reveal the correct answer.
Tone: Encouraging, simple, and direct. Get straight to the hint.
Format your response using HTML tags.

Question: ${strip(q.question)}
Options: ${(q.options || []).join(', ')}

Provide HTML formatted hint:`;

  const text = await callGemini(apiKey, modelName, prompt);
  return { advice: text };
}

// ==========================================
// MAIN HANDLER
// ==========================================
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get AI config
    const cfgs = await base44.asServiceRole.entities.AIAPIConfig.filter({ key: 'default' });
    const cfg = cfgs[0];
    if (!cfg?.api_key) {
      return Response.json({ error: 'No AI API config found' }, { status: 400 });
    }

    const apiKey = cfg.api_key;
    // Use the lite model for background pre-generation (cheaper/faster)
    const modelName = LITE_MODEL;

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
          // ---- READING COMPREHENSION ----
          if (q.type === 'reading_comprehension') {
            for (let ci = 0; ci < (q.comprehensionQuestions || []).length; ci++) {
              const cq = q.comprehensionQuestions[ci];

              if (wantExplanations && !cq.ai_data?.explanation) {
                const result = await generateRCExplanation(apiKey, modelName, globalPrompts, q, cq);
                if (result) {
                  questions[qi].comprehensionQuestions[ci] = {
                    ...questions[qi].comprehensionQuestions[ci],
                    ai_data: { ...questions[qi].comprehensionQuestions[ci].ai_data, explanation: result }
                  };
                  changed = true;
                  stats.explanations++;
                }
              }

              if (wantTips && !cq.ai_data?.helper_tip) {
                const result = await generateRCTip(apiKey, modelName, globalPrompts, q, cq);
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
          }

          // ---- MULTIPLE CHOICE ----
          else if (q.type === 'multiple_choice') {
            if (wantExplanations && !q.ai_data?.explanation) {
              const result = await generateMCExplanation(apiKey, modelName, globalPrompts, q);
              if (result) {
                questions[qi] = { ...questions[qi], ai_data: { ...questions[qi].ai_data, explanation: result } };
                changed = true;
                stats.explanations++;
              }
            }
            if (wantTips && !q.ai_data?.helper_tip) {
              const result = await generateMCTip(apiKey, modelName, globalPrompts, q);
              if (result) {
                questions[qi] = { ...questions[qi], ai_data: { ...questions[qi].ai_data, helper_tip: result } };
                changed = true;
                stats.tips++;
              }
            }
          }

          // ---- DRAG & DROP ----
          else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
            for (let zi = 0; zi < (q.dropZones || []).length; zi++) {
              const zone = q.dropZones[zi];

              if (wantExplanations && !zone.ai_data?.explanation) {
                const result = await generateDropZoneExplanation(apiKey, modelName, globalPrompts, q, zone);
                if (result) {
                  questions[qi].dropZones[zi] = {
                    ...questions[qi].dropZones[zi],
                    ai_data: { ...questions[qi].dropZones[zi].ai_data, explanation: result }
                  };
                  changed = true;
                  stats.explanations++;
                }
              }

              if (wantTips && !zone.ai_data?.helper_tip) {
                const result = await generateDropZoneTip(apiKey, modelName, globalPrompts, q, zone);
                if (result) {
                  questions[qi].dropZones[zi] = {
                    ...questions[qi].dropZones[zi],
                    ai_data: { ...questions[qi].dropZones[zi].ai_data, helper_tip: result }
                  };
                  changed = true;
                  stats.tips++;
                }
              }
            }
          }

          // ---- INLINE DROPDOWN (SEPARATE & SAME) ----
          else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
            for (let bi = 0; bi < (q.blanks || []).length; bi++) {
              const blank = q.blanks[bi];

              if (wantExplanations && !blank.ai_data?.explanation) {
                const result = await generateBlankExplanation(apiKey, modelName, globalPrompts, q, blank, bi);
                if (result) {
                  questions[qi].blanks[bi] = {
                    ...questions[qi].blanks[bi],
                    ai_data: { ...questions[qi].blanks[bi].ai_data, explanation: result }
                  };
                  changed = true;
                  stats.explanations++;
                }
              }

              if (wantTips && !blank.ai_data?.helper_tip) {
                const result = await generateBlankTip(apiKey, modelName, globalPrompts, q, blank, bi);
                if (result) {
                  questions[qi].blanks[bi] = {
                    ...questions[qi].blanks[bi],
                    ai_data: { ...questions[qi].blanks[bi].ai_data, helper_tip: result }
                  };
                  changed = true;
                  stats.tips++;
                }
              }
            }
          }

          // ---- MATCHING LIST ----
          else if (q.type === 'matching_list_dual') {
            for (let mi = 0; mi < (q.matchingQuestions || []).length; mi++) {
              const mq = q.matchingQuestions[mi];

              if (wantExplanations && !mq.ai_data?.explanation) {
                const result = await generateMatchingExplanation(apiKey, modelName, globalPrompts, q, mq);
                if (result) {
                  questions[qi].matchingQuestions[mi] = {
                    ...questions[qi].matchingQuestions[mi],
                    ai_data: { ...questions[qi].matchingQuestions[mi].ai_data, explanation: result }
                  };
                  changed = true;
                  stats.explanations++;
                }
              }

              if (wantTips && !mq.ai_data?.helper_tip) {
                const result = await generateMatchingTip(apiKey, modelName, globalPrompts, q, mq);
                if (result) {
                  questions[qi].matchingQuestions[mi] = {
                    ...questions[qi].matchingQuestions[mi],
                    ai_data: { ...questions[qi].matchingQuestions[mi].ai_data, helper_tip: result }
                  };
                  changed = true;
                  stats.tips++;
                }
              }
            }
          }

        } catch (err) {
          stats.errors.push(`Quiz ${quiz.id} Q${qi + 1}: ${err.message}`);
          console.error(`Error on quiz ${quiz.id} Q${qi + 1}:`, err.message);
        }
      }

      // Save updated questions if anything changed
      if (changed) {
        await base44.asServiceRole.entities.Quiz.update(quiz.id, { questions });
        stats.processed++;
        console.log(`Updated quiz "${quiz.title}" (${quiz.id})`);
      }
    }

    console.log('Pre-generation complete:', JSON.stringify(stats));
    return Response.json({ success: true, stats });
  } catch (error) {
    console.error('pregenAiContent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});