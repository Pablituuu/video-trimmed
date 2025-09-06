import React from 'react';
import {
  BsVolumeMute,
  BsVolumeUp,
  BsArrowCounterclockwise,
  BsArrowLeft,
} from 'react-icons/bs';

import styles from './Trim.module.scss';
import { useMainStore } from '../stores/main';
import { VideoTrim } from '../components/VideoTrim';
import { VideoPlayer } from '../components/VideoPlayer';

export const Trim: React.FC = () => {
  const { video, transform, setTransform, reset, setVideo, setFile } = useMainStore();
  if (!video) {
    return (
      <div>
        <span>No video selected.</span>
      </div>
    );
  }

  return (
    <div className={styles.step}>
      <div className={styles.controls}>
        <div>
          <button
            onClick={() => {
              video?.pause();
              setVideo(undefined);
              setFile(undefined);
              reset();
            }}
            title="Select new file"
          >
            <BsArrowLeft />
          </button>
          <button
            title={transform.mute ? 'Unmute' : 'Mute'}
            onClick={() => {
              const mute = !transform.mute;
              setTransform({
                ...transform,
                mute,
              });
              video.muted = mute;
            }}
          >
            {transform.mute ? <BsVolumeMute /> : <BsVolumeUp />}
          </button>
        </div>
        <div>
          <button
            onClick={() => {
              reset();
            }}
            title="Reset"
          >
            <BsArrowCounterclockwise />
          </button>
        </div>
      </div>
      <VideoPlayer 
        video={video}
        transform={transform}
      />
      <VideoTrim
        time={transform.time}
        video={video}
        onChange={time => {
          setTransform({
            ...transform,
            time,
          });
        }}
      />
    </div>
  );
};
