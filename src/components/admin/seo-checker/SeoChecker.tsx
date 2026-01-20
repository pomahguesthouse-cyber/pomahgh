import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, AlertCircle, AlertTriangle, CheckCircle2, Image, FileText, Layout, Zap } from "lucide-react";
import { useSeoChecker, type SeoIssue } from "@/hooks/useSeoChecker";
import { SeoScoreRing } from "./SeoScoreRing";
import { SeoIssueCard } from "./SeoIssueCard";
import { SpeedMetrics } from "./SpeedMetrics";

export const SeoChecker = () => {
  const { isAuditing, auditResult, runFullAudit, updateAltText, convertImageToWebP } = useSeoChecker();
  const [fixedIssues, setFixedIssues] = useState<Set<string>>(new Set());

  const handleRunAudit = async () => {
    setFixedIssues(new Set());
    await runFullAudit();
  };

  const handleIssueFixed = (issueId: string) => {
    setFixedIssues((prev) => new Set([...prev, issueId]));
  };

  const getFilteredIssues = (issues: SeoIssue[], category?: string, type?: string) => {
    return issues.filter((issue) => {
      if (fixedIssues.has(issue.id)) return false;
      if (category && issue.category !== category) return false;
      if (type && issue.type !== type) return false;
      return true;
    });
  };

  const activeIssues = auditResult ? auditResult.issues.filter((i) => !fixedIssues.has(i.id)) : [];
  const activeErrors = activeIssues.filter((i) => i.type === "error").length;
  const activeWarnings = activeIssues.filter((i) => i.type === "warning").length;

  return (
    <div className="space-y-6">
      {/* Header with Run Audit button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">SEO Checker</h2>
          <p className="text-sm text-muted-foreground">
            Audit website untuk menemukan masalah SEO dan aksesibilitas
          </p>
        </div>
        <Button onClick={handleRunAudit} disabled={isAuditing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isAuditing ? "animate-spin" : ""}`} />
          {isAuditing ? "Scanning..." : "Run Audit"}
        </Button>
      </div>

      {/* Website Speed Metrics */}
      <SpeedMetrics />

      {!auditResult && !isAuditing && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <RefreshCw className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Belum Ada Audit</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Klik tombol "Run Audit" untuk memulai pemeriksaan SEO
            </p>
          </CardContent>
        </Card>
      )}

      {auditResult && (
        <>
          {/* Score and Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="md:col-span-1">
              <CardContent className="flex items-center justify-center py-6">
                <SeoScoreRing score={auditResult.score} />
              </CardContent>
            </Card>

            <Card className="md:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                    <div>
                      <p className="text-2xl font-bold text-destructive">{activeErrors}</p>
                      <p className="text-xs text-muted-foreground">Errors</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10">
                    <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{activeWarnings}</p>
                      <p className="text-xs text-muted-foreground">Warnings</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-600">{auditResult.summary.passed + fixedIssues.size}</p>
                      <p className="text-xs text-muted-foreground">Passed</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Last audit: {new Date(auditResult.lastAuditAt).toLocaleString("id-ID")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Issues Tabs */}
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="all" className="w-full">
                <div className="border-b px-4">
                  <TabsList className="h-12 bg-transparent border-none">
                    <TabsTrigger value="all" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                      All ({activeIssues.length})
                    </TabsTrigger>
                    <TabsTrigger value="errors" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                      <AlertCircle className="w-4 h-4 mr-1 text-destructive" />
                      Errors ({activeErrors})
                    </TabsTrigger>
                    <TabsTrigger value="warnings" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                      <AlertTriangle className="w-4 h-4 mr-1 text-yellow-500" />
                      Warnings ({activeWarnings})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="border-b px-4 py-2">
                  <Tabs defaultValue="all-category">
                    <TabsList className="h-8 bg-muted/50">
                      <TabsTrigger value="all-category" className="text-xs h-7">All</TabsTrigger>
                      <TabsTrigger value="image" className="text-xs h-7">
                        <Image className="w-3 h-3 mr-1" /> Images
                      </TabsTrigger>
                      <TabsTrigger value="content" className="text-xs h-7">
                        <FileText className="w-3 h-3 mr-1" /> Content
                      </TabsTrigger>
                      <TabsTrigger value="structure" className="text-xs h-7">
                        <Layout className="w-3 h-3 mr-1" /> Structure
                      </TabsTrigger>
                      <TabsTrigger value="performance" className="text-xs h-7">
                        <Zap className="w-3 h-3 mr-1" /> Performance
                      </TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[400px] mt-4">
                      <div className="space-y-3 px-4 pb-4">
                        <TabsContent value="all-category" className="m-0 space-y-3">
                          <IssuesList
                            issues={activeIssues}
                            onUpdateAltText={updateAltText}
                            onConvertToWebP={convertImageToWebP}
                            onIssueFixed={handleIssueFixed}
                          />
                        </TabsContent>
                        <TabsContent value="image" className="m-0 space-y-3">
                          <IssuesList
                            issues={getFilteredIssues(auditResult.issues, "image")}
                            onUpdateAltText={updateAltText}
                            onConvertToWebP={convertImageToWebP}
                            onIssueFixed={handleIssueFixed}
                          />
                        </TabsContent>
                        <TabsContent value="content" className="m-0 space-y-3">
                          <IssuesList
                            issues={getFilteredIssues(auditResult.issues, "content")}
                            onUpdateAltText={updateAltText}
                            onConvertToWebP={convertImageToWebP}
                            onIssueFixed={handleIssueFixed}
                          />
                        </TabsContent>
                        <TabsContent value="structure" className="m-0 space-y-3">
                          <IssuesList
                            issues={getFilteredIssues(auditResult.issues, "structure")}
                            onUpdateAltText={updateAltText}
                            onConvertToWebP={convertImageToWebP}
                            onIssueFixed={handleIssueFixed}
                          />
                        </TabsContent>
                        <TabsContent value="performance" className="m-0 space-y-3">
                          <IssuesList
                            issues={getFilteredIssues(auditResult.issues, "performance")}
                            onUpdateAltText={updateAltText}
                            onConvertToWebP={convertImageToWebP}
                            onIssueFixed={handleIssueFixed}
                          />
                        </TabsContent>
                      </div>
                    </ScrollArea>
                  </Tabs>
                </div>

                {/* Same structure for errors and warnings tabs */}
                <TabsContent value="errors" className="m-0">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3 p-4">
                      <IssuesList
                        issues={getFilteredIssues(auditResult.issues, undefined, "error")}
                        onUpdateAltText={updateAltText}
                        onConvertToWebP={convertImageToWebP}
                        onIssueFixed={handleIssueFixed}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="warnings" className="m-0">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3 p-4">
                      <IssuesList
                        issues={getFilteredIssues(auditResult.issues, undefined, "warning")}
                        onUpdateAltText={updateAltText}
                        onConvertToWebP={convertImageToWebP}
                        onIssueFixed={handleIssueFixed}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

interface IssuesListProps {
  issues: SeoIssue[];
  onUpdateAltText?: (tableName: string, recordId: string, field: string, altText: string) => Promise<void>;
  onConvertToWebP?: (
    tableName: string,
    recordId: string,
    field: string,
    imageUrl: string,
    onProgress?: (status: string) => void
  ) => Promise<{ success: boolean; newUrl?: string; savedBytes?: number }>;
  onIssueFixed?: (issueId: string) => void;
}

const IssuesList = ({ issues, onUpdateAltText, onConvertToWebP, onIssueFixed }: IssuesListProps) => {
  if (issues.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
        <p>Tidak ada masalah ditemukan!</p>
      </div>
    );
  }

  return (
    <>
      {issues.map((issue) => (
        <SeoIssueCard
          key={issue.id}
          issue={issue}
          onUpdateAltText={onUpdateAltText}
          onConvertToWebP={onConvertToWebP}
          onIssueFixed={onIssueFixed}
        />
      ))}
    </>
  );
};
