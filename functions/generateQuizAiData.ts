import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  console.log('generateQuizAiData called');
  let base44;
  try {
    base44 = createClientFromRequest(req);
    console.log('SDK initialized');
  } catch(initErr) {
    console.error('SDK init error:', initErr.message);
    return Response.json({ error: 'SDK init failed: ' + initErr.message }, { status: 500 });
  }
  try {
    console.log('Fetching AI config...');
    const aiConfigs = await base44.asServiceRole.entities.AIAPIConfig.filter({ key: 'default' });
    console.log('AI configs fetched:', aiConfigs?.length);
    const aiConfig = aiConfigs[0];
    if (!aiConfig?.api_key || !aiConfig?.model_name) {
      return Response.json({ error: 'AI config not set up' }, { status: 500 });
    }
    console.log('Using model:', aiConfig.model_name);

    // Get global prompts
    console.log('Fetching prompts...');
    const globalPrompts = await base44.asServiceRole.entities.AIPrompt.list();
    console.log('Prompts fetched:', globalPrompts?.length);

    // Fetch all published quizzes
    const allQuizzes = await base44.asServiceRole.entities.Quiz.filter({ status: 'published' });

    const stats = {
      quizzesProcessed: 0,
      questionsProcessed: 0,
      tipsGenerated: 0,
      explanationsGenerated: 0,
      errors: 0,
    };

    for (const quiz of allQuizzes) {
      const hasTips = quiz.allow_tips === true;
      const hasExplanations = quiz.ai_explanation_enabled !== false;

      if (!hasTips && !hasExplanations) continue;

      if (!quiz.questions || quiz.questions.length === 0) continue;

      let quizUpdated = false;
      const updatedQuestions = JSON.parse(JSON.stringify(quiz.questions)); // deep clone

      for (let qIdx = 0; qIdx < updatedQuestions.length; qIdx++) {
        const q = updatedQuestions[qIdx];

        stats.questionsProcessed++;

        // ─── TIPS ──────────────────────────────────────────────────────────────
        if (hasTips) {
          // Reading comprehension: tips go inside each comprehensionQuestion
          if (q.type === 'reading_comprehension' && q.comprehensionQuestions?.length > 0) {
            for (let cIdx = 0; cIdx < q.comprehensionQuestions.length; cIdx++) {
              const cq = q.comprehensionQuestions[cIdx];
              if (cq.ai_data?.helper_tip) continue; // already exists

              try {
                const tip = await generateRCHelperTip(aiConfig, globalPrompts, q, cq);
                if (tip) {
                  q.comprehensionQuestions[cIdx] = {
                    ...cq,
                    ai_data: { ...(cq.ai_data || {}), helper_tip: tip }
                  };
                  quizUpdated = true;
                  stats.tipsGenerated++;
                }
              } catch (e) {
                console.error(`RC tip error quiz=${quiz.id} cIdx=${cIdx}:`, e.message);
                stats.errors++;
              }
              await sleep(300);
            }
          }

          // Drag Drop Dual / Single: tips per dropZone
          if ((q.type === 'drag_drop_dual' || q.type === 'drag_drop_single') && q.dropZones?.length > 0) {
            for (let zIdx = 0; zIdx < q.dropZones.length; zIdx++) {
              const zone = q.dropZones[zIdx];
              if (zone.ai_data?.helper_tip) continue;

              try {
                const tip = await generateDropZoneHelperTip(aiConfig, globalPrompts, q, zone);
                if (tip) {
                  q.dropZones[zIdx] = {
                    ...zone,
                    ai_data: { ...(zone.ai_data || {}), helper_tip: tip }
                  };
                  quizUpdated = true;
                  stats.tipsGenerated++;
                }
              } catch (e) {
                console.error(`DropZone tip error quiz=${quiz.id} zone=${zone.id}:`, e.message);
                stats.errors++;
              }
              await sleep(300);
            }
          }

          // Inline Dropdown: tips per blank
          if ((q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') && q.blanks?.length > 0) {
            for (let bIdx = 0; bIdx < q.blanks.length; bIdx++) {
              const blank = q.blanks[bIdx];
              if (blank.ai_data?.helper_tip) continue;

              try {
                const tip = await generateBlankHelperTip(aiConfig, globalPrompts, q, blank, bIdx);
                if (tip) {
                  q.blanks[bIdx] = {
                    ...blank,
                    ai_data: { ...(blank.ai_data || {}), helper_tip: tip }
                  };
                  quizUpdated = true;
                  stats.tipsGenerated++;
                }
              } catch (e) {
                console.error(`Blank tip error quiz=${quiz.id} blank=${blank.id}:`, e.message);
                stats.errors++;
              }
              await sleep(300);
            }
          }

          // Matching List: tips per matchingQuestion
          if (q.type === 'matching_list_dual' && q.matchingQuestions?.length > 0) {
            for (let mIdx = 0; mIdx < q.matchingQuestions.length; mIdx++) {
              const mq = q.matchingQuestions[mIdx];
              if (mq.ai_data?.helper_tip) continue;

              try {
                const tip = await generateMatchingHelperTip(aiConfig, globalPrompts, q, mq);
                if (tip) {
                  q.matchingQuestions[mIdx] = {
                    ...mq,
                    ai_data: { ...(mq.ai_data || {}), helper_tip: tip }
                  };
                  quizUpdated = true;
                  stats.tipsGenerated++;
                }
              } catch (e) {
                console.error(`Matching tip error quiz=${quiz.id} mq=${mq.id}:`, e.message);
                stats.errors++;
              }
              await sleep(300);
            }
          }
        }

        // ─── EXPLANATIONS ──────────────────────────────────────────────────────
        if (hasExplanations) {
          // Reading comprehension: explanations per comprehensionQuestion
          if (q.type === 'reading_comprehension' && q.comprehensionQuestions?.length > 0) {
            for (let cIdx = 0; cIdx < q.comprehensionQuestions.length; cIdx++) {
              const cq = q.comprehensionQuestions[cIdx];
              if (cq.ai_data?.explanation) continue;

              try {
                const explanation = await generateRCExplanation(aiConfig, globalPrompts, q, cq);
                if (explanation) {
                  q.comprehensionQuestions[cIdx] = {
                    ...cq,
                    ai_data: { ...(cq.ai_data || {}), explanation }
                  };
                  quizUpdated = true;
                  stats.explanationsGenerated++;
                }
              } catch (e) {
                console.error(`RC explanation error quiz=${quiz.id} cIdx=${cIdx}:`, e.message);
                stats.errors++;
              }
              await sleep(300);
            }
          }

          // Drag Drop: explanations per dropZone
          if ((q.type === 'drag_drop_dual' || q.type === 'drag_drop_single') && q.dropZones?.length > 0) {
            for (let zIdx = 0; zIdx < q.dropZones.length; zIdx++) {
              const zone = q.dropZones[zIdx];
              if (zone.ai_data?.explanation) continue;

              try {
                const explanation = await generateDropZoneExplanation(aiConfig, q, zone);
                if (explanation) {
                  q.dropZones[zIdx] = {
                    ...zone,
                    ai_data: { ...(zone.ai_data || {}), explanation: { advice: explanation } }
                  };
                  quizUpdated = true;
                  stats.explanationsGenerated++;
                }
              } catch (e) {
                console.error(`DropZone explanation error quiz=${quiz.id} zone=${zone.id}:`, e.message);
                stats.errors++;
              }
              await sleep(300);
            }
          }

          // Inline Dropdown: explanations per blank
          if ((q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') && q.blanks?.length > 0) {
            for (let bIdx = 0; bIdx < q.blanks.length; bIdx++) {
              const blank = q.blanks[bIdx];
              if (blank.ai_data?.explanation) continue;

              try {
                const explanation = await generateBlankExplanation(aiConfig, globalPrompts, q, blank, bIdx);
                if (explanation) {
                  q.blanks[bIdx] = {
                    ...blank,
                    ai_data: { ...(blank.ai_data || {}), explanation: { advice: explanation } }
                  };
                  quizUpdated = true;
                  stats.explanationsGenerated++;
                }
              } catch (e) {
                console.error(`Blank explanation error quiz=${quiz.id} blank=${blank.id}:`, e.message);
                stats.errors++;
              }
              await sleep(300);
            }
          }

          // Matching: explanations per matchingQuestion
          if (q.type === 'matching_list_dual' && q.matchingQuestions?.length > 0) {
            for (let mIdx = 0; mIdx < q.matchingQuestions.length; mIdx++) {
              const mq = q.matchingQuestions[mIdx];
              if (mq.ai_data?.explanation) continue;

              try {
                const explanation = await generateMatchingExplanation(aiConfig, q, mq);
                if (explanation) {
                  q.matchingQuestions[mIdx] = {
                    ...mq,
                    ai_data: { ...(mq.ai_data || {}), explanation: { advice: explanation } }
                  };
                  quizUpdated = true;
                  stats.explanationsGenerated++;
                }
              } catch (e) {
                console.error(`Matching explanation error quiz=${quiz.id} mq=${mq.id}:`, e.message);
                stats.errors++;
              }
              await sleep(300);
            }
          }
        }

        updatedQuestions[qIdx] = q;
      }

      if (quizUpdated) {
        await base44.asServiceRole.entities.Quiz.update(quiz.id, { questions: updatedQuestions });
        stats.quizzesProcessed++;
        console.log(`Updated quiz: ${quiz.title} (${quiz.id})`);
      }

      // Pause between quizzes to avoid rate limiting
      await sleep(500);
    }

    return Response.json({ success: true, stats });
  } catch (error) {
    console.error('generateQuizAiData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── Helper: sleep ─────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Helper: call Gemini ────────────────────────────────────────────────────────
async function callGemini(apiKey, modelName, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'identity'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── Build passage context ──────────────────────────────────────────────────────
function buildPassageContext(q) {
  if (q.passages?.length > 0) {
    return '\n\nPassages:\n' + q.passages.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');
  } else if (q.passage) {
    return '\n\nPassage:\n' + q.passage;
  }
  return '';
}

function buildPassagesForPrompt(q) {
  if (q.passages?.length > 0) return q.passages.map(p => ({ id: p.id, title: p.title, content: p.content }));
  if (q.passage) return [{ id: 'main', title: 'Passage', content: q.passage }];
  return [];
}

// ─── RC HELPER TIP ─────────────────────────────────────────────────────────────
async function generateRCHelperTip(aiConfig, globalPrompts, q, cq) {
  const questionText = cq.question?.replace(/<[^>]*>/g, '');
  const passagesForPrompt = buildPassagesForPrompt(q);
  const passageContext = buildPassageContext(q);
  const hasMultiplePassages = passagesForPrompt.length > 1;
  const options = cq.options;
  const correctAnswer = cq.correctAnswer;
  const optionsContext = options ? '\n\nOptions:\n' + options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n') : '';
  const answerContext = correctAnswer ? `\n\nCorrect Answer: ${correctAnswer}` : '';

  const globalPrompt = globalPrompts.find(p => p.key === 'reading_comprehension');
  const defaultPrompt = `You are a Year 6 teacher helping a student find evidence in a text.
Tone: Simple, direct.

**CRITICAL RULES:**
1. **Highlighting:** Locate ALL specific sentences or phrases that prove the Correct Answer. Wrap EACH distinct piece of evidence in: <mark class="bg-yellow-200 px-1 rounded">EVIDENCE HERE</mark>. Keep existing formatting tags inside highlighted sections.
2. **Text Integrity:** Return the ENTIRE passage text exactly as provided, preserving all original HTML tags. Do NOT summarize or truncate.
3. **Advice Strategy:** Explain the connection between highlighted text and the question. Do NOT state the Correct Answer directly.
4. **JSON Logic:** If single passage use [For single passage] format. If multiple passages use [For multiple passages] format. Return valid raw JSON only.

**INPUT DATA:**
Question: ${questionText}
Passage(s): ${passageContext}
Options: ${optionsContext}
Correct Answer: ${answerContext}

**OUTPUT FORMAT (JSON):**

[For single passage]
{"advice": "Explain simply why the highlighted text supports the correct answer (2-3 sentences). Do not state what the correct answer is.", "highlightedContent": "Full passage with <mark class=\\"bg-yellow-200 px-1 rounded\\"> tags around the specific evidence"}

[For multiple passages]
{"advice": "Explain simply (2-3 sentences).", "passages": [{"passageId": "passage_123", "highlightedContent": "Full passage with marks"}]}`;

  let prompt = globalPrompt?.template || defaultPrompt;
  prompt = prompt.replace('{{QUESTION}}', questionText);
  prompt = prompt.replace('{{PASSAGE}}', passageContext);
  prompt = prompt.replace('{{OPTIONS}}', optionsContext);
  prompt = prompt.replace('{{CORRECT_ANSWER}}', answerContext);

  const text = await callGemini(aiConfig.api_key, aiConfig.model_name, prompt);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  const parsed = JSON.parse(jsonMatch[0]);
  const advice = parsed.advice || text;
  const passages = {};

  if (parsed.passages && Array.isArray(parsed.passages)) {
    parsed.passages.forEach(p => {
      if (p.passageId && p.highlightedContent) {
        const lines = p.highlightedContent.split('\n');
        passages[p.passageId] = lines.slice(1).join('\n');
      }
    });
  } else if (parsed.highlightedContent) {
    const passageId = passagesForPrompt[0]?.id || 'main';
    passages[passageId] = parsed.highlightedContent;
  }

  return { advice, passages };
}

// ─── DROP ZONE HELPER TIP ──────────────────────────────────────────────────────
async function generateDropZoneHelperTip(aiConfig, globalPrompts, q, zone) {
  const hasPassages = q.passages?.length > 0 || q.passage;
  const passageContext = buildPassageContext(q);
  const passagesForPrompt = buildPassagesForPrompt(q);

  const prompt = `You are a Year 6 teacher. Based on the passage(s) and the drop zone label, generate a short clue and highlight evidence.

Zone Label: ${zone.label}
Correct Answer: ${zone.correctAnswer}
Available Options: ${q.options?.join(', ')}
${passageContext}

Provide a JSON response:
${hasPassages
  ? `{"advice": "2-3 sentences explaining what type of content fits in ${zone.label}. Do NOT reveal the answer.", "passages": [{"passageId": "...", "highlightedContent": "Full passage with <mark class=\\"bg-yellow-200 px-1 rounded\\"> tags around evidence"}]}`
  : `{"advice": "2-3 sentences explaining what type of content fits in ${zone.label}. Do NOT reveal the answer."}`}

For single passage use:
{"advice": "...", "highlightedContent": "Full passage with <mark class=\\"bg-yellow-200 px-1 rounded\\"> tags"}`;

  const text = await callGemini(aiConfig.api_key, aiConfig.model_name, prompt);

  let advice = text;
  let passages = {};

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    advice = parsed.advice || text;
    if (parsed.passages && Array.isArray(parsed.passages) && parsed.passages[0] && passagesForPrompt[0]) {
      passages[passagesForPrompt[0].id] = parsed.passages[0].highlightedContent;
    } else if (parsed.highlightedContent && passagesForPrompt[0]) {
      passages[passagesForPrompt[0].id] = parsed.highlightedContent;
    }
  }

  return { advice, passages };
}

// ─── BLANK HELPER TIP ──────────────────────────────────────────────────────────
async function generateBlankHelperTip(aiConfig, globalPrompts, q, blank, bIdx) {
  const passageText = (q.passage || q.textWithBlanks || '').replace(/<[^>]*>/g, '');
  const globalPrompt = globalPrompts.find(p => p.key === 'dropdown_blanks');
  const defaultPrompt = `You are a Year 6 teacher helping a student understand vocabulary words.
For each of these words, provide:
1. A very brief definition aligning with the context (one short sentence)
2. An example sentence using the word

Passage: ${passageText}
This is for blank ${bIdx + 1} of ${q.blanks?.length}.
Words: ${blank.options?.join(', ')}

Format your response as HTML:
<div class="space-y-2"><div><strong>word1:</strong> brief definition<br/><em>Example: example sentence here</em></div></div>

Keep it simple and clear. Do NOT indicate which word is correct.`;

  let prompt = globalPrompt?.template || defaultPrompt;
  prompt = prompt.replace('{{PASSAGE}}', passageText);
  prompt = prompt.replace('{{BLANK_NUMBER}}', (bIdx + 1).toString());
  prompt = prompt.replace('{{TOTAL_BLANKS}}', (q.blanks?.length || 1).toString());
  prompt = prompt.replace('{{OPTIONS}}', blank.options?.join(', ') || '');

  return await callGemini(aiConfig.api_key, aiConfig.model_name, prompt);
}

// ─── MATCHING HELPER TIP ───────────────────────────────────────────────────────
async function generateMatchingHelperTip(aiConfig, globalPrompts, q, mq) {
  const passageContext = buildPassageContext(q);
  const globalPrompt = globalPrompts.find(p => p.key === 'matching_list_dual');
  const defaultPrompt = `You are a Year 6 teacher helping a student with a matching question.

Help the student answer: "${mq.question}"
${passageContext ? 'There is a passage provided. Quote specific sentences from the passage that give clues.' : 'Give hints about what to look for.'}

**CRITICAL RULES:**
1. Quote specific sentences (2-3) from the passage.
2. Use phrases like "One extract says...", "Another part mentions..."
3. Do NOT reveal the answer: "${mq.correctAnswer}"
4. Keep it brief.

Question: ${mq.question}
Correct Answer (DO NOT REVEAL): ${mq.correctAnswer}
${passageContext}

Provide a helpful hint with quoted sentences.`;

  let prompt = globalPrompt?.template || defaultPrompt;
  prompt = prompt.replace(/\{\{QUESTION\}\}/g, mq.question);
  prompt = prompt.replace(/\{\{CORRECT_ANSWER\}\}/g, mq.correctAnswer);
  prompt = prompt.replace('{{PASSAGES}}', passageContext);

  return await callGemini(aiConfig.api_key, aiConfig.model_name, prompt);
}

// ─── RC EXPLANATION ────────────────────────────────────────────────────────────
async function generateRCExplanation(aiConfig, globalPrompts, q, cq) {
  const questionText = cq.question?.replace(/<[^>]*>/g, '');
  const passagesForPrompt = buildPassagesForPrompt(q);
  const passagesList = passagesForPrompt.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');

  const globalPrompt = globalPrompts.find(p => p.key === 'reading_comprehension_explanation');
  const defaultPrompt = `You are a Year 6 teacher helping a student understand a reading comprehension question.
Tone: Encouraging, simple, and direct.
IMPORTANT: Do NOT start with conversational phrases. Get straight to the explanation.

**CRITICAL RULES:**
1. Highlight specific evidence with <mark class="bg-yellow-200 px-1 rounded">EVIDENCE</mark> tags.
2. Return the ENTIRE passage text exactly as provided.
3. State the correct answer clearly and explain each option individually.
4. Return valid raw JSON only.

**INPUT DATA:**
Question: ${questionText}
Passage(s): ${passagesList}
Options: ${cq.options?.join(', ')}
Correct Answer: ${cq.correctAnswer}

**OUTPUT FORMAT (JSON):**
${passagesForPrompt.length > 1
  ? `{"advice": "HTML formatted advice", "passages": [{"passageId": "${passagesForPrompt[0].id}", "highlightedContent": "Full passage with marks"}]}`
  : `{"advice": "HTML formatted advice", "highlightedContent": "Full passage with <mark class=\\"bg-yellow-200 px-1 rounded\\"> tags"}`}`;

  let prompt = globalPrompt?.template || defaultPrompt;
  prompt = prompt.replace(/\{\{QUESTION\}\}/g, questionText);
  prompt = prompt.replace('{{PASSAGES}}', passagesList);
  prompt = prompt.replace('{{OPTIONS}}', cq.options?.join(', ') || '');
  prompt = prompt.replace('{{CORRECT_ANSWER}}', cq.correctAnswer);

  const text = await callGemini(aiConfig.api_key, aiConfig.model_name, prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  const parsed = JSON.parse(jsonMatch[0]);

  const cleanedPassages = {};
  if (parsed.passages && Array.isArray(parsed.passages)) {
    parsed.passages.forEach(p => {
      if (p.passageId && p.highlightedContent) {
        const firstLB = p.highlightedContent.indexOf('\n');
        cleanedPassages[p.passageId] = firstLB !== -1 ? p.highlightedContent.substring(firstLB + 1) : p.highlightedContent;
      }
    });
  } else if (parsed.highlightedContent) {
    const passageId = passagesForPrompt[0]?.id || 'main';
    const firstLB = parsed.highlightedContent.indexOf('\n');
    cleanedPassages[passageId] = firstLB !== -1 ? parsed.highlightedContent.substring(firstLB + 1) : parsed.highlightedContent;
  }

  return { advice: parsed.advice || text, passages: cleanedPassages };
}

// ─── DROP ZONE EXPLANATION ──────────────────────────────────────────────────────
async function generateDropZoneExplanation(aiConfig, q, zone) {
  const passageContext = buildPassageContext(q);

  const prompt = `You are a Year 6 teacher helping a student understand why their drag-and-drop answer is incorrect.
Tone: Encouraging, simple, and direct.
IMPORTANT: Do NOT start with conversational phrases.

**CRITICAL RULES:**
1. State the Correct Answer clearly for "${zone.label}".
2. Explain why a wrong answer would be incorrect${passageContext ? ', using quotes from the passage' : ''}.
3. Explain why "${zone.correctAnswer}" is the right choice${passageContext ? ', using quotes from the passage' : ''}.
4. Format using HTML tags: <p>, <strong>, <br>.

Gap Label: ${zone.label}
Correct Answer: ${zone.correctAnswer}${passageContext}

Provide HTML formatted explanation:`;

  return await callGemini(aiConfig.api_key, aiConfig.model_name, prompt);
}

// ─── BLANK EXPLANATION ─────────────────────────────────────────────────────────
async function generateBlankExplanation(aiConfig, globalPrompts, q, blank, bIdx) {
  let passageText = '';
  if (q.textWithBlanks) passageText = q.textWithBlanks.replace(/<[^>]*>/g, '');
  else if (q.passages?.length > 0) passageText = q.passages.map(p => `${p.title}:\n${p.content?.replace(/<[^>]*>/g, '')}`).join('\n\n');
  else if (q.passage) passageText = q.passage.replace(/<[^>]*>/g, '');

  const globalPrompt = globalPrompts.find(p => p.key === 'dropdown_blanks_explanation');
  const defaultPrompt = `You are a Year 6 teacher helping a student understand a fill-in-the-blank question.
Tone: Encouraging, simple, and direct.
IMPORTANT: Do NOT start with conversational phrases. Get straight to the explanation.

**CRITICAL RULES:**
1. State the Correct Answer clearly.
2. Explain each option individually (correct and wrong).
3. Format using HTML tags: <p>, <strong>, <br>.

Blank Number: ${bIdx + 1}
Student's Answer: (pre-generated, no student context available)
Correct Answer: ${blank.correctAnswer}
Options: ${blank.options?.join(', ')}

Passage:
${passageText || 'No passage provided'}

Provide HTML formatted explanation:`;

  let prompt = globalPrompt?.template || defaultPrompt;
  prompt = prompt.replaceAll('{{BLANK_NUMBER}}', (bIdx + 1).toString());
  prompt = prompt.replaceAll('{{USER_ANSWER}}', '(not yet answered)');
  prompt = prompt.replaceAll('{{CORRECT_ANSWER}}', blank.correctAnswer);
  prompt = prompt.replaceAll('{{OPTIONS}}', blank.options?.join(', ') || '');
  prompt = prompt.replaceAll('{{PASSAGE}}', passageText || 'No passage provided');

  return await callGemini(aiConfig.api_key, aiConfig.model_name, prompt);
}

// ─── MATCHING EXPLANATION ──────────────────────────────────────────────────────
async function generateMatchingExplanation(aiConfig, q, mq) {
  const passageContext = buildPassageContext(q);

  const prompt = `You are a Year 6 teacher helping a student understand why their matching answer is incorrect.
Tone: Encouraging, simple, and direct.
IMPORTANT: Do NOT start with conversational phrases.

**CRITICAL RULES:**
1. State the Correct Answer clearly.
2. Explain why a wrong answer would be incorrect${passageContext ? ', using quotes from the passage' : ''}.
3. Explain why "${mq.correctAnswer}" is the correct match${passageContext ? ', using quotes from the passage' : ''}.
4. Format using HTML tags: <p>, <strong>, <br>.

Question: ${mq.question}
Correct Answer: ${mq.correctAnswer}${passageContext}

Provide HTML formatted explanation:`;

  return await callGemini(aiConfig.api_key, aiConfig.model_name, prompt);
}