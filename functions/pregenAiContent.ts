import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

async function gemini(cfg, prompt) {
  const r = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + cfg.model_name + ':generateContent?key=' + cfg.api_key,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
  );
  if (!r.ok) throw new Error('Gemini ' + r.status);
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function strip(s) { return (s || '').replace(/<[^>]*>/g, ''); }

function pctx(q) {
  if (q.passages?.length > 0) return '\n\nPassages:\n' + q.passages.map(function(p) { return p.title + ':\n' + p.content; }).join('\n\n');
  if (q.passage) return '\n\nPassage:\n' + q.passage;
  return '';
}

async function rcExpl(cfg, gp, q, cq) {
  var pl = q.passages?.length > 0 ? q.passages : [{ id: 'main', title: 'Passage', content: q.passage }];
  var ps = pl.map(function(p) { return '[' + p.id + '] ' + p.title + ':\n' + p.content; }).join('\n\n');
  var tp = gp.find(function(p) { return p.key === 'reading_comprehension_explanation'; });
  var pr = tp?.template || 'Year 6 teacher. Explain RC question. State correct answer, explain each option. Highlight with <mark class="bg-yellow-200 px-1 rounded">...</mark>. Return JSON: {"advice":"...","highlightedContent":"..."}.\n\nQuestion: {{QUESTION}}\nPassage(s): {{PASSAGES}}\nOptions: {{OPTIONS}}\nCorrect Answer: {{CORRECT_ANSWER}}';
  pr = pr.replace(/\{\{QUESTION\}\}/g, strip(cq.question));
  pr = pr.replace('{{PASSAGES}}', ps);
  pr = pr.replace('{{OPTIONS}}', (cq.options || []).join(', '));
  pr = pr.replace('{{CORRECT_ANSWER}}', cq.correctAnswer || '');
  var t = await gemini(cfg, pr);
  var m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  var p = JSON.parse(m[0]);
  var passages = {};
  if (p.passages && Array.isArray(p.passages)) { p.passages.forEach(function(x) { if (x.passageId) passages[x.passageId] = x.highlightedContent; }); }
  else if (p.highlightedContent) { passages[pl[0]?.id || 'main'] = p.highlightedContent; }
  return { advice: p.advice, passages: passages };
}

async function rcTip(cfg, gp, q, cq) {
  var pl = q.passages?.length > 0 ? q.passages : [{ id: 'main', title: 'Passage', content: q.passage }];
  var ps = pl.map(function(p) { return '[' + p.id + '] ' + p.title + ':\n' + p.content; }).join('\n\n');
  var tp = gp.find(function(p) { return p.key === 'reading_comprehension_tip'; });
  var pr = tp?.template || 'Year 6 teacher. Hint for RC question. Do NOT reveal the answer. Highlight with <mark>. Return JSON: {"advice":"...","highlightedContent":"..."}.\n\nQuestion: ' + strip(cq.question) + '\nPassage(s): ' + ps + '\nOptions: ' + (cq.options || []).join(', ');
  var t = await gemini(cfg, pr);
  var m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  var p = JSON.parse(m[0]);
  var passages = {};
  if (p.passages && Array.isArray(p.passages)) { p.passages.forEach(function(x) { if (x.passageId) passages[x.passageId] = x.highlightedContent; }); }
  else if (p.highlightedContent) { passages[pl[0]?.id || 'main'] = p.highlightedContent; }
  return { advice: p.advice, passages: passages };
}

async function blankExpl(cfg, gp, q, b, i) {
  var pt = '';
  if (q.textWithBlanks) pt = strip(q.textWithBlanks);
  else if (q.passage) pt = strip(q.passage);
  var tp = gp.find(function(p) { return p.key === 'dropdown_blanks_explanation'; });
  var pr = tp?.template || 'Year 6 teacher. Explain fill-in-blank. State correct answer, explain each option. HTML.\n\nBlank: {{BLANK_NUMBER}}\nCorrect: {{CORRECT_ANSWER}}\nOptions: {{OPTIONS}}\n\nPassage:\n{{PASSAGE}}';
  pr = pr.replaceAll('{{BLANK_NUMBER}}', String(i + 1));
  pr = pr.replaceAll('{{USER_ANSWER}}', 'Not answered');
  pr = pr.replaceAll('{{CORRECT_ANSWER}}', b.correctAnswer);
  pr = pr.replaceAll('{{OPTIONS}}', b.options.join(', '));
  pr = pr.replaceAll('{{PASSAGE}}', pt || 'No passage');
  return await gemini(cfg, pr);
}

Deno.serve(async (req) => {
  var base44 = createClientFromRequest(req);
  try {
    var user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    var cfgs = await base44.asServiceRole.entities.AIAPIConfig.filter({ key: 'default' });
    var cfg = cfgs[0];
    if (!cfg?.api_key) return Response.json({ error: 'No AI config' }, { status: 400 });

    var gp = await base44.asServiceRole.entities.AIPrompt.list();
    var quizzes = await base44.asServiceRole.entities.Quiz.filter({ status: 'published' });
    var st = { processed: 0, explanations: 0, tips: 0, skipped: 0, errors: [] };

    for (var quiz of quizzes) {
      var wE = quiz.ai_explanation_enabled !== false;
      var wT = quiz.allow_tips === true;
      if ((!wE && !wT) || !quiz.questions?.length) { st.skipped++; continue; }

      var ch = false;
      var qs = JSON.parse(JSON.stringify(quiz.questions));

      for (var qi = 0; qi < qs.length; qi++) {
        var q = qs[qi];
        try {
          if (q.type === 'reading_comprehension') {
            for (var ci = 0; ci < (q.comprehensionQuestions || []).length; ci++) {
              var cq = q.comprehensionQuestions[ci];
              if (wE && !cq.ai_data?.explanation) { var r = await rcExpl(cfg, gp, q, cq); if (r) { qs[qi].comprehensionQuestions[ci] = Object.assign({}, cq, { ai_data: Object.assign({}, cq.ai_data, { explanation: r }) }); ch = true; st.explanations++; } }
              if (wT && !cq.ai_data?.helper_tip) { var r2 = await rcTip(cfg, gp, q, cq); if (r2) { qs[qi].comprehensionQuestions[ci] = Object.assign({}, qs[qi].comprehensionQuestions[ci], { ai_data: Object.assign({}, qs[qi].comprehensionQuestions[ci].ai_data, { helper_tip: r2 }) }); ch = true; st.tips++; } }
            }
          } else if (q.type === 'multiple_choice') {
            if (wE && !q.ai_data?.explanation) { var t1 = await gemini(cfg, 'Year 6 teacher. Explain MC. State correct answer, explain each option. HTML.\n\nQ: ' + strip(q.question) + '\nOpts: ' + (q.options || []).join(', ') + '\nCorrect: ' + q.correctAnswer); qs[qi] = Object.assign({}, q, { ai_data: Object.assign({}, q.ai_data, { explanation: { advice: t1 } }) }); ch = true; st.explanations++; }
            if (wT && !q.ai_data?.helper_tip) { var t2 = await gemini(cfg, 'Year 6 teacher. Hint for MC. Do NOT reveal answer. HTML.\n\nQ: ' + strip(q.question) + '\nOpts: ' + (q.options || []).join(', ')); qs[qi] = Object.assign({}, qs[qi], { ai_data: Object.assign({}, qs[qi].ai_data, { helper_tip: { advice: t2 } }) }); ch = true; st.tips++; }
          } else if (q.type === 'drag_drop_single' || q.type === 'drag_drop_dual') {
            var pc = pctx(q);
            for (var zi = 0; zi < (q.dropZones || []).length; zi++) {
              var z = q.dropZones[zi];
              if (wE && !z.ai_data?.explanation) { var te = await gemini(cfg, 'Year 6 teacher. Explain drag-drop for "' + z.label + '". HTML.' + pc + '\nGap: ' + z.label + '\nCorrect: ' + z.correctAnswer); qs[qi].dropZones[zi] = Object.assign({}, z, { ai_data: Object.assign({}, z.ai_data, { explanation: { advice: te } }) }); ch = true; st.explanations++; }
              if (wT && !z.ai_data?.helper_tip) { var tt = await gemini(cfg, 'Year 6 teacher. Hint for drag-drop. Do NOT reveal answer. HTML.' + pc + '\nGap: ' + z.label + '\nOpts: ' + (q.options || []).join(', ')); qs[qi].dropZones[zi] = Object.assign({}, qs[qi].dropZones[zi], { ai_data: Object.assign({}, qs[qi].dropZones[zi].ai_data, { helper_tip: { advice: tt } }) }); ch = true; st.tips++; }
            }
          } else if (q.type === 'inline_dropdown_separate' || q.type === 'inline_dropdown_same') {
            for (var bi = 0; bi < (q.blanks || []).length; bi++) {
              var b = q.blanks[bi];
              if (wE && !b.ai_data?.explanation) { var be = await blankExpl(cfg, gp, q, b, bi); if (be) { qs[qi].blanks[bi] = Object.assign({}, b, { ai_data: Object.assign({}, b.ai_data, { explanation: { advice: be } }) }); ch = true; st.explanations++; } }
              if (wT && !b.ai_data?.helper_tip) { var pt = ''; if (q.textWithBlanks) pt = strip(q.textWithBlanks); else if (q.passage) pt = strip(q.passage); var bt = await gemini(cfg, 'Year 6 teacher. Hint for fill-in-blank. Do NOT reveal answer. HTML.\n\nBlank ' + (bi+1) + '\nOpts: ' + b.options.join(', ') + '\n\nPassage:\n' + (pt || 'No passage')); qs[qi].blanks[bi] = Object.assign({}, qs[qi].blanks[bi], { ai_data: Object.assign({}, qs[qi].blanks[bi].ai_data, { helper_tip: { advice: bt } }) }); ch = true; st.tips++; }
            }
          } else if (q.type === 'matching_list_dual') {
            var pc2 = pctx(q);
            for (var mi = 0; mi < (q.matchingQuestions || []).length; mi++) {
              var mq = q.matchingQuestions[mi];
              if (wE && !mq.ai_data?.explanation) { var me = await gemini(cfg, 'Year 6 teacher. Explain matching. State correct match. HTML.' + pc2 + '\nQ: ' + mq.question + '\nCorrect: ' + mq.correctAnswer); qs[qi].matchingQuestions[mi] = Object.assign({}, mq, { ai_data: Object.assign({}, mq.ai_data, { explanation: { advice: me } }) }); ch = true; st.explanations++; }
              if (wT && !mq.ai_data?.helper_tip) { var mt = await gemini(cfg, 'Year 6 teacher. Hint for matching. Do NOT reveal answer. HTML.' + pc2 + '\nQ: ' + mq.question); qs[qi].matchingQuestions[mi] = Object.assign({}, qs[qi].matchingQuestions[mi], { ai_data: Object.assign({}, qs[qi].matchingQuestions[mi].ai_data, { helper_tip: { advice: mt } }) }); ch = true; st.tips++; }
            }
          }
        } catch (err) { st.errors.push(quiz.id + ' Q' + (qi+1) + ': ' + err.message); }
      }
      if (ch) { await base44.asServiceRole.entities.Quiz.update(quiz.id, { questions: qs }); st.processed++; }
    }
    return Response.json({ success: true, stats: st });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
});