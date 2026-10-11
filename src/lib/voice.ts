// Dictée continue (Web Speech API, fr-FR) + niveau du micro pour animer l'orbe.
// Selon le navigateur, la reconnaissance peut passer par un service distant du fournisseur du navigateur.
import { useCallback, useEffect, useRef, useState } from 'react';

type Rec = any;

export function useVoice(onFinal: (text: string) => void) {
  const Ctor: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
  const supported = !!Ctor;
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [level, setLevel] = useState(0);
  const [error, setError] = useState('');
  const rec = useRef<Rec>(null);
  const wanted = useRef(false);
  const audio = useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  const stopMeter = () => {
    if (!audio.current) return;
    cancelAnimationFrame(audio.current.raf);
    audio.current.stream.getTracks().forEach((t) => t.stop());
    audio.current.ctx.close().catch(() => {});
    audio.current = null;
    setLevel(0);
  };

  const startMeter = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (const v of data) sum += v;
        setLevel(Math.min(1, sum / data.length / 90));
        if (audio.current) audio.current.raf = requestAnimationFrame(tick);
      };
      audio.current = { ctx, stream, raf: requestAnimationFrame(tick) };
    } catch { /* niveau indisponible : l'orbe respire simplement */ }
  };

  const stop = useCallback(() => {
    wanted.current = false;
    rec.current?.stop();
    setListening(false);
    setInterim('');
    stopMeter();
  }, []);

  const start = useCallback(() => {
    if (!Ctor) { setError('La dictée n’est pas disponible sur ce navigateur. Tu peux écrire ton récit.'); return; }
    setError('');
    const r: Rec = new Ctor();
    r.lang = 'fr-FR';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: any) => {
      let partial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalRef.current(res[0].transcript.trim());
        else partial += res[0].transcript;
      }
      setInterim(partial);
    };
    r.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { setError('Micro refusé. Autorise-le dans ton navigateur, ou écris ton récit.'); wanted.current = false; }
    };
    r.onend = () => {
      // Chrome coupe après un silence : on relance tant que l'utilisateur n'a pas arrêté.
      if (wanted.current) { try { r.start(); } catch { /* déjà relancé */ } } else setListening(false);
    };
    rec.current = r;
    wanted.current = true;
    try { r.start(); setListening(true); startMeter(); } catch { setError('Impossible de démarrer la dictée.'); }
  }, [Ctor]);

  useEffect(() => () => { wanted.current = false; rec.current?.abort?.(); stopMeter(); }, []);

  return { supported, listening, interim, level, error, start, stop };
}

/** Lecture à voix haute des questions du copilote (désactivable). */
export function speak(text: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  u.rate = 1.05;
  window.speechSynthesis.speak(u);
}
