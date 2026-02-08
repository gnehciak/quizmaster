import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

const quizCache = {};

export function useLazyQuiz(quizId) {
  const [quiz, setQuiz] = useState(quizCache[quizId] || null);
  const [loading, setLoading] = useState(!quizCache[quizId]);
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !quizId || quizCache[quizId]) {
      if (quizCache[quizId]) {
        setQuiz(quizCache[quizId]);
        setLoading(false);
      }
      return;
    }

    let cancelled = false;
    setLoading(true);

    base44.entities.Quiz.filter({ id: quizId })
      .then(results => {
        if (cancelled) return;
        const q = results[0] || null;
        if (q) quizCache[quizId] = q;
        setQuiz(q);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [inView, quizId]);

  return { ref, quiz, loading, inView };
}

export function invalidateQuizCache(quizId) {
  if (quizId) {
    delete quizCache[quizId];
  } else {
    Object.keys(quizCache).forEach(k => delete quizCache[k]);
  }
}

export function QuizLoadingPlaceholder() {
  return (
    <div className="flex items-center gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm w-full">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
      <div className="flex-1">
        <div className="h-5 bg-slate-200 rounded w-48 mb-2 animate-pulse" />
        <div className="h-4 bg-slate-100 rounded w-32 animate-pulse" />
      </div>
    </div>
  );
}