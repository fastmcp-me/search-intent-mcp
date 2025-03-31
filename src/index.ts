import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";

/**
 * Search Intent Response Interface
 * Defines the structure of the response from the search intent API
 */
interface SearchIntentApiResponse {
  code: number;
  message: string;
  data: {
    query: string;
    intent: string;
    possibleCategories: string[];
    reasoning: string;
    references: Array<{
      url: string;
      title: string;
    }>;
    groundingMetadata: {
      searchSuggestions: string[];
    };
  };
}

/**
 * Get API Key from environment variables
 * Ensures secure access to the search intent API
 */
function getApiKey(): string {
  const apiKey = process.env.SEARCH_INTENT_API_KEY;
  if (!apiKey) {
    console.error("SEARCH_INTENT_API_KEY environment variable is not set");
    process.exit(1);
  }
  return apiKey;
}

// Initialize MCP Server
const server = new McpServer({
  name: "search-intent-analysis",
  version: "1.0.0",
});

// Define and implement the search intent analysis tool
server.tool(
  "search_intent_analysis",
  `A powerful search intent analysis tool that helps understand user search behavior and optimize content strategy.

CAPABILITIES:
1. Analyze search query intent and user motivation
2. Identify relevant topic categories and classifications
3. Provide detailed reasoning behind the intent analysis
4. Generate semantic search suggestions
5. Offer authoritative reference links

USE CASES:
- SEO Optimization: Understand search patterns and improve content targeting
- Content Strategy: Plan content based on user search intentions
- Market Research: Analyze user interests and trends
- User Behavior: Gain insights into search patterns and preferences
- Keyword Research: Discover related search terms and categories

EXAMPLE QUERIES:
- "iphone 15" → Product research, comparison, or purchase intent
- "python tutorial" → Learning intent, skill level assessment
- "restaurants near me" → Local service with immediate intent
- "climate change facts" → Information gathering, research intent
- "best running shoes" → Product comparison with purchase intent

RESPONSE FORMAT:
- query: Original search term
- intent: Primary search intention
- possibleCategories: Related topic categories
- reasoning: Detailed analysis explanation
- references: Authoritative source links
- searchSuggestions: Related search terms`,
  {
    query: z
      .string()
      .describe(
        "The search query to analyze. Provide any search term or phrase to understand user intent, categories, and get related suggestions."
      ),
  },
  async ({ query }) => {
    try {
      const response = await fetch(
        "https://aisearchintent.com/api/search-intent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getApiKey()}`,
          },
          body: JSON.stringify({ query }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      // 解析完整的响应结构
      const apiResponse = (await response.json()) as SearchIntentApiResponse;

      // 验证响应状态
      if (apiResponse.code !== 0) {
        throw new Error(`API error: ${apiResponse.message}`);
      }

      // 直接返回数据部分的 JSON
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(apiResponse.data, null, 2),
          },
        ],
        isError: false,
        _meta: {
          latency: Date.now(),
          version: "1.0.0",
        },
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error analyzing search intent: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
        _meta: {
          errorType: error instanceof Error ? error.name : "Unknown",
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
);

// Start the MCP server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Search Intent MCP Server running on stdio");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle server startup
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
