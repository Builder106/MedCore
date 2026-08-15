import { clsx } from 'clsx';
import { AlertCircle, CalendarHeart, Pill, ShieldCheck, Syringe } from 'lucide-react';

const events = [
  {
    id: 1,
    type: 'visit',
    title: 'General Consultation',
    date: 'Today, 10:30 AM',
    patient: 'Amina Osei',
    status: 'completed',
    icon: CalendarHeart,
    color: 'bg-teal-100 text-teal-700 ring-teal-50',
    description:
      'Routine checkup. BP slightly elevated at 140/90. Prescribed rest and low-sodium diet.',
  },
  {
    id: 2,
    type: 'lab',
    title: 'Blood Panel Results',
    date: 'Yesterday, 02:15 PM',
    patient: 'Samuel Mutisya',
    status: 'flagged',
    icon: Syringe,
    color: 'bg-rose-100 text-rose-700 ring-rose-50',
    description: 'HbA1c levels indicated pre-diabetes range (6.2%). Requires follow-up.',
  },
  {
    id: 3,
    type: 'rx',
    title: 'Prescription Refill',
    date: 'Oct 12, 09:00 AM',
    patient: 'Grace Njoroge',
    status: 'pending',
    icon: Pill,
    color: 'bg-indigo-100 text-indigo-700 ring-indigo-50',
    description: 'Lisinopril 10mg QD requested via USSD portal.',
  },
];

export function ClinicalTimeline() {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] border border-[#EAE6DF]/60 flex-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Recent Clinical Activity
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Timeline of encounters across your facility.
          </p>
        </div>
        <button className="text-sm font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl transition-colors hidden sm:block">
          Filter Timeline
        </button>
      </div>

      <div className="relative pl-3 space-y-8 before:absolute before:inset-y-2 before:left-7 before:w-px before:bg-[#EAE6DF] z-0">
        {events.map(event => (
          <div key={event.id} className="relative flex items-start gap-6 group">
            {/* Timeline Node */}
            <div
              className={clsx(
                'relative z-10 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ring-4 transition-transform group-hover:scale-110',
                event.color
              )}
            >
              <event.icon size={16} className="fill-current/20" />
            </div>

            {/* Event Content */}
            <div className="flex-1 bg-[#F9F7F2]/50 hover:bg-[#F9F7F2] p-4 rounded-2xl border border-[#EAE6DF]/60 transition-all shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{event.title}</h4>
                  <p className="text-[11px] font-semibold text-teal-700 bg-teal-100/50 px-2 py-0.5 rounded-md inline-flex items-center gap-1 mt-1">
                    {event.patient}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">{event.date}</span>
                  {event.status === 'completed' && (
                    <ShieldCheck size={16} className="text-emerald-500" />
                  )}
                  {event.status === 'flagged' && (
                    <AlertCircle size={16} className="text-rose-500" />
                  )}
                  {event.status === 'pending' && (
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
              </div>
              <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-2xl">
                {event.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
