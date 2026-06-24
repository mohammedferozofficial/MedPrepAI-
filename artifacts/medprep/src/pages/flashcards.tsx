import { useState } from "react";
import { useListPdfs } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brain, ThumbsUp, ThumbsDown, RotateCcw, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string | null;
  topic: string | null;
}

const OPTION_LABELS = ["A", "B", "C", "D", "E"];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function FlashcardsPage() {
  const [pdfId, setPdfId] = useState("all");
  const [started, setStarted] = useState(false);
  const [deck, setDeck] = useState<Question[]>([]);
  const [toReview, setToReview] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);

  const { data: pdfs } = useListPdfs({ status: "COMPLETED" });

  const { data, isLoading } = useQuery<{ items: Question[] }>({
    queryKey: ["/api/questions-flash", pdfId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "200" });
      if (pdfId !== "all") params.set("pdfId", pdfId);
      const res = await fetch(`/api/questions?${params}`);
      return res.json();
    },
  });

  function startDeck() {
    const cards = shuffle(data?.items ?? []);
    setDeck(cards);
    setToReview([]);
    setCurrentIndex(0);
    setFlipped(false);
    setKnown(0);
    setStarted(true);
  }

  function handleKnow() {
    setKnown(k => k + 1);
    nextCard();
  }

  function handleReview() {
    setToReview(r => [...r, deck[currentIndex]]);
    nextCard();
  }

  function nextCard() {
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex(i => i + 1);
    }, 150);
  }

  function reviewAgain() {
    const cards = shuffle(toReview);
    setDeck(cards);
    setToReview([]);
    setCurrentIndex(0);
    setFlipped(false);
    setKnown(0);
  }

  const total = deck.length;
  const current = deck[currentIndex];
  const isDone = currentIndex >= total;
  const progress = total > 0 ? (currentIndex / total) * 100 : 0;

  if (!started) {
    return (
      <Layout>
        <div className="px-8 py-8 max-w-lg">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Flashcards</h1>
            <p className="text-sm text-muted-foreground mt-1">Review questions one at a time</p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Source</label>
                <Select value={pdfId} onValueChange={setPdfId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All PDFs ({data?.items?.length ?? 0} cards)</SelectItem>
                    {(pdfs?.items ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.fileName.replace(".pdf", "")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(data?.items?.length ?? 0) === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-2">No questions yet. Upload and process a PDF first.</p>
              ) : (
                <Button className="w-full" onClick={startDeck} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                  Start Flashcards
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isDone) {
    return (
      <Layout>
        <div className="px-8 py-8 max-w-lg">
          <Card>
            <CardContent className="p-8 text-center">
              <Brain className="w-14 h-14 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-1">Round complete!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {known} known · {toReview.length} to review
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6 text-center">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <ThumbsUp className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-emerald-700">{known}</div>
                  <div className="text-xs text-emerald-600">Got it</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <ThumbsDown className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-amber-700">{toReview.length}</div>
                  <div className="text-xs text-amber-600">Review again</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStarted(false)}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New deck
                </Button>
                {toReview.length > 0 && (
                  <Button className="flex-1" onClick={reviewAgain}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Review {toReview.length}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-8 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">{currentIndex + 1} / {total} cards</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="text-emerald-600 font-medium">{known} known</span>
            <span>·</span>
            <span className="text-amber-600 font-medium">{toReview.length} to review</span>
          </div>
        </div>

        <Progress value={progress} className="h-1.5 mb-6" />

        <div
          className="cursor-pointer select-none"
          onClick={() => setFlipped(f => !f)}
          style={{ perspective: "1000px" }}
        >
          <div
            className="relative transition-all duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              minHeight: "280px",
            }}
          >
            <Card className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
              <CardContent className="p-8 h-full flex flex-col items-center justify-center text-center min-h-[280px]">
                {current.topic && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full mb-4">{current.topic}</span>}
                <p className="text-base font-medium text-foreground leading-relaxed">{current.questionText}</p>
                <p className="text-xs text-muted-foreground mt-6">Tap to reveal answer</p>
              </CardContent>
            </Card>

            <Card className="absolute inset-0 bg-primary/5 border-primary/20" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              <CardContent className="p-8 h-full flex flex-col justify-between min-h-[280px]">
                <div>
                  <p className="text-xs font-semibold text-primary mb-3">Correct Answer</p>
                  <div className="flex items-start gap-3 mb-4">
                    <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {OPTION_LABELS[current.correctAnswer]}
                    </span>
                    <p className="text-sm font-medium text-foreground leading-relaxed">{current.options[current.correctAnswer]}</p>
                  </div>
                  {current.explanation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-800 leading-relaxed">{current.explanation}</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">Choose below</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {flipped && (
          <div className="flex gap-3 mt-5">
            <Button
              variant="outline"
              className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={handleReview}
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              Review again
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleKnow}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Got it!
            </Button>
          </div>
        )}

        {!flipped && (
          <div className="flex gap-3 mt-5">
            <Button variant="outline" className="flex-1" onClick={() => setFlipped(true)}>
              Flip card
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
