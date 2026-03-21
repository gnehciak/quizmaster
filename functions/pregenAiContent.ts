import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const LITE_MODEL = 'gemini-3.1-flash-lite-preview';

async function gem(key, model, prompt) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  if (!r.ok) throw new Error('Gemini ' + r.status);
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function s(t) { return (t || '').replace(/<[^>]*>/g, ''); }

function pctx(q) {
  if (q.passages?.length > 0) return q.passages.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');
  if (q.passage) return q.passage;
  return '';
}

async function rcExpl(key, model, gp, q, cq) {
  const pl = q.passages?.length > 0 ? q.passages : [{ id: 'main', title: 'Passage', content: q.passage }];
  const ps = pl.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');
  const tp = gp.find(p => p.key === 'reading_comprehension_explanation');
  let pr = tp?.template || `You are a Year 6 teacher helping a student understand a reading comprehension question.
Tone: Encouraging, simple, and direct. Do NOT start with conversational phrases.
CRITICAL RULES:
1. Highlighting: Wrap evidence in <mark class="bg-yellow-200 px-1 rounded">...</mark>. Preserve all original HTML.
2. Text Integrity: Return ENTIRE passage text exactly as provided.
3. State correct answer. Explain each option individually. Quote from passage.
4. Return valid raw JSON only.

Question: {{QUESTION}}
Passage(s): {{PASSAGES}}
Options: {{OPTIONS}}
Correct Answer: {{CORRECT_ANSWER}}

OUTPUT FORMAT:
{"advice":"HTML explanation","highlightedContent":"Full passage with <mark> tags"}
Or for multiple passages:
{"advice":"HTML explanation","passages":[{"passageId":"id","highlightedContent":"..."}]}`;
  pr = pr.replace(/\{\{QUESTION\}\}/g, s(cq.question));
  pr = pr.replace('{{PASSAGES}}', ps);
  pr = pr.replace('{{OPTIONS}}', (cq.options || []).join(', '));
  pr = pr.replace('{{CORRECT_ANSWER}}', cq.correctAnswer || '');
  const t = await gem(key, model, pr);
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  const p = JSON.parse(m[0]);
  const passages = {};
  if (p.passages && Array.isArray(p.passages)) p.passages.forEach(x => { if (x.passageId) passages[x.passageId] = x.highlightedContent; });
  else if (p.highlightedContent) passages[pl[0]?.id || 'main'] = p.highlightedContent;
  return { advice: p.advice, passages };
}

async function rcTip(key, model, gp, q, cq) {
  const pl = q.passages?.length > 0 ? q.passages : [{ id: 'main', title: 'Passage', content: q.passage }];
  const ps = pl.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');
  const tp = gp.find(p => p.key === 'reading_comprehension_tip');
  let pr = tp?.template || `Year 6 teacher. Hint for RC question. Do NOT reveal answer. Highlight clues with <mark class="bg-yellow-200 px-1 rounded">...</mark>. Return JSON: {"advice":"...","highlightedContent":"..."}.
Question: {{QUESTION}}
Passage(s): {{PASSAGES}}
Options: {{OPTIONS}}`;
  pr = pr.replace(/\{\{QUESTION\}\}/g, s(cq.question));
  pr = pr.replace('{{PASSAGES}}', ps);
  pr = pr.replace('{{OPTIONS}}', (cq.options || []).join(', '));
  const t = await gem(key, model, pr);
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  const p = JSON.parse(m[0]);
  const passages = {};
  if (p.passages && Array.isArray(p.passages)) p.passages.forEach(x => { if (x.passageId) passages[x.passageId] = x.highlightedContent; });
  else if (p.highlightedContent) passages[pl[0]?.id || 'main'] = p.highlightedContent;
  return { advice: p.advice, passages };
}

async function blankExpl(key, model, gp, q, b, i) {
  let pt = q.textWithBlanks ? s(q.textWithBlanks) : q.passages?.length > 0 ? q.passages.map(p => `${p.title}:\n${s(p.content)}`).join('\n\n') : q.passage ? s(q.passage) : '';
  const tp = gp.find(p => p.key === 'dropdown_blanks_explanation');
  let pr = tp?.template || `Year 6 teacher. Explain fill-in-blank. State correct answer, explain each option. HTML.
Blank Number: {{BLANK_NUMBER}}
Correct Answer: {{CORRECT_ANSWER}}
Options: {{OPTIONS}}
Passage:
{{PASSAGE}}`;
  pr = pr.replaceAll('{{BLANK_NUMBER}}', String(i + 1));
  pr = pr.replaceAll('{{USER_ANSWER}}', 'Not answered');
  pr = pr.replaceAll('{{CORRECT_ANSWER}}', b.correctAnswer);
  pr = pr.replaceAll('{{OPTIONS}}', b.options.join(', '));
  pr = pr.replaceAll('{{PASSAGE}}', pt || 'No passage');
  return { advice: await gem(key, model, pr) };
}

async function blankTip(key, model, q, b, i) {
  let pt = q.textWithBlanks ? s(q.textWithBlanks) : q.passage ? s(q.passage) : '';
  return { advice: await gem(key, model, `Year 6 teacher. Hint for fill-in-blank. Do NOT reveal answer. HTML.\nBlank ${i+1}\nOpts: ${b.options.join(', ')}\nPassage:\n${pt || 'No passage'}`) };
}

async function dzExpl(key, model, q, z) {
  const pc = pctx(q);
  return { advice: await gem(key, model, `Year 6 teacher. Explain drag-drop for "${z.label}". State correct answer "${z.correctAnswer}". Explain why it fits. HTML.${pc ? '\nPassage:\n' + pc : ''}\nGap: ${z.label}\nCorrect: ${z.correctAnswer}`) };
}

async function dzTip(key, model, q, z) {
  const pc = pctx(q);
  return { advice: await gem(key, model, `Year 6 teacher. Hint for drag-drop gap "${z.label}". Do NOT reveal answer. HTML.${pc ? '\nPassage:\n' + pc : ''}\nGap: ${z.label}\nOpts: ${(q.options || []).join(', ')}`) };
}

async function matchExpl(key, model, q, mq) {
  const pc = pctx(q);
  return { advice: await gem(key, model, `Year 6 teacher. Explain matching. State correct match "${mq.correctAnswer}" for "${mq.question}". HTML.${pc ? '\nPassage:\n' + pc : ''}\nQ: ${mq.question}\nCorrect: ${mq.correctAnswer}`) };
}

async function matchTip(key, model, q, mq) {
  const pc = pctx(q);
  return { advice: await gem(key, model, `Year 6 teacher. Hint for matching "${mq.question}". Do NOT reveal answer. HTML.${pc ? '\nPassage:\n' + pc : ''}`) };
}

async function mcExpl(key, model, q) {
  return { advice: await gem(key, model, `Year 6 teacher. Explain MC. State correct answer, explain each option. HTML.\nQ: ${s(q.question)}\nOpts: ${(q.options || []).join(', ')}\nCorrect: ${q.correctAnswer}`) };
}

async function mcTip(key, model, q) {
  return { advice: await gem(key, model, `Year 6 teacher. Hint for MC. Do NOT reveal answer. HTML.\nQ: ${s(q.question)}\nOpts: ${(q.options || []).join(', ')}`) };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const cfgs = await base44.asServiceRole.entities.AIAPIConfig.filter({ key: 'default' });
    const cfg = cfgs[0];
    if (!cfg?.api_key) return Response.json({ error: 'No AI config' }, { status: 400 });

    const key = cfg.api_key;
    const model = LITE_MODEL;
    const gp = await base44.asServiceRole.entities.AIPrompt.list();
    const quizzes = await base44.asServiceRole.entities.Quiz.filter({ status: 'published' });
    const st = { processed: 0, explanations: 0, tips: 0, skipped: 0, errors: [] };

    for (const quiz of quizzes) {
      const wE = quiz.ai_explanation_enabled !== false;
      const wT = quiz.allow_tips === true;
      if ((!wE && !wT) || !quiz.questions?.length) { st.skipped++; continue; }

      let ch = false;
      const qs = JSON.parse(JSON.stringify(quiz.questions));

      for (let qi = 0; qi < qs.length; qi++) {
        const q = qs[qi];
        try {
          if (q.type === 'reading_comprehension') {
            for (let ci = 0; ci < (q.comprehensionQuestions || []).length; ci++) {
              const cq = q.comprehensionQuestions[ci];
              if (wE && !cq.ai_data?.explanation) { const r = await rcExpl(key, model, gp, q, cq); if (r) { qs[qi].comprehensionQuestions[ci] = { ...qs[qi].comprehensionQuestions[ci], ai_data: { ...qs[qi].comprehensionQuestions[ci].ai_data, explanation: r } }; ch = true; st.explanations++; } }
              if (wT && !cq.ai_data?.helper_tip) { const r = await rcTip(key, model, gp, q, cq); if (r) { qs[qi].comprehensionQuestions[ci] = { ...qs[qi].comprehensionQuestions[ci], ai_data: { ...qs[qi].comprehensionQuestions[ci].ai_data, helper_tip: r } }; ch = true; st.tips++; } }
            }
          } else if (q.type === 'multiple_choice') {
            if (wE && !q.ai_data?.explanation) { const r = await mcExpl(key, model, q); if (r) { qs[qi] = { ...qs[qi], ai_data: { ...qs[qi].ai_data, explanation: r } }; ch = true; st.explanations++; } }
            if (wT && !q.ai_data?.helper_tip) { const r = await mcTip(key, model, q); if (r) { qs[qi] = { ...qs[qi], ai_data: { ...qs[qi].ai_data, helper_tip: r } }; ch = true; st.tips++; } }
          } else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
            for (let zi = 0; zi < (q.dropZones || []).length; zi++) {
              const z = q.dropZones[zi];
              if (wE && !z.ai_data?.explanation) { const r = await dzExpl(key, model, q, z); if (r) { qs[qi].dropZones[zi] = { ...qs[qi].dropZones[zi], ai_data: { ...qs[qi].dropZones[zi].ai_data, explanation: r } }; ch = true; st.explanations++; } }
              if (wT && !z.ai_data?.helper_tip) { const r = await dzTip(key, model, q, z); if (r) { qs[qi].dropZones[zi] = { ...qs[qi].dropZones[zi], ai_data: { ...qs[qi].dropZones[zi].ai_data, helper_tip: r } }; ch = true; st.tips++; } }
            }
          } else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
            for (let bi = 0; bi < (q.blanks || []).length; bi++) {
              const b = q.blanks[bi];
              if (wE && !b.ai_data?.explanation) { const r = await blankExpl(key, model, gp, q, b, bi); if (r) { qs[qi].blanks[bi] = { ...qs[qi].blanks[bi], ai_data: { ...qs[qi].blanks[bi].ai_data, explanation: r } }; ch = true; st.explanations++; } }
              if (wT && !b.ai_data?.helper_tip) { const r = await blankTip(key, model, q, b, bi); if (r) { qs[qi].blanks[bi] = { ...qs[qi].blanks[bi], ai_data: { ...qs[qi].blanks[bi].ai_data, helper_tip: r } }; ch = true; st.tips++; } }
            }
          } else if (q.type === 'matching_list_dual') {
            for (let mi = 0; mi < (q.matchingQuestions || []).length; mi++) {
              const mq = q.matchingQuestions[mi];
              if (wE && !mq.ai_data?.explanation) { const r = await matchExpl(key, model, q, mq); if (r) { qs[qi].matchingQuestions[mi] = { ...qs[qi].matchingQuestions[mi], ai_data: { ...qs[qi].matchingQuestions[mi].ai_data, explanation: r } }; ch = true; st.explanations++; } }
              if (wT && !mq.ai_data?.helper_tip) { const r = await matchTip(key, model, q, mq); if (r) { qs[qi].matchingQuestions[mi] = { ...qs[qi].matchingQuestions[mi], ai_data: { ...qs[qi].matchingQuestions[mi].ai_data, helper_tip: r } }; ch = true; st.tips++; } }
            }
          }
        } catch (err) { st.errors.push(`${quiz.id} Q${qi+1}: ${err.message}`); console.error(`Quiz ${quiz.id} Q${qi+1}:`, err.message); }
      }

      if (ch) { await base44.asServiceRole.entities.Quiz.update(quiz.id, { questions: qs }); st.processed++; console.log(`Updated: ${quiz.title}`); }
    }

    console.log('Done:', JSON.stringify(st));
    return Response.json({ success: true, stats: st });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});