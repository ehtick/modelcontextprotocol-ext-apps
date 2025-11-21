import { App, PostMessageTransport } from "@ant/mcp-apps";
import {
  McpUiToolInputNotificationSchema,
  McpUiSizeChangeNotificationSchema,
  McpUiToolResultNotificationSchema,
} from "../src/types.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

let nextId = 1;
function sendRequest(method: string, params: any) {
  const id = nextId++;
  window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
  return new Promise((resolve, reject) => {
    window.addEventListener("message", function listener(event) {
      const data: JSONRPCMessage = event.data;
      if (event.data?.id === id) {
        window.removeEventListener("message", listener);
        if (event.data?.result) {
          resolve(true);
        } else if (event.data?.error) {
          reject(new Error(event.data.error));
        }
      } else {
        reject(new Error(`Unsupported message: ${JSON.stringify(data)}`));
      }
    });
  });
}
function sendNotification(method: string, params: any) {
  window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
}
function onNotification(method: string, handler: (params: any) => void) {
  window.addEventListener("message", function listener(event) {
    if (event.data?.method === method) {
      handler(event.data.params);
    }
  });
}

window.addEventListener("load", async () => {
  const root = document.getElementById("root")!;
  const appendText = (textContent: string, opts = {}) => {
    root.appendChild(
      Object.assign(document.createElement("div"), {
        textContent,
        ...opts,
      }),
    );
  };
  const appendError = (error: unknown) =>
    appendText(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
      { style: "color: red;" },
    );

  const initializeResult = await sendRequest("ui/initialize", {
    appCapabilities: {},
    hostInfo: {
      name: "MCP UI Client",
      version: "1.0.0",
    },
    protocolVersion: "2025-06-18",
  });

  sendNotification("ui/initialized", {});

  // onNotification(McpUiToolInputNotificationSchema.shape.method._def.value, (params:
  client.setNotificationHandler(
    McpUiToolResultNotificationSchema,
    async ({ params: { content, structuredContent, isError } }) => {
      appendText(
        `Tool call result received: isError=${isError}, content=${content}, structuredContent=${JSON.stringify(structuredContent)}`,
      );
    },
  );
  client.setNotificationHandler(
    McpUiSizeChangeNotificationSchema,
    async ({ params: { width, height } }) => {
      appendText(
        `Size change notification received: width=${width}, height=${height}`,
      );
    },
  );
  client.setNotificationHandler(
    McpUiToolInputNotificationSchema,
    async ({ params }) => {
      appendText(
        `Tool call input received: ${JSON.stringify(params.arguments)}`,
      );
    },
  );

  document.body.addEventListener("resize", () => {
    client.sendSizeChange({
      width: document.body.scrollWidth,
      height: document.body.scrollHeight,
    });
  });

  root.appendChild(
    Object.assign(document.createElement("button"), {
      textContent: "Buy Groceries (Intent)",
      onclick: async () => {
        const signal = AbortSignal.timeout(5000);
        try {
          const { isError } = await client.sendIntent(
            {
              intent: "create-task",
              params: {
                title: "Buy groceries",
                description: "Buy groceries for the week",
              },
            },
            { signal },
          );
          appendText(`Intent result: ${isError ? "error" : "success"}`);
        } catch (e) {
          if (signal.aborted) {
            appendError("Intent request timed out");
            return;
          }
          appendError(e);
        }
      },
    }),
  );

  root.appendChild(
    Object.assign(document.createElement("button"), {
      textContent: "Get Weather (Tool)",
      onclick: async () => {
        const signal = AbortSignal.timeout(5000);
        try {
          const result = await client.callTool({
            name: "get-weather",
            arguments: { location: "Tokyo" },
          });
          appendText(`Weather tool result: ${JSON.stringify(result)}`);
        } catch (e) {
          appendError(e);
        }
      },
    }),
  );

  root.appendChild(
    Object.assign(document.createElement("button"), {
      textContent: "Notify Cart Updated",
      onclick: async () => {
        try {
          await client.sendNotify({
            level: "info",
            data: "cart-updated",
          });
        } catch (e) {
          appendError(e);
        }
      },
    }),
  );

  root.appendChild(
    Object.assign(document.createElement("button"), {
      textContent: "Prompt Weather in Tokyo",
      onclick: async () => {
        const signal = AbortSignal.timeout(5000);
        try {
          const { isError } = await client.sendPrompt(
            {
              role: "user", // Forced.
              content: [
                {
                  type: "text",
                  text: "What is the weather in Tokyo?",
                },
              ],
            },
            { signal },
          );
          appendText(`Prompt result: ${isError ? "error" : "success"}`);
        } catch (e) {
          if (signal.aborted) {
            appendError("Prompt request timed out");
            return;
          }
          appendError(e);
        }
      },
    }),
  );

  root.appendChild(
    Object.assign(document.createElement("button"), {
      textContent: "Open Link to Google",
      onclick: async () => {
        try {
          const { isError } = await client.sendOpenLink({
            url: "https://www.google.com",
          });
          appendText(`Open link result: ${isError ? "error" : "success"}`);
        } catch (e) {
          appendError(e);
        }
      },
    }),
  );

  await client.connect(transport);
});
