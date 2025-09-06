import clsx from 'clsx';
import { PauseIcon, PlayIcon } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { usePointerDrag } from 'react-use-pointer-drag';
import { clamp, humanTime } from '../helpers';
import type { Time } from '../types';
import { Button } from './ui/button';

interface VideoTrimProps {
  onChange: (time: Time) => void;
  time?: Time;
  video: HTMLVideoElement;
}

const MIN_DURATION = 1;
const DURATION_SNAP_FACTOR = 0.02;

export const VideoTrim: React.FC<VideoTrimProps> = ({
  onChange,
  video,
  time = [0, video.duration],
}) => {
  const [currentTime, setCurrentTime] = useState(video.currentTime);
  const [playing, setPlaying] = useState(!video.paused);
  const ignoreTimeUpdatesRef = useRef(false);

  const timelineRef = useRef<HTMLDivElement>(null);
  const { dragProps, dragState } = usePointerDrag<{
    direction: string;
    time?: Time;
    currentTime?: number;
    paused: boolean;
  }>({
    stopPropagation: true,
    pointerDownStopPropagation: true,
    onStart: () => {
      video.pause();
    },
    onClick: ({ state, x }) => {
      if (state.direction !== 'move') {
        return;
      }

      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const relativeX =
        clamp((x - rect.left) / rect.width, 0, 1) * video.duration;
      if (!state.time) return;
      const currentTime = clamp(relativeX, state.time[0], state.time[1]);
      setCurrentTime(currentTime);
      video.currentTime = currentTime;
    },
    onMove: ({ x, deltaX, state }) => {
      ignoreTimeUpdatesRef.current = true;
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();

      let relativeX =
        clamp((x - rect.left) / rect.width, 0, 1) * video.duration;
      const newTime: Time = [...time];

      switch (state.direction) {
        case 'move':
          {
            relativeX = clamp(
              (deltaX / rect.width) * video.duration,
              -1 * state.time![0],
              video.duration - state.time![1]
            );
            newTime[0] = state.time![0] + relativeX;
            newTime[1] = state.time![1] + relativeX;

            const currentTime = clamp(
              video.currentTime,
              newTime[0],
              newTime[1]
            );
            setCurrentTime(currentTime);
            video.currentTime = currentTime;
          }
          break;
        case 'left':
          newTime[0] = Math.min(
            relativeX,
            Math.max(newTime[1] - MIN_DURATION, 0)
          );
          if (
            Math.abs(newTime[0] - currentTime) <=
            video.duration * DURATION_SNAP_FACTOR
          ) {
            newTime[0] = currentTime;
          }

          video.currentTime = newTime[0] + 0.01;
          break;
        case 'right':
          newTime[1] = Math.max(
            relativeX,
            Math.min(newTime[0] + MIN_DURATION, video.duration)
          );
          if (
            Math.abs(newTime[1] - currentTime) <=
            video.duration * DURATION_SNAP_FACTOR
          ) {
            newTime[1] = currentTime;
          }

          video.currentTime = newTime[1];
          break;
        case 'seek':
          {
            const currentTime = clamp(
              relativeX,
              state.time![0],
              state.time![1]
            );
            setCurrentTime(currentTime);
            video.currentTime = currentTime;
          }
          break;
      }

      onChange(newTime);
    },
    onEnd: ({ state }) => {
      ignoreTimeUpdatesRef.current = false;
      if (typeof state.currentTime !== 'undefined') {
        video.currentTime = state.currentTime;
      }

      if (!state.paused) {
        video.play();
      }
    },
  });

  useEffect(() => {
    const update = () => {
      setPlaying(!video.paused);

      if (!ignoreTimeUpdatesRef.current) {
        setCurrentTime(video.currentTime);
      }
    };

    video.addEventListener('pause', update);
    video.addEventListener('playing', update);
    video.addEventListener('play', update);
    video.addEventListener('timeupdate', update);

    return () => {
      video.removeEventListener('pause', update);
      video.removeEventListener('playing', update);
      video.removeEventListener('play', update);
      video.removeEventListener('timeupdate', update);
    };
  }, [video]);

  return (
    <div>
      <div className="flex items-center  justify-center">
        <Button
          size="icon"
          variant={'ghost'}
          onClick={() => {
            if (video.paused) {
              video.play();
            } else {
              video.pause();
            }
          }}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </Button>
      </div>

      <div className="video-timeline" ref={timelineRef}>
        <div
          className="range"
          style={{
            left: `${(time[0] / video.duration) * 100}%`,
            right: `${100 - (time[1] / video.duration) * 100}%`,
          }}
          {...dragProps({
            direction: 'move',
            time,
            paused: video.paused,
          })}
        >
          <div
            className={clsx('handle-left', {
              active: dragState?.direction === 'left',
            })}
            data-time={humanTime(time[0])}
            {...dragProps({
              direction: 'left',
              currentTime,
              paused: video.paused,
            })}
          >
            <div
              style={{
                height: 24,
                width: 4,
                background: 'rgba(0, 0, 0,0.5)',
                borderRadius: 12,
              }}
            ></div>
          </div>
          <div
            className={clsx('handle-right', {
              active: dragState?.direction === 'right',
            })}
            data-time={humanTime(time[1])}
            {...dragProps({
              direction: 'right',
              currentTime,
              paused: video.paused,
            })}
          >
            <div
              style={{
                height: 24,
                width: 4,
                background: 'rgba(0, 0, 0,0.5)',
                borderRadius: 12,
              }}
            ></div>
          </div>
        </div>
        <div
          className={clsx('current', {
            active: dragState?.direction === 'seek',
          })}
          style={{
            left: `${(currentTime / video.duration) * 100}%`,
          }}
          {...dragProps({
            direction: 'seek',
            time,
            paused: video.paused,
          })}
          data-time={humanTime(currentTime)}
        ></div>
      </div>
    </div>
  );
};
