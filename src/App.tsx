import { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Search, ArrowRight, Loader2, Link as LinkIcon, Globe, History, X, Plus, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Source {
  title: string;
  uri: string;
}

interface Message {
  role: 'user' | 'model';
  content: string;
  sources?: Source[];
  isWebSearch?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const startNewChat = () => {
    if (messages.length > 0) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: messages[0].content.slice(0, 40) + (messages[0].content.length > 40 ? '...' : ''),
        messages: [...messages],
        timestamp: Date.now(),
      };
      setHistory(prev => [newSession, ...prev.slice(0, 19)]);
    }
    setMessages([]);
    setQuery('');
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setShowHistory(false);
  };

  const handleSearch = async (e?: React.FormEvent, customQuery?: string, forceWebSearch?: boolean) => {
    e?.preventDefault();
    const searchQuery = customQuery || query;
    if (!searchQuery.trim() || isLoading) return;

    const useWebSearch = forceWebSearch !== undefined ? forceWebSearch : isWebSearchEnabled;
    const userMessage: Message = { role: 'user', content: searchQuery };
    
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          useWebSearch,
          history: messages.map((msg) => ({ role: msg.role, content: msg.content })),
        }),
      });

      const text = await res.text();
      let data: { error?: string; answer?: string; sources?: Source[] } = {};
      try {
        if (text) data = JSON.parse(text);
      } catch {
        if (!res.ok) {
          if (res.status === 405) {
            throw new Error("검색 API가 이 배포에서 동작하지 않습니다. Cloudflare Pages에서 Git 연결 후 Root directory를 배포용, Build output을 dist로 설정했는지 확인하세요.");
          }
          throw new Error(`서버 오류 (${res.status}). 응답이 비어 있을 수 있습니다.`);
        }
      }

      if (!res.ok) {
        throw new Error(data?.error || `요청에 실패했습니다. (${res.status})`);
      }

      const answer = data.answer ?? "죄송합니다. 답변을 생성하는 중에 문제가 발생했습니다.";
      const uniqueSources: Source[] = Array.isArray(data.sources) ? data.sources : [];

      const modelMessage: Message = {
        role: "model",
        content: answer,
        sources: uniqueSources,
        isWebSearch: useWebSearch,
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error("Search error:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: "검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        isWebSearch: useWebSearch,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#F5F5F0]">
      {/* Header */}
      <header className="border-b border-[#141414]/10 px-6 py-8 md:px-12 md:py-12">
        <div className="max-w-7xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-4xl md:text-6xl font-serif italic tracking-tight leading-none">
              Jupt AI Studio
            </h1>
            <p className="mt-4 text-sm uppercase tracking-widest opacity-50 font-mono">
              HaeTaeNae AI Powered Search & Answers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={startNewChat}
              className="p-3 border border-[#141414]/10 rounded-full hover:bg-[#141414]/5 transition-colors opacity-70 hover:opacity-100"
              title="새 대화"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-3 border border-[#141414]/10 rounded-full hover:bg-[#141414]/5 transition-colors opacity-70 hover:opacity-100"
              title="검색 기록"
            >
              <History size={20} />
            </button>
            <span className="hidden md:block text-xs font-mono opacity-50">v1.0.0</span>
          </div>
        </div>
      </header>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-[#141414]/20 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-[#141414]/10 shadow-[20px_0_0_0_rgba(20,20,20,0.03)] z-50 p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-serif italic flex items-center gap-2">
                  <History size={20} /> 최근 검색
                </h2>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm font-mono opacity-50 text-center py-12">검색 기록이 없습니다.</p>
                ) : (
                  history.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        loadSession(item);
                      }}
                      className="w-full text-left p-4 rounded-2xl border border-[#141414]/10 bg-white/50 hover:border-[#141414]/20 hover:bg-white/80 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <MessageSquare size={16} className="mt-1 opacity-40" />
                        <p className="text-sm font-serif italic text-[#141414] line-clamp-2 group-hover:opacity-80">
                          {item.title}
                        </p>
                      </div>
                      <p className="text-[10px] font-mono opacity-30 mt-2 uppercase tracking-widest">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 md:px-12">
        <div className="max-w-3xl mx-auto flex flex-col gap-12">
          {/* Intro */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center transition-all duration-700"
            >
              <h2 className="text-2xl md:text-3xl font-serif italic mb-4">질문을 입력하면 AI가 답변해 드립니다.</h2>
              <p className="text-lg leading-relaxed opacity-80 max-w-md">
                실시간 정보가 필요하면 웹 검색을 켜보세요.
              </p>
            </motion.div>
          )}

          {/* Chat Messages */}
          <div className="flex flex-col gap-12">
            <AnimatePresence mode="popLayout">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col gap-4",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[85%] bg-[#141414] text-[#F5F5F0] px-6 py-4 rounded-2xl shadow-lg font-serif italic text-xl">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="w-full space-y-8">
                      <div className="border border-[#141414] rounded-3xl p-8 md:p-12 bg-white shadow-[20px_20px_0px_0px_rgba(20,20,20,0.05)] relative">
                        <div className="markdown-body prose prose-slate max-w-none">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                        
                        {!msg.isWebSearch && idx === messages.length - 1 && !isLoading && (
                          <div className="mt-8 pt-6 border-t border-[#141414]/10 flex justify-center">
                            <button
                              onClick={() => handleSearch(undefined, messages[idx-1].content, true)}
                              disabled={isLoading}
                              className="flex items-center gap-2 px-6 py-3 border border-[#141414]/10 rounded-xl hover:bg-[#141414]/5 transition-colors font-mono uppercase tracking-widest text-xs"
                            >
                              <Globe size={16} />
                              웹 검색으로 더 정확한 정보 찾기
                            </button>
                          </div>
                        )}
                      </div>

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-xs font-mono uppercase tracking-widest opacity-50 flex items-center gap-2">
                            <LinkIcon size={14} /> 출처 및 참고 자료
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {msg.sources.map((source, i) => (
                              <a
                                key={i}
                                href={source.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col p-6 border border-[#141414]/10 rounded-2xl bg-white/50 backdrop-blur-sm hover:border-[#141414]/20 transition-all group"
                              >
                                <span className="text-lg font-serif italic text-[#141414] line-clamp-1 group-hover:opacity-80">
                                  {source.title}
                                </span>
                                <span className="text-xs font-mono opacity-50 truncate mt-1">
                                  {new URL(source.uri).hostname}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Search Card (Sticky at bottom if messages exist) */}
          <div className={cn(
            "transition-all duration-500",
            messages.length > 0 ? "sticky bottom-8 z-40" : "relative"
          )}>
            <motion.div
              layout
              className={cn(
                "border border-[#141414] rounded-3xl bg-white shadow-[20px_20px_0px_0px_rgba(20,20,20,0.05)]",
                messages.length > 0 ? "p-4 md:p-6" : "p-8 md:p-12"
              )}
            >
              <form onSubmit={handleSearch} className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none opacity-40 group-focus-within:opacity-70 transition-opacity">
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={messages.length > 0 ? "답변에 대해 더 궁금한 점이 있나요?" : "무엇이든 물어보세요..."}
                  className="w-full pl-14 pr-16 py-5 bg-[#F5F5F0] border border-[#141414]/10 rounded-2xl outline-none transition-colors text-lg focus:border-[#141414]/30"
                />
                <button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-[#141414] text-[#F5F5F0] rounded-xl hover:bg-[#141414]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono uppercase tracking-widest text-xs"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                </button>
              </form>

              <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono uppercase tracking-widest transition-all border",
                      isWebSearchEnabled
                        ? "bg-[#141414] text-[#F5F5F0] border-[#141414]"
                        : "bg-white text-[#141414] border-[#141414]/10 hover:border-[#141414]/20"
                    )}
                  >
                    <Globe size={16} />
                    웹 검색 {isWebSearchEnabled ? 'ON' : 'OFF'}
                  </button>
                  <span className="text-[10px] font-mono opacity-30 hidden md:inline uppercase tracking-widest">
                    {isWebSearchEnabled ? "Web Grounding Active" : "Internal Knowledge Only"}
                  </span>
                </div>
                
                {messages.length > 0 && (
                  <button 
                    onClick={startNewChat}
                    className="text-[10px] font-mono opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest flex items-center gap-1"
                  >
                    <Plus size={12} /> New Conversation
                  </button>
                )}
              </div>
            </motion.div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <div className="w-12 h-12 rounded-full bg-[#141414]/5 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#141414] opacity-60" size={24} />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-40 animate-pulse">
                Thinking...
              </p>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
