import { useState, useEffect, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { getStoredUser } from "../utils/api/auth.js";
import * as chatbotAPI from "../utils/api/chatbot.js";

function Chatbot({ user: propUser }) {
  const { theme } = useTheme();
  const { language, t } = useLanguage();
  const storedUser = getStoredUser();
  const user = propUser || (storedUser ? {
    id: storedUser.id,
    organization_id: storedUser.organization_id,
    role: storedUser.role,
    name: storedUser.full_name || storedUser.name,
  } : null);

  // State
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [savedQueries, setSavedQueries] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState("sessions"); // sessions | saved
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load sessions and saved queries on mount
  useEffect(() => {
    loadSessions();
    loadSavedQueries();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const loadSessions = async () => {
    try {
      const data = await chatbotAPI.getSessions();
      setSessions(data);
    } catch (err) {
      console.error("Error loading sessions:", err);
    }
  };

  const loadSavedQueries = async () => {
    try {
      const data = await chatbotAPI.getSavedQueries();
      setSavedQueries(data);
    } catch (err) {
      console.error("Error loading saved queries:", err);
    }
  };

  const loadSession = async (sessionId) => {
    try {
      setLoading(true);
      const data = await chatbotAPI.getSession(sessionId);
      setCurrentSessionId(sessionId);
      setMessages(data.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
      })));
    } catch (err) {
      console.error("Error loading session:", err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setInputMessage("");
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setLoading(true);

    // Add user message
    const newUserMessage = {
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const response = await chatbotAPI.sendChatMessage(
        userMessage,
        currentSessionId,
        "chatgpt",
        true // use AI Query
      );

      if (response.success) {
        if (response.session_id && !currentSessionId) {
          setCurrentSessionId(response.session_id);
          loadSessions();
        }

        const assistantMessage = {
          role: "assistant",
          content: response.response,
          intent: response.intent,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage = {
          role: "assistant",
          content: response.error || (language === "ar"
            ? "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى."
            : "Sorry, I encountered an error. Please try again."),
          isError: true,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      const errorMessage = {
        role: "assistant",
        content: language === "ar"
          ? "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى."
          : "Sorry, there was a connection error. Please try again.",
        isError: true,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleArchiveSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await chatbotAPI.archiveSession(sessionId);
      loadSessions();
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Error archiving session:", err);
    }
  };

  const handleRunSavedQuery = async (queryId) => {
    setLoading(true);
    try {
      const response = await chatbotAPI.runSavedQuery(queryId);
      if (response.success) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: response.response,
          intent: response.intent,
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      console.error("Error running saved query:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSavedQuery = async (queryId, e) => {
    e.stopPropagation();
    try {
      await chatbotAPI.deleteSavedQuery(queryId);
      loadSavedQueries();
    } catch (err) {
      console.error("Error deleting saved query:", err);
    }
  };

  // Theme colors - Premium Palette
  const isDark = theme === "dark";
  const bgMain = isDark ? "bg-[#0f172a]" : "bg-[#f8fafc]"; // Slate 900+ / Slate 50
  const bgCard = isDark ? "bg-[#1e293b]" : "bg-white"; // Slate 800
  const bgSidebar = isDark ? "bg-[#111827]" : "bg-[#f1f5f9]"; // Gray 900+ / Slate 100
  const borderColor = isDark ? "border-slate-700/50" : "border-slate-200";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const activeChatBg = isDark ? "bg-blue-500/10" : "bg-blue-50";

  return (
    <div className={`flex h-[calc(100vh-64px)] overflow-hidden ${bgMain} overflow-hidden`} dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Sidebar - Fixed Positioned relative to parent */}
      <aside
        className={`transition-all duration-300 ease-in-out border-e ${borderColor} ${bgSidebar} flex flex-col z-20
          ${showSidebar ? "w-80 translate-x-0" : "w-0 -translate-x-full opacity-0"}`}
      >
        <div className="flex flex-col h-full w-80">
          {/* New Chat Button Area */}
          <div className="p-5">
            <button
              onClick={handleNewChat}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>{language === "ar" ? "محادثة جديدة" : "New Chat"}</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-5 flex gap-1 mb-4">
            {["sessions", "saved"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all
                  ${activeTab === tab
                    ? `bg-blue-600/10 text-blue-600`
                    : `text-slate-500 hover:bg-slate-200/50 ${isDark ? "hover:bg-slate-800" : ""}`}`}
              >
                {tab === "sessions"
                  ? (language === "ar" ? "المحادثات" : "Chats")
                  : (language === "ar" ? "المحفوظة" : "Saved")}
              </button>
            ))}
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
            {activeTab === "sessions" ? (
              <div className="space-y-1">
                {sessions.length > 0 ? (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => loadSession(session.id)}
                      className={`w-full group p-3 rounded-xl text-start transition-all relative cursor-pointer active:scale-[0.98]
                        ${currentSessionId === session.id ? activeChatBg + " shadow-md" : "hover:bg-white/50 dark:hover:bg-slate-800"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300
                          ${currentSessionId === session.id
                            ? "bg-gradient-to-tr from-blue-600 to-emerald-500 text-white shadow-inner"
                            : "bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-500"}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className={`text-sm font-bold truncate ${currentSessionId === session.id ? "text-blue-600" : textPrimary}`}>
                            {session.title || (language === "ar" ? "محادثة ذكية" : "AI Conversation")}
                          </p>
                          <p className={`text-[11px] mt-0.5 ${textSecondary} truncate opacity-80 font-medium`}>
                            {session.updated_at ? (
                              new Date(session.updated_at).toDateString() === new Date().toDateString()
                                ? (language === 'ar' ? 'اليوم، ' : 'Today, ') + new Date(session.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : new Date(session.updated_at).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US', { day: 'numeric', month: 'short' })
                            ) : (language === 'ar' ? 'غير متوفر' : 'N/A')}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveSession(session.id, e);
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className={`text-sm ${textSecondary}`}>{language === "ar" ? "لا توجد سجلات" : "No Records Found"}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {savedQueries.map((query) => (
                  <div
                    key={query.id}
                    onClick={() => handleRunSavedQuery(query.id)}
                    className={`w-full group p-3 rounded-xl text-start hover:bg-white/50 dark:hover:bg-slate-800 transition-all cursor-pointer`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-800/50 flex items-center justify-center flex-shrink-0 shadow-sm text-amber-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                        </svg>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className={`text-sm font-bold truncate ${textPrimary}`}>{query.label}</p>
                        <p className={`text-[10px] ${textSecondary} opacity-70`}>
                          {language === 'ar' ? 'استعلام محفوظ' : 'Saved Insight'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSavedQuery(query.id, e); }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Profile Info in Sidebar Bottom */}
          <div className={`p-4 ${borderColor} border-t mt-auto`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${textPrimary}`}>{user?.name || "User"}</p>
                <p className={`text-xs ${textSecondary} truncate`}>{user?.role || "Observer"}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container - Absolute Layout for fixed header/footer */}
      <main className="flex-1 flex flex-col relative h-full">
        {/* Fixed Header */}
        <header className={`h-16 px-6 flex items-center justify-between z-30 sticky top-0 ${bgCard} ${borderColor} border-b backdrop-blur-md bg-opacity-80`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${textSecondary}`}
            >
              <svg className={`w-6 h-6 transition-transform ${!showSidebar ? (language === 'ar' ? 'rotate-180' : '') : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2 className={`text-base font-black ${textPrimary} tracking-tight`}>
                {language === "ar" ? "المساعد الذكي لبصيرة البيئة" : "EcoInsight AI Assistant"}
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>
                  {language === "ar" ? "متصل بالنظام الذكي" : "Connected to Smart System"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? "bg-blue-500/10" : "bg-blue-50"} text-blue-600`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </header>

        {/* Scrollable Chat Viewport */}
        <div className="flex-1 overflow-y-auto pt-6 pb-24 px-4 md:px-10 custom-scrollbar scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                <div className={`w-28 h-28 rounded-3xl bg-gradient-to-tr from-blue-500 to-emerald-400 p-0.5 shadow-2xl mb-8 animate-float`}>
                  <div className={`w-full h-full rounded-[26px] ${bgCard} flex items-center justify-center overflow-hidden`}>
                    <img src="/logo.png" alt="HSA Logo" className="w-20 h-20 object-contain" />
                  </div>
                </div>
                <h3 className={`text-2xl font-black ${textPrimary} mb-4`}>
                  {language === "ar" ? "كيف يمكنني دعمك اليوم؟" : "How can I support you today?"}
                </h3>
                <p className={`${textSecondary} max-w-lg mb-8 text-lg font-medium leading-relaxed`}>
                  {language === "ar"
                    ? "أنا مبرمج للمساعدة في مراقبة الهدر الغذائي وتحليل المبيعات وتقديم توصيات ذكية."
                    : "I am programmed to assist in monitoring food waste, analyzing sales, and providing smart recommendations."}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                  {[
                    language === "ar" ? "ما هي أكثر أسباب الهدر اليوم؟" : "What are the top waste causes today?",
                    language === "ar" ? "هل يوجد فائض للتبرع؟" : "Is there a surplus for donation?",
                    language === "ar" ? "أداء المبيعات في آخر أسبوع" : "Sales performance last week",
                    language === "ar" ? "توصيات لتحسين التخزين" : "Recommendations to improve storage",
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputMessage(suggestion);
                        inputRef.current?.focus();
                      }}
                      className={`text-start px-6 py-4 rounded-2xl border ${borderColor} transition-all
                        ${isDark ? "bg-slate-800/30 hover:bg-slate-800" : "bg-white hover:bg-slate-50 shadow-sm"}
                        ${textPrimary} text-sm font-bold group`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-blue-500 group-hover:scale-150 transition-transform"></span>
                        {suggestion}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div key={index} className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start animate-fade-in"}`}>
                    <div className={`flex gap-3 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                      {/* Avatar Icons */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-sm overflow-hidden
                        ${message.role === "user" ? "bg-blue-600 text-white" : "bg-white border-2 border-emerald-500/20"}`}>
                        {message.role === "user" ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        ) : (
                          <img src="/logo.png" alt="AI" className="w-7 h-7 object-contain" />
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div className={`px-5 py-4 rounded-2xl shadow-sm text-sm font-medium leading-[1.6]
                        ${message.role === "user"
                          ? "bg-blue-600 text-white rounded-te-none"
                          : message.isError
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : `${isDark ? "bg-[#1e293b]" : "bg-white"} ${textPrimary} rounded-ts-none border ${borderColor}`
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {message.timestamp && (
                          <p className={`text-[10px] mt-2 ${message.role === 'user' ? 'text-blue-100' : textSecondary} opacity-70`}>
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white border-2 border-emerald-500/20 flex items-center justify-center shadow-sm overflow-hidden">
                        <img src="/logo.png" alt="AI" className="w-7 h-7 object-contain animate-pulse" />
                      </div>
                      <div className={`px-5 py-4 rounded-2xl rounded-ts-none ${isDark ? "bg-[#1e293b]" : "bg-white"} border ${borderColor} flex items-center gap-2`}>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer Input Area */}
        <footer className={`absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t ${isDark ? "from-[#0f172a] via-[#0f172a]/95" : "from-[#f8fafc] via-[#f8fafc]/95"} to-transparent z-40`}>
          <div className="max-w-4xl mx-auto flex gap-3 relative">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    handleSend(e);
                  }
                }}
                disabled={loading}
                placeholder={language === "ar" ? "اسأل المساعد الذكي عن أي شيء..." : "Ask AI anything..."}
                className={`w-full pl-5 pr-14 py-4 rounded-2xl border ${borderColor} ${isDark ? "bg-[#1e293b] placeholder-slate-500" : "bg-white shadow-xl shadow-slate-200/50"} 
                  ${textPrimary} text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50`}
              />
              {/* Send Button integrated in input */}
              <button
                onClick={handleSend}
                disabled={loading || !inputMessage.trim()}
                className={`absolute ${language === 'ar' ? 'left-2' : 'right-2'} top-2 bottom-2 px-5 rounded-xl transition-all flex items-center justify-center
                  ${!inputMessage.trim() || loading
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-400"
                    : "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"}`}
              >
                <svg className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <p className={`text-[10px] text-center mt-3 ${textSecondary} font-bold opacity-60`}>
            {language === "ar" ? "مدعوم بنظام HSA للذكاء الاصطناعي - قد تظهر نتائج متفاوتة" : "Powered by HSA AI - Results may vary"}
          </p>
        </footer>
      </main>

      {/* Internal CSS for custom elements */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: ${isDark ? "#334155" : "#cbd5e1"}; 
          border-radius: 10px; 
        }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

export default Chatbot;
