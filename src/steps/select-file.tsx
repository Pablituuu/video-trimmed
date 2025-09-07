import type React from "react";
import { useState } from "react";
import { useMainStore } from "../stores/main";

export const SelectFile: React.FC = () => {
  const { loadVideo, loadVideoFromUrl } = useMainStore();
  const [videoUrl, setVideoUrl] = useState("");
  const [isUrlMode, setIsUrlMode] = useState(false);

  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleUrlSubmit = () => {
    if (videoUrl.trim() && isValidUrl(videoUrl.trim())) {
      loadVideoFromUrl(videoUrl.trim());
    }
  };

  return (
    <div className="step">
      <div className="text-center p-8 max-w-lg">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Trim Video Online
        </h1>

        <p className="text-muted-foreground mb-8 text-lg">
          Select a video file or paste a video URL to start trimming. Easily set
          start and end points to create the perfect clip.
        </p>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-muted p-1 rounded-lg">
            <button
              onClick={() => setIsUrlMode(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !isUrlMode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setIsUrlMode(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isUrlMode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Video URL
            </button>
          </div>
        </div>

        {/* File Upload Mode */}
        {!isUrlMode && (
          <label className="cursor-pointer">
            <input
              type="file"
              accept="video/*,.mkv,.mov,.mp4,.m4v,.mk3d,.wmv,.asf,.mxf,.ts,.m2ts,.3gp,.3g2,.flv,.webm,.ogv,.rmvb,.avi"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  loadVideo(file);
                }
                e.target.value = "";
              }}
            />
            <div className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors duration-200 inline-block">
              Select Video File
            </div>
          </label>
        )}

        {/* URL Input Mode */}
        {isUrlMode && (
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <input
                type="url"
                placeholder="https://example.com/video.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="px-4 py-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUrlSubmit();
                  }
                }}
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!videoUrl.trim() || !isValidUrl(videoUrl.trim())}
                className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors duration-200"
              >
                Load Video from URL
              </button>
            </div>
            {videoUrl && !isValidUrl(videoUrl) && (
              <p className="text-sm text-destructive">
                Please enter a valid URL (http:// or https://)
              </p>
            )}
          </div>
        )}

        <div className="mt-6 text-sm text-muted-foreground">
          {!isUrlMode
            ? "Supported formats: MP4, MOV, AVI, WebM, and more"
            : "Supported URL formats: Direct video links (MP4, WebM, etc.)"}
        </div>
      </div>
    </div>
  );
};
