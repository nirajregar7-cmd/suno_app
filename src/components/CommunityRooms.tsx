/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DiscussionRoom, CommunityPost, UserSession } from '../types';
import { 
  Heart, 
  MessageSquare, 
  PieChart, 
  PlusCircle, 
  Send, 
  User, 
  ShieldCheck, 
  Check, 
  Clock 
} from 'lucide-react';

interface CommunityRoomsProps {
  rooms: DiscussionRoom[];
  userSession: UserSession;
  onVote: (roomId: string, postId: string, optionId: string) => void;
  onAddPost: (roomId: string, content: string, pollQuestion?: string, pollOptions?: string[]) => void;
  onAddReply: (roomId: string, postId: string, replyContent: string) => void;
}

export default function CommunityRooms({
  rooms,
  userSession,
  onVote,
  onAddPost,
  onAddReply
}: CommunityRoomsProps) {
  const [activeRoomId, setActiveRoomId] = useState(rooms[0]?.id || '');
  const [newPostText, setNewPostText] = useState('');
  const [replyInputText, setReplyInputText] = useState<Record<string, string>>({});
  
  // Custom Poll Creation toggles
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOption1, setPollOption1] = useState('');
  const [pollOption2, setPollOption2] = useState('');
  const [voiceVerifiedOnly, setVoiceVerifiedOnly] = useState(false);

  const activeRoom = rooms.find(r => r.id === activeRoomId);
  
  const displayedPosts = activeRoom
    ? activeRoom.posts.filter(post => !voiceVerifiedOnly || post.authorVoiceVerified)
    : [];

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    let finalQuestion: string | undefined = undefined;
    let finalOptions: string[] | undefined = undefined;

    if (showPollForm && pollQuestion.trim() && pollOption1.trim() && pollOption2.trim()) {
      finalQuestion = pollQuestion.trim();
      finalOptions = [pollOption1.trim(), pollOption2.trim()];
    }

    onAddPost(activeRoomId, newPostText.trim(), finalQuestion, finalOptions);
    
    setNewPostText('');
    setPollQuestion('');
    setPollOption1('');
    setPollOption2('');
    setShowPollForm(false);
  };

  const handleReplySubmit = (postId: string) => {
    const text = replyInputText[postId];
    if (!text || !text.trim()) return;

    onAddReply(activeRoomId, postId, text.trim());
    setReplyInputText(prev => ({ ...prev, [postId]: '' }));
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString();
    } catch {
      return 'just now';
    }
  };

  return (
    <div id="community_rooms_arena" className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full text-[#ece8e5]">
      
      {/* ROOMS SIDEBAR */}
      <div className="md:col-span-4 bg-[#0f0b0a] border border-neutral-800 p-4 rounded-2xl flex flex-col gap-3">
        <h3 className="text-xs uppercase tracking-widest font-black text-rose-400">Discussion Rooms</h3>
        <p className="text-[10px] text-neutral-400 leading-relaxed">
          Connect in heavily moderated anonymous lobbies focused on specialized growth themes. Keep language constructive and helpful.
        </p>

        <div className="space-y-2 mt-2">
          {rooms.map((room) => {
            const isActive = room.id === activeRoomId;
            return (
              <button
                key={room.id}
                onClick={() => {
                  setActiveRoomId(room.id);
                  setNewPostText('');
                  setShowPollForm(false);
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer ${
                  isActive 
                    ? 'bg-neutral-900 border-rose-500/80 shadow-lg shadow-rose-500/5' 
                    : 'bg-neutral-950/40 border-neutral-900 hover:border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-neutral-300'}`}>{room.name}</span>
                  <span className="text-[9px] bg-neutral-900 text-neutral-400 border border-neutral-800 px-1.5 py-0.5 rounded-full font-mono">
                    {room.posts.length} Posts
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400 line-clamp-2 leading-relaxed">{room.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CHANNELS ACTIVE LOBBY */}
      <div className="md:col-span-8 flex flex-col gap-4 overflow-y-auto pr-1 max-h-[calc(100vh-140px)]">
        {activeRoom ? (
          <>
            {/* WRITE NEW POST CARD */}
            <div className="bg-[#0f0b0a] border border-neutral-800 p-4 rounded-2xl">
              <form onSubmit={handlePostSubmit} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-neutral-700 bg-neutral-800">
                    <img referrerPolicy="no-referrer" src={userSession.avatar} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-bold text-neutral-200">{userSession.nickname} <span className="text-[9px] text-neutral-400 font-normal">(Anonymous post)</span></span>
                </div>

                <textarea
                  required
                  rows={2}
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder={`Write an anonymous post in ${activeRoom.name}... Ask a supportive question or share suggestions!`}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none text-neutral-200 resize-none font-medium"
                />

                {/* Optional Poll Widget */}
                {showPollForm ? (
                  <div className="space-y-2.5 p-3 bg-neutral-950/80 rounded-xl border border-neutral-800/60">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase font-bold text-amber-500">Attach Interactive Poll</p>
                      <button 
                        type="button" 
                        onClick={() => setShowPollForm(false)} 
                        className="text-[10px] text-neutral-500 hover:text-rose-400 underline"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Add poll question (e.g., Which routine helps best?)"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Option A"
                        value={pollOption1}
                        onChange={(e) => setPollOption1(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Option B"
                        value={pollOption2}
                        onChange={(e) => setPollOption2(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPollForm(true)}
                    className="text-[10px] font-bold text-neutral-400 hover:text-white flex items-center gap-1 border border-neutral-800 px-3 py-1.5 rounded-lg bg-neutral-950/40"
                  >
                    <PlusCircle size={11} className="text-amber-500" /> + Add Poll
                  </button>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    Post Anonymously
                    <Send size={11} />
                  </button>
                </div>
              </form>
            </div>

            {/* DISCUSSION FEED */}
            <div className="space-y-3.5">
              {/* Voice Verification Filter Control Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-neutral-950 border border-neutral-900 rounded-2xl">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    📰 Feed Lobby <span className="text-[10px] bg-neutral-900 text-neutral-400 font-mono px-2 py-0.5 rounded-full border border-neutral-800">{displayedPosts.length} posts</span>
                  </span>
                  <span className="text-[10px] text-neutral-500 mt-0.5">Explore stories, polls and suggestions from peers</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 px-3 py-1.5 rounded-xl transition-all">
                  <input
                    type="checkbox"
                    checked={voiceVerifiedOnly}
                    onChange={(e) => setVoiceVerifiedOnly(e.target.checked)}
                    className="rounded accent-rose-500 h-3.5 w-3.5 border-neutral-800 shrink-0 cursor-pointer"
                  />
                  <span className="text-[10px] text-rose-400 font-black uppercase tracking-wider flex items-center gap-1">
                    ★ Filter Voice Verified Only
                  </span>
                </label>
              </div>

              {displayedPosts.length === 0 ? (
                <div className="p-8 text-center bg-[#0f0b0a]/40 border border-dashed border-neutral-800/80 rounded-2xl text-neutral-500">
                  <MessageSquare className="mx-auto w-8 h-8 text-neutral-700 mb-2" />
                  <p className="text-xs">No posts matching your voice verification toggle in this lobby. Try unchecking or be the first to post!</p>
                </div>
              ) : (
                displayedPosts.map((post) => (
                  <div key={post.id} className="bg-[#0f0b0a] border border-neutral-800 rounded-2xl overflow-hidden p-4 space-y-3.5 shadow-md">
                    {/* Author block */}
                    <div className="flex items-center justify-between border-b border-neutral-900/60 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-800 bg-neutral-900">
                          <img referrerPolicy="no-referrer" src={post.authorAvatar} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white">{post.authorNickname}</span>
                            <span className="text-[9px] text-[#22c55e] font-semibold bg-emerald-500/10 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                              <ShieldCheck size={9} /> {post.authorTrustScore}% Trust Score
                            </span>
                            {post.authorVoiceVerified && (
                              <span className="text-[9px] text-rose-400 font-black bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded-full flex items-center gap-0.5 uppercase tracking-wide">
                                ★ Voice DNA Verified
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-[#8e8d8d] flex items-center gap-0.5">
                            <Clock size={9} /> {formatTimestamp(post.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-xs text-neutral-200 mt-1.5 leading-relaxed font-medium">
                      {post.content}
                    </p>

                    {/* Optional Poll View */}
                    {post.poll && (
                      <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-900 space-y-2">
                        <p className="text-[10px] uppercase font-bold text-amber-500 flex items-center gap-1">
                          <PieChart size={11} /> Community Poll: {post.poll.question}
                        </p>
                        
                        <div className="space-y-1.5 mt-1">
                          {post.poll.options.map((opt) => {
                            const totalVotes = post.poll?.options.reduce((acc, current) => acc + current.votes, 0) || 1;
                            const percentage = Math.round((opt.votes / totalVotes) * 100);
                            const voted = post.poll?.userVotedId === opt.id;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => onVote(activeRoomId, post.id, opt.id)}
                                className={`w-full text-left p-2 rounded-lg text-xs relative overflow-hidden flex justify-between border transition-all ${
                                  voted 
                                    ? 'bg-rose-900/10 border-rose-500/40 text-rose-300 font-bold' 
                                    : 'bg-neutral-900/80 hover:bg-neutral-900 border-neutral-800 text-neutral-300'
                                }`}
                              >
                                <div className="absolute inset-y-0 left-0 bg-rose-500/10 transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                                <span className="relative z-10 flex items-center gap-1">
                                  {voted && <Check size={11} className="text-rose-500" />}
                                  {opt.text}
                                </span>
                                <span className="relative z-10 text-neutral-400 text-[10px] font-mono">{opt.votes} votes ({percentage}%)</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Replies loop */}
                    {post.replies.length > 0 && (
                      <div className="border-t border-neutral-900/40 pt-3 space-y-2.5">
                        <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold">Replies</p>
                        {post.replies.map((rep) => (
                          <div key={rep.id} className="flex gap-2.5 p-2 bg-neutral-950/40 rounded-xl border border-neutral-900/80">
                            <img referrerPolicy="no-referrer" src={rep.authorAvatar} alt="" className="w-6 h-6 rounded-full object-cover border border-neutral-800 bg-neutral-900 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold text-neutral-300">{rep.authorNickname}</p>
                              <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{rep.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Write quick reply */}
                    <div className="flex gap-2 pt-1 border-t border-neutral-900/40">
                      <input
                        type="text"
                        placeholder="Reply to this post anonymously..."
                        value={replyInputText[post.id] || ''}
                        onChange={(e) => setReplyInputText({ ...replyInputText, [post.id]: e.target.value })}
                        className="flex-1 bg-neutral-950 border border-neutral-900 rounded-xl px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleReplySubmit(post.id);
                        }}
                      />
                      <button
                        onClick={() => handleReplySubmit(post.id)}
                        className="px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-rose-500 font-bold text-[10px] rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        Reply
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <p className="text-neutral-500 italic text-center text-xs py-10">Lobbies loading...</p>
        )}
      </div>

    </div>
  );
}
