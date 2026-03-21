import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const MODEL = 'gemini-3.1-flash-lite-preview';

async function gem(key, prompt) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  if (!r.ok) throw new Error('Gemini ' + r.status);
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function strip(t) { return (t || '').replace(/<[^>]*>/g, ''); }

function passageCtx(q) {
  if (q.passages?.length > 0) return q.passages.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');
  if (q.passage) return q.passage;
  return '';
}

async function rcExpl(key, gp, q, cq) {
  const pl = q.passages?.length > 0 ? q.passages : [{ id: 'main', title: 'Passage', content: q.passage }];
  const ps = pl.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');
  const tp = gp.find(p => p.key === 'reading_comprehension_explanation');
  let pr = tp?.template || `Year 6 teacher. RC explanation. State correct answer. Explain each option. Highlight evidence with <mark class="bg-yellow-200 px-1 rounded">...</mark>. Preserve original HTML. Return JSON only:
{"advice":"HTML explanation","highlightedContent":"Full passage with marks"} or {"advice":"...","passages":[{"passageId":"id","highlightedContent":"..."}]}

Question: {{QUESTION}}
Passage(s): {{PASSAGES}}
Options: {{OPTIONS}}
Correct Answer: {{CORRECT_ANSWER}}`;
  pr = pr.replace(/\{\{QUESTION\}\}/g, strip(cq.question));
  pr = pr.replace('{{PASSAGES}}', ps);
  pr = pr.replace('{{OPTIONS}}', (cq.options || []).join(', '));
  pr = pr.replace('{{CORRECT_ANSWER}}', cq.correctAnswer || '');
  const t = await gem(key, pr);
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  const p = JSON.parse(m[0]);
  const passages = {};
  if (p.passages && Array.isArray(p.passages)) p.passages.forEach(x => { if (x.passageId) passages[x.passageId] = x.highlightedContent; });
  else if (p.highlightedContent) passages[pl[0]?.id || 'main'] = p.highlightedContent;
  return { advice: p.advice, passages };
}

async function rcTip(key, gp, q, cq) {
  const pl = q.passages?.length > 0 ? q.passages : [{ id: 'main', title: 'Passage', content: q.passage }];
  const ps = pl.map(p => `[${p.id}] ${p.title}:\n${p.content}`).join('\n\n');
  const tp = gp.find(p => p.key === 'reading_comprehension_tip');
  let pr = tp?.template || `Year 6 teacher. RC hint. Do NOT reveal answer. Highlight clues with <mark class="bg-yellow-200 px-1 rounded">...</mark>. Return JSON: {"advice":"...","highlightedContent":"..."}.
Question: {{QUESTION}}
Passage(s): {{PASSAGES}}
Options: {{OPTIONS}}`;
  pr = pr.replace(/\{\{QUESTION\}\}/g, strip(cq.question));
  pr = pr.replace('{{PASSAGES}}', ps);
  pr = pr.replace('{{OPTIONS}}', (cq.options || []).join(', '));
  const t = await gem(key, pr);
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  const p = JSON.parse(m[0]);
  const passages = {};
  if (p.passages && Array.isArray(p.passages)) p.passages.forEach(x => { if (x.passageId) passages[x.passageId] = x.highlightedContent; });
  else if (p.highlightedContent) passages[pl[0]?.id || 'main'] = p.highlightedContent;
  return { advice: p.advice, passages };
}

async function blankExpl(key, gp, q, b, i) {
  let pt = q.textWithBlanks ? strip(q.textWithBlanks) : q.passage ? strip(q.passage) : '';
  const tp = gp.find(p => p.key === 'dropdown_blanks_explanation');
  let pr = tp?.template || `Year 6 teacher. Explain fill-in-blank. State correct answer, explain each option. HTML.
Blank: {{BLANK_NUMBER}} Correct: {{CORRECT_ANSWER}} Options: {{OPTIONS}}
Passage: {{PASSAGE}}`;
  pr = pr.replaceAll('{{BLANK_NUMBER}}', String(i + 1));
  pr = pr.replaceAll('{{USER_ANSWER}}', 'Not answered');
  pr = pr.replaceAll('{{CORRECT_ANSWER}}', b.correctAnswer);
  pr = pr.replaceAll('{{OPTIONS}}', b.options.join(', '));
  pr = pr.replaceAll('{{PASSAGE}}', pt || 'No passage');
  return { advice: await gem(key, pr) };
}

async function processQuiz(base44, key, gp, quizId, st) {
  // Fetch quiz individually to avoid large batch responses
  const quizList = await base44.asServiceRole.entities.Quiz.filter({ id: quizId });
  const quiz = quizList[0];
  if (!quiz) return;

  const wE = quiz.ai_explanation_enabled !== false;
  const wT = quiz.allow_tips === true;
  if ((!wE && !wT) || !quiz.questions?.length) { st.skipped++; return; }

  let ch = false;
  const qs = JSON.parse(JSON.stringify(quiz.questions));

  for (let qi = 0; qi < qs.length; qi++) {
    const q = qs[qi];
    try {
      if (q.type === 'reading_comprehension') {
        for (let ci = 0; ci < (q.comprehensionQuestions || []).length; ci++) {
          const cq = q.comprehensionQuestions[ci];
          if (wE && !cq.ai_data?.explanation) { const r = await rcExpl(key, gp, q, cq); if (r) { qs[qi].comprehensionQuestions[ci] = { ...qs[qi].comprehensionQuestions[ci], ai_data: { ...qs[qi].comprehensionQuestions[ci].ai_data, explanation: r } }; ch = true; st.explanations++; } }
          if (wT && !cq.ai_data?.helper_tip) { const r = await rcTip(key, gp, q, cq); if (r) { qs[qi].comprehensionQuestions[ci] = { ...qs[qi].comprehensionQuestions[ci], ai_data: { ...qs[qi].comprehensionQuestions[ci].ai_data, helper_tip: r } }; ch = true; st.tips++; } }
        }
      } else if (q.type === 'multiple_choice') {
        if (wE && !q.ai_data?.explanation) { qs[qi] = { ...qs[qi], ai_data: { ...qs[qi].ai_data, explanation: { advice: await gem(key, `Year 6 teacher. Explain MC. State correct answer, explain each option. HTML.\nQ: ${strip(q.question)}\nOpts: ${(q.options||[]).join(', ')}\nCorrect: ${q.correctAnswer}`) } } }; ch = true; st.explanations++; }
        if (wT && !q.ai_data?.helper_tip) { qs[qi] = { ...qs[qi], ai_data: { ...qs[qi].ai_data, helper_tip: { advice: await gem(key, `Year 6 teacher. Hint for MC. Do NOT reveal answer. HTML.\nQ: ${strip(q.question)}\nOpts: ${(q.options||[]).join(', ')}`) } } }; ch = true; st.tips++; }
      } else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
        const px = passageCtx(q);
        for (let zi = 0; zi < (q.dropZones || []).length; zi++) {
          const z = q.dropZones[zi];
          if (wE && !z.ai_data?.explanation) { qs[qi].dropZones[zi] = { ...qs[qi].dropZones[zi], ai_data: { ...qs[qi].dropZones[zi].ai_data, explanation: { advice: await gem(key, `Year 6 teacher. Explain drag-drop "${z.label}". Correct: "${z.correctAnswer}". HTML.${px ? '\n'+px : ''}`) } } }; ch = true; st.explanations++; }
          if (wT && !z.ai_data?.helper_tip) { qs[qi].dropZones[zi] = { ...qs[qi].dropZones[zi], ai_data: { ...qs[qi].dropZones[zi].ai_data, helper_tip: { advice: await gem(key, `Year 6 teacher. Hint for drag-drop "${z.label}". Do NOT reveal answer. HTML.${px ? '\n'+px : ''}\nOpts: ${(q.options||[]).join(', ')}`) } } }; ch = true; st.tips++; }
        }
      } else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
        for (let bi = 0; bi < (q.blanks || []).length; bi++) {
          const b = q.blanks[bi];
          if (wE && !b.ai_data?.explanation) { const r = await blankExpl(key, gp, q, b, bi); if (r) { qs[qi].blanks[bi] = { ...qs[qi].blanks[bi], ai_data: { ...qs[qi].blanks[bi].ai_data, explanation: r } }; ch = true; st.explanations++; } }
          if (wT && !b.ai_data?.helper_tip) { let pt = q.textWithBlanks ? strip(q.textWithBlanks) : q.passage ? strip(q.passage) : ''; qs[qi].blanks[bi] = { ...qs[qi].blanks[bi], ai_data: { ...qs[qi].blanks[bi].ai_data, helper_tip: { advice: await gem(key, `Year 6 teacher. Hint for blank ${bi+1}. Do NOT reveal answer. HTML.\nOpts: ${b.options.join(', ')}\nPassage:\n${pt||'No passage'}`) } } }; ch = true; st.tips++; }
        }
      } else if (q.type === 'matching_list_dual') {
        const px = passageCtx(q);
        for (let mi = 0; mi < (q.matchingQuestions || []).length; mi++) {
          const mq = q.matchingQuestions[mi];
          if (wE && !mq.ai_data?.explanation) { qs[qi].matchingQuestions[mi] = { ...qs[qi].matchingQuestions[mi], ai_data: { ...qs[qi].matchingQuestions[mi].ai_data, explanation: { advice: await gem(key, `Year 6 teacher. Explain matching "${mq.question}". Correct: "${mq.correctAnswer}". HTML.${px ? '\n'+px : ''}`) } } }; ch = true; st.explanations++; }
          if (wT && !mq.ai_data?.helper_tip) { qs[qi].matchingQuestions[mi] = { ...qs[qi].matchingQuestions[mi], ai_data: { ...qs[qi].matchingQuestions[mi].ai_data, helper_tip: { advice: await gem(key, `Year 6 teacher. Hint for matching "${mq.question}". Do NOT reveal answer. HTML.${px ? '\n'+px : ''}`) } } }; ch = true; st.tips++; }
        }
      }
    } catch (err) { st.errors.push(`${quiz.id} Q${qi+1}: ${err.message}`); }
  }

  if (ch) {
    await base44.asServiceRole.entities.Quiz.update(quiz.id, { questions: qs });
    st.processed++;
    console.log(`Updated: ${quiz.title}`);
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const cfgs = await base44.asServiceRole.entities.AIAPIConfig.filter({ key: 'default' });
    if (!cfgs[0]?.api_key) return Response.json({ error: 'No AI config' }, { status: 400 });
    const key = cfgs[0].api_key;

    const gp = await base44.asServiceRole.entities.AIPrompt.list();

    // Get just quiz IDs and settings first (lightweight query)
    const allQuizzes = await base44.asServiceRole.entities.Quiz.filter({ status: 'published' });
    const quizIds = allQuizzes.map(q => q.id);

    console.log(`Found ${quizIds.length} published quizzes`);
    const st = { processed: 0, explanations: 0, tips: 0, skipped: 0, errors: [] };

    for (const quizId of quizIds) {
      await processQuiz(base44, key, gp, quizId, st);
    }

    console.log('Done:', JSON.stringify(st));
    return Response.json({ success: true, stats: st });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});