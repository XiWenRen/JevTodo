import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, ArrowUp, Sparkles, X, Clock, ListPlus } from 'lucide-react';
import { splitTasksWithJev, evaluateWithJev, JevDecision } from '../utils/jev';
import { TaskCategory } from '../types';

interface FloatingInputBarProps {
  onAddTask: (text: string, precomputedDecision?: JevDecision) => Promise<void>;
  onOpenBatchModal?: (initialText?: string) => void;
  isProcessing?: boolean;
  apiKey?: string;
  endpoint?: string;
}

export const FloatingInputBar: React.FC<FloatingInputBarProps> = ({
  onAddTask,
  onOpenBatchModal,
  isProcessing = false,
  apiKey,
  endpoint
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>('');

  // Jev real-time preview state with 1s debounce
  const [preview, setPreview] = useState<{
    category: TaskCategory;
    dueDate?: string;
    tags: string[];
    decision: JevDecision;
  } | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const inputTextRef = useRef<string>('');
  const lastPredictedTextRef = useRef<string>('');

  inputTextRef.current = inputText;

  // Check if multiple tasks are detected in the input
  const splitCandidates = React.useMemo(() => {
    if (!inputText.trim()) return [];
    return splitTasksWithJev(inputText);
  }, [inputText]);

  const isMultiTask = splitCandidates.length > 1;

  // 1s debounce after typing stops -> directly call Jev for prediction
  useEffect(() => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setPreview(null);
      setIsPredicting(false);
      lastPredictedTextRef.current = '';
      return;
    }

    if (lastPredictedTextRef.current === trimmed && preview) {
      return;
    }

    // Reset previous preview while editing to avoid inconsistency
    setPreview(null);
    setIsPredicting(false);

    if (splitTasksWithJev(trimmed).length > 1) {
      return;
    }

    const timer = setTimeout(async () => {
      if (inputTextRef.current.trim() !== trimmed) return;

      setIsPredicting(true);
      try {
        const decision = await evaluateWithJev(trimmed, {
          apiKey,
          endpoint
        });
        if (inputTextRef.current.trim() === trimmed) {
          setPreview({
            category: decision.category,
            dueDate: decision.dueDate,
            tags: decision.tags,
            decision
          });
          lastPredictedTextRef.current = trimmed;
        }
      } catch (err) {
        console.warn('Jev preview prediction error:', err);
      } finally {
        if (inputTextRef.current.trim() === trimmed) {
          setIsPredicting(false);
        }
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [inputText, apiKey, endpoint]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Setup Web Speech API for voice-to-text without repetitive duplication
  const toggleListening = () => {
    setSpeechError(null);
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('当前浏览器不支持语音识别，请在 Chrome / Edge 中尝试或直接打字输入。');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }

      baseTextRef.current = inputText;

      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        if (!isOpen) setIsOpen(true);
      };

      // Correctly compute speech text from total session results to prevent duplication
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item && item[0]) {
            if (item.isFinal) {
              finalTranscript += item[0].transcript;
            } else {
              interimTranscript += item[0].transcript;
            }
          }
        }

        const spoken = `${finalTranscript}${interimTranscript}`.trim();
        const base = baseTextRef.current.trim();
        const combined = base ? `${base} ${spoken}` : spoken;
        setInputText(combined);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('麦克风权限未开启，请在浏览器地址栏允许麦克风权限。');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`语音识别提示: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setSpeechError(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Failed to start speech recognition:', err);
      setSpeechError('无法启动语音识别服务');
      setIsListening(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      setIsListening(false);
    }

    const textToSubmit = inputText.trim();
    const matchedDecision = (lastPredictedTextRef.current === textToSubmit && preview?.decision)
      ? preview.decision
      : undefined;

    setInputText('');
    baseTextRef.current = '';
    setPreview(null);
    lastPredictedTextRef.current = '';
    setIsPredicting(false);

    // If text contains multiple tasks, open batch split modal if available
    if (splitTasksWithJev(textToSubmit).length > 1 && onOpenBatchModal) {
      onOpenBatchModal(textToSubmit);
      return;
    }

    await onAddTask(textToSubmit, matchedDecision);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div className="fixed bottom-4 inset-x-0 mx-auto max-w-[460px] px-3 sm:px-4 z-40">
      {/* Speech error toast */}
      <AnimatePresence>
        {speechError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="mb-2 text-xs bg-rose-950/85 text-rose-200 border border-rose-500/30 px-3 py-1.5 rounded-lg text-center backdrop-blur-md shadow-lg"
          >
            {speechError}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="acrylic-panel rounded-2xl p-2 sm:p-2.5 shadow-2xl transition-all duration-300">
        {/* Live Jev parsing indicator bar */}
        <AnimatePresence>
          {(isMultiTask || preview || isPredicting) && (isOpen || !!inputText.trim()) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-2 px-1 text-[11px] flex items-center justify-between text-[var(--text-sub)] border-b border-[var(--border-subtle)] pb-1.5"
            >
              {isMultiTask ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 text-amber-500 font-medium">
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                    <span>Cherry 识别到包含 {splitCandidates.length} 项待办</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenBatchModal?.(inputText);
                      setInputText('');
                    }}
                    className="text-[10px] text-amber-500 hover:text-amber-400 font-semibold underline underline-offset-2 flex items-center gap-0.5"
                  >
                    <span>智能拆分预览</span>
                    <ListPlus className="w-3 h-3" />
                  </button>
                </div>
              ) : isPredicting ? (
                <div className="flex items-center gap-1.5 text-[var(--text-sub)]">
                  <Sparkles className="w-3 h-3 text-[var(--cherry-red)] animate-spin" />
                  <span className="text-[10px]">Cherry (Jev) 预测中...</span>
                </div>
              ) : preview ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-[var(--text-main)] font-medium">
                    <Sparkles className="w-3 h-3 text-[var(--cherry-red)]" />
                    Cherry 预测:
                  </span>
                  <span className="bg-[var(--chip-bg)] border border-[var(--chip-border)] text-[var(--text-main)] px-1.5 py-0.5 rounded text-[10px]">
                    {preview.category}
                  </span>
                  {preview.dueDate && (
                    <span className="inline-flex items-center gap-0.5 text-[var(--text-sub)] bg-[var(--chip-bg)] border border-[var(--chip-border)] px-1.5 py-0.5 rounded text-[10px]">
                      <Clock className="w-2.5 h-2.5" />
                      {preview.dueDate}
                    </span>
                  )}
                  {preview.tags.map(t => (
                    <span key={t} className="text-[var(--tag-text)] text-[10px]">
                      #{t}
                    </span>
                  ))}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar Form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5 sm:gap-2">

          {/* Batch split modal trigger button */}
          {onOpenBatchModal && (
            <button
              type="button"
              onClick={() => {
                onOpenBatchModal(inputText);
                setInputText('');
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--chip-hover)] border border-[var(--chip-border)] transition-all"
              title="批量录入一大堆内容，Cherry 自动拆分"
            >
              <ListPlus className="w-4 h-4 stroke-[2.2]" />
            </button>
          )}

          {/* Natural Language Input Field */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? '正在倾听您的语音...' : '自然语言添加，如：下午3点开会 #工作'}
              disabled={isProcessing}
              className={`w-full bg-transparent text-sm text-[var(--text-main)] placeholder:text-[var(--text-faint)] outline-none pr-7 py-1.5 transition-colors ${
                isListening ? 'animate-pulse font-medium' : ''
              }`}
            />
            {inputText && (
              <button
                type="button"
                onClick={() => {
                  setInputText('');
                  baseTextRef.current = '';
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-main)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Voice Speech-to-Text Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
              isListening
                ? 'bg-rose-600 text-white shadow-md animate-pulse'
                : 'bg-[var(--chip-bg)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--chip-hover)] border border-[var(--chip-border)]'
            }`}
            title={isListening ? '点击停止语音输入' : '语音转文字输入'}
          >
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          {/* Submit / Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-medium transition-all ${
              inputText.trim() && !isProcessing
                ? 'bg-[var(--accent-bg)] text-[var(--accent-fg)] hover:opacity-90 active:scale-95 shadow-sm'
                : 'bg-[var(--chip-bg)] text-[var(--text-faint)] opacity-40 cursor-not-allowed border border-[var(--chip-border)]'
            }`}
            title="通过 Cherry 智能分类并添加 (Enter)"
          >
            {isProcessing ? (
              <Sparkles className="w-4 h-4 animate-spin text-[var(--accent-fg)]" />
            ) : (
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
