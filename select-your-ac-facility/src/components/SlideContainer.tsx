import { useState, useRef, useEffect, type ReactNode } from 'react';

interface SlideContainerProps {
  slideKey: number;
  direction: 'forward' | 'back';
  children: ReactNode;
}

export function SlideContainer({ slideKey, direction, children }: SlideContainerProps) {
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const prevKeyRef = useRef(slideKey);

  useEffect(() => {
    if (slideKey === prevKeyRef.current) {
      setDisplayedChildren(children);
      return;
    }
    prevKeyRef.current = slideKey;

    // Start exit animation
    setPhase('exit');

    const exitTimer = setTimeout(() => {
      // Swap content and start enter animation
      setDisplayedChildren(children);
      setPhase('enter');

      const enterTimer = setTimeout(() => {
        setPhase('idle');
      }, 500);

      return () => clearTimeout(enterTimer);
    }, 400);

    return () => clearTimeout(exitTimer);
  }, [slideKey, children]);

  const getTransformStyle = (): React.CSSProperties => {
    const isForward = direction === 'forward';
    switch (phase) {
      case 'exit':
        return {
          opacity: 0,
          transform: `translateX(${isForward ? '-60px' : '60px'})`,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        };
      case 'enter':
        return {
          opacity: 1,
          transform: 'translateX(0)',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        };
      default:
        return {
          opacity: 1,
          transform: 'translateX(0)',
        };
    }
  };

  // Set initial offset for enter phase
  useEffect(() => {
    if (phase === 'enter' && containerRef.current) {
      const isForward = direction === 'forward';
      containerRef.current.style.opacity = '0';
      containerRef.current.style.transform = `translateX(${isForward ? '60px' : '-60px'})`;
      // Force reflow
      containerRef.current.offsetHeight;
      containerRef.current.style.opacity = '1';
      containerRef.current.style.transform = 'translateX(0)';
      containerRef.current.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  }, [phase, direction]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={phase !== 'enter' ? getTransformStyle() : undefined}
    >
      {displayedChildren}
    </div>
  );
}
