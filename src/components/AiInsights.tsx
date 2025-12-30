---

### **Step 2: Update `src/components/AiInsights.tsx`**
This is the **new UI code**. It replaces the static form with a **Chat Interface** on the left and **Live Predictions** on the right.

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { generateResponse, getPredictiveInsights } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { 
    Send, Bot, User, Sparkles, AlertTriangle, 
    Wind, Thermometer, Activity, Zap, BrainCircuit 
} from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: Date;
}

interface Insight {
    id: number;
    title: string;
    probability: string;
    impact: string;
    action: string;
}

export const AiInsights: React.FC = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'ai',
            content: 'Hello! I am **NeuroCommand**, your HSE Intelligence Assistant.\n\nI can help you:\n- Analyze incident root causes\n- Draft Risk Assessments (RAMS)\n- Create Toolbox Talks\n\n*What safety challenge are we solving today?*',
            timestamp: new Date()
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [insights, setInsights] = useState<Insight[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load predictive insights
        getPredictiveInsights().then(setInsights);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await generateResponse(userMsg.content);
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error(error);
        } finally {
            setIsTyping(false);
        }
    };

    const handleQuickPrompt = (text: string) => {
        setInput(text);
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6 p-2">
            
            {/* LEFT: Chat Interface */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800">
                {/* Chat Header */}
                <div className="p-4 border-b dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                            <BrainCircuit className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white text-lg">NeuroCommand AI</h2>
                            <p className="text-xs text-emerald-500 flex items-center gap-1 font-mono">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                SYSTEM ONLINE
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setMessages([])}>Clear History</Button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 dark:bg-slate-950/50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                : 'bg-white dark:bg-slate-900 border dark:border-slate-800 text-gray-800 dark:text-gray-200 rounded-bl-none'
                            }`}>
                                {msg.role === 'ai' ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="text-sm">{msg.content}</p>
                                )}
                                <p className={`text-[10px] mt-2 opacity-70 text-right`}>
                                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-2 items-center">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
                    {messages.length === 1 && (
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                            <button onClick={() => handleQuickPrompt("Analyze this incident: Forklift collision due to wet floor")} className="whitespace-nowrap px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/20 hover:border-indigo-500/50 rounded-full text-xs text-slate-600 dark:text-slate-300 border dark:border-slate-700 transition-all">
                                🚨 Analyze Incident
                            </button>
                            <button onClick={() => handleQuickPrompt("Draft a Risk Assessment for Working at Height")} className="whitespace-nowrap px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/20 hover:border-indigo-500/50 rounded-full text-xs text-slate-600 dark:text-slate-300 border dark:border-slate-700 transition-all">
                                🛡️ Create RAMS
                            </button>
                            <button onClick={() => handleQuickPrompt("Write a TBT about Heat Stress")} className="whitespace-nowrap px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/20 hover:border-indigo-500/50 rounded-full text-xs text-slate-600 dark:text-slate-300 border dark:border-slate-700 transition-all">
                                🗣️ Draft TBT
                            </button>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask NeuroCommand..."
                            className="flex-1 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder-slate-400"
                        />
                        <Button onClick={handleSend} disabled={!input.trim() || isTyping} className="rounded-xl px-5 bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* RIGHT: Predictive Insights Panel */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
                {/* Hero Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <Sparkles className="absolute top-4 right-4 w-12 h-12 text-white/20 animate-pulse" />
                    <h3 className="font-bold text-lg mb-1">Predictive Risk</h3>
                    <p className="text-indigo-100 text-xs mb-4 uppercase tracking-wider">24h Forecast</p>
                    <div className="flex items-end gap-2">
                        <span className="text-5xl font-black">Medium</span>
                    </div>
                    <div className="mt-4 h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 w-[60%]"></div>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                    <h3 className="font-bold text-gray-700 dark:text-gray-300">Live Insights</h3>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded border border-emerald-500/20">Real-time</span>
                </div>
                
                <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                    {insights.map((insight) => (
                        <Card key={insight.id} className="p-4 border-l-4 border-l-amber-500 hover:shadow-md transition-all bg-white dark:bg-slate-900 border-y dark:border-y-slate-800 border-r dark:border-r-slate-800">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">{insight.title}</h4>
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded">
                                    {insight.probability} Prob.
                                </span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Activity className="w-3 h-3 text-indigo-400" />
                                    <span>Impact: <span className="text-gray-900 dark:text-gray-200 font-medium">{insight.impact}</span></span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Zap className="w-3 h-3 text-yellow-400" />
                                    <span>Action: <span className="text-gray-900 dark:text-gray-200 font-medium">{insight.action}</span></span>
                                </div>
                            </div>
                        </Card>
                    ))}

                    {/* Weather Card */}
                    <Card className="p-4 border-l-4 border-l-blue-500 bg-white dark:bg-slate-900 border-y dark:border-y-slate-800 border-r dark:border-r-slate-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <Wind className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">Wind Gusts</h4>
                                <p className="text-[10px] text-gray-500 uppercase">Weather Alert</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                            Wind speeds expected to exceed <strong>35km/h</strong> at 14:00. Secure crane operations immediately.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
};