import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";

export const useChat = () => {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Load messages and session ID from localStorage on mount
  useEffect(() => {
    if (session?.user?.email) {
      const savedMessages = localStorage.getItem(
        `chat_messages_${session.user.email}`
      );
      const savedSessionId = localStorage.getItem(
        `chat_session_${session.user.email}`
      );

      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch (error) {
          console.error("Error loading saved messages:", error);
        }
      }

      if (savedSessionId) {
        setCurrentSessionId(savedSessionId);
      }
    }
  }, [session?.user?.email]);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (session?.user?.email && messages.length > 0) {
      localStorage.setItem(
        `chat_messages_${session.user.email}`,
        JSON.stringify(messages)
      );
    }
  }, [messages, session?.user?.email]);

  // Clear messages and session when user logs out
  useEffect(() => {
    if (!session?.user?.email) {
      setMessages([]);
      setCurrentSessionId(null);
    }
  }, [session?.user?.email]);

  // Save session ID to localStorage whenever it changes
  useEffect(() => {
    if (session?.user?.email && currentSessionId) {
      localStorage.setItem(
        `chat_session_${session.user.email}`,
        currentSessionId
      );
    }
  }, [currentSessionId, session?.user?.email]);

  const generateSessionId = () => {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const createChatSession = useCallback(async () => {
    if (!session?.user) return null;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_FRAPPE_URL || "";
      const response = await fetch(
        `${baseUrl}/api/method/elearning.elearning.agents.tutor.create_chat_session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user: session.user.email,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create chat session");
      }

      const data = await response.json();
      return data.message; // The agents API directly returns the session_id
    } catch (error) {
      console.error("Error creating chat session:", error);
      return null;
    }
  }, [session]);

  const sendMessage = useCallback(
    async (content, attachments = []) => {
      if ((!content.trim() && attachments.length === 0) || !session?.user)
        return;

      const userMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: content.trim(),
        attachments: attachments,
        timestamp: new Date().toISOString(),
      };

      // Add user message to chat
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      setError(null);

      try {
        // Ensure we have a session ID
        let sessionId = currentSessionId;
        if (!sessionId) {
          sessionId = await createChatSession();
          setCurrentSessionId(sessionId);
        }

        // Prepare form data for file uploads
        const formData = new FormData();
        formData.append("user", session.user.email);
        formData.append("user_input", content.trim());
        formData.append("session_id", sessionId);

        // Add conversation history for trigger analysis (include current user message)
        const conversationForAnalysis = [...messages, userMessage];
        if (conversationForAnalysis.length > 0) {
          const conversationHistory = JSON.stringify(conversationForAnalysis);
          formData.append("conversation_history", conversationHistory);
        }

        // Add attachments to form data
        attachments.forEach((attachment, index) => {
          if (attachment.file) {
            formData.append(
              `attachment_${index}`,
              attachment.file,
              attachment.name
            );
          }
        });
        formData.append("attachment_count", attachments.length.toString());

        const baseUrl = process.env.NEXT_PUBLIC_FRAPPE_URL || "";
        const response = await fetch(
          `${baseUrl}/api/method/elearning.elearning.agents.tutor.handle_chat_message`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const data = await response.json();

        // 🐛 DEBUG KNOWLEDGE GAP CREATION
        console.log("🐛 CHAT DEBUG - Full Response:", data);
        console.log("🐛 CHAT DEBUG - Debug Info:", data.message?.debug_info);
        console.log(
          "🐛 CHAT DEBUG - Proactive Response:",
          data.message?.proactive_response
        );

        if (data.message?.proactive_response?.debug_proactive) {
          console.log(
            "🎯 KNOWLEDGE GAP DEBUG:",
            data.message.proactive_response.debug_proactive
          );
        }

        // Add AI response to chat
        if (data.message?.success && data.message.response) {
          const aiMessage = {
            id: `ai_${Date.now()}`,
            role: "assistant",
            content: data.message.response,
            timestamp: new Date().toISOString(),
            intent: data.message.intent, // Store intent for debugging/analytics
          };

          setMessages((prev) => [...prev, aiMessage]);

          // Add proactive response if available
          if (data.message.proactive_response) {
            const proactiveMessage = {
              id: `ai_proactive_${Date.now()}`,
              role: "assistant",
              timestamp: new Date().toISOString(),
              isProactive: true,
            };

            // Handle intelligent tutoring format
            if (
              typeof data.message.proactive_response === "object" &&
              data.message.proactive_response.type
            ) {
              proactiveMessage.tutoring_data = data.message.proactive_response;
              proactiveMessage.content =
                data.message.proactive_response.content;
            } else {
              proactiveMessage.content = data.message.proactive_response;
            }

            setMessages((prev) => [...prev, proactiveMessage]);
          }
        } else if (data.message?.error) {
          throw new Error(data.message.error);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        setError("Failed to send message. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [session, currentSessionId, createChatSession]
  );

  const handleSubmit = useCallback(
    (e, attachments = []) => {
      e?.preventDefault();
      if ((input.trim() || attachments.length > 0) && !isLoading) {
        sendMessage(input, attachments);
      }
    },
    [input, isLoading, sendMessage]
  );

  const stop = useCallback(() => {
    setIsLoading(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(null);
    if (session?.user?.email) {
      localStorage.removeItem(`chat_messages_${session.user.email}`);
      localStorage.removeItem(`chat_session_${session.user.email}`);
    }
  }, [session?.user?.email]);

  const handleTutoringButtonClick = useCallback(
    (action, data, buttonText) => {
      // Handle different tutoring actions
      switch (action) {
        case "review_prerequisites":
          console.log("Review prerequisites:", data.prerequisites);
          // TODO: Navigate to prerequisite learning objects
          break;
        case "skip_prerequisites":
          console.log("Skip to main learning object:", data.main_lo);
          // TODO: Navigate to main learning object
          break;
        case "start_practice":
          console.log("Start practice for:", data);
          // TODO: Navigate to practice exercises
          break;
        case "watch_video":
          console.log("Watch video for topic:", data.topic);
          // TODO: Navigate to video recommendations
          break;
        default:
          console.log("Unknown action:", action, data);
      }

      // Send user's choice back to chatbot
      if (buttonText) {
        sendMessage(`Tôi chọn: ${buttonText}`, []);
      }
    },
    [sendMessage]
  );

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    stop,
    error,
    clearMessages,
    handleTutoringButtonClick,
  };
};
