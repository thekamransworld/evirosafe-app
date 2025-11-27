
import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { generateSafetyReport } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

export const AiInsights: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('Generate a risk assessment plan for a high-rise construction project in a dense urban area. Include sections for fall protection, material handling, and public safety.');
  const [report, setReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (!prompt.trim()) {
      setError('Prompt cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setReport('');
    try {
      const result = await generateSafetyReport(prompt);
      setReport(result);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-6">AI Safety Insights</h1>
      <p className="text-text-secondary mb-6 max-w-3xl">
        Leverage generative AI to create risk assessments, generate safety meeting topics, or summarize incident reports. 
        Describe what you need, and our AI assistant will generate a professional document for you.
      </p>

      <Card>
        <div className="space-y-4">
          <div>
            <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-700 mb-1">
              Your Request
            </label>
            <textarea
              id="ai-prompt"
              rows={5}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Summarize the top 3 safety concerns from last month's incident reports..."
            />
          </div>
          <div>
            <Button onClick={handleGenerateReport} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
      
      {(isLoading || report || error) && (
        <Card className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Generated Report</h2>
          {isLoading && (
            <div className="flex items-center space-x-2 text-text-secondary">
              <Spinner />
              <span>The AI is analyzing your request. This may take a moment...</span>
            </div>
          )}
          {error && <div className="text-red-600 bg-red-50 p-4 rounded-md">{error}</div>}
          {report && (
            <div className="prose prose-blue max-w-none">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624l-.259 1.035L16.38 20.624a3.375 3.375 0 00-2.455-2.455l-1.036-.259.259-1.035a3.375 3.375 0 002.456-2.456l.259-1.035.259 1.035a3.375 3.375 0 002.456 2.456l1.035.259-.259 1.035a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
);