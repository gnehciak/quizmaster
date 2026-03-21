import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

async function callGemini(aiConfig, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model_name}:generateContent?key=${aiConfig.api_key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  if (!res.ok) throw new Error("Gemini API error: " + res.status);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function getPassageContext(q) {
  if (q.passages?.length > 0) return "\n\nPassages:\n" + q.passages.map(p => p.title + ":\n" + p.content).join("\n\n");
  if (q.passage) return "\n\nPassage:\n" + q.passage;
  return "";
}

function stripHtml(s) { return (s || "").replace(/<[^>]*>/g, ""); }

async function genRCExplanation(aiConfig, prompts, q, cq) {
  const pList = (q.passages?.length > 0 ? q.passages : [{ id: "main", title: "Passage", content: q.passage }]);
  const pStr = pList.map(p => "[" + p.id + "] " + p.title + ":\n" + p.content).join("\n\n");
  const gp = prompts.find(p => p.key === "reading_comprehension_explanation");
  const def = "You are a Year 6 teacher. Explain this RC question. State the correct answer, explain each option. Highlight evidence with <mark class=\"bg-yellow-200 px-1 rounded\">...</mark>. Return JSON: {\"advice\":\"...\",\"highlightedContent\":\"...\"}.\n\nQuestion: {{QUESTION}}\nPassage(s): {{PASSAGES}}\nOptions: {{OPTIONS}}\nCorrect Answer: {{CORRECT_ANSWER}}";
  let prompt = gp?.template || def;
  prompt = prompt.replace(/\{\{QUESTION\}\}/g, stripHtml(cq.question));
  prompt = prompt.replace("{{PASSAGES}}", pStr);
  prompt = prompt.replace("{{OPTIONS}}", (cq.options || []).join(", "));
  prompt = prompt.replace("{{CORRECT_ANSWER}}", cq.correctAnswer || "");
  const text = await callGemini(aiConfig, prompt);
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    const parsed = JSON.parse(m[0]);
    const passages = {};
    if (parsed.passages) {
      (Array.isArray(parsed.passages) ? parsed.passages : []).forEach(p => { if (p.passageId) passages[p.passageId] = p.highlightedContent; });
    } else if (parsed.highlightedContent) {
      passages[pList[0]?.id || "main"] = parsed.highlightedContent;
    }
    return { advice: parsed.advice, passages };
  }
  return null;
}

async function genRCTip(aiConfig, prompts, q, cq) {
  const pList = (q.passages?.length > 0 ? q.passages : [{ id: "main", title: "Passage", content: q.passage }]);
  const pStr = pList.map(p => "[" + p.id + "] " + p.title + ":\n" + p.content).join("\n\n");
  const gp = prompts.find(p => p.key === "reading_comprehension_tip");
  const def = "You are a Year 6 teacher giving a hint. Do NOT reveal the answer. Highlight relevant passage sections with <mark>. Return JSON: {\"advice\":\"...\",\"highlightedContent\":\"...\"}.\n\nQuestion: " + stripHtml(cq.question) + "\nPassage(s): " + pStr + "\nOptions: " + (cq.options || []).join(", ");
  const text = await callGemini(aiConfig, gp?.template || def);
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    const parsed = JSON.parse(m[0]);
    const passages = {};
    if (parsed.passages) {
      (Array.isArray(parsed.passages) ? parsed.passages : []).forEach(p => { if (p.passageId) passages[p.passageId] = p.highlightedContent; });
    } else if (parsed.highlightedContent) {
      passages[pList[0]?.id || "main"] = parsed.highlightedContent;
    }
    return { advice: parsed.advice, passages };
  }
  return null;
}

async function genSimpleExplanation(aiConfig, prompt) {
  const text = await callGemini(aiConfig, prompt);
  return { advice: text };
}

async function genSimpleTip(aiConfig, prompt) {
  const text = await callGemini(aiConfig, prompt);
  return { advice: text };
}

async function genBlankExplanation(aiConfig, prompts, q, blank, bIdx) {
  let passage = "";
  if (q.textWithBlanks) passage = stripHtml(q.textWithBlanks);
  else if (q.passages?.length > 0) passage = q.passages.map(p => p.title + ":\n" + stripHtml(p.content)).join("\n\n");
  else if (q.passage) passage = stripHtml(q.passage);
  const gp = prompts.find(p => p.key === "dropdown_blanks_explanation");
  const def = "Explain this fill-in-the-blank. State the correct answer, explain each option. Format with HTML.\n\nBlank: {{BLANK_NUMBER}}\nCorrect: {{CORRECT_ANSWER}}\nOptions: {{OPTIONS}}\n\nPassage:\n{{PASSAGE}}";
  let prompt = gp?.template || def;
  prompt = prompt.replaceAll("{{BLANK_NUMBER}}", String(bIdx + 1));
  prompt = prompt.replaceAll("{{USER_ANSWER}}", "Not answered");
  prompt = prompt.replaceAll("{{CORRECT_ANSWER}}", blank.correctAnswer);
  prompt = prompt.replaceAll("{{OPTIONS}}", blank.options.join(", "));
  prompt = prompt.replaceAll("{{PASSAGE}}", passage || "No passage");
  return await callGemini(aiConfig, prompt);
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const aiConfigs = await base44.asServiceRole.entities.AIAPIConfig.filter({ key: "default" });
    const aiConfig = aiConfigs[0];
    if (!aiConfig?.api_key) return Response.json({ error: "AI config not found" }, { status: 400 });

    const prompts = await base44.asServiceRole.entities.AIPrompt.list();
    const allQuizzes = await base44.asServiceRole.entities.Quiz.filter({ status: "published" });

    const stats = { processed: 0, explanations: 0, tips: 0, skipped: 0, errors: [] };

    for (const quiz of allQuizzes) {
      const wantExpl = quiz.ai_explanation_enabled !== false;
      const wantTips = quiz.allow_tips === true;
      if ((!wantExpl && !wantTips) || !quiz.questions?.length) { stats.skipped++; continue; }

      let changed = false;
      const qs = JSON.parse(JSON.stringify(quiz.questions));

      for (let qi = 0; qi < qs.length; qi++) {
        const q = qs[qi];
        try {
          if (q.type === "reading_comprehension") {
            for (let ci = 0; ci < (q.comprehensionQuestions || []).length; ci++) {
              const cq = q.comprehensionQuestions[ci];
              if (wantExpl && !cq.ai_data?.explanation) {
                const r = await genRCExplanation(aiConfig, prompts, q, cq);
                if (r) { qs[qi].comprehensionQuestions[ci] = { ...cq, ai_data: { ...cq.ai_data, explanation: r } }; changed = true; stats.explanations++; }
              }
              if (wantTips && !cq.ai_data?.helper_tip) {
                const r = await genRCTip(aiConfig, prompts, q, cq);
                if (r) { qs[qi].comprehensionQuestions[ci] = { ...qs[qi].comprehensionQuestions[ci], ai_data: { ...qs[qi].comprehensionQuestions[ci].ai_data, helper_tip: r } }; changed = true; stats.tips++; }
              }
            }
          } else if (q.type === "multiple_choice") {
            if (wantExpl && !q.ai_data?.explanation) {
              const r = await genSimpleExplanation(aiConfig, "Year 6 teacher. Explain this MC question. State correct answer, explain each option. HTML format.\n\nQuestion: " + stripHtml(q.question) + "\nOptions: " + (q.options || []).join(", ") + "\nCorrect: " + q.correctAnswer);
              if (r) { qs[qi] = { ...q, ai_data: { ...q.ai_data, explanation: r } }; changed = true; stats.explanations++; }
            }
            if (wantTips && !q.ai_data?.helper_tip) {
              const r = await genSimpleTip(aiConfig, "Year 6 teacher. Give a hint for this MC question. Do NOT reveal the answer. HTML format.\n\nQuestion: " + stripHtml(q.question) + "\nOptions: " + (q.options || []).join(", "));
              if (r) { qs[qi] = { ...qs[qi], ai_data: { ...qs[qi].ai_data, helper_tip: r } }; changed = true; stats.tips++; }
            }
          } else if (q.type === "drag_drop_single" || q.type === "drag_drop_dual") {
            const pc = getPassageContext(q);
            for (let zi = 0; zi < (q.dropZones || []).length; zi++) {
              const z = q.dropZones[zi];
              if (wantExpl && !z.ai_data?.explanation) {
                const t = await callGemini(aiConfig, "Year 6 teacher. Explain drag-and-drop answer. State correct answer for \"" + z.label + "\". Explain why. HTML format." + pc + "\n\nGap: " + z.label + "\nCorrect: " + z.correctAnswer);
                if (t) { qs[qi].dropZones[zi] = { ...z, ai_data: { ...z.ai_data, explanation: { advice: t } } }; changed = true; stats.explanations++; }
              }
              if (wantTips && !z.ai_data?.helper_tip) {
                const t = await callGemini(aiConfig, "Year 6 teacher. Give hint for drag-drop. Do NOT reveal answer. HTML format." + pc + "\n\nGap: " + z.label + "\nOptions: " + (q.options || []).join(", "));
                if (t) { qs[qi].dropZones[zi] = { ...qs[qi].dropZones[zi], ai_data: { ...qs[qi].dropZones[zi].ai_data, helper_tip: { advice: t } } }; changed = true; stats.tips++; }
              }
            }
          } else if (q.type === "inline_dropdown_separate" || q.type === "inline_dropdown_same") {
            for (let bi = 0; bi < (q.blanks || []).length; bi++) {
              const b = q.blanks[bi];
              if (wantExpl && !b.ai_data?.explanation) {
                const t = await genBlankExplanation(aiConfig, prompts, q, b, bi);
                if (t) { qs[qi].blanks[bi] = { ...b, ai_data: { ...b.ai_data, explanation: { advice: t } } }; changed = true; stats.explanations++; }
              }
              if (wantTips && !b.ai_data?.helper_tip) {
                let passage = "";
                if (q.textWithBlanks) passage = stripHtml(q.textWithBlanks);
                else if (q.passage) passage = stripHtml(q.passage);
                const t = await callGemini(aiConfig, "Year 6 teacher. Give hint for fill-in-blank. Do NOT reveal answer. HTML format.\n\nBlank " + (bi+1) + "\nOptions: " + b.options.join(", ") + "\n\nPassage:\n" + (passage || "No passage"));
                if (t) { qs[qi].blanks[bi] = { ...qs[qi].blanks[bi], ai_data: { ...qs[qi].blanks[bi].ai_data, helper_tip: { advice: t } } }; changed = true; stats.tips++; }
              }
            }
          } else if (q.type === "matching_list_dual") {
            const pc = getPassageContext(q);
            for (let mi = 0; mi < (q.matchingQuestions || []).length; mi++) {
              const mq = q.matchingQuestions[mi];
              if (wantExpl && !mq.ai_data?.explanation) {
                const t = await callGemini(aiConfig, "Year 6 teacher. Explain matching answer. State correct match. Explain why. HTML format." + pc + "\n\nQuestion: " + mq.question + "\nCorrect: " + mq.correctAnswer);
                if (t) { qs[qi].matchingQuestions[mi] = { ...mq, ai_data: { ...mq.ai_data, explanation: { advice: t } } }; changed = true; stats.explanations++; }
              }
              if (wantTips && !mq.ai_data?.helper_tip) {
                const t = await callGemini(aiConfig, "Year 6 teacher. Give hint for matching question. Do NOT reveal answer. HTML format." + pc + "\n\nQuestion: " + mq.question);
                if (t) { qs[qi].matchingQuestions[mi] = { ...qs[qi].matchingQuestions[mi], ai_data: { ...qs[qi].matchingQuestions[mi].ai_data, helper_tip: { advice: t } } }; changed = true; stats.tips++; }
              }
            }
          }
        } catch (err) {
          stats.errors.push("Quiz " + quiz.id + " Q" + (qi+1) + ": " + err.message);
        }
      }

      if (changed) {
        await base44.asServiceRole.entities.Quiz.update(quiz.id, { questions: qs });
        stats.processed++;
      }
    }

    return Response.json({ success: true, stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});