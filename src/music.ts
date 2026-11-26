const TARGET_VOLUME = 0.2;

// 浏览器不允许自动播放，音乐默认关闭，由页脚按钮在用户手势后启动。
export function mountMusic(audio: HTMLAudioElement, button: HTMLButtonElement) {
  const text = button.querySelector<HTMLElement>('#music-text');
  let fadeFrame: number | undefined;
  let fadeToken = 0;

  const setPlaying = (playing: boolean) => {
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? 'Pause background music' : 'Play background music');
    if (text) text.textContent = playing ? 'Music on' : 'Music off';
  };

  const cancelFade = () => {
    fadeToken += 1;
    if (fadeFrame !== undefined) cancelAnimationFrame(fadeFrame);
    fadeFrame = undefined;
  };

  const fadeTo = (target: number, duration: number, done?: () => void) => {
    cancelFade();
    const token = fadeToken;
    const start = audio.volume;
    const startTime = performance.now();
    const step = (now: number) => {
      if (token !== fadeToken) return;
      const progress = Math.min(1, (now - startTime) / duration);
      audio.volume = Math.max(0, Math.min(1, start + (target - start) * progress));
      if (progress < 1) {
        fadeFrame = requestAnimationFrame(step);
      } else {
        fadeFrame = undefined;
        done?.();
      }
    };
    fadeFrame = requestAnimationFrame(step);
  };

  button.addEventListener('click', async () => {
    if (audio.paused) {
      try {
        audio.volume = 0;
        await audio.play();
        setPlaying(true);
        fadeTo(TARGET_VOLUME, 900);
      } catch {
        setPlaying(false);
        audio.pause();
      }
      return;
    }

    setPlaying(false);
    fadeTo(0, 500, () => audio.pause());
  });

  audio.addEventListener('play', () => setPlaying(true));
  audio.addEventListener('pause', () => setPlaying(false));

  // 切到后台标签页时立即暂停，避免浏览器节流后延迟到切回来才停。
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    cancelFade();
    audio.volume = 0;
    audio.pause();
    setPlaying(false);
  });
}
