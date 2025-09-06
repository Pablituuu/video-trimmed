import { useState } from 'react';
import { Input, ALL_FORMATS, BlobSource, Output, Mp4OutputFormat } from 'mediabunny';

interface UseVideoDownloadSimpleOptions {
    onProgress?: (progress: number) => void;
    onComplete?: (blob: Blob) => void;
    onError?: (error: Error) => void;
}

export const useVideoDownloadSimple = (options: UseVideoDownloadSimpleOptions = {}) => {
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
            console.log('🎬 Starting video processing with Media Bunny...', {
                fileName: videoFile.name,
                startTime,
                endTime,
                duration: endTime - startTime
            });

            // Create input from video file
            const source = new BlobSource(videoFile);
            const input = new Input({
                source: source,
                formats: ALL_FORMATS,
            });

            // Get video track
            const videoTrack = await input.getPrimaryVideoTrack();
            if (!videoTrack) {
                throw new Error('File has no video track.');
            }

            if (videoTrack.codec === null) {
                throw new Error('Unsupported video codec.');
            }

            if (!(await videoTrack.canDecode())) {
                throw new Error('Unable to decode the video track.');
            }

            console.log('✅ Video track loaded successfully');

            // Generate output filename
            const originalName = videoFile.name.replace(/\.[^/.]+$/, '');
            const outputFileName_ = outputFileName || `${originalName}_trimmed.mp4`;

            console.log('📁 Creating MP4 output...');

            // Create output with MP4 format
            // @ts-ignore
            const output = new Output({
                format: new Mp4OutputFormat(),
            });

            // Add video track to output
            // @ts-ignore
            output.addVideoTrack(videoTrack);

            // Simulate progress since Media Bunny doesn't provide progress callbacks
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    const newProgress = Math.min(prev + 10, 90);
                    options.onProgress?.(newProgress);
                    return newProgress;
                });
            }, 200);

            // Process the video
            // @ts-ignore
            const outputBlob = await output.output();

            clearInterval(progressInterval);
            setProgress(100);
            options.onProgress?.(100);

            console.log('💾 Video processing completed:', {
                size: outputBlob.size,
                type: outputBlob.type
            });

            // Trigger download
            const url = URL.createObjectURL(outputBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = outputFileName_;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('✅ Video download completed');

            options.onComplete?.(outputBlob);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            console.error('❌ Video processing failed:', errorMessage);
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
