import React, { useState, useEffect, useRef } from 'react';

// Simple ANSI color code to CSS class converter
const AnsiToClass = (text: string): React.ReactNode => {
  const colorMap: { [key: string]: string } = {
    '30': 'text-black',
    '31': 'text-red-500',
    '32': 'text-green-500',
    '33': 'text-yellow-500',
    '34': 'text-blue-500',
    '35': 'text-purple-500',
    '36': 'text-cyan-500',
    '37': 'text-white',
    '90': 'text-gray-400',
  };

  const regex = /\u001b\[(\d+)m(.*?)\u001b\[0m/g;
  const parts = text.split(regex);
  
  if (parts.length <= 1) {
    return text;
  }

  const elements: React.ReactNode[] = [];
  let i = 0;
  while(i < parts.length) {
    // Add plain text part
    if (parts[i]) {
      elements.push(<span key={`text-${i}`}>{parts[i]}</span>);
    }
    
    // Add colored text part if it exists
    const colorCode = parts[i+1];
    const content = parts[i+2];
    if (colorCode && content) {
      const className = colorMap[colorCode] || '';
      elements.push(<span key={`ansi-${i}`} className={className}>{content}</span>);
    }
    
    i += 3;
  }

  return <>{elements}</>;
};

const SandboxLogs: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'Connecting' | 'Connected' | 'Disconnected'>('Connecting');
  const logContainerRef = useRef<HTMLDivElement>(null);
  const isScrolledToBottom = useRef(true);

  useEffect(() => {
    // The WebSocket URL should correspond to the backend service that streams Docker logs.
    const wsUrl = process.env.REACT_APP_LOGS_WEBSOCKET_URL || 'ws://localhost:8088/ws/logs';
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      setStatus('Connecting');

      ws.onopen = () => {
        console.log('Log stream connected');
        setStatus('Connected');
        setLogs(prev => [...prev, `--- [${new Date().toLocaleTimeString()}] Connection established ---`]);
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
      };

      ws.onmessage = (event) => {
        const newLog = event.data;
        // Batch updates to avoid excessive re-renders
        setLogs(prevLogs => [...prevLogs, newLog].slice(-1000)); // Keep last 1000 lines
      };

      ws.onclose = () => {
        console.log('Log stream disconnected');
        setStatus('Disconnected');
        setLogs(prev => [...prev, `--- [${new Date().toLocaleTimeString()}] Connection lost. Reconnecting... ---`]);
        // Simple exponential backoff could be added here
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close(); // This will trigger the onclose handler for reconnection
      };
    }

    connect();

    // Cleanup function to close the WebSocket and clear timeout
    return () => {
      if (ws) {
        ws.onclose = null; // Prevent reconnection attempts on component unmount
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount

  useEffect(() => {
    if (logContainerRef.current && isScrolledToBottom.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      // Check if user is at the bottom (with a small tolerance)
      isScrolledToBottom.current = scrollHeight - scrollTop <= clientHeight + 5;
    }
  };

  const handleClearLogs = () => {
    setLogs([`--- [${new Date().toLocaleTimeString()}] Logs cleared by user ---`]);
  };

  const getStatusIndicator = () => {
    switch (status) {
      case 'Connected': return { color: 'bg-green-500', text: 'text-green-400' };
      case 'Connecting': return { color: 'bg-yellow-500 animate-pulse', text: 'text-yellow-400' };
      case 'Disconnected': return { color: 'bg-red-500', text: 'text-red-400' };
    }
  };

  const { color, text } = getStatusIndicator();

  return (
    <div className="bg-gray-900 text-gray-300 font-mono rounded-lg shadow-lg h-full flex flex-col">
      <div className="flex justify-between items-center p-3 bg-gray-800 border-b border-gray-700 rounded-t-lg select-none">
        <h2 className="text-lg font-bold text-gray-100">Canton Sandbox Logs</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className={`h-3 w-3 rounded-full mr-2 ${color}`}></span>
            <span className={text}>{status}</span>
          </div>
          <button
            onClick={handleClearLogs}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded text-sm transition-colors"
            aria-label="Clear logs"
          >
            Clear
          </button>
        </div>
      </div>
      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="flex-grow p-4 overflow-y-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="flex flex-col">
          {logs.map((log, index) => (
            <div key={index} className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {AnsiToClass(log)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SandboxLogs;