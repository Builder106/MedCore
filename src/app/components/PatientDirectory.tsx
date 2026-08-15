import { clsx } from 'clsx';
import { Activity, Heart, MapPin } from 'lucide-react';

const patients = [
  {
    id: 'AFY-892',
    name: 'Amina Osei',
    age: 34,
    gender: 'F',
    location: 'Nairobi Central',
    status: 'critical', // needs attention
    bp: '140/90',
    image:
      'https://images.unsplash.com/photo-1770396528756-d463cc7f0a8a?crop=entropy&cs=tinysrgb&fit=facearea&facepad=2.5&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFjayUyMHdvbWFuJTIwbmF0dXJhbCUyMGhhaXIlMjBzbWlsaW5nJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzc2NDYxMTQ3fDA&ixlib=rb-4.1.0&q=80&w=256',
  },
  {
    id: 'AFY-714',
    name: 'Samuel Mutisya',
    age: 52,
    gender: 'M',
    location: 'Kibera Clinic',
    status: 'stable',
    bp: '120/80',
    image:
      'https://images.unsplash.com/photo-1612213993024-b0ed04dfb248?crop=entropy&cs=tinysrgb&fit=facearea&facepad=2&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwbWFuJTIwcG9ydHJhaXQlMjBzbWlsaW5nfGVufDF8fHx8MTc3NjQ2MTc3NHww&ixlib=rb-4.1.0&q=80&w=256',
  },
  {
    id: 'AFY-633',
    name: 'Grace Njoroge',
    age: 68,
    gender: 'F',
    location: 'Mombasa East',
    status: 'monitoring',
    bp: '135/85',
    image:
      'https://images.unsplash.com/photo-1511481783776-b56b8c2018b6?crop=entropy&cs=tinysrgb&fit=facearea&facepad=2.5&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGRlciUyMGFmcmljYW4lMjB3b21hbiUyMHBvcnRyYWl0fGVufDF8fHx8MTc3NjQ2MTc3N3ww&ixlib=rb-4.1.0&q=80&w=256',
  },
];

export function PatientDirectory() {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] border border-[#EAE6DF]/60">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Active Patients</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Recently updated records synced via FHIR.
          </p>
        </div>
        <button className="text-sm font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl transition-colors">
          View All Directory
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {patients.map(patient => (
          <div
            key={patient.id}
            className="group relative bg-[#F9F7F2]/50 hover:bg-[#F9F7F2] rounded-2xl p-5 border border-[#EAE6DF] hover:border-teal-200 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
          >
            {/* Status Indicator */}
            <div
              className={clsx(
                'absolute top-4 right-4 w-2.5 h-2.5 rounded-full ring-4 ring-white shadow-sm',
                patient.status === 'critical'
                  ? 'bg-rose-500'
                  : patient.status === 'monitoring'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              )}
            />

            <div className="flex items-start gap-4 mb-4">
              <img
                src={patient.image}
                alt={patient.name}
                className="w-14 h-14 rounded-full object-cover bg-slate-200 shadow-inner"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                  {patient.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {patient.id}
                  </span>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-100/50 px-1.5 py-0.5 rounded-md">
                    {patient.age}y • {patient.gender}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-4 bg-white/60 p-2 rounded-xl border border-[#EAE6DF]/40">
              <MapPin size={14} className="text-teal-600" />
              {patient.location}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#EAE6DF]">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Heart size={12} className="text-rose-400" /> Blood Press.
                </span>
                <span
                  className={clsx(
                    'text-sm font-bold',
                    patient.status === 'critical' ? 'text-rose-600' : 'text-slate-800'
                  )}
                >
                  {patient.bp} <span className="text-[10px] font-medium text-slate-500">mmHg</span>
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Activity size={12} className="text-amber-500" /> Last Visit
                </span>
                <span className="text-sm font-bold text-slate-800">2 days ago</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
