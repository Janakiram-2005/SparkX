import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const IntroAnimation = ({ onComplete }) => {
  const videoRef = useRef(null);
  const [hlsReady, setHlsReady] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 2.0;

      const videoSrc = '/intro-stream/intro.m3u8';
      const fallbackSrc = '/intro.mp4';

      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(videoSrc);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setHlsReady(true);
          videoRef.current.play().catch(e => console.log('Autoplay blocked', e));
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            // fallback to normal mp4 if hls fails
            videoRef.current.src = fallbackSrc;
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        videoRef.current.src = videoSrc;
        videoRef.current.addEventListener('loadedmetadata', () => {
          setHlsReady(true);
          videoRef.current.play().catch(e => console.log('Autoplay blocked', e));
        });
      } else {
        videoRef.current.src = fallbackSrc;
      }
    }
  }, []);

  return (
    <div style={styles.container}>
      <video 
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
    objectFit: 'cover' // This ensures it scales up and fills the screen
  }
};

export default IntroAnimation;
