import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Brain, Upload, Zap, BookOpen } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-foreground">MedPrep AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-8">
          <Zap className="w-3 h-3" />
          Powered by Gemini AI
        </div>
        <h1 className="text-5xl font-bold text-foreground leading-tight mb-6">
          Your medical exams,<br />intelligently prepared.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Upload your PDFs. AI extracts every question, organizes your material, and builds a personalized study system for NEET PG and university exams.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/sign-up">Start for free</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>

        <div className="mt-24 grid grid-cols-3 gap-8 text-left">
          {[
            { icon: Upload, title: "Upload any PDF", desc: "Textbooks, notes, past papers — any medical PDF works instantly." },
            { icon: Brain, title: "AI question extraction", desc: "Gemini identifies and structures MCQs and short answers with context." },
            { icon: BookOpen, title: "Organized study bank", desc: "Browse your question bank, track progress, practice by topic." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
