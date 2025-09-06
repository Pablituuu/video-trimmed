import { ArrowLeftIcon, RotateCcwIcon } from 'lucide-react';
import type React from 'react';
import { VideoPlayer } from '../components/video-player';
import { VideoTrim } from '../components/video-trim';
import { useMainStore } from '../stores/main';

export const Trim: React.FC = () => {
  const { video, transform, setTransform, reset, setVideo, setFile } =
    useMainStore();
  if (!video) {
    return (
      <div>
        <span>No video selected.</span>
      </div>
    );
  }

  return (
    <div className="trim-step max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
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
            <ArrowLeftIcon />
          </button>
        </div>
        <div>
          <button
            onClick={() => {
              reset();
            }}
            title="Reset"
          >
            <RotateCcwIcon />
          </button>
        </div>
      </div>
      <VideoPlayer video={video} transform={transform} />
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
