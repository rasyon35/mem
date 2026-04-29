import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  ChatSurface, 
  ChatSurfaceState, 
  ChatMode, 
  ChatContextPayload, 
  ChatMsg, 
  ChatAnswerMeta 
} from './types';

export function useWikiChat(API: string, trackMetricEvent: any) {
  const defaultSurfaceState = (): ChatSurfaceState => ({
    question: '',
    chatLog: [],
    chatLoading: false,
    chatMode: 'global',
    chatContext: {},
    lastChatRequest: null,
  });

  const [chatState, setChatState] = useState<Record<ChatSurface, ChatSurfaceState>>({
    main: defaultSurfaceState(),
    wiki: defaultSurfaceState(),
    graph: defaultSurfaceState(),
    synthesis: defaultSurfaceState(),
  });

  const mainChatEndRef = useRef<HTMLDivElement>(null);
  const wikiChatEndRef = useRef<HTMLDivElement>(null);
  const graphChatEndRef = useRef<HTMLDivElement>(null);
  const synthesisChatEndRef = useRef<HTMLDivElement>(null);

  const getChatEndRef = (surface: ChatSurface) => {
    if (surface === 'wiki') return wikiChatEndRef;
    if (surface === 'graph') return graphChatEndRef;
    if (surface === 'synthesis') return synthesisChatEndRef;
    return mainChatEndRef;
  };

  const getSurfaceState = (surface: ChatSurface) => chatState[surface];

  const setQuestionForSurface = useCallback((surface: ChatSurface, q: string) => {
    setChatState(prev => ({ ...prev, [surface]: { ...prev[surface], question: q } }));
  }, []);

  useEffect(() => {
    mainChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.main.chatLog]);
  useEffect(() => {
    wikiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.wiki.chatLog]);
  useEffect(() => {
    graphChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.graph.chatLog]);
  useEffect(() => {
    synthesisChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.synthesis.chatLog]);

  const setContext = useCallback((surface: ChatSurface, mode: ChatMode, context: ChatContextPayload = {}) => {
    setChatState(prev => ({
      ...prev,
      [surface]: {
        ...prev[surface],
        chatMode: mode,
        chatContext: context,
      },
    }));
  }, []);

  const ask = useCallback(async (
    surface: ChatSurface,
    questionText: string,
    options: { mode?: ChatMode; context?: ChatContextPayload } = {},
  ) => {
    if (!questionText.trim()) return;
    const q = questionText.trim();
    const surfaceState = chatState[surface];
    const mode = options.mode || surfaceState.chatMode;
    const contextPayload = options.context || surfaceState.chatContext;

    setChatState(prev => ({
      ...prev,
      [surface]: {
        ...prev[surface],
        question: '',
        chatLoading: true,
        lastChatRequest: { question: q, mode, context: contextPayload },
        chatLog: [...prev[surface].chatLog, { role: 'user', text: q }],
      },
    }));

    await trackMetricEvent('chat_message_sent', {
      surface,
      mode,
      has_context: Boolean(contextPayload.pageTitle || contextPayload.nodeId),
    });

    try {
      const payload: any = { question: q, surface };
      const pageContext = contextPayload.pageTitle || contextPayload.nodeId;
      if (pageContext) payload.page_context = pageContext;
      
      const res = await axios.post(`${API}/chat`, payload);
      const aiMeta: ChatAnswerMeta = {
        citations: res.data.citations || [],
        confidence: res.data.confidence || 'medium',
        reasoning_summary: res.data.reasoning_summary || '',
      };
      setChatState(prev => ({
        ...prev,
        [surface]: {
          ...prev[surface],
          chatLog: [...prev[surface].chatLog, { role: 'ai', text: res.data.answer, meta: aiMeta }],
        },
      }));

      await trackMetricEvent('chat_answer_received', {
        surface,
        mode,
        confidence: res.data.confidence || 'medium',
        citations_count: Array.isArray(res.data.citations) ? res.data.citations.length : 0,
      });

      await trackMetricEvent('frontend_chat_completed', {
        surface,
        with_page_context: Boolean(pageContext),
        has_error: false,
      });
    } catch {
      setChatState(prev => ({
        ...prev,
        [surface]: {
          ...prev[surface],
          chatLog: [
            ...prev[surface].chatLog,
            { role: 'ai', text: '⚠️ Could not reach backend.', meta: { citations: [], confidence: 'low', reasoning_summary: 'Request failed.' } },
          ],
        },
      }));

      await trackMetricEvent('frontend_chat_completed', {
        surface,
        with_page_context: Boolean(contextPayload.pageTitle || contextPayload.nodeId),
        has_error: true,
      });
    } finally {
      setChatState(prev => ({
        ...prev,
        [surface]: { ...prev[surface], chatLoading: false },
      }));
    }
  }, [API, chatState, trackMetricEvent]);

  const retry = useCallback(async (surface: ChatSurface) => {
    const surfaceState = chatState[surface];
    if (!surfaceState.lastChatRequest) return;
    await trackMetricEvent('chat_retry', { surface, mode: surfaceState.lastChatRequest.mode });
    await ask(surface, surfaceState.lastChatRequest.question, {
      mode: surfaceState.lastChatRequest.mode,
      context: surfaceState.lastChatRequest.context,
    });
  }, [ask, chatState, trackMetricEvent]);

  const clearConversation = useCallback((surface: ChatSurface) => {
    setChatState(prev => ({
      ...prev,
      [surface]: {
        ...prev[surface],
        chatLog: [],
        lastChatRequest: null,
      },
    }));
  }, []);

  const handleChat = useCallback(async (pageContext?: string) => {
    const ctx: ChatContextPayload =
      pageContext ? { pageTitle: pageContext, nodeId: pageContext } : chatState.main.chatContext;
    const mode: ChatMode = pageContext ? 'wiki_page' : chatState.main.chatMode;
    await ask('main', chatState.main.question, { mode, context: ctx });
  }, [ask, chatState.main.chatContext, chatState.main.question]);

  const getChatState = (surface: ChatSurface) => ({
    question: chatState[surface].question,
    chatLog: chatState[surface].chatLog,
    chatLoading: chatState[surface].chatLoading,
    chatMode: chatState[surface].chatMode,
    chatContext: chatState[surface].chatContext,
    chatEndRef: getChatEndRef(surface),
  });

  return {
    chatState,
    setChatState,
    mainChatEndRef,
    wikiChatEndRef,
    graphChatEndRef,
    synthesisChatEndRef,
    setContext,
    ask,
    retry,
    clearConversation,
    handleChat,
    getChatState,
    setQuestionForSurface,
  };
}
