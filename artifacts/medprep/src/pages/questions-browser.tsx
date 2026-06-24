import { useState } from "react";
import { useListPdfs } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Link } from "wouter";
import {
  Brain,
  ChevronDown,
  Search,
  Loader2,
  BookOpen,
  CheckCircle2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string | null;
  topic: string | null;
  difficulty: string | null;
  pageNumber: number | null;
  pdfId: string;
}

interface QuestionsResponse {
  items: Question[];
  total: number;
  page: number;
  limit: number;
}

const difficultyColor: Record<string, string> = {
  EASY: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HARD: "bg-red-100 text-red-700",
};

const OPTION_LABELS = ["A", "B", "C", "D", "E"];

function QuestionCard({ q }: { q: Question }) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <Collapsible open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setRevealed(false); setSelected(null); } }}>
      <Card className="transition-shadow hover:shadow-sm">
        <CollapsibleTrigger asChild>
          <CardContent className="px-5 py-4 cursor-pointer">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-relaxed">{q.questionText}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {q.topic && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {q.topic}
                    </span>
                  )}
                  {q.difficulty && (
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", difficultyColor[q.difficulty] ?? "bg-muted text-muted-foreground")}>
                      {q.difficulty}
                    </span>
                  )}
                  {q.pageNumber && (
                    <span className="text-xs text-muted-foreground">p.{q.pageNumber}</span>
                  )}
                </div>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 transition-transform", open && "rotate-180")} />
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-4 border-t border-border pt-3 space-y-2">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => { setSelected(i); setRevealed(true); }}
                disabled={revealed}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors border",
                  !revealed
                    ? "border-border hover:bg-accent hover:border-primary/30 cursor-pointer"
                    : i === q.correctAnswer
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : selected === i
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-border bg-muted/40 text-muted-foreground"
                )}
              >
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                  !revealed ? "bg-muted text-muted-foreground"
                    : i === q.correctAnswer ? "bg-emerald-600 text-white"
                    : selected === i ? "bg-red-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}>
                  {OPTION_LABELS[i]}
                </span>
                {opt}
              </button>
            ))}

            {revealed && q.explanation && (
              <div className="mt-3 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs font-semibold text-blue-700 mb-1">Explanation</p>
                <p className="text-xs text-blue-800 leading-relaxed">{q.explanation}</p>
              </div>
            )}

            {!revealed && (
              <Button size="sm" variant="outline" className="mt-1" onClick={() => { setRevealed(true); setSelected(q.correctAnswer); }}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Show answer
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function QuestionsBrowserPage() {
  const [search, setSearch] = useState("");
  const [pdfFilter, setPdfFilter] = useState("all");
  const [diffFilter, setDiffFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data: pdfs } = useListPdfs({ status: "COMPLETED" });

  const params = new URLSearchParams({ limit: "30", page: String(page) });
  if (pdfFilter !== "all") params.set("pdfId", pdfFilter);
  if (diffFilter !== "all") params.set("difficulty", diffFilter);

  const { data, isLoading } = useQuery<QuestionsResponse>({
    queryKey: ["/api/questions", pdfFilter, diffFilter, page],
    queryFn: async () => {
      const res = await fetch(`/api/questions?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const filtered = (data?.items ?? []).filter((q) =>
    !search || q.questionText.toLowerCase().includes(search.toLowerCase()) || q.topic?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="px-8 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Question Bank</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data?.total ?? 0} questions extracted from your PDFs
            </p>
          </div>
          <Button asChild>
            <Link href="/quiz">
              <Brain className="w-4 h-4 mr-2" />
              Start Quiz
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search questions or topics..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={pdfFilter} onValueChange={(v) => { setPdfFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All PDFs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All PDFs</SelectItem>
              {(pdfs?.items ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.fileName.replace(".pdf", "")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={diffFilter} onValueChange={(v) => { setDiffFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="EASY">Easy</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HARD">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading questions...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground">No questions found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data?.total === 0 ? "Upload a PDF and wait for it to be processed." : "Try a different filter."}
            </p>
            {data?.total === 0 && (
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/upload"><Upload className="w-3.5 h-3.5 mr-1.5" />Upload PDF</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {filtered.map((q) => <QuestionCard key={q.id} q={q} />)}
            </div>
            {data && data.total > 30 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(data.total / 30)}</span>
                <Button variant="outline" size="sm" disabled={page * 30 >= data.total} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
