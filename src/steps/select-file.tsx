import React from 'react';
import { useMainStore } from '../stores/main';

export const SelectFile: React.FC = () => {
  const { loadVideo } = useMainStore();

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-lg">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Trim Video Online
        </h1>
        
        <p className="text-muted-foreground mb-8 text-lg">
          Select a video file to start trimming. Easily set start and end points to create the perfect clip.
        </p>

        <label className="cursor-pointer">
          <input
            type="file"
            accept="video/*,.mkv,.mov,.mp4,.m4v,.mk3d,.wmv,.asf,.mxf,.ts,.m2ts,.3gp,.3g2,.flv,.webm,.ogv,.rmvb,.avi"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                loadVideo(file);
              }
              e.target.value = '';
            }}
          />
          <div className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors duration-200 inline-block">
            Select Video File
          </div>
        </label>

        <div className="mt-6 text-sm text-muted-foreground">
          Supported formats: MP4, MOV, AVI, WebM, and more
        </div>
      </div>
    </div>
  );
};
