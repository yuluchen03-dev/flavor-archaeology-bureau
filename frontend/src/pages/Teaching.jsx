import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../lib/language.jsx';
import Eyebrow from '../components/Eyebrow.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

const mentorIdentity = {
  name: '林氏风味传承人',
  role: '宋代风味传承人',
  opening: '我会先讲出处，再讲食材，最后把古法转成今天能做的步骤。评委可以直接追问证据、火候和替代食材。',
};

const Teaching = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const routeDishId = location.state?.dishId || 'dish_001';
  const routeDishName = location.state?.dishName || '蟹酿橙';
  const [dishId] = useState(routeDishId);
  const [dishName, setDishName] = useState(location.state?.dishName || '蟹酿橙');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      content: `您好，我是${mentorIdentity.name}，也是风味考古局的${mentorIdentity.role}。今天我们来学习「${routeDishName}」。${mentorIdentity.opening}`,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuestion = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/teach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishId: dishId, message: currentQuestion })
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage = {
          id: messages.length + 2,
          sender: 'ai',
          content: data.data.response,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          tips: data.data.tips,
          historicalFact: data.data.historicalFact
        };
        setMessages(prev => [...prev, aiMessage]);
        if (data.data.dishName) {
          setDishName(data.data.dishName);
        }
      } else {
        setMessages(prev => [...prev, {
          id: messages.length + 2,
          sender: 'ai',
          content: '抱歉，我暂时无法回答这个问题。请尝试换个方式提问。',
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: messages.length + 2,
        sender: 'ai',
        content: '抱歉，无法连接到服务器。请确认后端服务已启动。',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question) => {
    setInputMessage(question);
  };

  // U4: 新消息自动滚到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="mentor-studio w-full overflow-x-hidden px-5 py-14 md:px-6 md:py-16">
      <div className="mx-auto w-full max-w-[1120px]">
        {/* 标题 */}
        <section className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <Eyebrow>{t('数字传承｜工作室', 'TEACHING | Mentor Studio')}</Eyebrow>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-ink md:text-6xl">与大师对话</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-gray">复活的菜召出那个朝代的大师，对话式传授技艺。</p>
          </div>
          <div className="archive-surface p-5">
            <p className="text-xs tracking-[0.3em] text-tea-gold">当前学习</p>
            <p className="mt-2 text-3xl font-bold text-cinnabar">{dishName}</p>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* 左侧：传承人介绍 + 快捷问题 */}
          <div className="space-y-6">
            {/* 传承人卡片 */}
            <div className="mentor-profile p-6 text-center text-paper">
              <div className="seal-badge w-20 h-20 mx-auto mb-4 flex items-center justify-center shadow-lg">
                <span className="text-paper font-bold text-2xl">味</span>
              </div>
              <h3 className="text-lg font-semibold mb-1">数字传承人 · {mentorIdentity.name}</h3>
              <p className="text-paper/60 text-xs tracking-widest mb-4">{mentorIdentity.role}</p>
              <div className="h-px bg-paper/20 my-4"></div>
              <p className="text-paper/70 text-sm leading-relaxed">
                {mentorIdentity.opening}
              </p>
            </div>

            {/* 当前学习 */}
            <div className="archive-surface p-5">
              <p className="text-smoke text-xs tracking-widest mb-2">当前学习</p>
              <p className="text-cinnabar font-semibold text-lg">{dishName}</p>
            </div>

            {/* 快捷问题 */}
            <div className="evidence-panel p-5">
              <p className="text-ink text-sm font-semibold mb-3">评委可问</p>
              <div className="space-y-2">
                {[
                  `这道${dishName}的证据链可靠吗？`,
                  `${dishName}的历史是什么？`,
                  `怎么制作${dishName}？`,
                  `${dishName}需要哪些食材？`,
                  `${dishName}有什么文化意义？`,
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickQuestion(q)}
                    className="block w-full text-left text-ink-gray hover:text-cinnabar hover:bg-cinnabar/5 px-3 py-2 transition-colors text-sm border-l-2 border-transparent hover:border-cinnabar"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：对话区 */}
          <div>
            <div className="archive-surface flex h-[600px] flex-col overflow-hidden">
              {/* 对话头部 */}
              <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-celadon rounded-full animate-pulse"></span>
                  <span className="text-ink font-medium">小味在线</span>
                </div>
                <span className="text-smoke text-xs tracking-widest">{t('对话', 'DIALOGUE')}</span>
              </div>

              {/* 对话内容 */}
              <div className="dialogue-scroll flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div key={message.id}>
                    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-5 py-3 ${
                        message.sender === 'user'
                          ? 'bg-ink text-paper'
                          : 'bg-paper border-l-4 border-cinnabar text-ink shadow-sm'
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <p className={`text-xs mt-2 ${message.sender === 'user' ? 'text-paper/50' : 'text-smoke'}`}>
                          {message.timestamp}
                        </p>
                      </div>
                    </div>
                    
                    {message.sender === 'ai' && message.tips && message.tips.length > 0 && (
                      <div className="mt-2 ml-4 max-w-[80%]">
                        <div className="evidence-panel p-3 text-sm">
                          <p className="font-semibold text-tea-gold mb-2 text-xs tracking-widest">◆ 小贴士</p>
                          <ul className="text-ink-gray space-y-1">
                            {message.tips.map((tip, i) => (
                              <li key={i} className="text-sm">· {tip}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-paper border-l-4 border-tea-gold px-5 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-tea-gold rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-tea-gold rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-tea-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-smoke text-sm">小味正在思考...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 输入区 */}
              <div className="border-t border-ink/10 p-4">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="输入您的问题..."
                    className="flex-1 px-4 py-3 bg-paper border border-ink/20 text-ink focus:border-cinnabar outline-none transition-colors"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="museum-button px-8 tracking-wider disabled:opacity-50"
                  >
                    发送
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teaching;
