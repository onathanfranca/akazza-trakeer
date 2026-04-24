// src/hooks/useNotifications.js
import { useEffect, useRef, useCallback } from 'react';

export function useNotifications() {
  const audioRef = useRef(null);

  useEffect(() => {
    try {
      const audio = new Audio('/cpa_notification.mp3');
      audio.preload = 'auto';
      audio.volume = 1.0;
      audioRef.current = audio;
    } catch (e) {}
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const playSound = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          new Audio('/cpa_notification.mp3').play().catch(() => {});
        });
      }
    } catch (e) {}
  }, []);

  const vibrate = useCallback(() => {
    try {
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    } catch (e) {}
  }, []);

  const notify = useCallback(({ title, body, icon = '/logo192.png' }) => {
    playSound();
    vibrate();
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, {
          body,
          icon,
          badge: '/logo192.png',
          tag: 'cpa-notification',
          renotify: true,
        });
        setTimeout(() => n.close(), 6000);
      } catch (e) {}
    } else if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') notify({ title, body, icon });
      });
    }
  }, [playSound, vibrate]);

  return { notify, playSound, vibrate };
}
