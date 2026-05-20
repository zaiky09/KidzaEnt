// Purpose: Floating AI Customer Support Widget

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi there! 👋 I am the Kidza Delivery AI assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to the bottom whenever a new message appears
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    // 1. Add user's message to the chat
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      // 2. Ask the AI backend
      const response = await axios.post('http://localhost:5000/api/ai/chat', {
        message: userMessage
      });

      // 3. Add the AI's reply to the chat
      setMessages((prev) => [...prev, { sender: 'bot', text: response.data.reply }]);
    } catch (err) {
      console.error('Chatbot error:', err);
      setMessages((prev) => [...prev, { sender: 'bot', text: '⚠️ Sorry, I am having trouble connecting to my brain right now!' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* --- THE FLOATING BUBBLE --- */}
      <div 
        onClick={toggleChat}
        style={{ position: 'fixed', bottom: '20px', right: '20px', width: '60px', height: '60px', backgroundColor: '#FFD700', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 9999, transition: 'transform 0.2s' }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span style={{ fontSize: '30px' }}>{isOpen ? '❌' : '💬'}</span>
      </div>

      {/* --- THE CHAT WINDOW --- */}
      {isOpen && (
        <div style={{ position: 'fixed', bottom: '90px', right: '20px', width: '320px', height: '450px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', border: '2px solid #FFD700', display: 'flex', flexDirection: 'column', zIndex: 9999, overflow: 'hidden' }}>
          
          {/* Header */}
          <div style={{ backgroundColor: '#FFD700', padding: '15px', color: '#000', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '16px' }}>🤖 Kidza Support AI</span>
            <button onClick={toggleChat} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>✖</button>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', backgroundColor: '#f9f9f9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((msg, index) => (
              <div key={index} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', padding: '10px 14px', borderRadius: msg.sender === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0', backgroundColor: msg.sender === 'user' ? '#FFD700' : '#e0e0e0', color: '#000', fontSize: '14px', lineHeight: '1.4', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                {msg.text}
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '16px 16px 16px 0', backgroundColor: '#e0e0e0', color: '#555', fontSize: '14px', fontStyle: 'italic' }}>
                Kidza AI is typing...
              </div>
            )}
            <div ref={messagesEndRef} /> {/* Invisible div to scroll to */}
          </div>

          {/* Input Area */}
          <form onSubmit={sendMessage} style={{ display: 'flex', borderTop: '1px solid #ddd', padding: '10px', backgroundColor: '#fff' }}>
            <input 
              type="text" 
              placeholder="Ask me anything..." 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ccc', outline: 'none', fontSize: '14px' }}
            />
            <button type="submit" disabled={isTyping || !input.trim()} style={{ marginLeft: '10px', padding: '10px 15px', backgroundColor: input.trim() ? '#FFD700' : '#eee', color: '#000', border: 'none', borderRadius: '20px', cursor: input.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
              Send
            </button>
          </form>

        </div>
      )}
    </>
  );
};

export default Chatbot;


