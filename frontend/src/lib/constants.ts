/**
 * Maps display metro names (used in onboarding UI) to market_key values
 * used in the database prompts table and backend pipeline.
 */
export const METRO_TO_MARKET_KEY: Record<string, string> = {
  "Dallas, TX": "dallas_pi",
  "Houston, TX": "houston_pi",
  "Austin, TX": "austin_pi",
  "San Antonio, TX": "san_antonio_pi",
  "Los Angeles, CA": "los_angeles_pi",
  "Chicago, IL": "chicago_pi",
  "New York, NY": "new_york_pi",
  "Miami, FL": "miami_pi",
  "Denver, CO": "denver_pi",
  "Phoenix, AZ": "phoenix_pi",
};
