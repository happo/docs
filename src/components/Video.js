import useBaseUrl from '@docusaurus/useBaseUrl';
import { useEffect, useRef } from 'react';

import videos from '@site/src/data/videos.json';

/**
 * A looping, muted docs video from static/video/: `<Video name="…" label="…" />`.
 * `pnpm media` writes each one as an AV1 .webm and an H.264 .mp4 and records
 * its size and codecs in src/data/videos.json. Browsers that can play the AV1
 * file get it (it's the smaller one), and the rest fall back to the .mp4.
 *
 * It plays only while it's on screen, and not at all for readers who prefer
 * reduced motion (it follows that preference as it changes): they get the
 * controls to play it themselves, as does anyone whose browser won't start
 * it. The server renders it paused on its first frame, which is also what
 * Happo screenshots.
 */
export default function Video({ name, label }) {
  const ref = useRef(null);
  const video = videos[name];
  if (!video) {
    throw new Error(
      `<Video name="${name}">: no such video in src/data/videos.json. ` +
        'Add it with `pnpm media optimize` (see media/README.md).',
    );
  }
  const webm = useBaseUrl(`/video/${name}.webm`);
  const mp4 = useBaseUrl(`/video/${name}.mp4`);

  useEffect(() => {
    const element = ref.current;
    // Browsers only play a video without a click when it's muted, and React
    // doesn't always reflect the `muted` prop onto the element.
    element.muted = true;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const play = () =>
      // Rejected when the browser won't play it without a click (in power
      // saving mode, say): the controls let the reader start it.
      element.play().catch(() => {
        element.controls = true;
      });
    // Follows the preference as it changes, not only as it was on load.
    const followPreference = () => {
      if (reducedMotion.matches) {
        element.pause();
        element.controls = true;
      } else {
        element.controls = false;
        if (visible) play();
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (reducedMotion.matches) return;
        if (visible) {
          play();
        } else {
          element.pause();
        }
      },
      { threshold: 0.25 },
    );
    followPreference();
    reducedMotion.addEventListener('change', followPreference);
    observer.observe(element);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener('change', followPreference);
    };
  }, []);

  return (
    <video
      ref={ref}
      className="docs-video"
      aria-label={label}
      width={video.width}
      height={video.height}
      loop
      muted
      playsInline
      preload="metadata"
    >
      <source src={webm} type={`video/webm; codecs="${video.webm}"`} />
      <source src={mp4} type={`video/mp4; codecs="${video.mp4}"`} />
    </video>
  );
}
