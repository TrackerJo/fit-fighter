import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

export default function AnimatedContent({
  children,
  distance = 100,
  direction = 'vertical',
  reverse = false,
  duration = 0.8,
  ease = 'power3.out',
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.1,
  delay = 0,
  className = ''
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const axis = direction === 'horizontal' ? 'x' : 'y';
    const sign = reverse ? -1 : 1;

    const fromVars = { [axis]: sign * distance, opacity: animateOpacity ? initialOpacity : 1, scale };
    const toVars = {
      [axis]: 0,
      opacity: 1,
      scale: 1,
      duration,
      ease,
      delay,
      scrollTrigger: { trigger: el, start: `top ${(1 - threshold) * 100}%`, once: true }
    };

    gsap.fromTo(el, fromVars, toVars);
  }, [distance, direction, reverse, duration, ease, initialOpacity, animateOpacity, scale, threshold, delay]);

  return (
    <div ref={ref} className={className} style={{ opacity: initialOpacity }}>
      {children}
    </div>
  );
}
