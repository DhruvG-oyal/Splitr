import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { BarLoader } from "react-spinners";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InsightsPage() {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/ai/insights");
      setInsights(res.data.insights);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate insights");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl gradient-title">AI Insights</h1>
          <p className="text-muted-foreground mt-1">
            Get personalized spending analysis powered by Google Gemini
          </p>
        </div>
        <Button onClick={fetchInsights} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
          {isLoading ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isLoading ? "Analyzing..." : "Generate Insights"}
        </Button>
      </div>

      {isLoading && (
        <div className="py-4">
          <BarLoader width="100%" color="#36d7b7" />
          <p className="text-center text-muted-foreground mt-4 text-sm">
            Analyzing your spending patterns with AI...
          </p>
        </div>
      )}

      {!isLoading && !insights && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No insights yet</h3>
            <p className="text-muted-foreground mb-4">
              Click "Generate Insights" to get an AI-powered analysis of your spending habits from the past month.
            </p>
            <Button onClick={fetchInsights} className="bg-green-600 hover:bg-green-700">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Insights
            </Button>
          </CardContent>
        </Card>
      )}

      {insights && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-600" />
              Your Monthly Spending Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {insights}
            </div>
            <div className="mt-6 pt-4 border-t">
              <Button variant="outline" onClick={fetchInsights} disabled={isLoading} size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
