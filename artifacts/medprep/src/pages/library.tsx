import { useState } from "react";
import { useListPdfs, useDeletePdf, getListPdfsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreHorizontal,
  Trash2,
  Upload,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PdfStatus = "ALL" | "UPLOADED" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: string; color: string }> = {
  UPLOADED: { label: "Uploaded", icon: Clock, variant: "secondary", color: "text-muted-foreground" },
  QUEUED: { label: "Queued", icon: Clock, variant: "secondary", color: "text-amber-600" },
  PROCESSING: { label: "Processing", icon: Loader2, variant: "default", color: "text-primary" },
  COMPLETED: { label: "Completed", icon: CheckCircle2, variant: "outline", color: "text-emerald-600" },
  FAILED: { label: "Failed", icon: AlertCircle, variant: "destructive", color: "text-destructive" },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LibraryPage() {
  const [statusFilter, setStatusFilter] = useState<PdfStatus>("ALL");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const params = statusFilter !== "ALL" ? { status: statusFilter } : {};
  const { data, isLoading } = useListPdfs(params, { query: { queryKey: getListPdfsQueryKey(params) } });
  const deletePdf = useDeletePdf();

  const filtered = (data?.items ?? []).filter((pdf) =>
    pdf.fileName.toLowerCase().includes(search.toLowerCase())
  );

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deletePdf.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPdfsQueryKey() });
        },
      }
    );
  }

  return (
    <Layout>
      <div className="px-8 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data?.total ?? 0} PDF{data?.total !== 1 ? "s" : ""} uploaded
            </p>
          </div>
          <Button asChild>
            <Link href="/upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload PDF
            </Link>
          </Button>
        </div>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PdfStatus)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="UPLOADED">Uploaded</SelectItem>
              <SelectItem value="QUEUED">Queued</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading library...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground">No PDFs found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search || statusFilter !== "ALL" ? "Try a different filter." : "Upload your first PDF to get started."}
            </p>
            {!search && statusFilter === "ALL" && (
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/upload">Upload now</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((pdf) => {
              const cfg = statusConfig[pdf.status] ?? statusConfig.UPLOADED;
              const StatusIcon = cfg.icon;
              return (
                <Card key={pdf.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{pdf.fileName}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatBytes(pdf.fileSizeBytes)}</span>
                          {pdf.pageCount && (
                            <span className="text-xs text-muted-foreground">{pdf.pageCount} pages</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(pdf.uploadedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge variant={cfg.variant as any} className="text-xs gap-1">
                          <StatusIcon className={`w-2.5 h-2.5 ${pdf.status === "PROCESSING" ? "animate-spin" : ""} ${cfg.color}`} />
                          {cfg.label}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(pdf.id, pdf.fileName)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {pdf.status === "FAILED" && pdf.errorMessage && (
                      <p className="text-xs text-destructive mt-2 pl-14">{pdf.errorMessage}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
