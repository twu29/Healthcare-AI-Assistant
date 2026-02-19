import { IMessageSDK } from "@photon-ai/imessage-kit";
import { mastra } from "./mastra/index";

const sdk = new IMessageSDK();

async function main() {
  const agent = mastra.getAgent("preDiagnosisAgent");

  console.log("Healthcare agent is now listening for iMessages...");

  await sdk.startWatching({
    onDirectMessage: async (msg) => {
      const userText = msg.text?.trim();
      if (!userText) return;

      const sender = msg.sender;
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

        await sdk.send(sender, reply);
      } catch (err) {
        console.error(`[${sender}] Error processing message:`, err);
        await sdk.send(
          sender,
          "I'm sorry, I encountered an issue processing your message. Please try again."
        );
      }
    },
  });

  // Handle graceful shutdown
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
