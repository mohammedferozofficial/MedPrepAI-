import { useState, useEffect } from "react";
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
import { Brain, CheckCircle2, XCircle, Trophy, RotateCcw, Loader2, ChevronRight } from "lucide-react";
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
}

const OPTION_LABELS = ["A", "B", "C", "D", "E"];

type QuizState = "setup" | "running" | "review" | "finished";

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function QuizPage() {
  const [quizState, setQuizState] = useState<QuizState>("setup");
  const [pdfId, setPdfId] = useState("all");
  const [questionCount, setQuestionCount] = useState("10");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  const { data: pdfs } = useListPdfs({ status: "COMPLETED" });

  const { data: allQuestions, isLoading } = useQuery<{ items: Question[] }>({
    queryKey: ["/api/questions-quiz", pdfId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "200" });
      if (pdfId !== "all") params.set("pdfId", pdfId);
      const res = await fetch(`/api/questions?${params}`);
      return res.json();
    },
  });

  function startQuiz() {
    const pool = shuffle(allQuestions?.items ?? []).slice(0, parseInt(questionCount, 10));
    setQuestions(pool);
    setAnswers(new Array(pool.length).fill(null));
    setCurrentIndex(0);
    setSelected(null);
    setShowExplanation(false);
    setQuizState("running");
  }

  function handleAnswer(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    const newAnswers = [...answers];
    newAnswers[currentIndex] = idx;
    setAnswers(newAnswers);
    setShowExplanation(true);
  }

  function handleNext() {
    if (currentIndex + 1 >= questions.length) {
      setQuizState("finished");
    } else {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  }

  const currentQuestion = questions[currentIndex];
  const score = answers.filter((a, i) => a === questions[i]?.correctAnswer).length;
  const percent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  if (quizState === "setup") {
    const total = allQuestions?.items?.length ?? 0;
    return (
      <Layout>
        <div className="px-8 py-8 max-w-xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Quiz Mode</h1>
            <p className="text-sm text-muted-foreground mt-1">Practice with your extracted questions</p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Source PDF</label>
                <Select value={pdfId} onValueChange={setPdfId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select PDF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All PDFs ({total} questions)</SelectItem>
                    {(pdfs?.items ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.fileName.replace(".pdf", "")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Number of questions</label>
                <Select value={questionCount} onValueChange={setQuestionCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["5", "10", "20", "30", "50"].map((n) => (
                      <SelectItem key={n} value={n}>{n} questions</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {total === 0 ? (
                <div className="pt-2 text-center py-4">
                  <p className="text-sm text-muted-foreground">No questions available yet. Upload and process a PDF first.</p>
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={startQuiz}
                  disabled={isLoading || total === 0}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                  Start Quiz
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (quizState === "finished") {
    return (
      <Layout>
        <div className="px-8 py-8 max-w-xl">
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className={cn("w-16 h-16 mx-auto mb-4", percent >= 70 ? "text-amber-500" : "text-muted-foreground/40")} />
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {percent >= 80 ? "Excellent!" : percent >= 60 ? "Good effort!" : "Keep practicing!"}
              </h2>
              <p className="text-muted-foreground text-sm mb-6">Quiz complete</p>

              <div className="bg-muted rounded-2xl p-6 mb-6">
                <div className="text-5xl font-bold text-foreground">{score}<span className="text-2xl text-muted-foreground">/{questions.length}</span></div>
                <div className="text-sm text-muted-foreground mt-1">{percent}% correct</div>
                <Progress value={percent} className="mt-3 h-2" />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-emerald-50 rounded-xl p-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <div className="text-xl font-bold text-emerald-700">{score}</div>
                  <div className="text-xs text-emerald-600">Correct</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-red-600">{questions.length - score}</div>
                  <div className="text-xs text-red-500">Wrong</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setQuizState("setup")}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Quiz
                </Button>
                <Button className="flex-1" onClick={startQuiz}>
                  Retry Same
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!currentQuestion) return null;

  return (
    <Layout>
      <div className="px-8 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Question {currentIndex + 1} of {questions.length}</p>
            <div className="flex items-center gap-2 mt-1">
              {currentQuestion.topic && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{currentQuestion.topic}</span>}
              {currentQuestion.difficulty && <span className="text-xs text-muted-foreground">{currentQuestion.difficulty}</span>}
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-foreground">{score}</span>
            <span className="text-sm text-muted-foreground">/{currentIndex} correct</span>
          </div>
        </div>

        <Progress value={((currentIndex) / questions.length) * 100} className="h-1.5 mb-6" />

        <Card className="mb-4">
          <CardContent className="p-6">
            <p className="text-base font-medium text-foreground leading-relaxed">{currentQuestion.questionText}</p>
          </CardContent>
        </Card>

        <div className="space-y-2 mb-4">
          {currentQuestion.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={selected !== null}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm text-left border transition-all",
                selected === null
                  ? "border-border hover:border-primary/40 hover:bg-accent cursor-pointer"
                  : i === currentQuestion.correctAnswer
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : selected === i
                  ? "border-red-400 bg-red-50 text-red-700"
                  : "border-border bg-muted/30 text-muted-foreground cursor-default"
              )}
            >
              <span className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                selected === null ? "bg-muted text-muted-foreground"
                  : i === currentQuestion.correctAnswer ? "bg-emerald-600 text-white"
                  : selected === i ? "bg-red-500 text-white"
                  : "bg-muted text-muted-foreground"
              )}>
                {OPTION_LABELS[i]}
              </span>
              <span className="flex-1">{opt}</span>
              {selected !== null && i === currentQuestion.correctAnswer && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
              {selected !== null && selected === i && i !== currentQuestion.correctAnswer && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
            </button>
          ))}
        </div>

        {showExplanation && currentQuestion.explanation && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-1">Explanation</p>
            <p className="text-xs text-blue-800 leading-relaxed">{currentQuestion.explanation}</p>
          </div>
        )}

        {selected !== null && (
          <Button className="w-full" onClick={handleNext}>
            {currentIndex + 1 >= questions.length ? "See Results" : "Next Question"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </Layout>
  );
}
