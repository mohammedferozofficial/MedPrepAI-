import { useCallback, useState, useRef } from "react";
import { useRequestUploadUrl, useRegisterPdf, getListPdfsQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CloudUpload,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UploadStatus = "idle" | "uploading" | "registering" | "done" | "error";

interface FileEntry {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusLabels: Record<UploadStatus, string> = {
  idle: "Ready",
  uploading: "Uploading...",
  registering: "Registering...",
  done: "Queued for analysis",
  error: "Failed",
};

const statusColors: Record<UploadStatus, string> = {
  idle: "secondary",
  uploading: "default",
  registering: "default",
  done: "outline",
  error: "destructive",
};

export default function UploadPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const requestUploadUrl = useRequestUploadUrl();
  const registerPdf = useRegisterPdf();

  function addFiles(incoming: File[]) {
    const pdfs = incoming.filter((f) => f.type === "application/pdf");
    const entries: FileEntry[] = pdfs.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      status: "idle",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...entries]);
  }

  function updateEntry(id: string, patch: Partial<FileEntry>) {
    setFiles((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  async function uploadFile(entry: FileEntry) {
    updateEntry(entry.id, { status: "uploading", progress: 0 });

    try {
      const urlData = await requestUploadUrl.mutateAsync({
        data: { name: entry.file.name, size: entry.file.size, contentType: "application/pdf" },
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            updateEntry(entry.id, { progress: Math.round((e.loaded / e.total) * 100) });
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.open("PUT", urlData.uploadURL);
        xhr.setRequestHeader("Content-Type", "application/pdf");
        xhr.send(entry.file);
      });

      updateEntry(entry.id, { status: "registering", progress: 100 });

      await registerPdf.mutateAsync({
        data: {
          fileName: entry.file.name,
          storagePath: urlData.objectPath,
          fileSizeBytes: entry.file.size,
        },
      });

      updateEntry(entry.id, { status: "done", progress: 100 });

      queryClient.invalidateQueries({ queryKey: getListPdfsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      updateEntry(entry.id, { status: "error", error: msg });
    }
  }

  function handleUploadAll() {
    files.filter((e) => e.status === "idle" || e.status === "error").forEach(uploadFile);
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    []
  );

  const pendingCount = files.filter((e) => e.status === "idle" || e.status === "error").length;
  const inProgressCount = files.filter((e) => e.status === "uploading" || e.status === "registering").length;

  return (
    <Layout>
      <div className="px-8 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Upload PDFs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your study material. AI will extract questions and build your question bank.
          </p>
        </div>

        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-accent/40"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
          />
          <CloudUpload className={cn("w-12 h-12 mx-auto mb-4 transition-colors", dragOver ? "text-primary" : "text-muted-foreground/40")} />
          <p className="text-sm font-medium text-foreground">
            {dragOver ? "Drop to add PDFs" : "Drop PDFs here or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Only PDF files are accepted</p>
        </div>

        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{files.length} file{files.length !== 1 ? "s" : ""}</p>
              {pendingCount > 0 && inProgressCount === 0 && (
                <Button size="sm" onClick={handleUploadAll}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
                </Button>
              )}
              {inProgressCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading {inProgressCount}...
                </div>
              )}
            </div>

            {files.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{entry.file.name}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={statusColors[entry.status] as any} className="text-xs gap-1">
                            {entry.status === "uploading" || entry.status === "registering" ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : entry.status === "done" ? (
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            ) : entry.status === "error" ? (
                              <AlertCircle className="w-2.5 h-2.5" />
                            ) : null}
                            {statusLabels[entry.status]}
                          </Badge>
                          {(entry.status === "idle" || entry.status === "error") && (
                            <button
                              onClick={() => setFiles((prev) => prev.filter((e) => e.id !== entry.id))}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(entry.file.size)}</p>
                      {(entry.status === "uploading" || entry.status === "registering") && (
                        <Progress value={entry.progress} className="h-1.5 mt-2" />
                      )}
                      {entry.status === "error" && entry.error && (
                        <p className="text-xs text-destructive mt-1">{entry.error}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {files.some((e) => e.status === "done") && (
              <div className="pt-2 text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  Files queued for processing. Check progress in your library.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/library">View Library</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
