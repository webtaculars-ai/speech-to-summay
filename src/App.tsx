import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Clipboard, Trash2, FileText } from 'lucide-react';
import axios from 'axios';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setError("Your browser doesn't support speech recognition. Please try using Chrome or Edge.");
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setError(null);
      } catch (err) {
        setError("Couldn't start speech recognition. Please try again.");
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcript);
  };

  const clearTranscript = () => {
    setTranscript('');
    setSummary('');
  };

  const summarizeTranscript = async () => {
    if (!transcript) {
      setError("There's no text to summarize. Please transcribe some speech first.");
      return;
    }

    setIsSummarizing(true);
    setError(null);

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/engines/text-davinci-002/completions',
        {
          prompt: `Please summarize the following text:\n\n${transcript}\n\nSummary:`,
          max_tokens: 100,
          n: 1,
          stop: null,
          temperature: 0.5,
        },
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setSummary(response.data.choices[0].text.trim());
    } catch (error) {
      setError('Failed to generate summary. Please try again.');
      console.error('Error summarizing transcript:', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6">Speech-to-Text App</h1>
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={toggleListening}
            className={`flex items-center px-4 py-2 rounded-full ${
              isListening ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
            }`}
          >
            {isListening ? <MicOff className="mr-2" /> : <Mic className="mr-2" />}
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
          <div>
            <button
              onClick={copyToClipboard}
              className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-full mr-2"
            >
              <Clipboard className="mr-2" />
              Copy Text
            </button>
            <button
              onClick={clearTranscript}
              className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-full"
            >
              <Trash2 className="mr-2" />
              Clear
            </button>
          </div>
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="bg-gray-100 p-4 rounded-lg min-h-[200px] max-h-[400px] overflow-y-auto mb-4">
          <p className="whitespace-pre-wrap">{transcript}</p>
        </div>
        <div className="flex justify-between items-center">
          <button
            onClick={summarizeTranscript}
            disabled={isSummarizing}
            className={`flex items-center px-4 py-2 rounded-full ${
              isSummarizing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 text-white'
            }`}
          >
            <FileText className="mr-2" />
            {isSummarizing ? 'Summarizing...' : 'Summarize'}
          </button>
        </div>
        {summary && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-2">Summary:</h2>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p>{summary}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;