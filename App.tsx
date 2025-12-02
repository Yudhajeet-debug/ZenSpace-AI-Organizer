import React, { useState } from 'react';
import { LayoutDashboard, Sparkles, Video, MessageSquare } from 'lucide-react';
import DeclutterChat from './components/DeclutterChat';
import LiveAssistant from './components/LiveAssistant';
import { AppMode } from './types';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.DECLUTTER);

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-stone-50">
      
      {/* Sidebar / Navigation */}
      <nav className="md:w-24 lg:w-64 bg-white border-r border-stone-200 flex flex-col justify-between shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center text-white">
                <Sparkles className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-stone-800 hidden lg:block">ZenSpace</span>
          </div>

          <div className="flex flex-col gap-2">
            <button 
                onClick={() => setActiveMode(AppMode.DECLUTTER)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    activeMode === AppMode.DECLUTTER 
                    ? 'bg-stone-100 text-stone-900 font-medium' 
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                }`}
            >
                <MessageSquare className="w-5 h-5" />
                <span className="hidden lg:block">Assistant</span>
            </button>
            
            <button 
                onClick={() => setActiveMode(AppMode.LIVE)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    activeMode === AppMode.LIVE 
                    ? 'bg-emerald-50 text-emerald-800 font-medium ring-1 ring-emerald-200' 
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                }`}
            >
                <Video className="w-5 h-5" />
                <span className="hidden lg:block">Live Expert</span>
            </button>
          </div>
        </div>

        <div className="p-6 hidden lg:block">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-100">
                <h3 className="font-medium text-emerald-900 mb-1">Quick Tip</h3>
                <p className="text-xs text-emerald-700 leading-relaxed">
                    Start with the floor. Clearing visible floor space instantly makes a room feel 50% larger.
                </p>
            </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 h-full p-4 md:p-6 overflow-hidden relative">
        <div className="h-full max-w-5xl mx-auto">
            {activeMode === AppMode.DECLUTTER ? (
                <div className="h-full flex flex-col gap-4">
                    <header className="flex-none mb-2">
                        <h1 className="text-2xl font-semibold text-stone-800">Declutter Assistant</h1>
                        <p className="text-stone-500">Upload a photo to get started with your organization journey.</p>
                    </header>
                    <div className="flex-1 min-h-0">
                        <DeclutterChat />
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col gap-4">
                     <header className="flex-none mb-2">
                        <h1 className="text-2xl font-semibold text-stone-800">Live Organization Session</h1>
                        <p className="text-stone-500">Talk to ZenSpace AI in real-time. Show your room via camera.</p>
                    </header>
                    <div className="flex-1 min-h-0">
                        <LiveAssistant />
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
