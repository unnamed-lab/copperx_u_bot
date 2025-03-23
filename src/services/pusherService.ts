import Pusher from "pusher-js";
import axios from "axios";
import { ChannelAuthorizationData } from "pusher-js/types/src/core/auth/options";
import dotenv from "dotenv";

dotenv.config();

// Initialize Pusher client
export const initializePusher = (token: string, organizationId: string) => {
  const pusherClient = new Pusher(process.env.PUSHER_KEY!, {
    cluster: process.env.PUSHER_CLUSTER!,
    authorizer: (channel) => ({
      authorize: async (socketId, callback) => {
        try {
          const response = await axios.post(
            "https://income-api.copperx.io/api/notifications/auth",
            {
              socket_id: socketId,
              channel_name: channel.name,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.data) {
            callback(
              null,
              response.data as unknown as ChannelAuthorizationData
            );
          } else {
            callback(new Error("Pusher authentication failed"), null);
          }
        } catch (error) {
          console.error("Pusher authorization error:", error);
          callback(error as Error, null);
        }
      },
    }),
  });

  // Subscribe to the organization's private channel
  const channel = pusherClient.subscribe(`private-org-${organizationId}`);

  channel.bind("pusher:subscription_succeeded", () => {
    console.log("Successfully subscribed to private channel");
  });

  channel.bind("pusher:subscription_error", (error: Error) => {
    console.error("Subscription error:", error);
  });

  return channel;
};
