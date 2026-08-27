import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

const IntroAnimation = ({ onComplete }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 2.0;

      const videoSrc = '/intro-stream/intro.m3u8';
      const fallbackSrc = '/intro.mp4';

      const attemptPlay = () => {
        videoRef.current.play().catch(e => {
          console.warn('Autoplay blocked by browser policy:', e);
        });
      };

      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(videoSrc);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          attemptPlay();
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            videoRef.current.src = fallbackSrc;
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = videoSrc;
        videoRef.current.addEventListener('loadedmetadata', () => {
          attemptPlay();
        });
      } else {
        videoRef.current.src = fallbackSrc;
      }
    }
  }, []);

  const handleUnmute = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
    }
  };

  return (
    <div style={styles.container} onClick={handleUnmute}>
      <video 
        id="intro-video-element"
        ref={videoRef}
        src="/intro.mp4"
        autoPlay
        muted
        playsInline
        onEnded={onComplete}
        style={styles.video}
      />
    </div>
  );
};

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#000',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  }
};

export default IntroAnimation;
