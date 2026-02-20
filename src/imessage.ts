import { IMessageSDK } from "@photon-ai/imessage-kit";
import { mastra } from "./mastra/index";

async function main() {
  const agent = mastra.getAgent("preDiagnosisAgent");
  const sdk = new IMessageSDK();

  console.log("Healthcare agent is now listening for iMessages...");

  await sdk.startWatching({
    onMessage: async (message) => {
      if (message.isFromMe) return;

      const userText = message.text?.trim();
      if (!userText) return;

      const sender = message.sender;
      if (!sender) return;

      console.log(`[${sender}] Received: ${userText}`);

      try {
        const response = await agent.generate(userText, {
          memory: {
            thread: sender,
            resource: sender,
          },
        });

        const reply = response.text
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/#{1,6}\s/g, "")
          .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ""));
        console.log(`[${sender}] Replying: ${reply.substring(0, 100)}...`);

        await sdk.send(sender, reply);
      } catch (err) {
        console.error(`[${sender}] Error processing message:`, err);
        await sdk.send(sender, "I'm sorry, I encountered an issue processing your message. Please try again.");
      }
    },
    onError: (error) => {
      console.error("Watcher error:", error);
    },
  });

  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    sdk.stopWatching();
    await sdk.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start iMessage integration:", err);
  process.exit(1);
});
