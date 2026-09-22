import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

interface Env {
  OPENAI_API_KEY: string;
}

function createServer(env: Env) {
  const server = new McpServer({
    name: "Claude OpenAI Bridge",
    version: "1.0.0",
  });

  server.registerTool(
    "ask_openai",
    {
      description:
        "Send a question or instruction from Claude to an OpenAI model and return the response.",
      inputSchema: {
        prompt: z.string().describe("The question or instruction to send to OpenAI"),
      },
    },
    async ({ prompt }) => {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-5.6",
          input: prompt,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          content: [
            {
              type: "text",
              text: `OpenAI API error: ${error}`,
            },
          ],
          isError: true,
        };
      }

      const data = await response.json() as {
        output_text?: string;
      };

      return {
        content: [
          {
            type: "text",
            text: data.output_text ?? "OpenAI returned no text.",
          },
        ],
      };
    }
  );

  return server;
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return createMcpHandler(() => createServer(env))(request, env, ctx);
  },
};
