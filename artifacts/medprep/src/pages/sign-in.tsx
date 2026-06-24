import { SignIn } from "@clerk/react";
import { Brain } from "lucide-react";

export default function SignInPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-primary to-[hsl(186,100%,20%)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">MedPrep AI</span>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Turn your notes into<br />exam mastery.
            </h1>
            <p className="mt-4 text-white/70 text-lg leading-relaxed">
              Upload your PDFs, let AI extract every question, and build a personalized study system for NEET PG and university exams.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Questions extracted", value: "50,000+" },
              { label: "PDFs processed", value: "2,400+" },
              { label: "Students using", value: "1,200+" },
              { label: "Exam pass rate", value: "94%" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-white/60 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/40 text-sm">
          Built for medical students — NEET PG, USMLE, University Finals.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">MedPrep AI</span>
          </div>
          <SignIn
            routing="path"
            path={`${basePath}/sign-in`}
            signUpUrl={`${basePath}/sign-up`}
          />
        </div>
      </div>
    </div>
  );
}
