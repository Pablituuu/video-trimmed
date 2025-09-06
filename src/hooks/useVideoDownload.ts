import { useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface UseVideoDownloadOptions {
    onProgress?: (progress: number) => void;
    onComplete?: (blob: Blob) => void;
    onError?: (error: Error) => void;
}

export const useVideoDownload = (options: UseVideoDownloadOptions = {}) => {
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
            console.log('🎬 Starting video processing...', {
                fileName: videoFile.name,
                startTime,
                endTime,
                duration: endTime - startTime
            });

            // Initialize FFmpeg
            const ffmpeg = new FFmpeg();

            // Load FFmpeg with Windows-compatible configuration
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

            try {
                await ffmpeg.load({
                    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });
            } catch (loadError) {
                console.warn('⚠️ Primary FFmpeg load failed, trying alternative...', loadError);

                // Try alternative CDN
                const altBaseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
                await ffmpeg.load({
                    coreURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.js`, 'text/javascript'),
                    wasmURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                });
            }

            console.log('✅ FFmpeg loaded successfully');

            // Set up progress monitoring
            ffmpeg.on('progress', ({ progress: p }) => {
                const progressPercent = Math.round(p * 100);
                setProgress(progressPercent);
                options.onProgress?.(progressPercent);
                console.log(`📊 Processing progress: ${progressPercent}%`);
            });

            // Set up logging for debugging
            ffmpeg.on('log', ({ message }) => {
                console.log('🔧 FFmpeg log:', message);
            });

            // Write input file to FFmpeg
            const inputFileName = 'input.mp4';
            await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

            console.log('📁 Input file written to FFmpeg');

            // Calculate duration
            const duration = endTime - startTime;

            // Generate output filename
            const originalName = videoFile.name.replace(/\.[^/.]+$/, '');
            const outputFileName_ = outputFileName || `${originalName}_trimmed.mp4`;

            // Run FFmpeg command to trim video
            await ffmpeg.exec([
                '-i', inputFileName,
                '-ss', startTime.toString(),
                '-t', duration.toString(),
                '-c', 'copy', // Copy streams without re-encoding for speed
                '-avoid_negative_ts', 'make_zero',
                outputFileName_
            ]);

            console.log('⚙️ FFmpeg processing completed');

            // Read the output file
            const data = await ffmpeg.readFile(outputFileName_);

            // Create blob from output
            const blob = new Blob([data], { type: 'video/mp4' });

            console.log('💾 Video blob created:', {
                size: blob.size,
                type: blob.type
            });

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
