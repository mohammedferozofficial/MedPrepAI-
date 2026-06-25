import { useCallback, useState, useRef } from "react";
import { useRegisterPdf, getListPdfsQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
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
  Brain,
  ListChecks,
  AlignLeft,
  BookOpen,
  History,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UploadStatus = "idle" | "uploading" | "registering" | "done" | "error";

interface FileEntry {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  pdfId?: string;
}

interface PdfStatus {
  id: string;
  status: string;
  progress: number;
  errorMessage: string | null;
}

interface QuestionSummary {
  total: number;
  mcq: number;
  pyq: number;
  short: number;
  long: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STAGE_LABELS: Record<string, string> = {
  QUEUED: "Queued — waiting for AI",
  PROCESSING: "AI is analyzing your PDF…",
  COMPLETED: "Done!",
  FAILED: "Failed",
};

function ProcessingCard({ pdfId, fileName }: { pdfId: string; fileName: string }) {
  const { data: status } = useQuery<PdfStatus>({
    queryKey: ["/api/pdfs", pdfId, "status"],
    queryFn: async () => {
      const res = await fetch(`/api/pdfs/${pdfId}/status`);
      return res.json();
    },
    refetchInterval: (q) => {
      const s = (q.state.data as PdfStatus | undefined)?.status;
      return s === "COMPLETED" || s === "FAILED" ? false : 3000;
    },
  });

  const { data: questions } = useQuery<QuestionSummary>({
    queryKey: ["/api/questions/summary", pdfId],
    enabled: status?.status === "COMPLETED",
    queryFn: async () => {
      const res = await fetch(`/api/questions?pdfId=${pdfId}&limit=200`);
      const data = await res.json();
      const items = data.items ?? [];
      return {
        total: data.total,
        mcq: items.filter((q: any) => q.questionType === "MCQ").length,
        pyq: items.filter((q: any) => q.questionType === "PYQ").length,
        short: items.filter((q: any) => q.questionType === "SHORT").length,
        long: items.filter((q: any) => q.questionType === "LONG").length,
      };
    },
  });

  const isCompleted = status?.status === "COMPLETED";
  const isFailed = status?.status === "FAILED";

  return (
    <Card className={cn("border", isCompleted ? "border-emerald-200 bg-emerald-50/40" : isFailed ? "border-red-200 bg-red-50/40" : "")}>
      <CardContent className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
            isCompleted ? "bg-emerald-100" : isFailed ? "bg-red-100" : "bg-primary/10"
          )}>
            {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
             isFailed ? <AlertCircle className="w-4 h-4 text-red-500" /> :
             <Loader2 className="w-4 h-4 text-primary animate-spin" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {STAGE_LABELS[status?.status ?? "QUEUED"]}
            </p>

            {!isCompleted && !isFailed && (
              <div className="mt-2">
                <Progress value={status?.progress ?? 0} className="h-1.5" />
                <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                  <span className={cn("flex items-center gap-1", (status?.progress ?? 0) >= 15 && "text-primary")}>
                    <ListChecks className="w-3 h-3" /> Download
                  </span>
                  <span className={cn("flex items-center gap-1", (status?.progress ?? 0) >= 30 && "text-primary")}>
                    <Brain className="w-3 h-3" /> AI Analysis
                  </span>
                  <span className={cn("flex items-center gap-1", (status?.progress ?? 0) >= 80 && "text-primary")}>
                    <ListChecks className="w-3 h-3" /> Saving
                  </span>
                </div>
              </div>
            )}

            {isCompleted && questions && (
              <div className="mt-3">
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "MCQs", count: questions.mcq, icon: ListChecks, color: "text-blue-600 bg-blue-50" },
                    { label: "PYQs", count: questions.pyq, icon: History, color: "text-purple-600 bg-purple-50" },
                    { label: "Short", count: questions.short, icon: AlignLeft, color: "text-amber-600 bg-amber-50" },
                    { label: "Long", count: questions.long, icon: BookOpen, color: "text-emerald-600 bg-emerald-50" },
                  ].map(({ label, count, icon: Icon, color }) => (
                    <div key={label} className={cn("rounded-lg px-2 py-1.5 text-center", color.split(" ")[1])}>
                      <Icon className={cn("w-3.5 h-3.5 mx-auto mb-0.5", color.split(" ")[0])} />
                      <div className="text-sm font-bold">{count}</div>
                      <div className="text-xs">{label}</div>
                    </div>
                  ))}
                </div>
                <Button asChild size="sm" className="w-full">
                  <Link href={`/questions?pdfId=${pdfId}`}>
                    View {questions.total} questions
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            )}

            {isCompleted && !questions && (
              <div className="mt-2 text-xs text-muted-foreground">
                No questions extracted from this PDF. The content may not contain exam-style questions.
              </div>
            )}

            {isFailed && status?.errorMessage && (
              <p className="text-xs text-red-600 mt-1">{status.errorMessage}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

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
      // Upload via our API server — no CORS issues, clean progress tracking
      const objectPath = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            updateEntry(entry.id, { progress: Math.round((e.loaded / e.total) * 85) });
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data.objectPath);
            } catch {
              reject(new Error("Invalid response from server"));
            }
          } else {
            let msg = `Upload failed (${xhr.status})`;
            try {
              const err = JSON.parse(xhr.responseText);
              if (err.error) msg = err.error;
            } catch {}
            reject(new Error(msg));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Network error — check your connection")));
        xhr.open("POST", "/api/storage/upload");
        xhr.setRequestHeader("Content-Type", "application/pdf");
        xhr.send(entry.file);
      });

      updateEntry(entry.id, { status: "registering", progress: 90 });

      const pdf = await registerPdf.mutateAsync({
        data: {
          fileName: entry.file.name,
          storagePath: objectPath,
          fileSizeBytes: entry.file.size,
        },
      });

      updateEntry(entry.id, { status: "done", progress: 100, pdfId: pdf.id });

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

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const pendingCount = files.filter((e) => e.status === "idle" || e.status === "error").length;
  const inProgressCount = files.filter((e) => e.status === "uploading" || e.status === "registering").length;
  const doneEntries = files.filter((e) => e.status === "done");

  return (
    <Layout>
      <div className="px-8 py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Upload Study Material</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI extracts MCQs, PYQs, short &amp; long questions from your PDFs automatically.
          </p>
        </div>

        {/* What gets extracted — info bar */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { icon: ListChecks, label: "MCQs", desc: "Multiple choice", color: "text-blue-600 bg-blue-50 border-blue-100" },
            { icon: History, label: "PYQs", desc: "Previous year Qs", color: "text-purple-600 bg-purple-50 border-purple-100" },
            { icon: AlignLeft, label: "Short Qs", desc: "2–5 mark answers", color: "text-amber-600 bg-amber-50 border-amber-100" },
            { icon: BookOpen, label: "Long Qs", desc: "Essay questions", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className={cn("rounded-xl p-3 border text-center", color)}>
              <Icon className="w-4 h-4 mx-auto mb-1" />
              <div className="text-xs font-semibold">{label}</div>
              <div className="text-xs opacity-70">{desc}</div>
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
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
          <CloudUpload className={cn("w-10 h-10 mx-auto mb-3 transition-colors", dragOver ? "text-primary" : "text-muted-foreground/40")} />
          <p className="text-sm font-medium text-foreground">
            {dragOver ? "Drop to add PDFs" : "Drop PDFs here or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">PDF only · Max 20 MB per file</p>
        </div>

        {/* File queue */}
        {files.filter((e) => e.status !== "done").length > 0 && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {files.filter((e) => e.status !== "done").length} file{files.filter((e) => e.status !== "done").length !== 1 ? "s" : ""}
              </p>
              {pendingCount > 0 && inProgressCount === 0 && (
                <Button size="sm" onClick={handleUploadAll}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
                </Button>
              )}
              {inProgressCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading {inProgressCount}…
                </div>
              )}
            </div>

            {files.filter((e) => e.status !== "done").map((entry) => (
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
                          {entry.status === "uploading" && <Badge variant="default" className="text-xs gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" />Uploading…</Badge>}
                          {entry.status === "registering" && <Badge variant="default" className="text-xs gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" />Saving…</Badge>}
                          {entry.status === "error" && <Badge variant="destructive" className="text-xs gap-1"><AlertCircle className="w-2.5 h-2.5" />Failed</Badge>}
                          {(entry.status === "idle" || entry.status === "error") && (
                            <button onClick={() => setFiles((prev) => prev.filter((e) => e.id !== entry.id))} className="text-muted-foreground hover:text-foreground transition-colors">
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
          </div>
        )}

        {/* Processing status for completed uploads */}
        {doneEntries.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">AI Processing</p>
              <span className="text-xs text-muted-foreground">— updates every 3 seconds</span>
            </div>
            {doneEntries.map((entry) =>
              entry.pdfId ? (
                <ProcessingCard key={entry.pdfId} pdfId={entry.pdfId} fileName={entry.file.name} />
              ) : null
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
