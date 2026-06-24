import { useState } from "react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetMe } from "@workspace/api-client-react";
import { CheckCircle2, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "Upload up to 5 PDFs per month",
  "Up to 100 questions extracted",
  "Quiz mode (10 questions per session)",
  "Flashcard review",
  "Basic question browser",
];

const PRO_FEATURES = [
  "Unlimited PDF uploads",
  "Unlimited question extraction",
  "Unlimited quiz sessions",
  "Full flashcard deck with spaced repetition",
  "Topic-wise analytics",
  "Priority AI processing",
  "Export questions as PDF",
  "Early access to new features",
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PricingPage() {
  const { data: profile } = useGetMe();
  const [loading, setLoading] = useState<"monthly" | "annual" | null>(null);

  const isPro = (profile as any)?.membershipTier === "pro";

  async function handleUpgrade(plan: "monthly" | "annual") {
    setLoading(plan);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        alert("Could not load payment gateway. Please try again.");
        return;
      }

      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Failed to create order");
        return;
      }

      const order = await res.json();

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "MedPrep AI",
        description: plan === "monthly" ? "Pro Monthly Plan" : "Pro Annual Plan",
        order_id: order.orderId,
        prefill: {
          email: profile?.email,
          name: profile?.fullName ?? undefined,
        },
        theme: { color: "#009688" },
        handler: async (response: any) => {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              plan,
            }),
          });

          if (verifyRes.ok) {
            window.location.href = "/dashboard";
          } else {
            alert("Payment verification failed. Contact support.");
          }
        },
        modal: { ondismiss: () => setLoading(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Layout>
      <div className="px-8 py-8 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground">Simple, transparent pricing</h1>
          <p className="text-muted-foreground mt-2">Start free. Upgrade when you're ready to go all in.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold text-foreground">Free</h2>
                {!isPro && <Badge variant="secondary">Current plan</Badge>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">₹0</span>
                <span className="text-muted-foreground text-sm">/ forever</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Great for trying out MedPrep AI</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {FREE_FEATURES.map((f) => (
                <div key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  {f}
                </div>
              ))}
              <Button variant="outline" className="w-full mt-4" disabled>
                {isPro ? "Downgrade" : "Current plan"}
              </Button>
            </CardContent>
          </Card>

          <Card className={cn("border-2", isPro ? "border-primary" : "border-primary/50 shadow-lg shadow-primary/10")}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">Pro</h2>
                  <Badge className="bg-primary text-white text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    Popular
                  </Badge>
                </div>
                {isPro && <Badge className="bg-primary text-white">Active</Badge>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">₹299</span>
                <span className="text-muted-foreground text-sm">/ month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Or <span className="font-semibold text-foreground">₹2,499/year</span> — save 30%
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {PRO_FEATURES.map((f) => (
                <div key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  {f}
                </div>
              ))}

              {isPro ? (
                <Button className="w-full mt-4" disabled>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Pro Active
                </Button>
              ) : (
                <div className="flex gap-2 mt-4">
                  <Button
                    className="flex-1"
                    onClick={() => handleUpgrade("monthly")}
                    disabled={loading !== null}
                  >
                    {loading === "monthly" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    ₹299/mo
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-primary text-primary hover:bg-primary hover:text-white"
                    onClick={() => handleUpgrade("annual")}
                    disabled={loading !== null}
                  >
                    {loading === "annual" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    ₹2,499/yr
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Secure payments via Razorpay · GST-compliant invoices · Cancel anytime
        </p>
      </div>
    </Layout>
  );
}
