import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { generateResponse, generateAiRiskForecast } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { Sparkles } from 'lucide-react';

export const AiInsights: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [forecast, setForecast] = useState<any>(null);

  const handleAskAi = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResponse('');
    try {
      const result = await generateResponse(prompt);
      setResponse(result);
    } catch (e) {
      setResponse("Error generating response. Please check your API Key.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetForecast = async () => {
      const data = await generateAiRiskForecast();
      setForecast(data);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-text-primary dark:text-white mb-6">AI Safety Insights</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="md:col-span-2">
            <Card title="Ask EviroSafe AI">
                <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ask about safety regulations, risk assessments, or analyze a specific scenario.
                </p>
                <textarea
                    rows={4}
                    className="w-full p-3 border rounded-lg dark:bg-dark-background dark:border-dark-border dark:text-white focus:ring-2 focus:ring-primary-500"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., What are the key risks for working in a confined space with welding?"
                />
                <div className="flex justify-end">
                    <Button onClick={handleAskAi} disabled={isLoading} leftIcon={<Sparkles className="w-4 h-4"/>}>
                        {isLoading ? 'Thinking...' : 'Ask AI'}
                    </Button>
                </div>
                
                {response && (
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-white/5 rounded-lg border dark:border-dark-border">
                        <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">AI Response:</h3>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{response}</ReactMarkdown>
                        </div>
                    </div>
                )}
                </div>
            </Card>
          </div>

          {/* Predictive Insights */}
          <div>
              <Card title="Predictive Risk Forecast">
                  <div className="text-center py-6">
                      {!forecast ? (
                          <Button variant="secondary" onClick={handleGetForecast}>Generate Forecast</Button>
                      ) : (
                          <div className="space-y-4">
                              <div className={`text-4xl font-black ${forecast.risk_level === 'High' ? 'text-red-500' : 'text-yellow-500'}`}>
                                  {forecast.risk_level}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{forecast.summary}</p>
                              <div className="text-left bg-gray-50 dark:bg-white/5 p-3 rounded text-xs">
                                  <p className="font-bold mb-1">Recommendations:</p>
                                  <ul className="list-disc list-inside space-y-1">
                                      {forecast.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                                  </ul>
                              </div>
                          </div>
                      )}
                  </div>
              </Card>
          </div>
      </div>
    </div>
  );
};