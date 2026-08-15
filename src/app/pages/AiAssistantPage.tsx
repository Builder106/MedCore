import { AlertTriangle, Bot, Send, Sparkles, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { patients } from '../data/mock-data';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

// Simulated AI responses
const aiResponses: Record<string, string> = {
  summary: `## Patient Summary — Amina Okafor (PAT-001)

**Demographics:** Female, 38 years old, Blood Type O+, NHIF Kenya
**Known Allergies:** ⚠️ Penicillin

### Active Conditions
- **Type 2 Diabetes Mellitus** — Diagnosed 2026-04-10, fasting glucose 11.2 mmol/L
- **Hypertension** — Controlled on Amlodipine 5mg, latest BP 130/82

### Current Medications
1. Metformin 500mg BD (started 2026-04-10)
2. Amlodipine 5mg OD (ongoing)

### Recent Lab Results
- **Fasting Glucose:** 11.2 mmol/L ⚠️ (significantly elevated)
- **HbA1c:** 7.8% ⚠️ (above target <7%)
- **CBC:** Normal

### ⚠️ High-Risk Flags
1. **Newly diagnosed diabetes with poor glycaemic control** — HbA1c 7.8% suggests chronic hyperglycaemia predating diagnosis
2. **Weight trend:** 78-80 kg over 3 months — monitor for metabolic syndrome
3. **Dual cardiovascular risk:** Hypertension + diabetes significantly elevates CVD risk

### Overdue Screenings
- **Diabetic retinopathy screening** — Should be performed at diagnosis
- **Foot examination** — Baseline assessment recommended
- **Renal function panel** — eGFR and urine albumin-creatinine ratio needed`,

  differential: `## Differential Diagnosis Analysis

Based on presenting symptoms of polyuria, polydipsia, and elevated fasting glucose (11.2 mmol/L):

### Most Likely
1. **Type 2 Diabetes Mellitus** (95% probability)
   - Age 38, BMI likely elevated, HbA1c 7.8%
   - Classic osmotic symptoms present

### Consider
2. **Type 1 Diabetes / LADA** (3% probability)
   - Less likely given age, but GAD antibodies should be checked if poor response to metformin
3. **Secondary Diabetes** (2% probability)
   - Cushing's, acromegaly — no clinical features described

### Recommended Next Steps
- Confirm with repeat fasting glucose or OGTT
- Check C-peptide and GAD antibodies
- Comprehensive metabolic panel
- Lipid profile for cardiovascular risk stratification`,

  interactions: `## Drug Interaction Check

### Current Medications Review

**Metformin 500mg + Amlodipine 5mg**
- ✅ No significant drug-drug interactions
- ℹ️ Both drugs are metabolised differently (renal vs hepatic)

### Warnings
- ⚠️ **Patient is allergic to Penicillin** — avoid all penicillin-class antibiotics
- ⚠️ **Amlodipine + Grapefruit** — advise patient to avoid grapefruit juice
- ⚠️ **Metformin + Contrast dye** — hold metformin 48h before/after CT with contrast
- ⚠️ **Metformin + Alcohol** — increased risk of lactic acidosis

### Monitoring Required
- Renal function every 3-6 months (metformin)
- Blood pressure weekly initially (amlodipine titration)
- HbA1c every 3 months until at target`,
};

const quickActions = [
  { label: 'Summarise patient record', key: 'summary', icon: Sparkles },
  { label: 'Differential diagnosis', key: 'differential', icon: Bot },
  { label: 'Drug interaction check', key: 'interactions', icon: AlertTriangle },
];

export function AiAssistantPage() {
  const { currentPatientId } = useApp();
  const patient = patients.find(p => p.id === currentPatientId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(currentPatientId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const simulateStreaming = (text: string) => {
    setIsStreaming(true);
    const msgId = `ai-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id: msgId, role: 'assistant', content: '', timestamp: new Date() },
    ]);

    let i = 0;
    const interval = setInterval(() => {
      i += Math.floor(Math.random() * 8) + 3;
      if (i >= text.length) {
        setMessages(prev => prev.map(m => (m.id === msgId ? { ...m, content: text } : m)));
        setIsStreaming(false);
        clearInterval(interval);
      } else {
        setMessages(prev =>
          prev.map(m => (m.id === msgId ? { ...m, content: text.slice(0, i) } : m))
        );
      }
    }, 20);
  };

  const handleQuickAction = (key: string) => {
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: quickActions.find(a => a.key === key)!.label,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setTimeout(
      () =>
        simulateStreaming(
          aiResponses[key] || 'I can help with that. Let me analyse the patient record...'
        ),
      500
    );
  };

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTimeout(() => simulateStreaming(aiResponses.summary), 500);
  };

  return (
    <div className="max-w-4xl h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-[22px] text-slate-900 flex items-center gap-2">
            <Bot className="w-6 h-6 text-amber-500" /> AI Clinical Assistant
          </h1>
          <p className="text-[12px] text-slate-400">
            Powered by Claude · Advisory only — verify all suggestions clinically
          </p>
        </div>
        <select
          value={selectedPatient}
          onChange={e => setSelectedPatient(e.target.value)}
          className="text-[12px] border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600"
        >
          {patients.map(p => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} ({p.id})
            </option>
          ))}
        </select>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-4 py-2 mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-[11px] text-amber-700">
          AI outputs are advisory. Always apply clinical judgement. Do not share AI outputs with
          patients directly.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-200/50">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-[16px] text-slate-900 mb-1">Clinical AI ready</h3>
            <p className="text-[13px] text-slate-400 mb-6 max-w-sm">
              Summarise records, flag risks, check interactions, or explore differential diagnoses.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickActions.map(a => (
                <button
                  key={a.key}
                  onClick={() => handleQuickAction(a.key)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-[13px] border border-amber-200"
                >
                  <a.icon className="w-4 h-4" /> {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-amber-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-50 border border-gray-200'}`}
            >
              {msg.role === 'assistant' ? (
                <div
                  className="text-[13px] leading-relaxed prose prose-sm max-w-none whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/## (.*)/g, '<h3 class="text-[15px] mt-3 mb-1">$1</h3>')
                      .replace(/### (.*)/g, '<h4 class="text-[14px] mt-2 mb-1">$1</h4>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/⚠️/g, '⚠️')
                      .replace(/✅/g, '✅')
                      .replace(/ℹ️/g, 'ℹ️'),
                  }}
                />
              ) : (
                <p className="text-[13px]">{msg.content}</p>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-purple-600" />
              </div>
            )}
          </div>
        ))}
        {isStreaming && (
          <div className="flex items-center gap-2 text-amber-600 text-[12px]">
            <div className="flex gap-1">
              <span
                className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
            Generating response...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions (when there are messages) */}
      {messages.length > 0 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {quickActions.map(a => (
            <button
              key={a.key}
              onClick={() => handleQuickAction(a.key)}
              disabled={isStreaming}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-[12px] border border-amber-200 whitespace-nowrap disabled:opacity-50"
            >
              <a.icon className="w-3.5 h-3.5" /> {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 mt-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about this patient..."
          disabled={isStreaming}
          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100 disabled:opacity-50 transition-all"
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          className="w-11 h-11 bg-amber-500 text-white rounded-xl flex items-center justify-center hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-sm"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
