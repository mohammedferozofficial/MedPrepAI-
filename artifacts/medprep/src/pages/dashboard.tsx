import { useGetDashboardStats, useListJobs } from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { FileText, Loader2, CheckCircle2, AlertCircle, Brain, Upload, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

const jobStatusColor: Record<string, string> = {
  PENDING: "secondary",
  RUNNING: "default",
  SUCCEEDED: "outline",
  FAILED: "destructive",
};

function StatCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1 text-foreground">{value}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useGetDashboardStats();

  return (
    <Layout>
      <div className="px-8 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Your study progress at a glance</p>
          </div>
          <Button asChild>
            <Link href="/upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload PDF
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading stats...</span>
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total PDFs" value={stats.totalPdfs} icon={FileText} />
              <StatCard label="Questions Extracted" value={stats.totalQuestions} icon={Brain} />
              <StatCard label="Processing" value={stats.processingPdfs} icon={Loader2} />
              <StatCard label="Completed" value={stats.completedPdfs} icon={CheckCircle2} />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Recent Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentJobs.length === 0 ? (
                  <div className="py-12 text-center">
                    <TrendingUp className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No jobs yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Upload a PDF to get started</p>
                    <Button asChild variant="outline" size="sm" className="mt-4">
                      <Link href="/upload">Upload your first PDF</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {stats.recentJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{job.type.replace(/_/g, " ")}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {job.status === "RUNNING" && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${job.progress}%` }}
                                />
                              </div>
                              <span>{job.progress}%</span>
                            </div>
                          )}
                          <Badge variant={jobStatusColor[job.status] as any} className="text-xs">
                            {job.status === "RUNNING" ? (
                              <span className="flex items-center gap-1">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                Running
                              </span>
                            ) : job.status === "SUCCEEDED" ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Done
                              </span>
                            ) : job.status === "FAILED" ? (
                              <span className="flex items-center gap-1">
                                <AlertCircle className="w-2.5 h-2.5" />
                                Failed
                              </span>
                            ) : (
                              "Pending"
                            )}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
