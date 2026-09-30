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
 * reduced motion: they get the controls to play it themselves. The server
 * renders it paused on its first frame, which is also what Happo screenshots.
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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.controls = true;
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Rejected if the browser won't autoplay (e.g. in power saving
          // mode). The first frame stays, which is fine.
          element.play().catch(() => {});
        } else {
          element.pause();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
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
