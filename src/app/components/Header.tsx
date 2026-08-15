import { Bell, CheckCircle2, Menu, Search } from 'lucide-react';

export function Header() {
  return (
    <header className="h-20 bg-white/70 backdrop-blur-md border-b border-[#EAE6DF] flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30 shadow-[0_4px_30px_-20px_rgba(0,0,0,0.05)]">
      {/* Mobile Menu Toggle */}
      <button className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors mr-4">
        <Menu size={24} />
      </button>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl relative group">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors"
        />
        <input
          type="text"
          placeholder="Search patient records, IDs, or history..."
          className="w-full bg-[#F3EFE9] border border-transparent text-slate-700 text-sm font-medium rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-teal-500/30 focus:ring-4 focus:ring-teal-500/10 transition-all"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1.5">
          <kbd className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-slate-400 shadow-sm border border-slate-200">
            ⌘
          </kbd>
          <kbd className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-slate-400 shadow-sm border border-slate-200">
            K
          </kbd>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-5 ml-6">
        <div className="hidden lg:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
          <CheckCircle2 size={14} />
          <span className="text-xs font-bold tracking-wide">Sync: Active</span>
        </div>

        <button className="relative p-2 text-slate-400 hover:text-slate-700 transition-colors hover:bg-slate-100 rounded-xl group">
          <Bell size={22} className="group-hover:rotate-12 transition-transform origin-top" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        </button>

        <div className="h-8 w-px bg-[#EAE6DF] mx-1"></div>

        <button className="flex items-center gap-3 text-left group">
          <img
            src="https://images.unsplash.com/photo-1666887360369-1901f341fdad?crop=entropy&cs=tinysrgb&fit=facearea&facepad=2&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGRlciUyMGJsYWNrJTIwbWFsZSUyMGRvY3RvciUyMHBvcnRyYWl0fGVufDF8fHx8MTc3NjQ2MTE1N3ww&ixlib=rb-4.1.0&q=80&w=256"
            alt="Dr. Osei"
            className="w-10 h-10 rounded-full border-2 border-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] group-hover:border-teal-200 transition-colors object-cover bg-slate-200"
          />
          <div className="hidden md:block">
            <p className="text-sm font-bold text-slate-800 leading-none">Dr. K. Osei</p>
            <p className="text-[11px] font-medium text-teal-600 mt-0.5">Chief Physician</p>
          </div>
        </button>
      </div>
    </header>
  );
}
