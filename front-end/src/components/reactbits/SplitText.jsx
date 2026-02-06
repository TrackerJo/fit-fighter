import { useRef, useEffect, useState, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SplitText = ({
  text,
  className = '',
  delay = 50,
  duration = 0.6,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  onLetterAnimationComplete
}) => {
  const containerRef = useRef(null);
  const hasAnimated = useRef(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    if (document.fonts?.status === 'loaded') setFontsLoaded(true);
    else document.fonts?.ready.then(() => setFontsLoaded(true));
  }, []);

  const elements = useMemo(() => {
    if (!text) return [];
    if (splitType === 'words') {
      return text.split(' ').map((word, i) => ({ text: word, key: `w-${i}` }));
    }
    return text.split('').map((char, i) => ({ text: char === ' ' ? '\u00A0' : char, key: `c-${i}` }));
  }, [text, splitType]);

  useEffect(() => {
    if (!containerRef.current || !fontsLoaded || !text || hasAnimated.current) return;
    const el = containerRef.current;
    const spans = el.querySelectorAll('.split-char');
    if (!spans.length) return;

    hasAnimated.current = true;

    const startPct = (1 - threshold) * 100;
    const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
    const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
    const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
    const sign = marginValue === 0 ? ''
      : marginValue < 0 ? `-=${Math.abs(marginValue)}${marginUnit}`
      : `+=${marginValue}${marginUnit}`;
    const start = `top ${startPct}%${sign}`;

    gsap.fromTo(spans, { ...from }, {
      ...to,
      duration,
      ease,
      stagger: delay / 1000,
      scrollTrigger: { trigger: el, start, once: true },
      onComplete: () => { if (onLetterAnimationComplete) onLetterAnimationComplete(); }
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => { if (st.trigger === el) st.kill(); });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay, duration, ease, splitType, threshold, rootMargin, fontsLoaded]);

  return (
    <p
      ref={containerRef}
      className={className}
      style={{ textAlign, overflow: 'hidden', display: 'inline-block', whiteSpace: 'normal', wordWrap: 'break-word' }}
    >
      {elements.map(({ text: t, key }) => (
        <span key={key} className="split-char" style={{ display: 'inline-block', opacity: 0 }}>
          {t}
        </span>
      ))}
    </p>
  );
};

export default SplitText;
