import { useState } from 'react';

interface UseVideoDownloadNativeOptions {
    onProgress?: (progress: number) => void;
    onComplete?: (blob: Blob) => void;
    onError?: (error: Error) => void;
}

export const useVideoDownloadNative = (options: UseVideoDownloadNativeOptions = {}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const downloadVideo = async (
        videoFile: File,
        startTime: number,
        endTime: number,
        outputFileName?: string
    ) => {
        if (isProcessing) return;

        setIsProcessing(true);
        setError(null);
        setProgress(0);

        try {
            console.log('🎬 Starting native video processing...', {
                fileName: videoFile.name,
                startTime,
                endTime,
                duration: endTime - startTime
            });

            // Create video element
            const video = document.createElement('video');
            video.src = URL.createObjectURL(videoFile);
            video.crossOrigin = 'anonymous';
            video.muted = true; // Mute to avoid autoplay restrictions

            // Wait for video to load
            await new Promise<void>((resolve, reject) => {
                video.onloadedmetadata = () => {
                    console.log('✅ Video loaded:', {
                        duration: video.duration,
                        width: video.videoWidth,
                        height: video.videoHeight
                    });
                    resolve();
                };
                video.onerror = () => reject(new Error('Failed to load video'));
                video.load();
            });

            // Create canvas for frame extraction
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Could not get canvas context');
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Calculate frame rate and frame count
            const duration = endTime - startTime;
            const frameRate = 30; // 30 FPS
            const frameCount = Math.floor(duration * frameRate);

            console.log(`📊 Processing ${frameCount} frames at ${frameRate} FPS...`);

            // Extract frames
            const frames: ImageData[] = [];

            for (let i = 0; i < frameCount; i++) {
                const time = startTime + (i / frameRate);

                // Seek to specific time
                video.currentTime = time;

                await new Promise<void>((resolve) => {
                    video.onseeked = () => {
                        // Draw frame to canvas
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
                        resolve();
                    };
                });

                // Update progress
                const frameProgress = Math.floor(((i + 1) / frameCount) * 80); // 80% for frame extraction
                setProgress(frameProgress);
                options.onProgress?.(frameProgress);
            }

            console.log(`✅ Extracted ${frames.length} frames`);

            // Create a simple video file using MediaRecorder
            const stream = canvas.captureStream(frameRate);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp8'
            });

            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                console.log('💾 Video blob created:', {
                    size: blob.size,
                    type: blob.type
                });

                // Generate output filename
                const originalName = videoFile.name.replace(/\.[^/.]+$/, '');
                const outputFileName_ = outputFileName || `${originalName}_trimmed.webm`;

                // Trigger download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = outputFileName_;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                console.log('✅ Video download completed');
                options.onComplete?.(blob);
            };

            // Start recording
            mediaRecorder.start();

            // Play frames to create video
            for (let i = 0; i < frames.length; i++) {
                const frame = frames[i];
                ctx.putImageData(frame, 0, 0);

                // Wait for next frame
                await new Promise(resolve => setTimeout(resolve, 1000 / frameRate));

                // Update progress
                const recordingProgress = 80 + Math.floor((i / frames.length) * 20); // 20% for recording
                setProgress(recordingProgress);
                options.onProgress?.(recordingProgress);
            }

            // Stop recording
            setTimeout(() => {
                mediaRecorder.stop();
                setProgress(100);
                options.onProgress?.(100);
            }, 1000);

            // Cleanup
            URL.revokeObjectURL(video.src);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            console.error('❌ Native video processing failed:', errorMessage);
            setError(errorMessage);
            options.onError?.(err instanceof Error ? err : new Error(errorMessage));
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    return {
        downloadVideo,
        isProcessing,
        progress,
        error,
        clearError: () => setError(null)
    };
};
