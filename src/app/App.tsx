import { AIPanel } from './components/AIPanel';
import { ClinicalTimeline } from './components/ClinicalTimeline';
import { Header } from './components/Header';
import { PatientDirectory } from './components/PatientDirectory';
import { Sidebar } from './components/Sidebar';

export default function App() {
  return (
    <div className="flex h-screen bg-[#F9F7F2] font-['Inter',_sans-serif] overflow-hidden selection:bg-teal-200">
      {/* Sidebar (Fixed Left) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 bg-gradient-to-br from-[#F9F7F2] to-[#F3EFE9]">
        {/* Top Navigation */}
        <Header />

        {/* Scrollable Dashboard Space */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 flex flex-col lg:flex-row items-start gap-6 xl:gap-8 scroll-smooth pb-16">
          {/* Main Column */}
          <div className="flex-1 flex flex-col gap-6 xl:gap-8 min-w-0 w-full">
            {/* Page Header Area */}
            <div className="mb-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                Central Hub
              </h1>
              <p className="text-base font-medium text-slate-600">
                Overview of patient encounters and system status.
              </p>
            </div>

            <PatientDirectory />
            <ClinicalTimeline />
          </div>

          {/* Right Floating AI Panel (Sticky on Desktop) */}
          <AIPanel />
        </main>
      </div>
    </div>
  );
}
