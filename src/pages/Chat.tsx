import { Helmet } from "react-helmet-async";
import { ChatHeader, ChatInput, ChatMessages, ChatQuickReplies } from "@/components/chat";
import { useChatbot } from "@/hooks/useChatbot";
import { useHotelSettings } from "@/hooks/useHotelSettings";

const Chat = () => {
  const { messages, isLoading, sendMessage, clearChat, settings } = useChatbot();
  const { settings: hotelSettings } = useHotelSettings();

  const handleQuickReply = (message: string) => {
    sendMessage(message);
  };

  return (
    <>
      <Helmet>
        <title>{settings?.bot_name || "Chat"} - {hotelSettings?.hotel_name || "Hotel"}</title>
        <meta name="description" content="Chat dengan asisten AI kami untuk informasi dan bantuan booking" />
      </Helmet>

      <div className="h-screen flex flex-col bg-background">
        <ChatHeader
          botName={settings?.bot_name || "AI Assistant"}
          hotelName={hotelSettings?.hotel_name || "Hotel"}
          logoUrl={hotelSettings?.logo_url || undefined}
          onClearChat={clearChat}
        />

        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          botName={settings?.bot_name || undefined}
        />

        {messages.length === 0 && (
          <ChatQuickReplies onSelect={handleQuickReply} disabled={isLoading} />
        )}

        <ChatInput onSend={sendMessage} disabled={isLoading} maxLength={settings?.max_message_length || 500} />
      </div>
    </>
  );
};

export default Chat;
