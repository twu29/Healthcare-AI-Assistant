import { SDK } from "@photon-ai/advanced-imessage-kit";
import { mastra } from "./mastra/index";

const sdk = SDK({
  serverUrl: "http://localhost:1234",
});

async function main() {
  const agent = mastra.getAgent("preDiagnosisAgent");

  await sdk.connect();
  console.log("Healthcare agent is now listening for iMessages...");

  sdk.on("new-message", async (message: any) => {
    // Ignore messages sent by us
    if (message.isFromMe) return;

    const userText = message.text?.trim();
    if (!userText) return;

    const sender = message.handle?.address;
    if (!sender) return;

    console.log(`[${sender}] Received: ${userText}`);

    try {
      // Use sender as thread/resource so each conversation has its own memory
      const response = await agent.generate(userText, {
        memory: {
          thread: sender,
          resource: sender,
        },
      });

      const reply = response.text;
      console.log(`[${sender}] Replying: ${reply.substring(0, 100)}...`);

      await sdk.messages.sendMessage({
        chatGuid: `iMessage;-;${sender}`,
        message: reply,
      });
    } catch (err) {
      console.error(`[${sender}] Error processing message:`, err);
      await sdk.messages.sendMessage({
        chatGuid: `iMessage;-;${sender}`,
        message:
          "I'm sorry, I encountered an issue processing your message. Please try again.",
      });
    }
  });

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    await sdk.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start iMessage integration:", err);
  process.exit(1);
});