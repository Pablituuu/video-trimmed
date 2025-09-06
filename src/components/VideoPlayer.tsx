import React, { useEffect, useRef } from 'react';
import styles from './VideoPlayer.module.scss';
import { VideoTransform } from '../types';

interface VideoPlayerProps {
  video: HTMLVideoElement;
  transform: VideoTransform;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, transform }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef(transform);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    let updating = true;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    const CANVAS_FRAME_TIME = 1000 / 30;
    let time = Date.now();

    const update = () => {
      if (!updating) {
        return;
      }

      const now = Date.now();
      const shouldDraw = now - time > CANVAS_FRAME_TIME && video.readyState === 4;

      if (canvas && context && shouldDraw) {
        time = now;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      requestAnimationFrame(update);
    };

    requestAnimationFrame(update);

    return () => {
      updating = false;
    };
  }, [video]);

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        width={video.videoWidth}
        height={video.videoHeight}
        className={styles.canvas}
      />
    </div>
  );
};
