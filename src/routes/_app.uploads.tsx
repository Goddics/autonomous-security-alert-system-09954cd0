import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import {
  UploadCloud,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Film,
  Cpu,
  Clock3,
} from "lucide-react";

interface ProcessingJob {
  id: string;
  videoId?: number;
  filename: string;
  cameraId?: number;
  status: "idle" | "uploading" | "uploaded" | "processing" | "completed" | "failed";
  message: string;
  startedAt?: string;
  completedAt?: string;
}

export const Route = createFileRoute("/_app/uploads")({
  head: () => ({ meta: [{ title: "Video Uploads — SecureWatch" }] }),
  component: VideoUploadsPage,
});

function VideoUploadsPage() {
  const cameras = api.cameras();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraId, setCameraId] = useState(cameras[0]?.id ?? 1);
  const [uploading, setUploading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<number | null>(null);
  const [processingJob, setProcessingJob] = useState<ProcessingJob | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function handleUpload() {
    if (!selectedFile) {
      toast.error("Choose a video file first");
      return;
    }

    setUploading(true);
    setProcessingJob({
      id: `upload_${Date.now()}`,
      filename: selectedFile.name,
      cameraId,
      status: "uploading",
      message: "Uploading video to the backend…",
    });

    try {
      const result = await api.uploadVideo(selectedFile, cameraId);
      const uploadedName = result.file_name || (result as any).filename || selectedFile.name;
      const responseId = Number(result.file_id ?? (result as any).id ?? (result as any).video_id ?? NaN);
      const videoIdValue = Number.isInteger(responseId) ? responseId : null;
      const uploadedJob: ProcessingJob = {
        id: `upload_${Date.now()}`,
        videoId: videoIdValue ?? undefined,
        filename: uploadedName,
        cameraId,
        status: "uploaded",
        message: videoIdValue ? "Video uploaded. You can process it now." : "Video uploaded, but the backend did not return a valid video id.",
      };
      if (mountedRef.current) {
        setUploadedFileName(uploadedName);
        setVideoId(videoIdValue);
        setProcessingJob(uploadedJob);
        setUploadSummary(
          videoIdValue != null
            ? `Upload complete — file_id ${videoIdValue} • ${uploadedName}`
            : `Upload complete — ${uploadedName}`,
        );
      }
      toast.success("Upload complete");
    } catch (error) {
      const failedJob: ProcessingJob = {
        id: `upload_${Date.now()}`,
        filename: selectedFile.name,
        cameraId,
        status: "failed",
        message: "Upload failed. Please try again.",
      };
      if (mountedRef.current) {
        setProcessingJob(failedJob);
      }
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      if (mountedRef.current) setUploading(false);
    }
  }

  async function handleProcess() {
    if (videoId == null) {
      toast.error("Upload a video before processing");
      return;
    }

    const filename = uploadedFileName || selectedFile?.name || "video.mp4";
    const startedJob: ProcessingJob = {
      id: `process_${Date.now()}`,
      videoId,
      filename,
      cameraId,
      status: "processing",
      message: "Processing is running in the background. This can take a while.",
      startedAt: new Date().toISOString(),
    };

    if (mountedRef.current) {
      setProcessingJob(startedJob);
    }

    try {
      const result = await api.processVideo(videoId);
      const completedJob: ProcessingJob = {
        id: startedJob.id,
        videoId,
        filename,
        cameraId,
        status: result.status === "completed" ? "completed" : "processing",
        message:
          result.status === "completed"
            ? result.message || "Processing completed successfully."
            : "Processing started. Come back later to download the annotated video.",
        startedAt: startedJob.startedAt,
        completedAt: result.status === "completed" ? new Date().toISOString() : undefined,
      };
      if (mountedRef.current) {
        setProcessingJob(completedJob);
      }
      toast.success(result.status === "completed" ? "Processing complete" : "Processing started");
    } catch (error) {
      const failedJob: ProcessingJob = {
        id: startedJob.id,
        videoId,
        filename,
        cameraId,
        status: "failed",
        message: error instanceof Error ? error.message : "Processing failed.",
        startedAt: startedJob.startedAt,
        completedAt: new Date().toISOString(),
      };
      if (mountedRef.current) {
        setProcessingJob(failedJob);
      }
      toast.error("Processing failed");
    }
  }

  async function handleDownload() {
    const currentVideoId = processingJob?.videoId ?? videoId;
    if (currentVideoId == null) {
      toast.error("No processed video available for download.");
      return;
    }

    setDownloadLoading(true);
    try {
      const blob = await api.downloadVideo(currentVideoId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${processingJob?.filename?.replace(/\.[^/.]+$/, "") ?? "annotated-video"}-annotated.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setDownloadLoading(false);
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Video Uploads"
        subtitle="Upload footage for offline processing and review the job status in the background."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex flex-col justify-between relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_40%)]" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Upload Queue
                  </p>
                  <h2 className="text-xl font-semibold">Secure footage upload workflow</h2>
                </div>
                <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                  {selectedFile ? "Ready to upload" : "No file selected"}
                </div>
              </div>

              <div className="relative z-10 rounded-xl border border-border/70 bg-background/70 p-5 backdrop-blur">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/80 px-6 py-8 text-center transition hover:border-primary/60">
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Drop a video here or browse</p>
                    <p className="text-xs text-muted-foreground">
                      MP4, MOV, AVI up to your backend limit
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                </label>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={cameraId}
                      onChange={(e) => setCameraId(Number(e.target.value))}
                      className="bg-input border border-border rounded-md text-sm px-2 py-1.5"
                    >
                      {cameras.map((camera) => (
                        <option key={camera.id} value={camera.id}>
                          {camera.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UploadCloud className="h-4 w-4" />
                    )}
                    {uploading ? "Uploading…" : "Upload Video"}
                  </button>
                  <button
                    onClick={handleProcess}
                    disabled={videoId == null}
                    className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" /> Process Video
                  </button>
                </div>

                {selectedFile && (
                  <div className="mt-4 rounded-lg border border-border/80 bg-background/70 p-3 text-sm">
                    <div className="font-medium">Selected video</div>
                    <div className="text-muted-foreground">{selectedFile.name}</div>
                  </div>
                )}

                {uploadSummary && (
                  <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                    <div className="font-medium">Upload response received</div>
                    <div className="text-primary/90">{uploadSummary}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" /> Processing Status
            </h2>
            {processingJob ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-border/80 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{processingJob.filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {processingJob.cameraId
                          ? `Camera ${processingJob.cameraId}`
                          : "No camera selected"}
                      </div>
                    </div>
                    {processingJob.status === "processing" && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {processingJob.status === "completed" && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    {processingJob.status === "failed" && (
                      <AlertCircle className="h-4 w-4 text-threat" />
                    )}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{processingJob.message}</div>
                </div>

                <div className="rounded-lg border border-border/80 p-3 text-sm text-muted-foreground">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      Processing can take several minutes. You can leave this page and return later;
                      the job state is preserved.
                    </div>
                    {processingJob.status === "completed" && (
                      <button
                        onClick={handleDownload}
                        disabled={downloadLoading || processingJob?.status !== "completed"}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                      >
                        {downloadLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {downloadLoading ? "Downloading…" : "Download Annotated Video"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                No upload or processing job yet.
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3">How it works</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Upload a video file from the panel.</li>
              <li>• Choose the camera source for context.</li>
              <li>• Start processing and continue using the dashboard.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
