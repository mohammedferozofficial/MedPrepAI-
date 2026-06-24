import { SignUp } from "@clerk/react";
import { Brain } from "lucide-react";

export default function SignUpPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[hsl(222,47%,15%)] to-[hsl(222,47%,8%)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold text-white">MedPrep AI</span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Your personal<br />exam intelligence.
            </h1>
            <p className="mt-4 text-white/60 text-lg leading-relaxed">
              Create your account and start uploading study material. AI does the heavy lifting — you focus on learning.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: "01", title: "Upload your PDFs", desc: "Textbooks, notes, past papers — any PDF works." },
              { icon: "02", title: "AI extracts questions", desc: "Gemini identifies and structures MCQs and short answers." },
              { icon: "03", title: "Practice and revise", desc: "Targeted quiz sessions and spaced repetition." },
            ].map((step) => (
              <div key={step.icon} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {step.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{step.title}</div>
                  <div className="text-xs text-white/50 mt-0.5">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-sm">Free to start. No credit card required.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">MedPrep AI</span>
          </div>
          <SignUp
            routing="path"
            path={`${basePath}/sign-up`}
            signInUrl={`${basePath}/sign-in`}
          />
        </div>
      </div>
    </div>
  );
}
