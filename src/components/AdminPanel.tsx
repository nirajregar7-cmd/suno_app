/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserReport, AppAnalytics } from '../types';
import { 
  ShieldAlert, 
  Trash2, 
  Check, 
  BarChart, 
  Users, 
  MessageSquare, 
  Percent, 
  HelpCircle,
  AlertTriangle,
  UserCheck,
  AlertOctagon
} from 'lucide-react';

interface AdminPanelProps {
  reports: UserReport[];
  analytics: AppAnalytics;
  onReviewReport: (reportId: string, action: 'Dismiss' | 'Reviewed_Warning' | 'Reviewed_Mute' | 'Reviewed_Suspended' | 'Reviewed_Banned') => void;
}

export default function AdminPanel({
  reports,
  analytics,
  onReviewReport
}: AdminPanelProps) {
  const [tab, setTab] = useState<'reports' | 'analytics'>('reports');

  return (
    <div id="admin_dashboard_universe" className="bg-[#0f0b0a] border border-neutral-800 rounded-2xl p-5 text-[#ece8e5] space-y-6">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
        <div>
          <h2 className="text-md font-extrabold text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldAlert size={18} /> Suno Moderation Console
          </h2>
          <p className="text-[10px] text-neutral-400 mt-1">
            Review live client-side abuse tickets, inspect flagged AI transcripts, and adjust system restrictions.
          </p>
        </div>

        <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-900 self-start">
          <button
            onClick={() => setTab('reports')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
              tab === 'reports' 
                ? 'bg-[#e11d48] text-white' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Abuse Reports ({reports.length})
          </button>
          
          <button
            onClick={() => setTab('analytics')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
              tab === 'analytics' 
                ? 'bg-[#e11d48] text-white' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            System Analytics
          </button>
        </div>
      </div>

      {reports.length === 0 && tab === 'reports' && (
        <div className="p-8 text-center bg-neutral-950/40 border border-dashed border-neutral-800 rounded-xl">
          <UserCheck className="mx-auto w-10 h-10 text-emerald-500/80 mb-2" />
          <h4 className="text-sm font-bold text-white">Trust Queue is Completely Clear!</h4>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1 leading-relaxed">
            No active anonymous flags or chat reports requires admin intervention. Ensure AI auto-moderator is active on endpoints.
          </p>
        </div>
      )}

      {/* REPORTS MODULE */}
      {tab === 'reports' && reports.length > 0 && (
        <div className="space-y-4">
          {reports.map((rep) => (
            <div key={rep.id} className="p-4 bg-neutral-950 border border-neutral-900 rounded-xl space-y-3.5">
              
              {/* Report metadata header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-900 pb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-rose-400 uppercase tracking-wider">{rep.reason}</span>
                    <span className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 text-[9px] font-mono text-neutral-400 rounded">
                      ID: #{rep.id.slice(-5)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 mt-1">
                    Reported Handle: <span className="text-white font-bold">{rep.reportedUserNickname}</span> &bull; 
                    By Reporter: <span className="text-neutral-400 text-[11px]">{rep.reporterNickname}</span>
                  </p>
                </div>
                
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/10 font-bold uppercase self-start">
                  Action Required
                </span>
              </div>

              {/* Grab transcripts evidence */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-neutral-500 uppercase font-black tracking-wider">Flagged Chat Snapshot Evidence</p>
                <div className="bg-[#0f0b0a] border border-neutral-900 p-3 rounded-lg text-xs space-y-1.5 text-neutral-300 leading-relaxed font-mono font-medium max-h-32 overflow-y-auto">
                  {rep.evidence.map((line, idx) => (
                    <div key={idx} className="border-b border-neutral-900/40 pb-1 last:border-0">{line}</div>
                  ))}
                </div>
              </div>

              {/* Action Rows */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => onReviewReport(rep.id, 'Dismiss')}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Dismiss Ticket
                </button>
                
                <button
                  onClick={() => onReviewReport(rep.id, 'Reviewed_Warning')}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-amber-500/10 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <AlertTriangle size={12} /> Warn Reported Handle
                </button>

                <button
                  onClick={() => onReviewReport(rep.id, 'Reviewed_Mute')}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-orange-400 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Temp Mute (24h)
                </button>

                <button
                  onClick={() => onReviewReport(rep.id, 'Reviewed_Suspended')}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-red-400 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Suspend Account
                </button>

                <button
                  onClick={() => onReviewReport(rep.id, 'Reviewed_Banned')}
                  className="px-3 py-1.5 bg-rose-600/15 border border-rose-600/20 hover:bg-rose-600/25 text-rose-300 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <AlertOctagon size={12} /> Permanent Ban
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ANALYTICS PLOTS MODULE */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-xl space-y-1">
              <Users className="w-5 h-5 text-rose-500 mb-1" />
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Active Daily Chats</p>
              <h3 className="text-xl font-bold text-white font-mono">{analytics.dau}</h3>
              <p className="text-[9px] text-[#22c55e] font-semibold">{analytics.userGrowthPct}% increase this week</p>
            </div>

            <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-xl space-y-1">
              <Percent className="w-5 h-5 text-amber-500 mb-1" />
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider">User Retention</p>
              <h3 className="text-xl font-bold text-white font-mono">{analytics.retentionRate}%</h3>
              <p className="text-[9px] text-neutral-500">Premium cohort baseline</p>
            </div>

            <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-xl space-y-1">
              <MessageSquare className="w-5 h-5 text-emerald-500 mb-1" />
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Messages Screened</p>
              <h3 className="text-xl font-bold text-white font-mono">{analytics.messagesSent}</h3>
              <p className="text-[9px] text-rose-400 font-semibold">{analytics.abuseReports} items auto-flagged</p>
            </div>

            <div className="bg-neutral-950 p-4 border border-neutral-900 rounded-xl space-y-1">
              <ShieldAlert className="w-5 h-5 text-rose-500 mb-1" />
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Avg Trust Rating</p>
              <h3 className="text-xl font-bold text-white font-mono">{analytics.avgTrustScore}/100</h3>
              <p className="text-[9px] text-[#22c55e] font-semibold">Excellent platform hygiene</p>
            </div>

          </div>

          {/* SIMULATED GROWTH GRAPH */}
          <div className="bg-neutral-950/80 p-5 border border-neutral-900 rounded-xl">
            <h4 className="text-xs uppercase font-extrabold text-[#fff] tracking-wide mb-3 flex items-center gap-1.5">
              <BarChart size={14} className="text-rose-500" /> Platform Security Performance Trend (Daily Audits)
            </h4>
            <div className="h-44 flex items-end justify-between gap-3 pt-6 border-b border-neutral-800 font-mono px-2 relative">
              
              <div className="flex flex-col items-center gap-2 flex-1 group">
                <span className="text-[9px] text-rose-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">12 Flag</span>
                <div className="w-full bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/10 h-10 rounded-t transition-all relative"></div>
                <span className="text-[9.5px] text-neutral-400 mb-1">Mon</span>
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 group">
                <span className="text-[9px] text-rose-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">18 Flag</span>
                <div className="w-full bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/10 h-14 rounded-t transition-all"></div>
                <span className="text-[9.5px] text-neutral-400 mb-1">Tue</span>
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 group">
                <span className="text-[9px] text-rose-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">8 Flag</span>
                <div className="w-full bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/10 h-6 rounded-t transition-all"></div>
                <span className="text-[9.5px] text-neutral-400 mb-1">Wed</span>
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 group">
                <span className="text-[9px] text-rose-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">22 Flag</span>
                <div className="w-full bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/10 h-20 rounded-t transition-all"></div>
                <span className="text-[9.5px] text-neutral-400 mb-1">Thu</span>
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 group">
                <span className="text-[9px] text-[#22c55e] font-bold opacity-0 group-hover:opacity-100 transition-opacity">2 Flag</span>
                <div className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/10 h-2 rounded-t transition-all"></div>
                <span className="text-[9.5px] text-neutral-400 mb-1">Fri</span>
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 group">
                <span className="text-[9px] text-amber-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">4 Flag</span>
                <div className="w-full bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/10 h-3 rounded-t transition-all"></div>
                <span className="text-[9.5px] text-neutral-400 mb-1">Sat</span>
              </div>

              <div className="flex flex-col items-center gap-2 flex-1 group">
                <span className="text-[9px] text-[#22c55e] font-bold opacity-0 group-hover:opacity-100 transition-opacity">1 Flag</span>
                <div className="w-full bg-emerald-500/25 hover:bg-emerald-500/45 border border-emerald-500/10 h-1.5 rounded-t transition-all"></div>
                <span className="text-[9.5px] text-neutral-400 mb-1">Sun</span>
              </div>

            </div>
            <p className="text-[10px] text-neutral-500 mt-2 text-center">
              *Abuse rate drops dramatically once Suno's real-time AI moderation was deployed on Friday.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
