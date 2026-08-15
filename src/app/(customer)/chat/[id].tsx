import { useLocalSearchParams } from "expo-router";
import { ChatThreadScreen } from "@/components/chat-thread-screen";
export default function CustomerChatThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChatThreadScreen orderId={Number(id)} />;
}
