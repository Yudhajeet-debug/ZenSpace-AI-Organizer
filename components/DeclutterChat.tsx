import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Sparkles, Loader2, Minimize2, Trash2, Map, Eye, EyeOff, Undo2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, MessageRole, ProcessingState } from '../types';
import { analyzeRoomImage, visualizeTidyRoom, sendChatMessage, generatePlacementGuides } from '../services/geminiService';

const ROOM_TYPES = ['Bedroom', 'Living Room', 'Kitchen', 'Workspace', 'Bathroom', 'Other'];

const DeclutterChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: MessageRole.MODEL,
      text: "Hi! I'm ZenSpace. Select a room type and upload a photo to get started.",
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [roomType, setRoomType] = useState<string>('Bedroom');
  const [viewingOriginalIds, setViewingOriginalIds] = useState<Set<string>>(new Set());
  
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isAnalyzing: false,
    isVisualizing: false,
    isThinking: false
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, processingState]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleComparison = (id: string) => {
    setViewingOriginalIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const undoVisualization = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !selectedImage) return;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: inputValue,
      image: selectedImage || undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    const currentImage = selectedImage;
    setSelectedImage(null); 
    
    // Construct history for the model
    const history = messages.filter(m => m.role !== MessageRole.SYSTEM).map(m => ({
        role: m.role === MessageRole.USER ? 'user' : 'model',
        parts: [{ text: m.text }]
    }));

    try {
      if (currentImage) {
        setProcessingState(prev => ({ ...prev, isAnalyzing: true }));
        const analysis = await analyzeRoomImage(currentImage, newUserMsg.text || "Analyze this room and give me a decluttering plan.", roomType);
        
        const newModelMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: MessageRole.MODEL,
          text: analysis,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, newModelMsg]);
      } else {
        setProcessingState(prev => ({ ...prev, isThinking: true }));
        const response = await sendChatMessage(history, newUserMsg.text);
        const newModelMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: MessageRole.MODEL,
          text: response,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, newModelMsg]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: MessageRole.MODEL,
        text: "Sorry, I had trouble connecting to the organization database. Please try again.",
        timestamp: Date.now()
      }]);
    } finally {
      setProcessingState({ isAnalyzing: false, isVisualizing: false, isThinking: false });
    }
  };

  const handleVisualize = async (imageUrl: string) => {
     setProcessingState(prev => ({ ...prev, isVisualizing: true }));
     
     const workingMsgId = Date.now().toString();
     setMessages(prev => [...prev, {
        id: workingMsgId,
        role: MessageRole.SYSTEM,
        text: "Generating a tidy visualization of your room...",
        timestamp: Date.now()
     }]);

     try {
        const result = await visualizeTidyRoom(imageUrl, `A clean, tidy, organized version of this ${roomType}. Remove clutter from floors and surfaces. Minimalist style.`);
        
        setMessages(prev => prev.filter(m => m.id !== workingMsgId));
        
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: MessageRole.MODEL,
            text: result.text || "Here is a vision of your tidy space:",
            image: result.image,
            originalImage: imageUrl,
            isVisualization: true,
            timestamp: Date.now()
        }]);

     } catch (err) {
        setMessages(prev => prev.filter(m => m.id !== workingMsgId));
         setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: MessageRole.MODEL,
            text: "I couldn't generate the visualization this time. Try uploading a clearer photo.",
            timestamp: Date.now()
        }]);
     } finally {
        setProcessingState(prev => ({ ...prev, isVisualizing: false }));
     }
  };

  const handleGenerateGuides = async (imageUrl: string) => {
    setProcessingState(prev => ({ ...prev, isVisualizing: true }));
    
    const workingMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
       id: workingMsgId,
       role: MessageRole.SYSTEM,
       text: "Creating placement guides overlay...",
       timestamp: Date.now()
    }]);

    try {
       const result = await generatePlacementGuides(imageUrl);
       
       setMessages(prev => prev.filter(m => m.id !== workingMsgId));
       
       setMessages(prev => [...prev, {
           id: Date.now().toString(),
           role: MessageRole.MODEL,
           text: result.text || "I've highlighted areas that need attention:",
           image: result.image,
           originalImage: imageUrl,
           isGuide: true,
           isVisualization: true,
           timestamp: Date.now()
       }]);

    } catch (err) {
       setMessages(prev => prev.filter(m => m.id !== workingMsgId));
        setMessages(prev => [...prev, {
           id: Date.now().toString(),
           role: MessageRole.MODEL,
           text: "I couldn't generate the guides this time.",
           timestamp: Date.now()
       }]);
    } finally {
       setProcessingState(prev => ({ ...prev, isVisualizing: false }));
    }
 };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-4 ${
              msg.role === MessageRole.USER 
                ? 'bg-stone-800 text-white rounded-br-none' 
                : msg.role === MessageRole.SYSTEM
                ? 'bg-stone-100 text-stone-500 text-sm italic mx-auto'
                : 'bg-stone-100 text-stone-800 rounded-bl-none'
            }`}>
              
              {/* Image in message */}
              {msg.image && (
                <div className="mb-3 relative group">
                  <div className="relative">
                    <img 
                      src={viewingOriginalIds.has(msg.id) ? msg.originalImage : msg.image} 
                      alt="Content" 
                      className="rounded-lg max-h-64 object-cover border border-stone-200 transition-all duration-300" 
                    />
                    
                    {/* Ghost Guide Overlay indicator */}
                    {msg.isGuide && !viewingOriginalIds.has(msg.id) && (
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md border border-white/20">
                        Guides Active
                      </div>
                    )}
                  </div>

                  {msg.role === MessageRole.USER && !msg.isVisualization && (
                      <div className="absolute top-2 right-2">
                         <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">Original</span>
                      </div>
                  )}
                  
                  {/* Action buttons for User Images */}
                  {msg.role === MessageRole.USER && !msg.isVisualization && (
                     <div className="flex gap-2 mt-2 flex-wrap">
                        <button 
                            onClick={() => handleVisualize(msg.image!)}
                            disabled={processingState.isVisualizing}
                            className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium bg-white/80 backdrop-blur px-3 py-1.5 rounded-full shadow-sm transition-all border border-emerald-100 hover:bg-emerald-50"
                        >
                            {processingState.isVisualizing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                            Visualize Tidy Room
                        </button>
                        <button 
                            onClick={() => handleGenerateGuides(msg.image!)}
                            disabled={processingState.isVisualizing}
                            className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium bg-white/80 backdrop-blur px-3 py-1.5 rounded-full shadow-sm transition-all border border-indigo-100 hover:bg-indigo-50"
                        >
                            {processingState.isVisualizing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Map className="w-3 h-3" />}
                            Show Guides
                        </button>
                     </div>
                  )}

                  {/* Actions for Visualizations (Compare/Undo) */}
                  {msg.isVisualization && msg.originalImage && (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => toggleComparison(msg.id)}
                        className="flex-1 flex items-center justify-center gap-2 text-xs font-medium bg-white/80 hover:bg-white text-stone-700 py-1.5 px-3 rounded-lg border border-stone-200 shadow-sm transition-all"
                      >
                         {viewingOriginalIds.has(msg.id) ? (
                            <><Eye className="w-3 h-3" /> Show Result</>
                         ) : (
                            <><EyeOff className="w-3 h-3" /> View Original</>
                         )}
                      </button>
                      
                      <button
                        onClick={() => undoVisualization(msg.id)}
                        className="flex items-center justify-center gap-1 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 py-1.5 px-3 rounded-lg border border-red-100 shadow-sm transition-all"
                        title="Discard this visualization"
                      >
                        <Undo2 className="w-3 h-3" /> Undo
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Text Content */}
              <div className="prose prose-stone prose-sm max-w-none">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading Indicators */}
        {processingState.isAnalyzing && (
            <div className="flex justify-start">
                <div className="bg-stone-100 rounded-2xl rounded-bl-none px-5 py-4 flex items-center gap-2 text-stone-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing your {roomType.toLowerCase()}...
                </div>
            </div>
        )}
        {processingState.isThinking && (
            <div className="flex justify-start">
                <div className="bg-stone-100 rounded-2xl rounded-bl-none px-5 py-4 flex items-center gap-2 text-stone-500 text-sm">
                    <span className="animate-pulse">...</span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-stone-100">
        
        {/* Room Type Selector */}
        <div className="mb-3 overflow-x-auto pb-2 scrollbar-hide flex gap-2">
            {ROOM_TYPES.map(type => (
                <button
                    key={type}
                    onClick={() => setRoomType(type)}
                    className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        roomType === type 
                        ? 'bg-stone-800 text-white border-stone-800' 
                        : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
                    }`}
                >
                    {type}
                </button>
            ))}
        </div>

        {selectedImage && (
            <div className="mb-3 flex items-center gap-2 bg-stone-50 p-2 rounded-lg w-fit border border-stone-200">
                <img src={selectedImage} alt="Preview" className="h-12 w-12 object-cover rounded-md" />
                <button onClick={() => setSelectedImage(null)} className="text-stone-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        )}
        <div className="flex items-center gap-2">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-full hover:bg-stone-100 text-stone-500 transition-colors"
                title="Upload Photo"
            >
                <ImageIcon className="w-5 h-5" />
            </button>
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
            />
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={`Ask about your ${roomType.toLowerCase()}...`}
                className="flex-1 bg-stone-50 border-0 rounded-full px-4 py-3 text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
            />
            <button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() && !selectedImage}
                className="p-3 bg-stone-800 hover:bg-stone-700 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <Send className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default DeclutterChat;