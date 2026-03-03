import { useCallback, useRef, useState } from 'react';

interface Options {
  threshold?: number;
  onStart?: () => void;
  onFinish?: () => void;
  onCancel?: () => void;
}

export const useLongPress = (
  onLongPress: (event: any) => void,
  onClick: (event: any) => void,
  { threshold = 500, onStart, onFinish, onCancel }: Options = {}
) => {
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);

  const start = useCallback(
    (event: any) => {
      event.persist();
      onStart?.();
      isLongPressTriggered.current = false;
      timerRef.current = setTimeout(() => {
        onLongPress(event);
        setIsLongPressActive(true);
        isLongPressTriggered.current = true;
      }, threshold);
    },
    [onLongPress, threshold, onStart]
  );

  const stop = useCallback(
    (event: any) => {
      onFinish?.();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (isLongPressActive) {
        setIsLongPressActive(false);
      } else if (!isLongPressTriggered.current) {
        onClick(event);
      }
    },
    [onClick, isLongPressActive, onFinish]
  );

  const cancel = useCallback(
    () => {
      onCancel?.();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setIsLongPressActive(false);
    },
    [onCancel]
  );

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: stop,
  };
};
