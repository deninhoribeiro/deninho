import React, { useCallback, useRef, useState } from 'react';

interface Options {
  threshold?: number;
  onStart?: () => void;
  onFinish?: () => void;
  onCancel?: () => void;
  onDoubleClick?: (event: any) => void;
}

export const useLongPress = (
  onLongPress: (event: any) => void,
  onClick: (event: any) => void,
  { threshold = 500, onStart, onFinish, onCancel, onDoubleClick }: Options = {}
) => {
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);
  const lastClickTime = useRef(0);

  const start = useCallback(
    (event: any) => {
      if (event.persist) event.persist();
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
      }
    },
    [isLongPressActive, onFinish]
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

  const handleClick = useCallback(
    (event: any) => {
      if (isLongPressTriggered.current) {
        isLongPressTriggered.current = false;
        return;
      }

      const now = Date.now();
      if (onDoubleClick && now - lastClickTime.current < 400) {
        onDoubleClick(event);
        lastClickTime.current = 0;
        return;
      }
      lastClickTime.current = now;

      onClick(event);
    },
    [onClick, onDoubleClick]
  );

  const handleKeyDown = useCallback(
    (event: any) => {
      if (event.repeat) return;
      if (event.key === 'Enter' || event.keyCode === 13 || event.key === 'Select' || event.keyCode === 23) {
        start(event);
      }
    },
    [start]
  );

  const handleKeyUp = useCallback(
    (event: any) => {
      if (event.key === 'Enter' || event.keyCode === 13 || event.key === 'Select' || event.keyCode === 23) {
        stop(event);
      }
    },
    [stop]
  );

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: stop,
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
    onClick: handleClick,
  };
};
