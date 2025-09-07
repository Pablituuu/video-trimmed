import { ArrowLeftIcon, RotateCcwIcon, DownloadIcon } from "lucide-react";
import type React from "react";
import { VideoPlayer } from "../components/video-player";
import { VideoTrim } from "../components/video-trim";
import { useMainStore } from "../stores/main";
import { Button } from "@/components/ui/button";
import { useVideoDownloadNative } from "../hooks/useVideoDownloadNative";

interface TrimProps {
  durationMax?: number;
}

export const Trim: React.FC<TrimProps> = ({ durationMax }) => {
  const {
    video,
    file,
    videoUrl,
    transform,
    setTransform,
    reset,
    setVideo,
    setFile,
    setVideoUrl,
  } = useMainStore();

  const { downloadVideo, isProcessing, progress, error } =
    useVideoDownloadNative({
      onProgress: (progress) => {
        console.log(`📊 Download progress: ${progress}%`);
      },
      onComplete: () => {
        console.log("✅ Video download completed successfully");
      },
      onError: (error) => {
        console.error("❌ Download failed:", error);
        console.log(
          "💡 Tip: Try using a different video format or check browser compatibility"
        );
      },
    });

  if (!video) {
    return (
      <div>
        <span>No video selected.</span>
      </div>
    );
  }

  return (
    <div className="trim-step">
      <div className="flex justify-between items-center w-full">
        <div>
          <Button
            size="icon"
            variant={"ghost"}
            onClick={() => {
              video?.pause();
              setVideo(undefined);
              setFile(undefined);
              setVideoUrl(undefined);
              reset();
            }}
          >
            <ArrowLeftIcon />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant={"ghost"}
            onClick={() => {
              reset();
            }}
            title="Reset"
          >
            <RotateCcwIcon />
          </Button>
          <Button
            size="icon"
            variant={"ghost"}
            onClick={() => {
              if (file && transform.time) {
                const [startTime, endTime] = transform.time;
                downloadVideo(file, startTime, endTime);
              }
            }}
            disabled={isProcessing || !file || !transform.time}
            title={
              isProcessing
                ? `Processing... ${progress}%`
                : "Download trimmed video"
            }
          >
            <DownloadIcon />
          </Button>
        </div>
      </div>

      {/* Progress indicator */}
      {isProcessing && (
        <div className="w-full max-w-md mx-auto">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-600 mt-1">
            Processing video... {progress}%
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="w-full max-w-md mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="text-sm font-semibold">Error: {error}</p>
          <p className="text-xs mt-1">
            💡 Try using a different video format (MP4, WebM) or check browser
            compatibility.
            <br />
            Some browsers may have limitations with video processing.
          </p>
        </div>
      )}

      <VideoPlayer video={video} transform={transform} />
      <VideoTrim
        time={transform.time}
        video={video}
        videoFile={file}
        videoUrl={videoUrl}
        durationMax={durationMax}
        onChange={(time) => {
          setTransform({
            ...transform,
            time,
          });
        }}
      />
    </div>
  );
};
