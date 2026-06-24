import { useEffect } from "react";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FormValues = {
  fullName: string;
  collegeName: string;
  yearOfStudy: string;
  examTarget: string;
};

const EXAM_TARGETS = ["NEET PG", "USMLE Step 1", "USMLE Step 2", "PLAB", "University Finals", "Other"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Intern", "PG Student"];

export default function SettingsPage() {
  const { data: profile, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, reset } = useForm<FormValues>({
    defaultValues: { fullName: "", collegeName: "", yearOfStudy: "", examTarget: "" },
  });

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName ?? "",
        collegeName: profile.collegeName ?? "",
        yearOfStudy: profile.yearOfStudy ? String(profile.yearOfStudy) : "",
        examTarget: profile.examTarget ?? "",
      });
    }
  }, [profile, reset]);

  function onSubmit(values: FormValues) {
    updateMe.mutate(
      {
        data: {
          fullName: values.fullName || undefined,
          collegeName: values.collegeName || undefined,
          yearOfStudy: values.yearOfStudy ? parseInt(values.yearOfStudy, 10) : undefined,
          examTarget: values.examTarget || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: "Profile updated", description: "Your changes have been saved." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center gap-2 text-muted-foreground p-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading profile...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-8 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your profile and study preferences</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Your name and contact email are managed through your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email ?? ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" placeholder="Dr. Priya Sharma" {...register("fullName")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Study Preferences</CardTitle>
              <CardDescription>Help us personalize your exam prep experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="collegeName">Medical College</Label>
                <Input id="collegeName" placeholder="AIIMS New Delhi" {...register("collegeName")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Year of Study</Label>
                  <Select
                    value={watch("yearOfStudy")}
                    onValueChange={(v) => setValue("yearOfStudy", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y, i) => (
                        <SelectItem key={y} value={String(i + 1)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Target Exam</Label>
                  <Select
                    value={watch("examTarget")}
                    onValueChange={(v) => setValue("examTarget", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAM_TARGETS.map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMe.isPending}>
              {updateMe.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
