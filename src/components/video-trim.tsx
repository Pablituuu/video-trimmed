import clsx from "clsx";
import { PauseIcon, PlayIcon } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { usePointerDrag } from "react-use-pointer-drag";
import { clamp, humanTime } from "../helpers";
import type { Time } from "../types";
import { Button } from "./ui/button";
import { Input, ALL_FORMATS, BlobSource, CanvasSink } from "mediabunny";

interface VideoTrimProps {
  onChange: (time: Time) => void;
  time?: Time;
  video: HTMLVideoElement;
  videoFile?: File;
  videoUrl?: string;
  durationMax?: number; // Duración máxima en milisegundos
}

const MIN_DURATION = 1;
const DURATION_SNAP_FACTOR = 0.02;

export const VideoTrim: React.FC<VideoTrimProps> = ({
  onChange,
  video,
  videoFile,
  videoUrl,
  time,
  durationMax,
}) => {
  const getInitialTime = (): [number, number] => {
    if (time) return time;

    const initialEnd =
      durationMax !== undefined
        ? Math.min(video.duration, durationMax / 1000)
        : video.duration;

    return [0, initialEnd];
  };

  const initialTime = getInitialTime();
  const [currentTime, setCurrentTime] = useState(video.currentTime);
  const [playing, setPlaying] = useState(!video.paused);
  const [thumbnails, setThumbnails] = useState<HTMLCanvasElement[]>([]);
  const ignoreTimeUpdatesRef = useRef(false);

  const currentTimeValue = time || initialTime;

  useEffect(() => {
    if (!time && durationMax !== undefined) {
      onChange(initialTime);
    }
  }, [time, durationMax, initialTime, onChange]);

  const timelineRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const calculateVideoAspectRatio = async (
    videoFile: File
  ): Promise<{
    videoWidth: number;
    videoHeight: number;
    videoAspectRatio: number;
  }> => {
    try {
      const source = new BlobSource(videoFile);
      const input = new Input({
        source: source,
        formats: ALL_FORMATS,
      });

      const videoTrack = await input.getPrimaryVideoTrack();
      if (videoTrack) {
        const videoWidth = videoTrack.displayWidth;
        const videoHeight = videoTrack.displayHeight;
        const videoAspectRatio = videoWidth / videoHeight;

        return { videoWidth, videoHeight, videoAspectRatio };
      }
    } catch (error) {
      console.warn(
        "⚠️ Could not calculate video aspect ratio, using default 16:9:",
        error
      );
    }

    return { videoWidth: 1920, videoHeight: 1080, videoAspectRatio: 16 / 9 };
  };

  // Calculate optimal number of thumbnails based on timeline width
  const calculateOptimalThumbnailCount = (
    timelineWidth: number,
    timelineHeight: number,
    videoAspectRatio: number
  ): number => {
    if (timelineWidth === 0 || timelineHeight === 0) {
      return 16; // Default value
    }

    // Calculate the width each thumbnail should have maintaining aspect ratio
    const thumbnailHeight = timelineHeight;
    const thumbnailWidth = thumbnailHeight * videoAspectRatio;

    // Calculate how many thumbnails fit in the available width
    const optimalCount = Math.floor(timelineWidth / thumbnailWidth);

    // Ensure minimum of 1 and reasonable maximum
    const minThumbnails = 1;
    const maxThumbnails = Math.floor(timelineWidth / 20); // Minimum 20px per thumbnail

    const finalCount = Math.max(
      minThumbnails,
      Math.min(optimalCount, maxThumbnails)
    );

    return finalCount;
  };

  // Generate thumbnails from URL using a separate video element
  const generateThumbnailsFromUrl = async (customThumbnailCount?: number) => {
    if (!videoUrl || !timelineRef.current || !video) {
      return;
    }

    let thumbnailVideo: HTMLVideoElement | null = null;

    try {
      // Create a separate video element for thumbnail generation
      thumbnailVideo = document.createElement("video");
      thumbnailVideo.setAttribute("playsinline", "");
      thumbnailVideo.preload = "metadata";
      thumbnailVideo.autoplay = false;
      thumbnailVideo.crossOrigin = "anonymous";
      thumbnailVideo.style.display = "none";

      // Add to DOM temporarily
      document.body.appendChild(thumbnailVideo);

      // Wait for thumbnail video to load
      await new Promise((resolve, reject) => {
        if (!thumbnailVideo) {
          reject(new Error("Failed to create thumbnail video element"));
          return;
        }

        const onLoadedMetadata = () => {
          thumbnailVideo!.removeEventListener(
            "loadedmetadata",
            onLoadedMetadata
          );
          thumbnailVideo!.removeEventListener("error", onError);
          resolve(void 0);
        };

        const onError = () => {
          thumbnailVideo!.removeEventListener(
            "loadedmetadata",
            onLoadedMetadata
          );
          thumbnailVideo!.removeEventListener("error", onError);
          reject(new Error("Failed to load video for thumbnails"));
        };

        thumbnailVideo.addEventListener("loadedmetadata", onLoadedMetadata);
        thumbnailVideo.addEventListener("error", onError);
        thumbnailVideo.src = videoUrl;
      });

      // Get timeline dimensions
      const timelineRect = timelineRef.current.getBoundingClientRect();
      const timelineWidth = timelineRect.width;
      const timelineHeight = timelineRect.height;

      // Calculate video aspect ratio from thumbnail video element
      if (!thumbnailVideo) {
        throw new Error("Thumbnail video element not available");
      }
      const videoAspectRatio =
        thumbnailVideo.videoWidth / thumbnailVideo.videoHeight;

      // Use custom count if provided, otherwise calculate optimal
      const thumbnailCount =
        customThumbnailCount ||
        calculateOptimalThumbnailCount(
          timelineWidth,
          timelineHeight,
          videoAspectRatio
        );

      // Calculate thumbnail dimensions maintaining video aspect ratio
      const thumbnailHeight = timelineHeight;
      const thumbnailWidth = thumbnailHeight * videoAspectRatio;

      // Prepare timestamps for thumbnails
      const duration = thumbnailVideo!.duration;
      const timestamps = Array.from(
        { length: thumbnailCount },
        (_, i) => (i * duration) / thumbnailCount
      );

      // Generate thumbnails by seeking to each timestamp
      const thumbnails: HTMLCanvasElement[] = [];
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      canvas.width = Math.floor(thumbnailWidth * window.devicePixelRatio);
      canvas.height = Math.floor(thumbnailHeight * window.devicePixelRatio);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];

        // Seek to timestamp
        thumbnailVideo!.currentTime = timestamp;

        // Wait for seek to complete
        await new Promise((resolve) => {
          const onSeeked = () => {
            thumbnailVideo!.removeEventListener("seeked", onSeeked);
            resolve(void 0);
          };
          thumbnailVideo!.addEventListener("seeked", onSeeked);

          // Timeout fallback
          setTimeout(() => {
            thumbnailVideo!.removeEventListener("seeked", onSeeked);
            resolve(void 0);
          }, 1000);
        });

        // Small delay to ensure frame is rendered
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Draw frame to canvas
        ctx.clearRect(0, 0, thumbnailWidth, thumbnailHeight);
        ctx.drawImage(thumbnailVideo!, 0, 0, thumbnailWidth, thumbnailHeight);

        // Create a copy of the canvas
        const thumbnailCanvas = document.createElement("canvas");
        const thumbnailCtx = thumbnailCanvas.getContext("2d");
        if (thumbnailCtx) {
          thumbnailCanvas.width = canvas.width;
          thumbnailCanvas.height = canvas.height;
          thumbnailCtx.drawImage(canvas, 0, 0);
          thumbnails.push(thumbnailCanvas);
        }
      }

      // Save thumbnails to state
      setThumbnails(thumbnails);
    } catch (error) {
      console.error("❌ Error generating thumbnails from URL:", error);
    } finally {
      // Ensure cleanup even if there's an error
      try {
        if (thumbnailVideo && document.body.contains(thumbnailVideo)) {
          thumbnailVideo.pause();
          thumbnailVideo.src = "";
          thumbnailVideo.load();
          document.body.removeChild(thumbnailVideo);
        }
      } catch (cleanupError) {
        console.warn("⚠️ Error during thumbnail video cleanup:", cleanupError);
      }
    }
  };

  // Generate thumbnails using Media Bunny
  const generateThumbnails = async (customThumbnailCount?: number) => {
    if (!videoFile || !timelineRef.current) {
      return;
    }

    try {
      // Calculate video aspect ratio
      const { videoAspectRatio } = await calculateVideoAspectRatio(videoFile);

      // Get timeline dimensions
      const timelineRect = timelineRef.current.getBoundingClientRect();
      const timelineWidth = timelineRect.width;
      const timelineHeight = timelineRect.height;

      // Use custom count if provided, otherwise calculate optimal
      const thumbnailCount =
        customThumbnailCount ||
        calculateOptimalThumbnailCount(
          timelineWidth,
          timelineHeight,
          videoAspectRatio
        );

      // Create input from video file
      const source = new BlobSource(videoFile);
      const input = new Input({
        source: source,
        formats: ALL_FORMATS,
      });

      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) {
        throw new Error("File has no video track.");
      }

      if (videoTrack.codec === null) {
        throw new Error("Unsupported video codec.");
      }

      if (!(await videoTrack.canDecode())) {
        throw new Error("Unable to decode the video track.");
      }

      // Calculate thumbnail dimensions maintaining video aspect ratio
      const thumbnailHeight = timelineHeight;
      const thumbnailWidth = thumbnailHeight * videoAspectRatio;

      // Prepare timestamps for thumbnails
      const firstTimestamp = await videoTrack.getFirstTimestamp();
      const lastTimestamp = await videoTrack.computeDuration();

      const timestamps = Array.from(
        { length: thumbnailCount },
        (_, i) =>
          firstTimestamp +
          (i * (lastTimestamp - firstTimestamp)) / thumbnailCount
      );

      // Create CanvasSink for extracting frames
      const sink = new CanvasSink(videoTrack, {
        width: Math.floor(thumbnailWidth * window.devicePixelRatio),
        height: Math.floor(thumbnailHeight * window.devicePixelRatio),
        fit: "fill",
      });

      // Generate thumbnails
      const thumbnails: HTMLCanvasElement[] = [];
      let i = 0;

      for await (const wrappedCanvas of sink.canvasesAtTimestamps(timestamps)) {
        if (wrappedCanvas) {
          const canvasElement = wrappedCanvas.canvas as HTMLCanvasElement;
          thumbnails.push(canvasElement);
        }
        i++;
      }

      // Save thumbnails to state
      setThumbnails(thumbnails);
    } catch (error) {
      console.error("❌ Error generating thumbnails:", error);
    }
  };

  // Draw thumbnails on canvas
  const drawThumbnails = () => {
    if (!canvasRef.current || !timelineRef.current || thumbnails.length === 0) {
      return;
    }

    const canvas = canvasRef.current;
    const timeline = timelineRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get current timeline dimensions
    const rect = timeline.getBoundingClientRect();
    const newWidth = Math.floor(rect.width);
    const newHeight = Math.floor(rect.height);

    // Only resize if dimensions changed
    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw thumbnails
    const thumbnailWidth = canvas.width / thumbnails.length;

    // Use requestAnimationFrame for smooth drawing
    requestAnimationFrame(() => {
      thumbnails.forEach((thumbnail, index) => {
        const x = index * thumbnailWidth;
        const y = 0;
        const width = thumbnailWidth;
        const height = canvas.height;

        // Draw thumbnail maintaining aspect ratio
        ctx.drawImage(thumbnail, x, y, width, height);
      });
    });
  };

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
      if (state.direction !== "move") {
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
      const newTime: Time = [...currentTimeValue];

      switch (state.direction) {
        case "move":
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
        case "left":
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
        case "right":
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
        case "seek":
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

      if (durationMax !== undefined) {
        const maxDurationSeconds = durationMax / 1000;
        if (newTime[1] - newTime[0] > maxDurationSeconds) {
          newTime[1] = newTime[0] + maxDurationSeconds;
        }
      }

      onChange(newTime);
    },
    onEnd: ({ state }) => {
      ignoreTimeUpdatesRef.current = false;
      if (typeof state.currentTime !== "undefined") {
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

    video.addEventListener("pause", update);
    video.addEventListener("playing", update);
    video.addEventListener("play", update);
    video.addEventListener("timeupdate", update);

    return () => {
      video.removeEventListener("pause", update);
      video.removeEventListener("playing", update);
      video.removeEventListener("play", update);
      video.removeEventListener("timeupdate", update);
    };
  }, [video]);

  // Generate thumbnails when video and timeline are ready
  useEffect(() => {
    if (video && timelineRef.current) {
      // Use a small delay to ensure timeline is fully rendered
      setTimeout(() => {
        if (videoFile) {
          generateThumbnails();
        } else if (videoUrl) {
          generateThumbnailsFromUrl();
        }
      }, 100);
    }
  }, [video, videoFile, videoUrl]);

  // Draw thumbnails when they change
  useEffect(() => {
    if (thumbnails.length > 0) {
      drawThumbnails();
    }
  }, [thumbnails]);

  // Handle canvas resize and thumbnail recalculation
  useEffect(() => {
    if (!canvasRef.current || !timelineRef.current || !videoFile) return;

    let resizeTimeout: NodeJS.Timeout;

    const resizeCanvas = async () => {
      if (!canvasRef.current || !timelineRef.current || !videoFile) return;

      const timeline = timelineRef.current;
      const canvas = canvasRef.current;
      const rect = timeline.getBoundingClientRect();

      // Update canvas size only if changed
      const newWidth = Math.floor(rect.width);
      const newHeight = Math.floor(rect.height);

      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
      }

      // Calculate new optimal thumbnail count
      const { videoAspectRatio } = await calculateVideoAspectRatio(videoFile);
      const newThumbnailCount = calculateOptimalThumbnailCount(
        rect.width,
        rect.height,
        videoAspectRatio
      );

      // Only regenerate thumbnails if count changed significantly
      if (Math.abs(newThumbnailCount - thumbnails.length) > 1) {
        generateThumbnails(newThumbnailCount);
      } else {
        // Just redraw existing thumbnails
        drawThumbnails();
      }
    };

    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 50);
    };

    // Initial resize
    resizeCanvas();

    // Listen for window resize
    window.addEventListener("resize", debouncedResize);

    // Use ResizeObserver for more precise timeline size changes
    const resizeObserver = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to batch resize operations
      requestAnimationFrame(() => {
        for (const entry of entries) {
          if (entry.target === timelineRef.current) {
            debouncedResize();
          }
        }
      });
    });

    resizeObserver.observe(timelineRef.current);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", debouncedResize);
      resizeObserver.disconnect();
    };
  }, [thumbnails, videoFile]);

  return (
    <div>
      <div className="flex items-center  justify-center">
        <Button
          size="icon"
          variant={"ghost"}
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
        {/* Canvas with thumbnails as background */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Left opaque area */}
        <div
          className="timeline-opaque-left"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${(currentTimeValue[0] / video.duration) * 100}%`,
            height: "100%",
            background: "rgba(255, 0, 0, 0.3)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {/* Right opaque area */}
        <div
          className="timeline-opaque-right"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: `${100 - (currentTimeValue[1] / video.duration) * 100}%`,
            height: "100%",
            background: "rgba(255, 0, 0, 0.3)",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        <div
          className="range"
          style={{
            left: `${(currentTimeValue[0] / video.duration) * 100}%`,
            right: `${100 - (currentTimeValue[1] / video.duration) * 100}%`,
            zIndex: 3,
            background: "transparent",
          }}
          {...dragProps({
            direction: "move",
            time: currentTimeValue,
            paused: video.paused,
          })}
        >
          <div
            className={clsx("handle-left", {
              active: dragState?.direction === "left",
            })}
            data-time={humanTime(currentTimeValue[0])}
            {...dragProps({
              direction: "left",
              currentTime,
              paused: video.paused,
            })}
          >
            <div
              style={{
                height: 24,
                width: 4,
                background: "rgba(0, 0, 0,0.5)",
                borderRadius: 12,
              }}
            ></div>
          </div>
          <div
            className={clsx("handle-right", {
              active: dragState?.direction === "right",
            })}
            data-time={humanTime(currentTimeValue[1])}
            {...dragProps({
              direction: "right",
              currentTime,
              paused: video.paused,
            })}
          >
            <div
              style={{
                height: 24,
                width: 4,
                background: "rgba(0, 0, 0,0.5)",
                borderRadius: 12,
              }}
            ></div>
          </div>
        </div>
        <div
          className={clsx("current", {
            active: dragState?.direction === "seek",
          })}
          style={{
            left: `${(currentTime / video.duration) * 100}%`,
            zIndex: 4,
          }}
          {...dragProps({
            direction: "seek",
            time: currentTimeValue,
            paused: video.paused,
          })}
          data-time={humanTime(currentTime)}
        ></div>
      </div>
    </div>
  );
};
