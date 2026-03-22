export interface Client {
  id: string;
  firm_name: string;
  primary_domain: string | null;
  market_key: string;
  practice_areas: string[];
  tier: "solo" | "growth" | "agency";
  is_active: boolean;
}

export interface VisibilityScore {
  id: string;
  client_id: string;
  run_id: string;
  week_date: string; // ISO date string "2026-03-16"
  overall_score: number;
  mention_rate: number; // 0.0000–1.0000
  first_position_rate: number;
  positive_sentiment_rate: number;
  chatgpt_score: number | null;
  perplexity_score: number | null;
  gemini_score: number | null;
  competitor_scores: Record<string, number>;
  score_components: ScoreComponents;
}

export interface ScoreComponents {
  mention: SignalDetail;
  position: SignalDetail;
  sentiment: SignalDetail;
}

export interface SignalDetail {
  raw: number;
  weight: number;
  contribution: number;
}

export interface Competitor {
  canonical_name: string;
  mention_count: number;
  mention_rate: number;
  score: number;
  platforms: Record<string, number>; // platform → mention count
}

export interface ReviewItem {
  id: string;
  raw_text: string;
  suggested_canonical: string | null;
  confidence: number;
  platform: string;
  prompt_text: string;
  resolved: boolean;
  resolution: string | null;
  created_at: string;
}

export type ScoreBand = "excellent" | "good" | "fair" | "weak";

export function getScoreBand(score: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (score >= 70) return { label: "Excellent", color: "text-green-600", bgColor: "bg-green-50" };
  if (score >= 40) return { label: "Good", color: "text-blue-600", bgColor: "bg-blue-50" };
  if (score >= 15) return { label: "Fair", color: "text-amber-600", bgColor: "bg-amber-50" };
  return { label: "Weak", color: "text-red-600", bgColor: "bg-red-50" };
}
