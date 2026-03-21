const {
  Server,
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  TextContent,
  ToolError,
} = require("@modelcontextprotocol/sdk/types");
const axios = require("axios");

const logger = require("pino")();

const ECOINTEL_API_URL = process.env.ECOINTEL_API_URL || "http://localhost:4052";
const ECOINTEL_API_KEY = process.env.ECOINTEL_API_KEY || "sk_ecointel_default";

// Initialize MCP server
const server = new Server(
  {
    name: "EcoIntel",
    version: "1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const tools = [
  {
    name: "benchmark_repo",
    description:
      "Benchmark a repo against ecosystem peers. Returns ranked similar repos with feature analysis, health scores, integration cost estimates, and cited evidence. Use before writing, recommending, or evaluating code.",
    inputSchema: {
      type: "object",
      properties: {
        repo_url: {
          type: "string",
          description: "GitHub repository URL (e.g., https://github.com/owner/repo)",
        },
        category: {
          type: "string",
          description: "Ecosystem category (optional, auto-detected if omitted)",
        },
        constraints: {
          type: "object",
          description: "Filter constraints (optional)",
          properties: {
            license: {
              type: "array",
              items: { type: "string" },
              description: "Allowed licenses (e.g., MIT, Apache-2.0)",
            },
            language: {
              type: "array",
              items: { type: "string" },
              description: "Allowed languages (e.g., Python, TypeScript)",
            },
            min_health_score: {
              type: "number",
              description: "Minimum health score (0-1)",
            },
            exclude_archived: {
              type: "boolean",
              description: "Exclude archived repos",
            },
            must_have_features: {
              type: "array",
              items: { type: "string" },
              description: "Required features",
            },
          },
        },
        k: {
          type: "number",
          description: "Number of results to return (default: 10)",
          default: 10,
        },
        include_narrative: {
          type: "boolean",
          description: "Include detailed narrative analysis",
          default: false,
        },
      },
      required: ["repo_url"],
    },
  },
  {
    name: "similar_repos",
    description:
      "Find the most similar GitHub repos to a given URL. Fast lookup, cached results. Use to discover alternatives, find prior art, or identify the best existing implementations.",
    inputSchema: {
      type: "object",
      properties: {
        repo_url: {
          type: "string",
          description: "GitHub repository URL",
        },
        k: {
          type: "number",
          description: "Number of results to return (default: 5)",
          default: 5,
        },
      },
      required: ["repo_url"],
    },
  },
  {
    name: "constraint_search",
    description:
      "Find repos matching hard constraints (license, language, health score, required features). When the pool is empty, returns infeasibility_reasons explaining what to relax.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Ecosystem category",
        },
        constraints: {
          type: "object",
          description: "Filter constraints",
          properties: {
            license: {
              type: "array",
              items: { type: "string" },
            },
            language: {
              type: "array",
              items: { type: "string" },
            },
            min_health_score: {
              type: "number",
            },
            exclude_archived: {
              type: "boolean",
            },
            must_have_features: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        required_features: {
          type: "array",
          items: { type: "string" },
          description: "Required features",
        },
        k: {
          type: "number",
          description: "Number of results to return (default: 10)",
          default: 10,
        },
      },
      required: ["category", "constraints"],
    },
  },
];

// Tool handlers
async function handleBenchmarkRepo(input) {
  const {
    repo_url,
    category,
    constraints,
    k = 10,
    include_narrative = false,
  } = input;

  try {
    const response = await axios.post(
      `${ECOINTEL_API_URL}/v1/ecosystem/benchmark`,
      {
        repo_url,
        category,
        constraints,
        k,
        include_narrative,
      },
      {
        headers: {
          "X-API-Key": ECOINTEL_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    return {
      type: "text",
      text: JSON.stringify(response.data, null, 2),
    };
  } catch (error) {
    return {
      type: "text",
      text: `Error benchmarking repo: ${error.message}`,
      isError: true,
    };
  }
}

async function handleSimilarRepos(input) {
  const { repo_url, k = 5 } = input;

  try {
    const response = await axios.post(
      `${ECOINTEL_API_URL}/v1/similar`,
      {
        repo_url,
        k,
      },
      {
        headers: {
          "X-API-Key": ECOINTEL_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    return {
      type: "text",
      text: JSON.stringify(response.data, null, 2),
    };
  } catch (error) {
    return {
      type: "text",
      text: `Error finding similar repos: ${error.message}`,
      isError: true,
    };
  }
}

async function handleConstraintSearch(input) {
  const { category, constraints, required_features, k = 10 } = input;

  try {
    const response = await axios.post(
      `${ECOINTEL_API_URL}/v1/ecosystem/benchmark`,
      {
        repo_url: "",
        category,
        constraints,
        required_features,
        k,
      },
      {
        headers: {
          "X-API-Key": ECOINTEL_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    return {
      type: "text",
      text: JSON.stringify(response.data, null, 2),
    };
  } catch (error) {
    return {
      type: "text",
      text: `Error searching repos: ${error.message}`,
      isError: true,
    };
  }
}

// Request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request;

  logger.info({ tool: name, args }, "Tool called");

  try {
    let result;

    if (name === "benchmark_repo") {
      result = await handleBenchmarkRepo(args);
    } else if (name === "similar_repos") {
      result = await handleSimilarRepos(args);
    } else if (name === "constraint_search") {
      result = await handleConstraintSearch(args);
    } else {
      return new ToolError(`Unknown tool: ${name}`);
    }

    return {
      content: [result],
    };
  } catch (error) {
    logger.error({ tool: name, error }, "Tool execution failed");
    return new ToolError(`Tool execution failed: ${error.message}`);
  }
});

// Startup
async function main() {
  // Warn if critical env vars are missing
  if (!ECOINTEL_API_URL || ECOINTEL_API_URL === "http://localhost:4052") {
    logger.warn({ ECOINTEL_API_URL }, "Using default API URL");
  }

  if (!ECOINTEL_API_KEY || ECOINTEL_API_KEY === "sk_ecointel_default") {
    logger.warn("Using default API key");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info({ apiUrl: ECOINTEL_API_URL }, "EcoIntel MCP server started");
}

main().catch((error) => {
  logger.error({ error }, "MCP server startup failed");
  process.exit(1);
});

module.exports = { server };
