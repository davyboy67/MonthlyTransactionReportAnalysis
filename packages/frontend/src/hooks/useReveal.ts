import { useCallback, useRef } from 'react';

export function useReveal<T extends HTMLElement>() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  // A callback ref, not useRef+useEffect: the target renders behind a loading
  // branch.
  return useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.dataset.revealed = 'true';
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealed = 'true';
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(node);
    observerRef.current = observer;
  }, []);
}
