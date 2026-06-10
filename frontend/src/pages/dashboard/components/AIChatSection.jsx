import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, MessageSquareText, Plus, Save, Search, Send, Server, Trash2, UserRound, X } from 'lucide-react';
import {
  askChatQuestion,
  deleteChatConversation,
  getChatConversation,
  getChatConversations,
  updateChatConversation,
} from '../../../services/chatApi';

const formatTime = (value) => value ? new Date(value).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

const renderInline = (text) => String(text || '').split(/(\*\*[^*]+\*\*)/g).map((part, index) => (
  part.startsWith('**') && part.endsWith('**')
    ? <strong key={index} className="font-black">{part.slice(2, -2)}</strong>
    : <span key={index}>{part}</span>
));

const MessageContent = ({ content }) => {
  const lines = String(content || '').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const next = lines[index + 1] || '';
    const isTable = line.trim().startsWith('|') && next.includes('---');

    if (isTable) {
      const tableLines = [];
      while (lines[index]?.trim().startsWith('|')) {
        tableLines.push(lines[index]);
        index += 1;
      }
      const rows = tableLines
        .filter((row) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(row.trim()))
        .map((row) => row.split('|').map((cell) => cell.trim()).filter(Boolean));
      const [head, ...body] = rows;
      blocks.push(
        <div key={`table-${index}`} className="my-3 overflow-x-auto rounded-xl border-2 border-black bg-white">
          <table className="w-full min-w-[520px] text-left text-xs">
            {head && (
              <thead className="bg-[#BFE8FF] font-black uppercase text-slate-950">
                <tr>{head.map((cell) => <th key={cell} className="border-b-2 border-black px-3 py-2">{renderInline(cell)}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="border-b border-slate-200 px-3 py-2 align-top font-bold">{renderInline(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      blocks.push(<div key={`space-${index}`} className="h-2" />);
    } else if (trimmed.startsWith('### ')) {
      blocks.push(<h4 key={index} className="mt-3 text-base font-black text-slate-950">{renderInline(trimmed.slice(4))}</h4>);
    } else if (trimmed.startsWith('## ')) {
      blocks.push(<h3 key={index} className="mt-4 text-lg font-black text-slate-950">{renderInline(trimmed.slice(3))}</h3>);
    } else if (/^\d+\.\s+/.test(trimmed)) {
      blocks.push(<p key={index} className="pl-2 text-sm font-bold leading-6 text-slate-800">{renderInline(trimmed)}</p>);
    } else if (/^[-*]\s+/.test(trimmed)) {
      blocks.push(<p key={index} className="pl-4 text-sm font-bold leading-6 text-slate-800">• {renderInline(trimmed.slice(2))}</p>);
    } else {
      blocks.push(<p key={index} className="text-sm font-bold leading-6">{renderInline(trimmed)}</p>);
    }
    index += 1;
  }

  return <div className="grid gap-1">{blocks}</div>;
};

const AIChatSection = ({ monitors = [] }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [conversationSearch, setConversationSearch] = useState('');
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const [selectedMonitorIds, setSelectedMonitorIds] = useState([]);
  const [saveToMemory, setSaveToMemory] = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);

  const selectedMonitorNames = useMemo(
    () => monitors.filter((monitor) => selectedMonitorIds.includes(monitor.id)).map((monitor) => monitor.name),
    [monitors, selectedMonitorIds]
  );
  const filteredConversations = useMemo(() => {
    const term = conversationSearch.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((conversation) =>
      `${conversation.title || ''} ${formatTime(conversation.lastMessageAt || conversation.updatedAt)}`
        .toLowerCase()
        .includes(term)
    );
  }, [conversationSearch, conversations]);

  const displayedMessages = useMemo(
    () => [...(activeConversation?.messages || []), ...optimisticMessages],
    [activeConversation?.messages, optimisticMessages]
  );
  const hasMessages = Boolean(displayedMessages.length);

  const loadConversations = () => {
    setIsLoadingList(true);
    setError('');
    getChatConversations()
      .then(setConversations)
      .catch((err) => setError(err.message || 'Failed to load conversations'))
      .finally(() => setIsLoadingList(false));
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [displayedMessages.length, isSending]);

  const openConversation = (id) => {
    setError('');
    getChatConversation(id)
      .then((conversation) => {
        setActiveConversation(conversation);
        setOptimisticMessages([]);
        setTitle(conversation.title || '');
        setSelectedMonitorIds((conversation.monitorIds || []).map(String));
      })
      .catch((err) => setError(err.message || 'Failed to open conversation'));
  };

  const updateConversationName = () => {
    if (!activeConversation?._id || !hasMessages) return;
    setError('');
    updateChatConversation(activeConversation._id, { title, monitorIds: selectedMonitorIds })
      .then((conversation) => {
        setActiveConversation((current) => ({ ...(current || {}), ...conversation }));
        setConversations((current) => current.map((item) => item._id === conversation._id ? conversation : item));
      })
      .catch((err) => setError(err.message || 'Failed to update conversation'));
  };

  const sendQuestion = (event) => {
    event.preventDefault();
    const messageText = question.trim();
    if (!messageText || isSending) return;

    const now = new Date().toISOString();
    setOptimisticMessages([
      {
        _id: `optimistic-user-${Date.now()}`,
        role: 'user',
        content: messageText,
        createdAt: now,
      },
      {
        _id: `optimistic-ai-${Date.now()}`,
        role: 'assistant',
        content: 'Thinking...',
        createdAt: now,
        isThinking: true,
      },
    ]);
    setQuestion('');
    setIsSending(true);
    setError('');
    askChatQuestion({
      conversationId: activeConversation?._id,
      title: title || messageText.slice(0, 58),
      question: messageText,
      monitorIds: selectedMonitorIds,
      saveToMemory,
    })
      .then((conversation) => {
        setActiveConversation(conversation);
        setTitle(conversation.title || title);
        setOptimisticMessages([]);
        setConversations((current) => {
          const withoutCurrent = current.filter((item) => item._id !== conversation._id);
          return [conversation, ...withoutCurrent];
        });
      })
      .catch((err) => {
        setOptimisticMessages([]);
        setQuestion(messageText);
        setError(err.message || 'Failed to ask AI');
      })
      .finally(() => setIsSending(false));
  };

  const handleQuestionKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendQuestion(event);
    }
  };

  const toggleMonitor = (id) => {
    setSelectedMonitorIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const removeConversation = (event, conversationId) => {
    event.stopPropagation();
    setError('');
    deleteChatConversation(conversationId)
      .then(() => {
        setConversations((current) => current.filter((item) => item._id !== conversationId));
        if (activeConversation?._id === conversationId) {
          setActiveConversation(null);
          setTitle('');
          setOptimisticMessages([]);
        }
      })
      .catch((err) => setError(err.message || 'Failed to delete conversation'));
  };

  return (
    <section className="grid h-[calc(100vh-150px)] min-h-[620px] min-w-0 gap-5 overflow-hidden xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
      <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-4">
        <div className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_#0F172A]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl border-[3px] border-black bg-[#BFE8FF]">
                <Bot size={21} strokeWidth={3} />
              </span>
              <div>
                <h2 className="font-black text-slate-950">Drishya AI Chat</h2>
                <p className="text-sm font-bold text-slate-500">
                  {selectedMonitorNames.length ? selectedMonitorNames.join(', ') : 'Ask across all your monitors'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={updateConversationName}
              disabled={!hasMessages || !activeConversation?._id || !title.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border-[3px] border-black bg-[#00E676] px-4 text-xs font-black text-black shadow-[3px_3px_0_#0F172A] hover:bg-[#FFD600] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={16} strokeWidth={3} />
              Update name
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border-[3px] border-black bg-red-50 p-3 text-sm font-black text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="min-h-0 rounded-2xl border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_#0F172A]">
          <div className="grid h-full content-start gap-4 overflow-y-auto pr-2">
            {displayedMessages.map((message) => (
              <div
                key={message._id || `${message.role}-${message.createdAt}`}
                className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role !== 'user' && (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[3px] border-black bg-[#BFE8FF] text-[#1E6BFF] shadow-[3px_3px_0_#0F172A]">
                    <Bot size={19} strokeWidth={3} />
                  </span>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl border-[3px] border-black p-3 ${
                  message.role === 'user'
                    ? 'ml-auto bg-[#1E6BFF] text-white shadow-[4px_4px_0_#0F172A]'
                    : 'bg-[#FDFBF7] text-slate-950 shadow-[4px_4px_0_#0F172A]'
                  }`}
                >
                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-75">
                  {message.role === 'user' ? 'Human' : 'Drishya AI'} | {formatTime(message.createdAt)}
                </div>
                {message.isThinking ? (
                  <div className="flex items-center gap-2 text-sm font-black text-slate-500">
                    <span>Thinking</span>
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1E6BFF]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1E6BFF] [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1E6BFF] [animation-delay:240ms]" />
                    </span>
                  </div>
                ) : (
                  <MessageContent content={message.content} />
                )}
                </div>
                {message.role === 'user' && (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[3px] border-black bg-[#FFD600] text-black shadow-[3px_3px_0_#0F172A]">
                    <UserRound size={19} strokeWidth={3} />
                  </span>
                )}
              </div>
            ))}
            {!displayedMessages.length && (
              <div className="grid min-h-full place-items-center rounded-xl border-[3px] border-dashed border-slate-300 bg-[#FDFBF7] p-6 text-center">
                <div>
                  <MessageSquareText className="mx-auto text-[#1E6BFF]" size={34} strokeWidth={3} />
                  <p className="mt-3 font-black text-slate-950">Your conversation will appear here.</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">Start a new question below or open a saved chat.</p>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <form onSubmit={sendQuestion} className="grid gap-3 rounded-2xl border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_#0F172A]">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            className="min-h-24 rounded-xl border-[3px] border-black bg-[#FDFBF7] px-3 py-2 text-sm font-bold outline-none focus:bg-white"
            placeholder="Why is my API failing and what should I check first?"
          />
          <button
            type="submit"
            disabled={isSending || !question.trim()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-[3px] border-black bg-[#1E6BFF] px-4 text-sm font-black text-white shadow-[3px_3px_0_#0F172A] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={17} strokeWidth={3} />
            {isSending ? 'Thinking...' : 'Ask AI'}
          </button>
        </form>
      </div>

      <aside className="grid min-h-0 gap-4 overflow-y-auto pr-1">
      <div className="grid max-h-[320px] gap-4 rounded-2xl border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_#0F172A]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-950">Saved chats</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">{isLoadingList ? 'Loading' : `${conversations.length} conversations`}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveConversation(null);
              setQuestion('');
              setOptimisticMessages([]);
              setTitle('');
            }}
            className="grid h-10 w-10 place-items-center rounded-xl border-[3px] border-black bg-[#FFD600] shadow-[3px_3px_0_#0F172A]"
            aria-label="New chat"
          >
            <Plus size={18} strokeWidth={3} />
          </button>
        </div>

        <label className="flex h-11 items-center gap-2 rounded-xl border-[3px] border-black bg-[#FDFBF7] px-3">
          <Search size={16} strokeWidth={3} className="text-slate-500" />
          <input
            value={conversationSearch}
            onChange={(event) => setConversationSearch(event.target.value)}
            placeholder="Search chats"
            className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
          />
          {conversationSearch && (
            <button type="button" onClick={() => setConversationSearch('')} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white" aria-label="Clear chat search">
              <X size={15} strokeWidth={3} />
            </button>
          )}
        </label>

        <div className="grid max-h-[190px] gap-2 overflow-y-auto pr-1">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation._id}
              className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border-[3px] border-black p-3 text-left shadow-[3px_3px_0_#0F172A] ${
                activeConversation?._id === conversation._id ? 'bg-[#00E676]' : 'bg-[#FDFBF7] hover:bg-[#FFD600]'
              }`}
            >
              <button type="button" onClick={() => openConversation(conversation._id)} className="min-w-0 text-left">
                <span className="block truncate text-sm font-black text-slate-950">{conversation.title}</span>
                <span className="mt-1 block text-[10px] font-bold uppercase text-slate-500">{formatTime(conversation.lastMessageAt || conversation.updatedAt)}</span>
              </button>
              <button
                type="button"
                onClick={(event) => removeConversation(event, conversation._id)}
                className="grid h-8 w-8 place-items-center rounded-lg border-2 border-black bg-white text-red-600 opacity-100 hover:bg-red-50"
                aria-label={`Delete ${conversation.title}`}
              >
                <Trash2 size={15} strokeWidth={3} />
              </button>
            </div>
          ))}
          {!filteredConversations.length && !isLoadingList && (
            <div className="rounded-xl border-[3px] border-dashed border-slate-300 bg-[#FDFBF7] p-4 text-sm font-black text-slate-500">
              {conversationSearch ? 'No chats match this search.' : 'No saved conversations yet.'}
            </div>
          )}
        </div>
      </div>
      <div className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_#0F172A]">
        <div className="rounded-xl border-[3px] border-dashed border-slate-300 bg-[#FDFBF7] p-4 text-center">
          <Bot className="mx-auto text-[#1E6BFF]" size={30} strokeWidth={3} />
          <p className="mt-3 text-sm font-black leading-6 text-slate-950">
            Ask why a monitor is failing, what changed, or how to fix it.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_#0F172A]">
          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Conversation name</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 rounded-xl border-[3px] border-black bg-[#FDFBF7] px-3 text-sm font-bold outline-none focus:bg-white"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border-[3px] border-black bg-[#FDFBF7] px-3 py-3">
              <span className="text-sm font-black text-slate-700">Save memory to Pinecone</span>
              <input
                type="checkbox"
                checked={saveToMemory}
                onChange={(event) => setSaveToMemory(event.target.checked)}
                className="h-5 w-5 accent-[#1E6BFF]"
              />
            </label>
          </div>
      </div>
          <div className="grid gap-3 rounded-2xl border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_#0F172A]">
            <div className="flex items-center gap-2">
              <Server size={18} strokeWidth={3} className="text-[#1E6BFF]" />
              <h3 className="text-sm font-black uppercase">Monitor context</h3>
            </div>
            <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1">
              {monitors.map((monitor) => (
                <label key={monitor.id} className="flex items-start gap-2 rounded-xl border-2 border-black bg-[#FDFBF7] p-2">
                  <input
                    type="checkbox"
                    checked={selectedMonitorIds.includes(monitor.id)}
                    onChange={() => toggleMonitor(monitor.id)}
                    className="mt-1 h-4 w-4 accent-[#1E6BFF]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-950">{monitor.name}</span>
                    <span className="block truncate text-[10px] font-bold uppercase text-slate-500">{monitor.lastStatus || 'PENDING'} | {monitor.method}</span>
                  </span>
                </label>
              ))}
              {!monitors.length && (
                <p className="rounded-xl border-2 border-dashed border-slate-300 bg-[#FDFBF7] p-3 text-sm font-black text-slate-500">Create a monitor first for richer AI context.</p>
              )}
            </div>
          </div>
      </aside>
    </section>
  );
};

export default AIChatSection;
