/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  X, 
  MessageCircle, 
  User, 
  ArrowLeft, 
  Send, 
  Sparkles, 
  MapPin, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Info,
  Clock,
  Shield,
  ThumbsUp,
  AlertOctagon,
  Users,
  Lock,
  Wallet,
  PhoneCall,
  Bell,
  ArrowRight,
  RefreshCw,
  LogOut,
  Ban,
  HeartCrack,
  Heart,
  Volume2,
  Mic,
  Palette,
  Camera,
  Upload
} from 'lucide-react';

import { 
  UserSession, 
  AnonymousPeer, 
  ChatMessage, 
  ConversationMatch, 
  DiscussionRoom, 
  CommunityPost, 
  UserReport, 
  AppAnalytics,
  GenderType
} from './types';

import Onboarding from './components/Onboarding';
import CommunityRooms from './components/CommunityRooms';
import AdminPanel from './components/AdminPanel';
import VoiceVerificationModal from './components/VoiceVerificationModal';
import { ANONYMOUS_PEERS } from './profilesData';
// Local mock states to replace Firebase dependencies
const auth = { currentUser: null, signOut: async () => {} };

const MALE_PRESETS = [
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'
];

const FEMALE_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80'
];

export function getSeededPhotosForPeer(uid: string, gender: string, avatar: string): string[] {
  const pool = gender === 'female' ? FEMALE_PRESETS : MALE_PRESETS;
  const filtered = pool.filter(p => !p.includes(avatar.substring(0, 15)));
  return [avatar, ...filtered.slice(0, 3)];
}

export default function App() {
  // Main session state
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('suno_user_session_v1');
    return saved ? JSON.parse(saved) : null;
  });

  // Real-time registered users database state
  const [realRegisteredUsers, setRealRegisteredUsers] = useState<UserSession[]>([]);

  // track firebase auth user independently to trigger Firestore observers safely
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  // Navigation tab: 'home' | 'match' | 'community' | 'admin'
  const [activeTab, setActiveTab] = useState<'home' | 'match' | 'community' | 'admin'>('home');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Profile Custom Photo states
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [showMyProfileModal, setShowMyProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [editorPhotoOption, setEditorPhotoOption] = useState<'preset' | 'upload' | 'url'>('preset');
  const [editorCustomUrl, setEditorCustomUrl] = useState('');
  const [editorUploadError, setEditorUploadError] = useState('');

  // Lightbox photo viewer states
  const [activeLightboxPhotos, setActiveLightboxPhotos] = useState<string[] | null>(null);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number>(0);

  // Synchronize local user session with Neon PostgreSQL backend
  useEffect(() => {
    let activeSession = localStorage.getItem('suno_user_session_v1');
    if (activeSession) {
      try {
        const parsed = JSON.parse(activeSession);
        setFirebaseUser({ uid: parsed.uid });
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed)
        }).catch(err => console.warn("Failed checking user session sync:", err));
      } catch (e) {}
    } else {
      setFirebaseUser({ uid: 'guest_' + Math.random().toString(36).substr(2, 9) });
    }
  }, []);

  // Fetch registered users from Neon Database in real-time
  useEffect(() => {
    let active = true;

    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('HTTP error');
        const data = await response.json();
        if (active && data.users) {
          setRealRegisteredUsers(data.users);
          localStorage.setItem('suno_registered_users_cache', JSON.stringify(data.users));
        }
      } catch (err) {
        console.warn("Neon database users fetching fallback:", err);
        const cached = localStorage.getItem('suno_registered_users_cache');
        if (cached && active) {
          try {
            setRealRegisteredUsers(JSON.parse(cached));
          } catch (e) {}
        }
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Admin authentication form states
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [adminFormTab, setAdminFormTab] = useState<'login' | 'signup'>('login');

  // Dynamic Theme Preset selector
  const [currentTheme, setCurrentTheme] = useState<'sunset' | 'saffron' | 'rose' | 'ocean'>(() => {
    return (localStorage.getItem('suno_theme_v1') as any) || 'saffron';
  });

  // Track opposite-gender likes
  const [likedPeers, setLikedPeers] = useState<string[]>(() => {
    const saved = localStorage.getItem('suno_liked_peers_v1');
    return saved ? JSON.parse(saved) : [];
  });

  // Quick Discovery Filter state on the Matcher tab
  const [discoveryFilterCity, setDiscoveryFilterCity] = useState<string>('All');
  const [discoveryFilterInterest, setDiscoveryFilterInterest] = useState<string>('All');
  const [matchMode, setMatchMode] = useState<'grid' | 'instant' | 'chats'>('chats');
  const [activeConversations, setActiveConversations] = useState<any[]>([]);

  // Matching states
  const [isSearchingMatch, setIsSearchingMatch] = useState(false);
  const [activeMatch, setActiveMatch] = useState<ConversationMatch | null>(null);
  
  // Chat typing states
  const [chatInput, setChatInput] = useState('');
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Community rooms state
  const [rooms, setRooms] = useState<DiscussionRoom[]>([]);
  
  // Reports database state
  const [reports, setReports] = useState<UserReport[]>(() => {
    const savedReports = localStorage.getItem('suno_reports_v1');
    if (savedReports) return JSON.parse(savedReports);
    
    // Default mock report for proof of concept
    return [
      {
        id: 'rep_demo_1',
        reportedUserNickname: 'AbusiveDino',
        reportedUserId: 'usr_mal_badguy',
        reporterNickname: 'CozyListener',
        reason: 'Harassment',
        evidence: [
          'CozyListener: Hi, how is college treating you?',
          'AbusiveDino: Drop dead b**ch, write me some codes or get lost',
          'CozyListener: Let’s keep conversation respectful please'
        ],
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'Pending'
      }
    ];
  });

  // App metrics
  const [analytics, setAnalytics] = useState<AppAnalytics>({
    dau: 480,
    retentionRate: 88,
    messagesSent: 16420,
    abuseReports: 36,
    avgTrustScore: 97.4,
    userGrowthPct: 15.2
  });

  // Free trial timer tick (Ticks down only during active chat)
  const [freeTrialSeconds, setFreeTrialSeconds] = useState(600); // 10 minutes default
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'init' | 'pay' | 'complete'>('init');
  const [paymentOption, setPaymentOption] = useState<'recurring' | 'initial_only'>('initial_only');
  const [paymentError, setPaymentError] = useState('');

  // Payment simulated details
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  // Notifications state
  const [notifications, setNotifications] = useState<{ id: string; text: string; time: string; type: 'alert' | 'success' | 'info' }[]>([
    { id: 'not_1', text: 'Welcome to Suno! Keep notes supportive & safe.', time: 'Just now', type: 'info' }
  ]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Direct chat voice note recorder and playback simulation state variables
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordSeconds, setVoiceRecordSeconds] = useState(0);
  const [playingVoiceMessages, setPlayingVoiceMessages] = useState<Record<string, boolean>>({});
  const [voicePlaybackProgress, setVoicePlaybackProgress] = useState<Record<string, number>>({});

  // Direct chat voice status timer effect
  useEffect(() => {
    let timer: any = null;
    if (isRecordingVoice) {
      setVoiceRecordSeconds(0);
      timer = setInterval(() => {
        setVoiceRecordSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setVoiceRecordSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecordingVoice]);

  // Local matching preferences filters
  const [matchCountryFilter, setMatchCountryFilter] = useState('Any');
  const [matchLanguageFilter, setMatchLanguageFilter] = useState('English');
  const [matchInterestFilter, setMatchInterestFilter] = useState('Any');

  // Persist reports & Session (Local + Firebase Firestore synchronization and local offline database sync)
  useEffect(() => {
    if (userSession) {
      localStorage.setItem('suno_user_session_v1', JSON.stringify(userSession));
      
      // Update local resilient offline user directory cache immediately with the registered details
      try {
        const cached = localStorage.getItem('suno_registered_users_cache');
        let currentCache: UserSession[] = cached ? JSON.parse(cached) : [];
        const index = currentCache.findIndex(u => u.uid === userSession.uid || u.phoneNumber === userSession.phoneNumber);
        if (index > -1) {
          currentCache[index] = { ...currentCache[index], ...userSession };
        } else {
          currentCache.push(userSession);
        }
        localStorage.setItem('suno_registered_users_cache', JSON.stringify(currentCache));
        
        // Ensure state is updated so the login finder recognizes this instantly
        setRealRegisteredUsers(prev => {
          const index = prev.findIndex(u => u.uid === userSession.uid || u.phoneNumber === userSession.phoneNumber);
          if (index > -1) {
            const copy = [...prev];
            copy[index] = { ...copy[index], ...userSession };
            return copy;
          } else {
            return [...prev, userSession];
          }
        });
      } catch (cacheErr) {
        console.warn("Resilient offline cache fallback sync completed with minor update:", cacheErr);
      }

      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userSession)
      }).catch((err) => {
        console.error("Failed to sync user session to Neon PG:", err);
      });
    } else {
      localStorage.removeItem('suno_user_session_v1');
    }
  }, [userSession]);

  // Sync safety reports database in real-time from Neon PG (Restrict to Admins only)
  useEffect(() => {
    if (!userSession || !userSession.isAdmin) return;
    let active = true;

    const fetchReports = async () => {
      try {
        const response = await fetch('/api/reports');
        if (!response.ok) throw new Error('HTTP error');
        const data = await response.json();
        if (active && data.reports) {
          setReports(data.reports);
        }
      } catch (err) {
        console.error("Neon reports fetching error:", err);
      }
    };

    fetchReports();
    const interval = setInterval(fetchReports, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userSession?.isAdmin]);

  // Sync public discussion posts from Neon PG and merge with pre-defined rooms
  useEffect(() => {
    if (!userSession) return;
    let active = true;

    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/posts');
        if (!response.ok) throw new Error('HTTP error');
        const data = await response.json();
        if (!active || !data.posts) return;

        const dbPosts = data.posts;
        setRooms(prevRooms => {
          if (prevRooms.length === 0) return prevRooms;
          return prevRooms.map(room => {
            const roomDbPosts = dbPosts.filter((p: any) => p.roomId === room.id);
            const mergedPostsMap = new Map<string, CommunityPost>();

            roomDbPosts.forEach((p: any) => {
              mergedPostsMap.set(p.id, {
                id: p.id,
                authorNickname: p.authorNickname,
                authorAvatar: p.authorAvatar,
                authorTrustScore: p.authorTrustScore,
                authorVoiceVerified: p.authorVoiceVerified,
                content: p.content,
                timestamp: p.timestamp,
                poll: p.poll,
                replies: p.replies || []
              });
            });

            room.posts.forEach(p => {
              if (!mergedPostsMap.has(p.id)) {
                mergedPostsMap.set(p.id, p);
              }
            });

            const sortedPosts = Array.from(mergedPostsMap.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            return {
              ...room,
              posts: sortedPosts
            };
          });
        });
      } catch (err) {
        console.error("Neon posts fetching error:", err);
      }
    };

    fetchPosts();
    const interval = setInterval(fetchPosts, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [rooms.length, userSession?.uid]);

  // Fetch Community Rooms on initialization
  useEffect(() => {
    fetch('/api/communities')
      .then(res => res.json())
      .then(data => {
        if (data.communities) {
          setRooms(data.communities);
        }
      })
      .catch(err => {
        console.error('Failed to load community boards:', err);
      });
  }, []);

  // Listen to all active private chat rooms where current user is a member (Neon PG WhatsApp Inbox)
  useEffect(() => {
    if (!userSession?.uid) return;
    let active = true;

    const fetchChats = async () => {
      try {
        const response = await fetch(`/api/chats?uid=${encodeURIComponent(userSession.uid)}`);
        if (!response.ok) throw new Error('HTTP error');
        const data = await response.json();
        if (active && data.chats) {
          const loadedChats = data.chats;
          loadedChats.sort((a: any, b: any) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
          setActiveConversations(loadedChats);
        }
      } catch (err) {
        console.warn("Neon chats fetching error:", err);
      }
    };

    fetchChats();
    const interval = setInterval(fetchChats, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userSession?.uid]);

  // Listen to active chat room messages in real-time (Neon PG Active Chat)
  useEffect(() => {
    if (!userSession || !activeMatch) return;

    const roomId = [userSession.uid, activeMatch.peer.uid].sort().join('_');
    let active = true;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/chats/${roomId}/messages`);
        if (!response.ok) throw new Error('HTTP error');
        const data = await response.json();
        if (!active) return;

        const msgsList = data.messages || [];
        msgsList.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        if (msgsList.length === 0) {
          console.log("Empty chatroom list - seeding system starting notifications to Neon PG.");
          const sysNotice: ChatMessage = {
            id: `sys_info_${Date.now()}`,
            senderId: 'system',
            senderNickname: 'Suno Provider',
            content: `🛡️ Anonymous session initialized. Your phone/exact credentials are end-to-end encrypted. Never share personal socials, WhatsApp values, or direct email. Safe moderation rules are active.`,
            timestamp: new Date().toISOString(),
            moderated: false,
            systemAlert: true
          };
          const welcomeReply: ChatMessage = {
            id: `starter_${Date.now()}`,
            senderId: activeMatch.peer.uid,
            senderNickname: activeMatch.peer.nickname,
            content: `Hello! I see we share interests in ${activeMatch.peer.interests.slice(0, 2).join(' & ')}. I'm always open to talking through problems. What's on your mind?`,
            timestamp: new Date().toISOString(),
            moderated: false
          };

          await fetch(`/api/chats/${roomId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sysNotice)
          });

          await fetch(`/api/chats/${roomId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(welcomeReply)
          });
        } else {
          setActiveMatch(prev => {
            if (!prev || [userSession.uid, prev.peer.uid].sort().join('_') !== roomId) return prev;
            return {
              ...prev,
              messages: msgsList
            };
          });
        }
      } catch (err) {
        console.warn("Neon messages fetching error:", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeMatch?.peer?.uid, userSession?.uid]);

  // TICK THE CONVERSATION TRIAL TIME (Ticks only during active match and when premium is not unlocked)
  useEffect(() => {
    if (!activeMatch) return;
    if (userSession?.paymentDetails.isPremiumSignedUp) return;

    const interval = setInterval(() => {
      setFreeTrialSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowPaymentModal(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeMatch, userSession?.paymentDetails.isPremiumSignedUp]);

  // Scroll active chat screen to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMatch?.messages, isPeerTyping]);

  if (!userSession) {
    return <Onboarding realRegisteredUsers={realRegisteredUsers} onComplete={(session) => {
      const finalSession = session;
      setUserSession(finalSession);
      localStorage.setItem('suno_user_session_v1', JSON.stringify(finalSession));
      
      // Persist to Neon Postgres Database
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalSession)
      }).catch(err => console.error("Onboarding sync failure:", err));

      // Trigger user welcome system alert
      setNotifications(prev => [
        { 
          id: `not_${Date.now()}`, 
          text: `Device Fingerprint Authorized. Nickname: ${finalSession.nickname}. Status: ${finalSession.offenseStatus.toUpperCase()}`, 
          time: 'Just now', 
          type: 'success' 
        },
        ...prev
      ]);
    }} />;
  }

  // --- ACTIONS ---

  // Safety trigger warning / offense escalation
  const handleOffenseEscalation = (reason: string) => {
    if (!userSession) return;
    
    const count = userSession.offenseCount + 1;
    let status: 'clear' | 'warned' | 'muted' | 'suspended' | 'banned' = 'warned';
    let alertText = '';

    if (count === 1) {
      status = 'warned';
      alertText = `[Moderator Warning]: Abuse/PII attempt caught in active server. Trust score decreased to 80.`;
    } else if (count === 2) {
      status = 'muted';
      alertText = `[Moderator Mute Alert]: Repeated system policy breaches. Your ability to write is muted temporarily.`;
    } else {
      status = 'banned';
      alertText = `[Account Suspended/Banned]: Your device is barred from accessing standard Suno matcher server due to structural misconduct.`;
    }

    const updatedUser: UserSession = {
      ...userSession,
      offenseCount: count,
      offenseStatus: status,
      trustScore: Math.max(0, userSession.trustScore - 20)
    };

    setUserSession(updatedUser);
    setNotifications(prev => [
      { id: `not_abuse_${Date.now()}`, text: alertText, time: 'Just now', type: 'alert' },
      ...prev
    ]);
  };

  const handleThemeChange = (newTheme: 'sunset' | 'saffron' | 'rose' | 'ocean') => {
    setCurrentTheme(newTheme);
    localStorage.setItem('suno_theme_v1', newTheme);
    setNotifications(prev => [
      { id: `not_theme_${Date.now()}`, text: `🎨 Theme switched successfully to ${newTheme.toUpperCase()} mode!`, time: 'Just now', type: 'success' },
      ...prev
    ]);
  };

  const handleLikePeer = (peerId: string, peerNickname: string) => {
    let updated: string[];
    if (likedPeers.includes(peerId)) {
      updated = likedPeers.filter(id => id !== peerId);
    } else {
      updated = [...likedPeers, peerId];
      // Trigger a beautiful matching notification/confetti
      setNotifications(prev => [
        { 
          id: `like_${Date.now()}`, 
          text: `💖 Match Connection Sealed! You and ${peerNickname} liked each other! Text messaging is now officially unlocked.`, 
          time: 'Just now', 
          type: 'success' 
        },
        ...prev
      ]);
    }
    setLikedPeers(updated);
    localStorage.setItem('suno_liked_peers_v1', JSON.stringify(updated));
  };

  const handleOpenConversation = (chat: any) => {
    if (!userSession) return;
    const peer = chat.user1.uid === userSession.uid ? chat.user2 : chat.user1;
    const match: ConversationMatch = {
      id: chat.id,
      peer: peer,
      startedAt: chat.startedAt || new Date().toISOString(),
      lastMessageAt: chat.lastMessageAt || new Date().toISOString(),
      active: true,
      messages: []
    };
    setActiveMatch(match);
  };

  const startMatchWithPeer = (peer: any) => {
    if (!userSession) return;
    if (userSession?.offenseStatus === 'banned') {
      alert("Misconduct Alert: Access prohibited.");
      return;
    }

    setIsSearchingMatch(true);

    setTimeout(async () => {
      const roomId = [userSession.uid, peer.uid].sort().join('_');
      const newMatch: ConversationMatch = {
        id: roomId,
        peer: peer,
        startedAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        active: true,
        messages: [
          {
            id: `sys_info_${Date.now()}`,
            senderId: 'system',
            senderNickname: 'Suno India Protector',
            content: `🛡️ Anonymous session initialized. Your phone/exact credentials are end-to-end encrypted. Never share personal socials, WhatsApp values, or direct email. Safe moderation rules are active.`,
            timestamp: new Date().toISOString(),
            moderated: false,
            systemAlert: true
          },
          {
            id: `starter_${Date.now()}`,
            senderId: peer.uid,
            senderNickname: peer.nickname,
            content: `Hello! I see we share interests in ${peer.interests.slice(0, 2).join(' & ')}. I'm always open to talking through problems. What's on your mind?`,
            timestamp: new Date().toISOString(),
            moderated: false
          }
        ]
      };

      try {
        await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: roomId,
            uids: [userSession.uid, peer.uid],
            lastMessage: `Connected with ${peer.nickname}`,
            lastMessageAt: new Date().toISOString(),
            startedAt: new Date().toISOString(),
            user1: {
              uid: userSession.uid,
              nickname: userSession.nickname,
              avatar: userSession.avatar,
              gender: userSession.gender,
              interests: userSession.interests,
              bio: userSession.bio,
              trustScore: userSession.trustScore,
              voiceVerified: userSession.voiceVerified || false,
              language: userSession.language
            },
            user2: {
              uid: peer.uid,
              nickname: peer.nickname,
              avatar: peer.avatar,
              gender: peer.gender,
              interests: peer.interests,
              bio: peer.bio,
              trustScore: peer.trustScore,
              voiceVerified: peer.voiceVerified || false,
              language: peer.language
            }
          })
        });

        await fetch(`/api/chats/${roomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMatch.messages[0])
        });

        await fetch(`/api/chats/${roomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMatch.messages[1])
        });
      } catch (err) {
        console.error("Neon PG chat initialization failed:", err);
      }

      setActiveMatch(newMatch);
      setIsSearchingMatch(false);
      setNotifications(prev => [
        { id: `not_m_${Date.now()}`, text: `🔒 Connected with ${peer.nickname}. Safe match room opened!`, time: 'Just now', type: 'success' },
        ...prev
      ]);
    }, 1200);
  };

  // Safe Matching Search Routine (No swiping - smart overlap of Interests and Language)
  const handleTriggerMatch = () => {
    if (userSession.offenseStatus === 'banned') {
      alert("Misconduct Alert: Access prohibited. Your profile is currently banned.");
      return;
    }

    setIsSearchingMatch(true);

    setTimeout(async () => {
      // Find candidate peers matching preferences from real live Firestore pool
      let possiblePeers = realRegisteredUsers.filter(p => p.uid !== userSession.uid && p.country === 'India');

      // Gender Matching Rule: Boys match with Girls, Girls match with Good Boys
      if (userSession.gender === 'male') {
        possiblePeers = possiblePeers.filter(p => p.gender === 'female');
      } else if (userSession.gender === 'female') {
        // Girls match with GOOD boys (Males with reputation rating >= 85)
        possiblePeers = possiblePeers.filter(p => p.gender === 'male' && p.trustScore >= 85);
      }

      // Filter by verified only if user requested female safety mode
      if (userSession.safetySettings.verifiedUsersOnly) {
        possiblePeers = possiblePeers.filter(p => p.trustScore >= 90);
      }

      // Filter by language criteria if matched elements exist
      const matchingLang = possiblePeers.filter(p => p.language.toLowerCase() === matchLanguageFilter.toLowerCase());
      if (matchingLang.length > 0) {
        possiblePeers = matchingLang;
      }

      // Interest match preference if matched elements exist
      if (matchInterestFilter !== 'Any') {
        const matchingInterest = possiblePeers.filter(p => p.interests.includes(matchInterestFilter));
        if (matchingInterest.length > 0) {
          possiblePeers = matchingInterest;
        }
      }

      // Fallback to primary localized list if empty to ensure a good match
      if (possiblePeers.length === 0) {
        possiblePeers = realRegisteredUsers.filter(p => p.uid !== userSession.uid && p.country === 'India');
        if (userSession.gender === 'male') {
          possiblePeers = possiblePeers.filter(p => p.gender === 'female');
        } else if (userSession.gender === 'female') {
          possiblePeers = possiblePeers.filter(p => p.gender === 'male');
        }
      }

      // If absolutely no opposite gender is registered yet, provide high-quality fallback or notify
      if (possiblePeers.length === 0) {
        setIsSearchingMatch(false);
        alert("Search Notice: All other profiles are currently busy or offline. Please browse profiles and send a friendly direct message!");
        return;
      }

      // Pick randomly
      const chosenPeer = possiblePeers[Math.floor(Math.random() * possiblePeers.length)];
      const roomId = [userSession.uid, chosenPeer.uid].sort().join('_');

      const newMatch: ConversationMatch = {
        id: roomId,
        peer: chosenPeer,
        startedAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        active: true,
        messages: [
          {
            id: `sys_info_${Date.now()}`,
            senderId: 'system',
            senderNickname: 'Suno Protector',
            content: `🛡️ Anonymous session initialized. Your phone/exact credentials are end-to-end encrypted. Never share personal socials, WhatsApp values, or direct email. Safe moderation rules are active.`,
            timestamp: new Date().toISOString(),
            moderated: false,
            systemAlert: true
          },
          {
            id: `starter_${Date.now()}`,
            senderId: chosenPeer.uid,
            senderNickname: chosenPeer.nickname,
            content: `Hello! I see we share interests in ${chosenPeer.interests.slice(0, 2).join(' & ')}. I'm always open to talking through problems. What's on your mind?`,
            timestamp: new Date().toISOString(),
            moderated: false
          }
        ]
      };

      try {
        await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: roomId,
            uids: [userSession.uid, chosenPeer.uid],
            lastMessage: `Connected with ${chosenPeer.nickname}`,
            lastMessageAt: new Date().toISOString(),
            startedAt: new Date().toISOString(),
            user1: {
              uid: userSession.uid,
              nickname: userSession.nickname,
              avatar: userSession.avatar,
              gender: userSession.gender,
              interests: userSession.interests,
              bio: userSession.bio,
              trustScore: userSession.trustScore,
              voiceVerified: userSession.voiceVerified || false,
              language: userSession.language
            },
            user2: {
              uid: chosenPeer.uid,
              nickname: chosenPeer.nickname,
              avatar: chosenPeer.avatar,
              gender: chosenPeer.gender,
              interests: chosenPeer.interests,
              bio: chosenPeer.bio,
              trustScore: chosenPeer.trustScore,
              voiceVerified: chosenPeer.voiceVerified || false,
              language: chosenPeer.language
            }
          })
        });

        await fetch(`/api/chats/${roomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMatch.messages[0])
        });

        await fetch(`/api/chats/${roomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMatch.messages[1])
        });
      } catch (err) {
        console.error("Neon PG random match initialization failed:", err);
      }

      setActiveMatch(newMatch);
      setIsSearchingMatch(false);
      setNotifications(prev => [
        { id: `not_m_${Date.now()}`, text: `🔒 Connected with ${chosenPeer.nickname}. Safe match room opened!`, time: 'Just now', type: 'success' },
        ...prev
      ]);
    }, 2200);
  };

  // Exit Match instantly
  const handleInstantExitChat = () => {
    if (!activeMatch) return;
    const peerName = activeMatch.peer.nickname;
    setActiveMatch(null);
    setNotifications(prev => [
      { id: `not_exit_${Date.now()}`, text: `Match with ${peerName} closed securely. Chat cache purged.`, time: 'Just now', type: 'info' },
      ...prev
    ]);
  };

  // Send Direct Message logic with real-time server-side Gemini Content/Abuse Moderator
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeMatch || !userSession) return;

    if (userSession.offenseStatus === 'muted' || userSession.offenseStatus === 'banned') {
      alert("Chat Prevented: You are temporarily muted/suspended due to content quality rules.");
      return;
    }

    const textToSend = chatInput.trim();
    setChatInput('');

    // Prepare user's message using their actual real UID
    const userMsg: ChatMessage = {
      id: `msg_usr_${Date.now()}`,
      senderId: userSession.uid,
      senderNickname: userSession.nickname,
      content: textToSend,
      timestamp: new Date().toISOString(),
      moderated: false
    };

    const roomId = [userSession.uid, activeMatch.peer.uid].sort().join('_');

    try {
      // 1. Immediately save user message to Neon PG REST API so it shows up in real-time
      await fetch(`/api/chats/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMsg)
      });

      // 2. Update room meta last message and timestamp
      const chatUpdate = {
        id: roomId,
        lastMessage: textToSend,
        lastMessageAt: new Date().toISOString()
      };
      await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatUpdate)
      });

      // Call server API for real-time moderation audit (and speech response if simulated)
      const isPeerSimulated = activeMatch.peer.uid.startsWith('peer_');
      setIsPeerTyping(true);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...activeMatch.messages, userMsg].filter(m => !m.systemAlert),
          peerProfile: activeMatch.peer,
          userProfile: userSession,
          latestMessageContent: textToSend
        })
      });

      const data = await response.json();
      
      // Handle Moderation Flags returning from Server!
      if (data.moderated && data.safetyVerdict) {
        handleOffenseEscalation(data.safetyVerdict.reason);

        const sysNotice: ChatMessage = {
          id: `sys_mod_${Date.now()}`,
          senderId: 'system',
          senderNickname: 'Moderator Warning',
          content: `⚠️ [Misconduct Warning]: Message retracted! It breached safety policy: "${data.safetyVerdict.reason}". System logs updated.`,
          timestamp: new Date().toISOString(),
          moderated: true,
          moderationLabel: data.safetyVerdict.reason,
          systemAlert: true
        };

        // Redact the bad message in Neon PG immediately
        const redactedMsg = {
          ...userMsg,
          content: `⚠️ [Message Blocked by Safe Moderation - ${data.safetyVerdict.reason}]`,
          moderated: true,
          moderationLabel: data.safetyVerdict.reason
        };
        await fetch(`/api/chats/${roomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(redactedMsg)
        });

        // Add system warn document to subcollection
        await fetch(`/api/chats/${roomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sysNotice)
        });

      } else if (isPeerSimulated && data.reply) {
        // Only append AI reply if the peer is simulated!
        const isVoiceReply = Math.random() < 0.4;
        const peerReply: ChatMessage = {
          id: `msg_peer_${Date.now()}`,
          senderId: activeMatch.peer.uid,
          senderNickname: activeMatch.peer.nickname,
          content: data.reply,
          timestamp: new Date().toISOString(),
          moderated: false,
          isVoice: isVoiceReply,
          voiceDuration: isVoiceReply ? Math.floor(4 + Math.random() * 8) : undefined
        };

        await fetch(`/api/chats/${roomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(peerReply)
        });

        const chatResultUpdate = {
          id: roomId,
          lastMessage: data.reply,
          lastMessageAt: new Date().toISOString()
        };
        await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatResultUpdate)
        });

        // Trigger notifications beep/shake
        setNotifications(prev => [
          { 
            id: `msg_not_${Date.now()}`, 
            text: `💬 New message from ${activeMatch.peer.nickname}`, 
            time: 'Just now', 
            type: 'info' 
          },
          ...prev
        ]);
      }

    } catch (err) {
      console.error('Chat routing error:', err);
      // Soft safety response offline fallback for simulated sessions
      if (activeMatch.peer.uid.startsWith('peer_')) {
        const errorReply: ChatMessage = {
          id: `msg_err_${Date.now()}`,
          senderId: activeMatch.peer.uid,
          senderNickname: activeMatch.peer.nickname,
          content: `Thanks for chatting! I am reflective and thinking about how to frame safe advice. Let's talk more.`,
          timestamp: new Date().toISOString(),
          moderated: false
        };
        await fetch(`/api/chats/${roomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorReply)
        }).catch(e => console.error(e));
      }
    } finally {
      setIsPeerTyping(false);
    }
  };

  // Speaks an voice note dynamically via SpeechSynthesis and advances visual waveforms
  const playVoiceMessage = (id: string, text: string, isFromUser: boolean, duration: number) => {
    if (playingVoiceMessages[id]) {
      setPlayingVoiceMessages(prev => ({ ...prev, [id]: false }));
      try {
        window.speechSynthesis?.cancel();
      } catch (e) {}
      return;
    }

    try {
      window.speechSynthesis?.cancel();
    } catch (e) {}

    setPlayingVoiceMessages(prev => ({ ...prev, [id]: true }));
    setVoicePlaybackProgress(prev => ({ ...prev, [id]: 0 }));

    try {
      if ('speechSynthesis' in window) {
        const speakText = text.includes("🎙️") || text.includes("Acoustic")
          ? (isFromUser ? "Playing your customized voice note DNA" : `Hi! This is ${activeMatch?.peer.nickname || "your anonymous friend"} sharing an acoustic voice signature. Let's keep our chats supportive and positive!`)
          : text;

        const utterance = new SpeechSynthesisUtterance(speakText);
        utterance.rate = 1.05;
        
        // Tone pitch settings: Girls prefer a higher pitch, Boys prefer lower grounded baritone pitch
        const genderVal = isFromUser 
          ? (userSession?.gender) 
          : (activeMatch?.peer.gender);

        if (genderVal === 'female') {
          utterance.pitch = 1.35; // melodic Feminine range
        } else if (genderVal === 'male') {
          utterance.pitch = 0.85; // grounded Masculine range
        } else {
          utterance.pitch = 1.05;
        }

        utterance.onend = () => {
          setPlayingVoiceMessages(prev => ({ ...prev, [id]: false }));
          setVoicePlaybackProgress(prev => ({ ...prev, [id]: 100 }));
        };

        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.warn("Audio speech skipped or visual-only progression fallback selected:", err);
    }

    // Visually increment state bars
    const stepTimeMs = (duration * 1000) / 100;
    let progress = 0;
    const interval = setInterval(() => {
      progress += 1.5;
      setVoicePlaybackProgress(prev => {
        if (progress >= 100) {
          clearInterval(interval);
          setPlayingVoiceMessages(curr => ({ ...curr, [id]: false }));
          return { ...prev, [id]: 100 };
        }
        return { ...prev, [id]: Math.min(progress, 100) };
      });
    }, stepTimeMs);
  };

  // Commits and sends simulated/recorded voice notes to the active peer-to-peer chat
  const handleSendVoiceNote = async () => {
    if (!activeMatch || !userSession) return;
    const duration = voiceRecordSeconds || 4;
    setIsRecordingVoice(false);

    if (userSession.offenseStatus === 'muted' || userSession.offenseStatus === 'banned') {
      alert("Chat Prevented: You are temporarily muted from recorded voice submissions.");
      return;
    }

    const voiceMsg: ChatMessage = {
      id: `msg_usr_voice_${Date.now()}`,
      senderId: userSession.uid,
      senderNickname: userSession.nickname,
      content: `🎙️ Acoustic Voice Message (${duration}s)`,
      timestamp: new Date().toISOString(),
      moderated: false,
      isVoice: true,
      voiceDuration: duration
    };

    const roomId = [userSession.uid, activeMatch.peer.uid].sort().join('_');

    try {
      // 1. Save voice message directly to Neon PG messages endpoint
      await fetch(`/api/chats/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voiceMsg)
      });

      // 2. Update room meta last message
      const chatUpdate = {
        id: roomId,
        lastMessage: `🎙️ Acoustic Voice Message (${duration}s)`,
        lastMessageAt: new Date().toISOString()
      };
      await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatUpdate)
      });

      const isPeerSimulated = activeMatch.peer.uid.startsWith('peer_');
      setIsPeerTyping(true);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...activeMatch.messages, voiceMsg].filter(m => !m.systemAlert),
          peerProfile: activeMatch.peer,
          userProfile: userSession,
          latestMessageContent: `[User successfully sent a voice message signature of length ${duration} seconds]`
        })
      });

      const data = await response.json();
      
      if (isPeerSimulated && data.reply) {
        // Appends Peer's corresponding response (40% chance of voice notes too!)
        const isVoiceReply = Math.random() < 0.4;
        const peerReply: ChatMessage = {
          id: `msg_peer_${Date.now()}`,
          senderId: activeMatch.peer.uid,
          senderNickname: activeMatch.peer.nickname,
          content: data.reply,
          timestamp: new Date().toISOString(),
          moderated: false,
          isVoice: isVoiceReply,
          voiceDuration: isVoiceReply ? Math.floor(4 + Math.random() * 8) : undefined
        };

        await fetch(`/api/chats/${roomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(peerReply)
        });

        const chatResultUpdate = {
          id: roomId,
          lastMessage: data.reply,
          lastMessageAt: new Date().toISOString()
        };
        await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatResultUpdate)
        });
      }
    } catch (e) {
      console.error("Failed to generate response for voice message:", e);
    } finally {
      setIsPeerTyping(false);
    }
  };

  const handleChatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeMatch || !userSession) return;

    if (userSession.offenseStatus === 'muted' || userSession.offenseStatus === 'banned') {
      alert("Chat Prevented: You are temporarily restricted from uploads.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;

      const userMsg: ChatMessage = {
        id: `msg_usr_img_${Date.now()}`,
        senderId: userSession.uid,
        senderNickname: userSession.nickname,
        content: `🖼️ Shared a picture`,
        timestamp: new Date().toISOString(),
        moderated: false,
        imageUrl: dataUrl
      };

      const roomId = [userSession.uid, activeMatch.peer.uid].sort().join('_');

      try {
        await fetch(`/api/chats/${roomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userMsg)
        });

        const chatUpdate = {
          id: roomId,
          lastMessage: `🖼️ Photo Attachment`,
          lastMessageAt: new Date().toISOString()
        };
        await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatUpdate)
        });

        // Simulate typing peer response with some fun text
        if (activeMatch.peer.uid.startsWith('peer_')) {
          setIsPeerTyping(true);
          setTimeout(async () => {
            const peerReply: ChatMessage = {
              id: `msg_peer_${Date.now()}`,
              senderId: activeMatch.peer.uid,
              senderNickname: activeMatch.peer.nickname,
              content: `Wow, that looks amazing! Thanks for sharing this photo with me.`,
              timestamp: new Date().toISOString(),
              moderated: false
            };
            
            await fetch(`/api/chats/${roomId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(peerReply)
            }).catch(e => console.error(e));

            setIsPeerTyping(false);
          }, 1500);
        }
      } catch (err) {
        console.error("Neon database image upload failed:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Abuse Report on active match peer
  const handleReportPeer = (reason: 'Harassment' | 'Abuse/Threats' | 'Sexual content' | 'Fake profile' | 'Spam' | 'PII Sharing') => {
    if (!activeMatch) return;
    
    // Extract recent chats context for evidence logs
    const evidenceLines = activeMatch.messages
      .filter(m => !m.systemAlert)
      .slice(-4)
      .map(m => `${m.senderNickname}: ${m.content}`);

    const newTicket: UserReport = {
      id: `ticket_${Date.now()}`,
      reportedUserNickname: activeMatch.peer.nickname,
      reportedUserId: activeMatch.peer.uid,
      reporterNickname: userSession.nickname,
      reason: reason,
      evidence: evidenceLines,
      timestamp: new Date().toISOString(),
      status: 'Pending'
    };

    // Save ticket document securely to Neon PG reports collection
    fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTicket)
    })
      .then(() => {
        setReports(prev => [newTicket, ...prev]);
      })
      .catch((err) => {
        console.error("Failed to sync abuse ticket to Neon PG:", err);
      });

    // Close conversations on severe reports
    setActiveMatch(null);

    setNotifications(prev => [
      { id: `rep_ack_${Date.now()}`, text: `🛡️ Report on ${newTicket.reportedUserNickname} logged. Moderator reviewing. Match terminated safely.`, time: 'Just now', type: 'success' },
      ...prev
    ]);

    alert("Thank you. Safety is Suno's highest priority. The match has been blocked instantly, and the flagged evidence transcript has been forwarded to our admin moderation console.");
  };

  // --- TRIAL BILLING & PAYMENT GATEWAY SUBMISSION SIMULATOR ---
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');

    if (!cardHolder.trim() || cardNumber.length < 12) {
      setPaymentError('Please fill detailed Payment instrument fields properly. Demo Code: 16 digits.');
      return;
    }

    setPaymentStep('pay');

    // Simulate safe banks redirect
    setTimeout(() => {
      // Success! Grant premium features
      const costAmount = paymentOption === 'recurring' ? '₹500 / month AutoPay' : '₹5 initial token';
      
      const updatedUser: UserSession = {
        ...userSession,
        paymentDetails: {
          freeTrialMinutesLeft: 999999, // Unbounded
          isPremiumSignedUp: true,
          hasAutoPayEnabled: paymentOption === 'recurring'
        }
      };

      setUserSession(updatedUser);
      setPaymentStep('complete');

      setNotifications(prev => [
        { 
          id: `pay_s_${Date.now()}`, 
          text: `🎉 Payment successful (${costAmount}). Safe Unlimited Suno Core fully activated!`, 
          time: 'Just now', 
          type: 'success' 
        },
        ...prev
      ]);
    }, 1500);
  };

  // --- SUBMISSION ACTIONS FOR COMMUNITES MODULES WITH FIRESTORE BACKING ---
  const handleAddCommunityPost = (roomId: string, content: string, pollQuestion?: string, pollOptions?: string[]) => {
    const postId = `post_${Date.now()}`;
    const newPost: any = {
      id: postId,
      roomId: roomId,
      authorNickname: userSession.nickname,
      authorAvatar: userSession.avatar,
      authorTrustScore: userSession.trustScore,
      authorVoiceVerified: !!userSession.voiceVerified,
      content: content,
      timestamp: new Date().toISOString(),
      replies: []
    };

    if (pollQuestion && pollOptions) {
      newPost.poll = {
        question: pollQuestion,
        options: pollOptions.map((text, idx) => ({ id: `opt_${Date.now()}_${idx}`, text, votes: 0 })),
      };
    }

    fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost)
    })
      .then(() => {
        setNotifications(prev => [
          { id: `post_n_${Date.now()}`, text: `📝 Anonymously posted in public lobby!`, time: 'Just now', type: 'success' },
          ...prev
        ]);
      })
      .catch((err) => {
        console.error("Failed to write community post to Neon PG:", err);
      });
  };

  const handleAddCommunityReply = (roomId: string, postId: string, replyContent: string) => {
    const activePost = rooms.flatMap(r => r.posts).find(p => p.id === postId);
    if (activePost) {
      const newReply = {
        id: `rep_${Date.now()}`,
        authorNickname: userSession.nickname,
        authorAvatar: userSession.avatar,
        content: replyContent,
        timestamp: new Date().toISOString()
      };

      const updatedReplies = [...(activePost.replies || []), newReply];
      const fullPostWithReply = {
        ...activePost,
        roomId: roomId,
        replies: updatedReplies
      };

      fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullPostWithReply)
      }).catch(err => {
        console.error("Failed to save reply to Neon PG:", err);
      });
    }
  };

  const handleVotePoll = (roomId: string, postId: string, optionId: string) => {
    const activePost = rooms.flatMap(r => r.posts).find(p => p.id === postId);
    if (activePost && activePost.poll) {
      if (activePost.poll.userVotedId) return; // prevent double vote

      const updatedPoll = {
        ...activePost.poll,
        userVotedId: optionId,
        options: activePost.poll.options.map(opt => opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt)
      };

      const fullPostWithVote = {
        ...activePost,
        roomId: roomId,
        poll: updatedPoll
      };

      fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullPostWithVote)
      }).catch(err => {
        console.error("Failed to vote to Neon PG:", err);
      });
    }
  };

  // --- SUBMISSIONS FROM ADMIN PANEL CONSOLE ---
  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');

    if (adminUsername.trim() === 'admin' && adminPassword === 'suno_admin_2026') {
      const adminSession: UserSession = {
        uid: 'usr_suno_admin',
        nickname: 'SystemAdmin',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        city: 'Delhi',
        isAdmin: true,
        ageRange: '25-34',
        gender: 'male',
        country: 'India',
        language: 'Hindi',
        interests: ['Mental Wellness', 'Supportive Spaces', 'Community Guild', 'Hindi Talk'],
        bio: 'Suno System Owner & Moderator Supervisor Hub.',
        trustScore: 100,
        offenseCount: 0,
        offenseStatus: 'clear',
        safetySettings: {
          hideGender: false,
          anonymousMode: false,
          limitIncomingChats: false,
          verifiedUsersOnly: false
        },
        paymentDetails: {
          freeTrialMinutesLeft: 99999,
          isPremiumSignedUp: true,
          hasAutoPayEnabled: true
        }
      };
      setUserSession(adminSession);
      localStorage.setItem('suno_user_session_v1', JSON.stringify(adminSession));
      alert("Administrator Access Protocols Engaged successfully.");
    } else {
      setAdminAuthError('Invalid Admin credentials. Check details listed on screen carefully.');
    }
  };

  const handleAdminSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');

    if (adminPasscode === 'suno_admin_2026' || adminPasscode === 'suno_master_key') {
      if (userSession) {
        const elevated = { ...userSession, isAdmin: true };
        setUserSession(elevated);
        localStorage.setItem('suno_user_session_v1', JSON.stringify(elevated));
        alert(`Congratulations! Current Profile "${userSession.nickname}" has been successfully elevated with permanent Admin privileges.`);
      } else {
        // No account exists, create one with Hindi & Admin permissions
        const generatedUser: UserSession = {
          uid: `usr_elevated_${Date.now()}`,
          nickname: 'SunoModerator',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
          city: 'Delhi',
          isAdmin: true,
          ageRange: '25-34',
          gender: 'male',
          country: 'India',
          language: 'Hindi',
          interests: ['Mental Wellness', 'Supportive Spaces'],
          bio: 'Decentralized Peer Moderator Account',
          trustScore: 100,
          offenseCount: 0,
          offenseStatus: 'clear',
          safetySettings: {
            hideGender: false,
            anonymousMode: false,
            limitIncomingChats: false,
            verifiedUsersOnly: false
          },
          paymentDetails: {
            freeTrialMinutesLeft: 99999,
            isPremiumSignedUp: true,
            hasAutoPayEnabled: true
          }
        };
        setUserSession(generatedUser);
        localStorage.setItem('suno_user_session_v1', JSON.stringify(generatedUser));
        alert("A new Administrator Profile has been deployed and selected.");
      }
    } else {
      setAdminAuthError('Invalid Admin Master Passcode. Use suno_admin_2026 or suno_master_key for authorization.');
    }
  };

  const handleReviewReport = (reportId: string, action: 'Dismiss' | 'Reviewed_Warning' | 'Reviewed_Mute' | 'Reviewed_Suspended' | 'Reviewed_Banned') => {
    // Modify report state
    setReports(prev => prev.filter(r => r.id !== reportId));
    
    // Simulate updating analytics/warnings metric bounds
    setAnalytics(prev => ({
      ...prev,
      abuseReports: prev.abuseReports + 1
    }));

    alert(`Moderator action logged successfully: Ticket Resolved (${action}). System logs updated.`);
  };

  const handleToggleHideGender = () => {
    if (!userSession) return;
    const hide = !userSession.safetySettings.hideGender;
    setUserSession({
      ...userSession,
      safetySettings: {
        ...userSession.safetySettings,
        hideGender: hide
      }
    });

    setNotifications(prev => [
      { id: `not_s_${Date.now()}`, text: hide ? '🎭 Gender tag disabled. Gender is fully hidden in matching views.' : '🏷️ Gender tag enabled on profile.', time: 'Just now', type: 'info' },
      ...prev
    ]);
  };

  const handleToggleVerifiedOnly = () => {
    if (!userSession) return;
    const verified = !userSession.safetySettings.verifiedUsersOnly;
    setUserSession({
      ...userSession,
      safetySettings: {
        ...userSession.safetySettings,
        verifiedUsersOnly: verified
      }
    });

    setNotifications(prev => [
      { id: `not_v_${Date.now()}`, text: verified ? '⭐ Verified Safe Mode: You will only match with high reputation score (>=95) peers.' : '⭐ Open matching enabled.', time: 'Just now', type: 'info' },
      ...prev
    ]);
  };

  const triggerPlayPeerVoiceGreeting = (peer: AnonymousPeer) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        let message = `This is a certified Suno Acoustic Seal. My anonymous handles is ${peer.nickname}. I am a verified ${peer.ageRange} year old active listener. Let's keep our anonymous chat safe and supportive!`;
        if (peer.gender === 'female') {
          message = `Suno Voice DNA Check verified. My anonymous handle is ${peer.nickname}. I am a female listener verified at ${peer.voiceVerification?.pitchHz || 210} hertz average frequency. I swear to provide a safe, respectful support dialogue.`;
        }
        const utterance = new SpeechSynthesisUtterance(message);
        
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = voices.find(v => v.lang.includes('en') && v.name.toLowerCase().includes('female'));
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.includes('en'));
        }
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        utterance.pitch = peer.uid === 'peer_sage' ? 1.2 : peer.uid === 'peer_empath' ? 1.3 : 0.95;
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Speech synthesis fail', e);
    }
  };

  const handleEditorPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setEditorUploadError('Image size is too large (must be below 2.0 MB)');
      return;
    }

    setEditorUploadError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Src = reader.result as string;
      setUserSession(prev => prev ? { ...prev, avatar: base64Src } : null);
    };
    reader.onerror = () => {
      setEditorUploadError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleResetSession = () => {
    setShowLogoutConfirm(true);
  };

  const handleExecuteLogout = async () => {
    // Keep cached user database to avoid complete lockout on custom projects, only wipe session/active match details
    localStorage.removeItem('suno_user_session_v1');
    localStorage.removeItem('suno_active_match');
    setUserSession(null);
    setActiveMatch(null);
    setFreeTrialSeconds(600);
    setShowLogoutConfirm(false);
    try {
      await auth.signOut();
    } catch (e) {
      console.warn("Firebase Auth signout omitted:", e);
    }
    window.location.reload();
  };

  const themeStyles = {
    sunset: {
      bg: 'bg-[#060404]',
      glowLeft: 'bg-rose-600/10',
      glowRight: 'bg-amber-500/10',
      primaryText: 'text-rose-400',
      primaryBg: 'bg-[#9f1239] hover:bg-rose-700',
      border: 'border-rose-500/35',
      btnAccent: 'bg-rose-600 text-white hover:bg-rose-700',
      badge: 'border-rose-500/30 text-rose-400 bg-rose-500/5',
      textColor: 'text-rose-400',
      tabActive: 'bg-rose-600 text-white',
      accentGradients: 'from-rose-600 via-pink-600 to-amber-500'
    },
    saffron: {
      bg: 'bg-[#0a0604]',
      glowLeft: 'bg-orange-600/15',
      glowRight: 'bg-emerald-600/10',
      primaryText: 'text-orange-400',
      primaryBg: 'bg-orange-600 hover:bg-orange-700',
      border: 'border-orange-500/35',
      btnAccent: 'bg-orange-600 text-white hover:bg-orange-700',
      badge: 'border-orange-500/30 text-orange-400 bg-orange-500/5',
      textColor: 'text-orange-400',
      tabActive: 'bg-orange-600 text-white',
      accentGradients: 'from-orange-600 via-amber-500 to-emerald-500'
    },
    rose: {
      bg: 'bg-[#0a0407]',
      glowLeft: 'bg-pink-600/15',
      glowRight: 'bg-rose-500/10',
      primaryText: 'text-pink-400',
      primaryBg: 'bg-pink-600 hover:bg-pink-700',
      border: 'border-pink-500/35',
      btnAccent: 'bg-pink-600 text-white hover:bg-pink-700',
      badge: 'border-pink-500/30 text-pink-400 bg-pink-500/5',
      textColor: 'text-pink-400',
      tabActive: 'bg-pink-600 text-white',
      accentGradients: 'from-pink-600 via-rose-500 to-amber-500'
    },
    ocean: {
      bg: 'bg-[#04070e]',
      glowLeft: 'bg-blue-600/15',
      glowRight: 'bg-cyan-500/10',
      primaryText: 'text-blue-400',
      primaryBg: 'bg-blue-600 hover:bg-blue-700',
      border: 'border-blue-500/35',
      btnAccent: 'bg-blue-600 text-white hover:bg-blue-700',
      badge: 'border-blue-500/30 text-blue-400 bg-blue-500/5',
      textColor: 'text-blue-400',
      tabActive: 'bg-blue-600 text-white',
      accentGradients: 'from-blue-600 via-indigo-600 to-cyan-400'
    }
  };

  const style = themeStyles[currentTheme] || themeStyles.saffron;

  return (
    <div id="suno_applet" className={`min-h-screen ${style.bg} text-[#ece8e5] font-sans flex flex-col justify-between selection:bg-orange-500/20 selection:text-white transition-colors duration-500 relative`}>
      
      {/* SAFE REACT LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-900 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-rose-600/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <LogOut size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-neutral-100 uppercase tracking-wider">Log Out of Suno?</h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                This clears all active matching buffers, reputation blocks, and local logs on this device.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 bg-neutral-900 border border-neutral-850 hover:bg-neutral-850 text-neutral-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteLogout}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO EDITOR DIALOG MODAL */}
      {showPhotoEditor && userSession && (
        <div id="photo_editor_overlay_modal" className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-900 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowPhotoEditor(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-neutral-900 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
            
            <div className="text-center space-y-1">
              <h3 className="text-sm font-extrabold text-[#ea580c] uppercase tracking-wider">Update Profile Picture</h3>
              <p className="text-[10.5px] text-neutral-400 leading-relaxed">Add a beautiful, real picture or select a template so other registered users can talk with you.</p>
            </div>

            <div className="flex bg-neutral-900/60 p-1 rounded-xl border border-neutral-900 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setEditorPhotoOption('preset')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${editorPhotoOption === 'preset' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
              >
                🏙️ Presets
              </button>
              <button
                type="button"
                onClick={() => setEditorPhotoOption('upload')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${editorPhotoOption === 'upload' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
              >
                📤 Upload Photo
              </button>
              <button
                type="button"
                onClick={() => setEditorPhotoOption('url')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${editorPhotoOption === 'url' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
              >
                🔗 Web URL
              </button>
            </div>

            <div className="flex flex-col items-center justify-center gap-3.5 py-4 bg-[#0a0605] border border-neutral-900 rounded-2xl">
              <div className="relative">
                <img
                  referrerPolicy="no-referrer"
                  src={userSession.avatar}
                  className={`w-20 h-20 rounded-2xl object-cover border-2 shadow-xl ${
                    userSession.gender === 'female' ? 'border-rose-500 shadow-rose-500/10' : 'border-blue-500 shadow-blue-500/10'
                  }`}
                  alt="My Profile Picture"
                />
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-neutral-950 px-2 py-0.5 rounded-full text-[8px] font-extrabold text-neutral-300 border border-neutral-800 uppercase font-mono tracking-wider">
                  Active Photo
                </span>
              </div>

              {/* Options details container */}
              <div className="w-full px-4">
                {editorPhotoOption === 'preset' && (
                  <div className="space-y-2 text-center">
                    <p className="text-[10px] text-neutral-400 leading-relaxed">Choose an instant portrait template for your profile:</p>
                    <div className="flex gap-2 justify-center flex-wrap max-h-24 overflow-y-auto p-1.5 bg-[#070404] rounded-xl border border-neutral-900 scrollbar-none">
                      {(userSession.gender === 'female' ? FEMALE_PRESETS : MALE_PRESETS).map((src, i) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setUserSession(prev => prev ? { ...prev, avatar: src } : null)}
                          className={`w-8 h-8 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${userSession.avatar === src ? (userSession.gender === 'female' ? 'border-rose-500 scale-105' : 'border-blue-500 scale-105') : 'border-transparent hover:scale-105'}`}
                        >
                          <img referrerPolicy="no-referrer" src={src} className="w-full h-full object-cover" alt={`Preset ${i+1}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {editorPhotoOption === 'upload' && (
                  <div className="space-y-2">
                    <label className="border border-dashed border-neutral-800 hover:border-neutral-700 bg-neutral-950 p-3 text-center block cursor-pointer transition-colors rounded-xl">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditorPhotoUpload}
                        className="hidden"
                      />
                      <div className="space-y-1 flex flex-col items-center justify-center">
                        <Upload size={14} className="text-orange-400 animate-pulse" />
                        <span className="text-[10.5px] font-bold text-neutral-200">Select Picture file of yourself</span>
                        <span className="text-[8.5px] text-neutral-500 font-mono">JPG, PNG, WEBP (Max 2MB)</span>
                      </div>
                    </label>
                    {editorUploadError && (
                      <p className="text-[10px] text-rose-400 font-semibold text-center">{editorUploadError}</p>
                    )}
                  </div>
                )}

                {editorPhotoOption === 'url' && (
                  <div className="space-y-2 text-center">
                    <p className="text-[10px] text-neutral-400">Paste any public web image address:</p>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={editorCustomUrl}
                        onChange={(e) => setEditorCustomUrl(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-neutral-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editorCustomUrl.trim().startsWith('http')) {
                            setUserSession(prev => prev ? { ...prev, avatar: editorCustomUrl.trim() } : null);
                          } else {
                            alert('Please enter a valid HTTP image url address');
                          }
                        }}
                        className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-[10px] rounded-lg border border-neutral-700 cursor-pointer shrink-0"
                      >
                        Load
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Gallery manager block inside the modal */}
            <div id="user_modal_gallery_manager" className="space-y-2 border-t border-neutral-900 pt-4">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-300">
                <span>📸 My Gallery Photos</span>
                <span className="text-[9px] font-mono text-neutral-500">
                  {Math.min(5, 1 + ((userSession.uploadedPhotos || []).filter(p => p !== userSession.avatar).length))} / 5
                </span>
              </div>
              
              <div className="grid grid-cols-5 gap-2 bg-neutral-950 p-2 rounded-2xl border border-neutral-900">
                {/* Slot 1: Primary avatar */}
                <div className="aspect-square rounded-xl overflow-hidden border border-orange-500 relative bg-neutral-900 flex items-center justify-center">
                  <img src={userSession.avatar} className="w-full h-full object-cover" alt="Main avatar" />
                  <span className="absolute bottom-0 left-0 right-0 bg-orange-600 text-white text-[6.5px] text-center uppercase font-bold py-0.5">Main</span>
                </div>
                
                {/* Slots 2-5: Supplementary */}
                {Array.from({ length: 4 }).map((_, i) => {
                  const photos = userSession.uploadedPhotos || [];
                  const listWithoutAvatar = photos.filter(p => p !== userSession.avatar);
                  const p = listWithoutAvatar[i];
                  return (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-neutral-850 relative bg-neutral-900 flex items-center justify-center">
                      {p ? (
                        <>
                          <img src={p} className="w-full h-full object-cover" alt="Gallery slot" />
                          <button
                            type="button"
                            onClick={() => {
                              const updatedGallery = photos.filter(img => img !== p);
                              setUserSession({
                                ...userSession,
                                uploadedPhotos: updatedGallery
                              });
                            }}
                            className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-1 leading-none hover:bg-red-700 transition-colors cursor-pointer"
                            style={{ fontSize: '7px' }}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-800/40 transition-colors">
                          <span className="text-neutral-500 text-sm font-bold">+</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 2 * 1024 * 1024) {
                                alert('Image must be under 2MB.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const base64Src = reader.result as string;
                                const originalGallery = userSession.uploadedPhotos || [userSession.avatar];
                                if (originalGallery.length >= 5) {
                                  alert('You can upload a maximum of 5 images. Please delete one first.');
                                  return;
                                }
                                setUserSession({
                                  ...userSession,
                                  uploadedPhotos: [...originalGallery, base64Src]
                                });
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setShowPhotoEditor(false)}
              className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 font-black text-white text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Done & Save Picture
            </button>
          </div>
        </div>
      )}

      {/* EXQUISITE MY PROFILE MODAL: COMPREHENSIVE VIEW & EDIT MY PROFILE */}
      {showMyProfileModal && editingProfile && (
        <div id="my_profile_details_modal" className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-neutral-950 border border-neutral-900 rounded-3xl p-6 space-y-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto scrollbar-none select-none">
            
            {/* Modal Corner Close */}
            <button
              onClick={() => {
                setShowMyProfileModal(false);
                setEditingProfile(null);
              }}
              className="absolute top-4 right-4 p-1.5 hover:bg-neutral-900 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Header Passport Card */}
            <div className="text-center space-y-1 pb-2 border-b border-neutral-900">
              <span className="text-[10px] bg-orange-600/10 text-[#ea580c] font-black tracking-widest uppercase px-3 py-1 rounded-full border border-orange-500/15">
                🇮🇳 SECURE ANONYMOUS PASS ID
              </span>
              <p className="text-[9.5px] font-mono text-neutral-500 pt-1.5 uppercase">
                UID: <span className="text-neutral-300">{(editingProfile.uid || '').toUpperCase()}</span>
              </p>
            </div>

            {/* General Profile Credentials Card */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-neutral-900/40 p-4 rounded-2xl border border-neutral-905">
                {/* Photo slot */}
                <div className="relative shrink-0 group">
                  <img
                    referrerPolicy="no-referrer"
                    src={editingProfile.avatar}
                    className={`w-16 h-16 rounded-xl object-cover border-2 shadow-md ${
                      editingProfile.gender === 'female' ? 'border-rose-500 shadow-rose-500/5' : 'border-blue-500 shadow-blue-500/5'
                    }`}
                  />
                  <button
                    onClick={() => {
                      setShowMyProfileModal(false);
                      setShowPhotoEditor(true);
                    }}
                    className="absolute -bottom-1 -right-1 bg-[#ea580c] hover:bg-orange-600 text-white p-1 rounded-md border border-neutral-950 shadow transition-transform group-hover:scale-105 cursor-pointer"
                    title="Change Avatar Preset"
                  >
                    <Camera size={10} />
                  </button>
                </div>

                {/* Main Details Grid */}
                <div className="flex-1 w-full space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8.5px] uppercase text-neutral-500 font-extrabold tracking-wider">Nickname</label>
                      <input
                        type="text"
                        value={editingProfile.nickname || ''}
                        onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, nickname: e.target.value }))}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-2.5 py-1 text-[11px] text-neutral-100 font-bold focus:outline-none focus:ring-1 focus:ring-orange-500"
                        placeholder="SweetStar_946"
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] uppercase text-neutral-500 font-extrabold tracking-wider">Gender Card</label>
                      <select
                        value={editingProfile.gender || 'female'}
                        onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, gender: e.target.value }))}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-2 py-1 text-[11px] text-neutral-100 font-bold focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="female">👧 Female</option>
                        <option value="male">👦 Male</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8.5px] uppercase text-neutral-500 font-extrabold tracking-wider">Age Group</label>
                      <select
                        value={editingProfile.ageRange || '18-24'}
                        onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, ageRange: e.target.value }))}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-2 py-1 text-[11px] text-neutral-100 font-bold focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="18-24">18 - 24 Years</option>
                        <option value="25-34">25 - 34 Years</option>
                        <option value="35+">35+ Years</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[8.5px] uppercase text-neutral-500 font-extrabold tracking-wider">Language</label>
                      <input
                        type="text"
                        value={editingProfile.language || 'Hindi'}
                        onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, language: e.target.value }))}
                        className="w-full bg-neutral-950 border border-neutral-900 rounded-lg px-2.5 py-1 text-[11px] text-neutral-100 font-bold focus:outline-none focus:ring-1 focus:ring-orange-500"
                        placeholder="Hindi, English"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* District locator dropdown */}
              <div>
                <label className="text-[8.5px] uppercase text-neutral-500 font-extrabold tracking-wider mb-1 block">Live City Hub (India)</label>
                <select
                  value={editingProfile.city || 'Delhi NCR'}
                  onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, city: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3 py-1.5 text-xs text-neutral-300 font-bold focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {['Mumbai, Maharashtra', 'Delhi NCR', 'Bengaluru, Karnataka', 'Pune, Maharashtra', 'Kolkata, West Bengal', 'Chennai, Tamil Nadu', 'Hyderabad, Telangana', 'Jaipur, Rajasthan', 'Lucknow, Uttar Pradesh', 'Ahmedabad, Gujarat', 'Patna, Bihar', 'Indore, Madhya Pradesh', 'Other City in India'].map((cityName) => (
                    <option key={cityName} value={cityName}>{cityName}</option>
                  ))}
                </select>
              </div>

              {/* Bio Statement */}
              <div>
                <label className="text-[8.5px] uppercase text-neutral-500 font-extrabold tracking-wider mb-1 block">Self Description & Bio</label>
                <textarea
                  value={editingProfile.bio || ''}
                  onChange={(e) => setEditingProfile((prev: any) => ({ ...prev, bio: e.target.value }))}
                  rows={2}
                  maxLength={160}
                  className="w-full bg-neutral-950 border border-neutral-900 rounded-xl p-3 text-xs text-neutral-200 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none font-medium leading-relaxed"
                  placeholder="Need someone to vent to? Hard exam session? Let's have a secure friendly safe-mode support talk here."
                />
                <span className="text-[8.5px] text-neutral-600 block text-right">Max 160 characters</span>
              </div>

              {/* Indian Verified Contacts Status Card */}
              <div className="bg-neutral-950 border border-neutral-900/60 p-3.5 rounded-2xl grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase text-neutral-500 font-bold block">Registered Mobile</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-emerald-400">🛡️</span>
                    <span className="text-[11px] font-mono text-neutral-300 font-bold">
                      {editingProfile.phoneNumber ? editingProfile.phoneNumber.replace(/.(?=.{3})/g, '*') : '+91 *******452'}
                    </span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] uppercase text-neutral-500 font-bold block">Trust Registry node</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#ea580c] rounded-full inline-block animate-ping"></span>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase font-black">MUMBAI-SEC-REST-A4</span>
                  </div>
                </div>
              </div>

              {/* Acoustic Voice DNA Verification Signature (Gilded Gold card) */}
              <div className="bg-gradient-to-r from-amber-600/10 via-neutral-950 to-amber-700/5 border border-amber-500/20 p-3.5 rounded-2xl space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-2 flex items-center justify-center bg-amber-500/10 border border-amber-500/20 p-1 rounded-lg text-amber-500">
                  <Mic size={14} />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] text-amber-500 uppercase font-extrabold tracking-widest block">Acoustic Voice DNA Signature</span>
                  <p className="text-[11.5px] font-extrabold text-neutral-200">
                    {editingProfile.voiceVerified ? '🔊 VERIFIED ACOUSTIC PASSPORT' : '⚠️ UNVERIFIED ACOUSTIC RECORD'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-neutral-400">
                  <p>Pitch Metric: <span className="text-amber-400 font-bold">{editingProfile.gender === 'female' ? '218 Hz (Soprano/Alto)' : '124 Hz (Tenor/Baritone)'}</span></p>
                  <p>Acoustic Tone: <span className="text-amber-400 font-bold">Safe & Support Approved</span></p>
                </div>
                <p className="text-[8.5px] text-neutral-500 leading-relaxed italic border-t border-neutral-900 pt-1.5">
                  All users must pass a 100% audio verification audit to authenticate opposite-gender status and block robot catfish accounts.
                </p>
              </div>

              {/* Trust Score & Rep Section */}
              <div className="bg-neutral-950 border border-neutral-900 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[8px] uppercase text-neutral-500 font-extrabold tracking-wider block">Trust Score Status</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">⭐</span>
                    <p className="text-[11.5px] font-black text-[#22c55e]">
                      {editingProfile.trustScore || 100}% Safe Rating
                    </p>
                  </div>
                  <span className="text-[8.5px] text-neutral-500 block leading-none">0 reported violations • Zero flags detected</span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] uppercase text-rose-500 font-extrabold tracking-wider block">Penalty Logs</span>
                  <p className="text-xs text-neutral-350 font-bold">Clear / Active Shield</p>
                  <span className="text-[8px] text-[#22c55e] uppercase tracking-wider font-extrabold">Highly Support Rated</span>
                </div>
              </div>

              {/* Focus Mindset Interests Section */}
              <div className="space-y-1.5 border-t border-neutral-900 pt-3">
                <label className="text-[8.5px] uppercase text-neutral-500 font-extrabold tracking-wider block">
                  Mindset Focus Interests (Click tags to toggle)
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {['College Life', 'Relationships', 'Career Advice', 'Mental Peace', 'Bollywood', 'Fitness & Yoga', 'Startups & Tech'].map((interestName) => {
                    const activeInterests = editingProfile.interests || [];
                    const isSelected = activeInterests.includes(interestName);
                    return (
                      <button
                        key={interestName}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? activeInterests.filter((it: string) => it !== interestName)
                            : [...activeInterests, interestName];
                          setEditingProfile((prev: any) => ({ ...prev, interests: updated }));
                        }}
                        className={`text-[9.5px] px-2.5 py-1 rounded-full font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-[#ea580c] text-white border-orange-500/20'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-900 hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{interestName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Safety Shield Switch Toggles */}
              <div className="space-y-2 border-t border-neutral-900 pt-3">
                <label className="text-[8.5px] uppercase text-neutral-500 font-extrabold tracking-wider block">
                  🛡️ INVISIBLE SAFETY SHIELD SHADES
                </label>
                
                <div className="space-y-2.5">
                  {/* Toggle 1: Hide Gender Tag */}
                  <div className="flex items-start justify-between gap-3 text-left">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-neutral-200">Hide Gender Tag inside Discover list</p>
                      <p className="text-[9px] text-neutral-500 leading-normal max-w-[340px]">
                        Prevents random browsing on Discover grids. Recommended for complete private safe-talking zones.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={!(editingProfile.safetySettings?.hideGender)}
                        onChange={() => {
                          const currentSettings = editingProfile.safetySettings || {};
                          setEditingProfile((prev: any) => ({
                            ...prev,
                            safetySettings: { ...currentSettings, hideGender: !currentSettings.hideGender }
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-neutral-900 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[6px] after:left-[2px] after:bg-neutral-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-600 peer-checked:after:bg-white relative"></div>
                    </label>
                  </div>

                  {/* Toggle 2: Anonymous Mode */}
                  <div className="flex items-start justify-between gap-3 text-left">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-neutral-200">Invisible Stealth Active State</p>
                      <p className="text-[9px] text-neutral-500 leading-normal max-w-[340px]">
                        Will not prompt "Peer is online" notifications. Keeps your communications totally hidden.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={!!(editingProfile.safetySettings?.anonymousMode)}
                        onChange={() => {
                          const currentSettings = editingProfile.safetySettings || {};
                          setEditingProfile((prev: any) => ({
                            ...prev,
                            safetySettings: { ...currentSettings, anonymousMode: !currentSettings.anonymousMode }
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-neutral-900 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[6px] after:left-[2px] after:bg-neutral-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-600 peer-checked:after:bg-white relative"></div>
                    </label>
                  </div>

                  {/* Toggle 3: Only Verified Chats */}
                  <div className="flex items-start justify-between gap-3 text-left">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-bold text-neutral-200">Ignore Chats from Unverified Users</p>
                      <p className="text-[9px] text-neutral-500 leading-normal max-w-[340px]">
                        Block the match request inbox completely from accounts waiting for voice verification credentials.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={!!(editingProfile.safetySettings?.verifiedUsersOnly)}
                        onChange={() => {
                          const currentSettings = editingProfile.safetySettings || {};
                          setEditingProfile((prev: any) => ({
                            ...prev,
                            safetySettings: { ...currentSettings, verifiedUsersOnly: !currentSettings.verifiedUsersOnly }
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-neutral-900 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[6px] after:left-[2px] after:bg-neutral-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-600 peer-checked:after:bg-white relative"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* VIP wallet / trial balance */}
              <div className="bg-neutral-950 border border-neutral-900/60 p-3 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-500">💎</span>
                  <span>Unlimited VIP Secure Corridor</span>
                </div>
                <div className="text-[10px] text-orange-400 uppercase tracking-wide">
                  {editingProfile.paymentDetails?.isPremiumSignedUp ? 'ACTIVE UNLIMITED' : '10 MINUTES FREE TRIAL'}
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3 border-t border-neutral-900">
              <button
                type="button"
                onClick={() => {
                  setShowMyProfileModal(false);
                  setEditingProfile(null);
                }}
                className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-850 hover:text-white font-black text-neutral-300 text-[10.5px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingProfile) {
                    setUserSession(editingProfile);
                    setNotifications((prev: any) => [
                      {
                        id: `prof_u_${Date.now()}`,
                        text: `👤 Secure Profile updated successfully & cached in Neon PG database!`,
                        time: 'Just now',
                        type: 'success'
                      },
                      ...prev
                    ]);
                  }
                  setShowMyProfileModal(false);
                  setEditingProfile(null);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 font-black text-white text-[10.5px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-orange-500/10"
              >
                Save & Lock Profile
              </button>
            </div>

          </div>
        </div>
      )}

      {/* HIGH FIDELITY PHOTO LIGHTBOX MODAL */}
      {activeLightboxPhotos && activeLightboxPhotos.length > 0 && (
        <div id="photo_lightbox_modal" className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[60] flex flex-col items-center justify-between p-6">
          {/* Header Close */}
          <div className="w-full max-w-lg flex items-center justify-between text-neutral-450">
            <span className="text-xs font-black tracking-widest text-[#ea580c] uppercase font-mono">
              ★ PORTRAIT GALLERY ({activeLightboxIndex + 1} / {activeLightboxPhotos.length})
            </span>
            <button
              onClick={() => setActiveLightboxPhotos(null)}
              className="p-2 hover:bg-neutral-900 rounded-full text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Active Image Container */}
          <div className="flex-1 w-full max-w-xl flex items-center justify-center relative my-6">
            <button
              onClick={() => setActiveLightboxIndex(prev => prev > 0 ? prev - 1 : activeLightboxPhotos.length - 1)}
              className="absolute left-2 bg-neutral-900/80 hover:bg-neutral-800 text-white rounded-full p-3 font-bold transition-all shadow-lg text-lg cursor-pointer select-none"
            >
              ◀
            </button>
            <img
              referrerPolicy="no-referrer"
              src={activeLightboxPhotos[activeLightboxIndex]}
              className="max-h-[70vh] max-w-full rounded-2xl object-contain border border-neutral-800 shadow-2xl"
              alt="Suno User Full Portrait"
            />
            <button
              onClick={() => setActiveLightboxIndex(prev => prev < activeLightboxPhotos.length - 1 ? prev + 1 : 0)}
              className="absolute right-2 bg-neutral-900/80 hover:bg-neutral-800 text-white rounded-full p-3 font-bold transition-all shadow-lg text-lg cursor-pointer select-none"
            >
              ▶
            </button>
          </div>

          {/* Thumbnails list at bottom */}
          <div className="w-full max-w-md bg-neutral-950/80 border border-neutral-900 p-3 rounded-2xl flex gap-2 justify-center overflow-x-auto scrollbar-none">
            {activeLightboxPhotos.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveLightboxIndex(i)}
                className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${activeLightboxIndex === i ? 'border-[#ea580c] scale-105 shadow-md shadow-[#ea580c]/10' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                <img referrerPolicy="no-referrer" src={src} className="w-full h-full object-cover" alt="Lightbox thumbnail" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ATMOSPHERIC BACKGROUND RADIALS */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none z-0">
        <div className={`absolute top-[-10%] left-[-20%] w-[600px] h-[600px] ${style.glowLeft} rounded-full blur-[140px] transition-colors duration-500`}></div>
        <div className={`absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] ${style.glowRight} rounded-full blur-[120px] transition-colors duration-500`}></div>
      </div>

      {/* SYSTEM HEADER BAR */}
      <header className="bg-[#0f0b0a]/90 backdrop-blur-xl border-b border-neutral-900 px-4 md:px-8 py-4 sticky top-0 z-40 flex items-center justify-between">
        
        {/* BRAND IDENTITY */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-rose-600 via-amber-500 to-amber-300 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/10 relative">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-widest text-white leading-none">SUNO</span>
              <span className="text-[10px] bg-rose-500/20 border border-rose-500/30 text-rose-300 px-1.5 py-0.2 rounded font-mono font-bold">18+ Safe</span>
            </div>
            <p className="text-[8.5px] text-neutral-400 tracking-wider">SUPPORT DIALOGUES FOR WELLNESS & MIND</p>
          </div>
        </div>

        {/* MID NAVIGATION CONTROLS */}
        <div className="hidden md:flex bg-neutral-950 p-1 border border-neutral-900 rounded-2xl">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'home' ? `${style.tabActive} shadow-md` : 'text-neutral-400 hover:text-white'
            }`}
          >
            🇮🇳 Home Safety
          </button>

          <button
            onClick={() => setActiveTab('match')}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'match' ? `${style.tabActive} shadow-md` : 'text-neutral-400 hover:text-white'
            }`}
          >
            Support Matches
          </button>
          
          <button
            onClick={() => setActiveTab('community')}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'community' ? `${style.tabActive} shadow-md` : 'text-neutral-400 hover:text-white'
            }`}
          >
            Lobbies & forums
          </button>

          {userSession?.isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'admin' ? 'bg-[#9f1239] text-rose-100 shadow-md' : 'text-neutral-400 hover:text-rose-450'
              }`}
            >
              Admin Panel
            </button>
          )}
        </div>

        {/* PROFILE SETTINGS ROW */}
        <div className="flex items-center gap-3 relative z-30">
          
          {/* Dynamic Theme Selection dropdown for changing theme option */}
          <div className="relative">
            <button
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
              className="p-2 bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 rounded-xl text-neutral-400 hover:text-orange-400 transition-colors cursor-pointer relative flex items-center justify-center gap-1"
              title="Change Theme Option"
            >
              <Palette size={15} />
              <span className="text-[10px] font-bold uppercase hidden lg:inline text-neutral-300">Theme</span>
            </button>

            {showThemeDropdown && (
              <div className="absolute right-0 mt-2.5 w-52 bg-neutral-950 border border-neutral-900 p-2.5 rounded-xl shadow-xl space-y-1.5 z-40 text-xs text-left">
                <p className="font-bold text-neutral-400 uppercase text-[9px] tracking-wider border-b border-neutral-900 pb-1.5 mb-1 flex justify-between items-center">
                  <span>Select Theme option</span>
                </p>
                <button
                  type="button"
                  onClick={() => { handleThemeChange('saffron'); setShowThemeDropdown(false); }}
                  className={`w-full p-2 rounded-lg text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${currentTheme === 'saffron' ? 'bg-[#ea580c]/10 text-orange-400 font-bold' : 'hover:bg-neutral-900 text-neutral-300'}`}
                >
                  <span className="flex items-center gap-1.5">🇮🇳 Saffron Flag</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                </button>
                <button
                  type="button"
                  onClick={() => { handleThemeChange('sunset'); setShowThemeDropdown(false); }}
                  className={`w-full p-2 rounded-lg text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${currentTheme === 'sunset' ? 'bg-rose-500/10 text-rose-400 font-bold' : 'hover:bg-neutral-900 text-neutral-300'}`}
                >
                  <span className="flex items-center gap-1.5">🌅 Crimson Sunset</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                </button>
                <button
                  type="button"
                  onClick={() => { handleThemeChange('rose'); setShowThemeDropdown(false); }}
                  className={`w-full p-2 rounded-lg text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${currentTheme === 'rose' ? 'bg-pink-500/10 text-pink-400 font-bold' : 'hover:bg-neutral-900 text-neutral-300'}`}
                >
                  <span className="flex items-center gap-1.5">💗 Romantic Rose</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                </button>
                <button
                  type="button"
                  onClick={() => { handleThemeChange('ocean'); setShowThemeDropdown(false); }}
                  className={`w-full p-2 rounded-lg text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${currentTheme === 'ocean' ? 'bg-blue-500/10 text-blue-400 font-bold' : 'hover:bg-neutral-900 text-neutral-300'}`}
                >
                  <span className="flex items-center gap-1.5">🌊 Indigo Ocean</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                </button>
              </div>
            )}
          </div>

          {/* Notifications panel toggle button */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              className="p-2 bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 rounded-xl text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer relative"
            >
              <Bell size={15} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>

            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-2.5 w-64 bg-neutral-950 border border-neutral-900 p-3 rounded-xl shadow-xl space-y-2 text-xs">
                <p className="font-bold text-neutral-300 uppercase text-[9px] tracking-wider border-b border-neutral-900 pb-1 flex justify-between items-center">
                  <span>Recent Security Alerts</span>
                  <button onClick={() => setNotifications([])} className="text-[8px] text-neutral-500 hover:underline hover:text-rose-400">Clear</button>
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none">
                  {notifications.map((not) => (
                    <div key={not.id} className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-900 leading-relaxed text-[10.5px]">
                      <p className={`${not.type === 'alert' ? 'text-rose-400 font-bold' : not.type === 'success' ? 'text-emerald-400 font-semibold' : 'text-neutral-300'}`}>{not.text}</p>
                      <span className="text-[8px] text-neutral-500 block mt-0.5">{not.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clean Logout Trigger */}
          <button
            onClick={handleResetSession}
            className="p-2 bg-neutral-950 hover:bg-[#150a0a] border border-neutral-900 rounded-xl text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
            title="Reset Profile session"
          >
            <LogOut size={15} />
          </button>

          {/* Connected User Badge (Clickable to view/edit profile) */}
          <button
            onClick={() => {
              setEditingProfile({ ...userSession });
              setShowMyProfileModal(true);
            }}
            className="bg-neutral-950 border border-neutral-900 px-3 py-1.5 rounded-xl flex items-center gap-2.5 hover:bg-neutral-900 active:scale-98 transition-all hover:border-neutral-800 text-left select-none cursor-pointer"
            title="View & Edit My Profile"
          >
            <img referrerPolicy="no-referrer" src={userSession.avatar} className="w-7 h-7 rounded-lg object-cover border border-neutral-800" />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-extrabold text-neutral-100 flex items-center gap-1">
                {userSession.nickname}
                <span className="text-[9.5px] text-[#22c55e] font-semibold">({userSession.trustScore}%)</span>
              </p>
              <p className="text-[9px] uppercase text-[#f59e0b] font-bold tracking-wider">
                {userSession.paymentDetails.isPremiumSignedUp ? '💎 UNLIMITED CORE' : `⏳ TRIAL: ${Math.floor(freeTrialSeconds / 60)}m`}
              </p>
            </div>
          </button>

        </div>

      </header>

      {/* MOBILE NAV TABS PANEL */}
      <div className="md:hidden flex bg-[#0f0b0a] border-b border-neutral-900 p-2 z-30">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex-1 text-center py-2 text-[10.5px] uppercase tracking-wider font-extrabold rounded-lg ${
            activeTab === 'home' ? 'bg-[#ea580c] text-white' : 'text-neutral-400'
          }`}
        >
          🇮🇳 Home
        </button>
        <button
          onClick={() => setActiveTab('match')}
          className={`flex-1 text-center py-2 text-[10.5px] uppercase tracking-wider font-extrabold rounded-lg ${
            activeTab === 'match' ? 'bg-rose-600 text-white' : 'text-neutral-400'
          }`}
        >
          Matcher
        </button>
        <button
          onClick={() => setActiveTab('community')}
          className={`flex-1 text-center py-2 text-[10.5px] uppercase tracking-wider font-extrabold rounded-lg ${
            activeTab === 'community' ? 'bg-rose-600 text-white' : 'text-neutral-400'
          }`}
        >
          Forums
        </button>
        {userSession?.isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 text-center py-2 text-[10.5px] uppercase tracking-wider font-extrabold rounded-lg ${
              activeTab === 'admin' ? 'bg-[#9f1239] text-rose-100' : 'text-neutral-400'
            }`}
          >
            Console
          </button>
        )}
      </div>

      {/* CORE FRAME CONTAINER AREA */}
      <main className="flex-1 p-4 md:p-8 relative z-10 overflow-hidden">
        
        {/* BAN ALERT IF USER REPUTATION PENALIZED */}
        {userSession.offenseStatus !== 'clear' && (
          <div className="mb-6 p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Reputation Integrity Notice: Offense status counts at level {userSession.offenseCount}</p>
              <p className="text-neutral-400 text-[11px] mt-0.5">
                Our active AI safety engine has registered {userSession.offenseStatus === 'warned' ? 'a polite warning' : 'a mute restriction'} on your device. Please ensure language aligns safely with the platform rules.
              </p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* TAB 0: HOME PAGE WITH RULES & SAFETY INFO */}
          {activeTab === 'home' && (
            <motion.div
              key="home_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl mx-auto space-y-6 pb-12"
            >
              {/* BEAUTIFUL HERO BANNER FOR INDIA */}
              <div className="bg-gradient-to-r from-orange-600/15 via-neutral-900 to-emerald-600/15 border border-neutral-800 p-6 md:p-8 rounded-3xl text-center space-y-3 relative overflow-hidden">
                <div className="absolute top-2 right-2 text-[9px] font-bold bg-[#ea580c]/10 text-[#ea580c] border border-[#ea580c]/20 px-2.5 py-0.5 rounded-full font-mono">
                  🇮🇳 INDIAN SECURE HUB
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Welcome to Suno India, <span className="text-orange-400">{userSession.nickname}</span>!
                </h2>
                <p className="text-xs text-neutral-300 max-w-xl mx-auto leading-relaxed">
                  We are India's safest anonymous talking space for boys and girls. Every user registers with a real Indian phone number and a mandatory acoustic voice pitch signature to keep catfishes, bots, and bad elements 100% out!
                </p>

                {/* INTERACTIVE AVATAR UPDATE WIDGET */}
                <div id="home_user_photo_widget" className="flex flex-col sm:flex-row items-center justify-center gap-4 py-3 px-5 bg-neutral-950/70 border border-neutral-900 rounded-2xl max-w-md mx-auto relative group">
                  <div className="relative shrink-0">
                    <img
                      referrerPolicy="no-referrer"
                      src={userSession.avatar}
                      className={`w-14 h-14 rounded-xl object-cover border-2 shadow-lg ${
                        userSession.gender === 'female' ? 'border-rose-500 shadow-rose-500/10' : 'border-blue-500 shadow-blue-500/10'
                      }`}
                      alt="My Active Profile Pic"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-orange-600 rounded-lg p-1 text-white border border-neutral-950">
                      <Camera size={9} />
                    </div>
                  </div>
                  <div className="text-center sm:text-left space-y-1">
                    <div className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wide mb-1">Live Profile Photo</div>
                    <div className="flex gap-1.5 flex-wrap justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={() => setShowPhotoEditor(true)}
                        className="px-2.5 py-1 bg-[#ea580c]/10 text-[#ea580c] hover:bg-[#ea580c]/20 border border-[#ea580c]/25 rounded-lg text-[9px] uppercase font-black tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                      >
                        <span>📷 Update Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProfile({ ...userSession });
                          setShowMyProfileModal(true);
                        }}
                        className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-850 hover:text-white border border-neutral-800 rounded-lg text-[9px] uppercase font-black tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 text-neutral-300 active:scale-95"
                      >
                        <span>👤 Full Profile</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-1.5 flex-wrap pt-2">
                  <div className="flex items-center gap-1.5 bg-neutral-950 px-3 py-1 rounded-full border border-neutral-800 text-[10px] text-orange-400 font-semibold">
                    <span>👦 Voice Verified Boys Only</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-neutral-950 px-3 py-1 rounded-full border border-neutral-800 text-[10px] text-rose-400 font-semibold">
                    <span>👧 Voice Verified Girls Only</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-neutral-950 px-3 py-1 rounded-full border border-neutral-800 text-[10px] text-emerald-400 font-semibold">
                    <span>🛡️ AI Moderation Live</span>
                  </div>
                </div>
              </div>

              {/* QUICK INSTANT MATCH BOARD */}
              <div id="instant_match_board" className="bg-[#110c0b]/80 border border-neutral-800 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-orange-400 w-5 h-5" />
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    Instant Smart Matchmaker
                  </h3>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {userSession.gender === 'male' 
                    ? "Welcome Boy! We will automatically connect you with verified Indian Girls for respectful dialogues, relationship advice, college chat rooms, or mental comfort."
                    : "Welcome Girl! We will automatically connect you only with certified, high-reputation Good Boys (verified voice acoustic pitch indices above 85%) on Suno."}
                </p>

                <div className="p-4 bg-neutral-950 rounded-2xl border border-[#1b1514] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] text-neutral-500 font-bold uppercase block">YOUR ACCOUNT STATUS</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${userSession.voiceVerified ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      <span className="text-xs font-semibold text-white">
                        {userSession.gender === 'male' ? 'Verified Boy' : userSession.gender === 'female' ? 'Verified Girl' : 'Verified Member'} (India Only 🇮🇳)
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-neutral-500 font-bold uppercase block">VOICE FREQUENCY DNA</span>
                    <span className="text-xs font-mono text-neutral-300">
                      {userSession.voiceVerification?.pitchHz ? `${userSession.voiceVerification.pitchHz}Hz - (${userSession.voiceVerification.toneLabel})` : 'Acoustically Sealed'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('match')}
                  className={`w-full py-3.5 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all hover:opacity-90 shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
                    userSession.gender === 'female'
                      ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 shadow-pink-500/10'
                      : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 shadow-blue-500/10'
                  }`}
                >
                  {userSession.gender === 'male' ? '👦 Talk to Girls in India Now 👧' : '👧 Talk to Good Boys in India Now 👦'}
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* THREE COLUMN BENTO SHOWING SAFETY GUARANTEES */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. WHY SUNO IS BEST */}
                <div className="bg-neutral-900/60 p-4 border border-neutral-800 rounded-2xl space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center border border-orange-500/20">
                    <Sparkles size={15} className="text-orange-400" />
                  </div>
                  <h4 className="text-xs font-bold uppercase text-white tracking-wide">
                    Why Suno is Peerless
                  </h4>
                  <p className="text-[10.5px] text-neutral-400 leading-relaxed">
                    Generic chatrooms are full of spambots & fake catfish accounts. Suno guarantees high-quality, genuine human interactions locked solely to India.
                  </p>
                </div>

                {/* 2. ACOUSTIC SEAL EXPLANATION */}
                <div className="bg-neutral-900/60 p-4 border border-neutral-800 rounded-2xl space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
                    <Mic size={15} className="text-emerald-400" />
                  </div>
                  <h4 className="text-xs font-bold uppercase text-white tracking-wide">
                    Acoustic Voice Safety
                  </h4>
                  <p className="text-[10.5px] text-neutral-400 leading-relaxed">
                    Suno analyzes user vocal frequencies to classify gender automatically. Men attempting to register as girls are blocked, keeping room spaces highly safe.
                  </p>
                </div>

                {/* 3. ZERO MISCONDUCT */}
                <div className="bg-neutral-900/60 p-4 border border-neutral-800 rounded-2xl space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center border border-rose-500/20">
                    <ShieldCheck size={15} className="text-rose-400" />
                  </div>
                  <h4 className="text-xs font-bold uppercase text-white tracking-wide">
                    100% Polite dialogues
                  </h4>
                  <p className="text-[10.5px] text-neutral-400 leading-relaxed">
                    Intelligent active AI scanners block abusive strings, bad flirting words, or direct phone number exchanges instantly to shield girl users from harm.
                  </p>
                </div>

              </div>

              {/* RULES CARD CHARTER */}
              <div className="bg-neutral-950 p-6 border border-neutral-800 rounded-3xl space-y-3.5">
                <div className="flex items-center gap-1.5 uppercase text-xs font-bold text-neutral-300">
                  <Info size={13} className="text-orange-400 animate-bounce" /> Suno India Code of Conduct & Rules Charter
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs leading-relaxed text-neutral-300">
                  <div className="p-3.5 bg-neutral-900/30 rounded-xl space-y-1.5 border border-[#1b1514]">
                    <p className="font-extrabold text-orange-400 flex items-center gap-1">
                      <span>1</span> Walk with high respect
                    </p>
                    <p className="text-[10.5px] text-neutral-400 leading-relaxed">
                      Suno is built strictly for supportive, warm conversations. Greet peers nicely, listen attentively, and build pleasant moments.
                    </p>
                  </div>

                  <div className="p-3.5 bg-neutral-900/30 rounded-xl space-y-1.5 border border-[#1b1514]">
                    <p className="font-extrabold text-rose-400 flex items-center gap-1">
                      <span>2</span> No Tinder-Style flirting
                    </p>
                    <p className="text-[10.5px] text-neutral-400 leading-relaxed">
                      Flirting, suggestive dirty messages, dating coercion, or sending uncool explicit requests gets your account/IP code banned immediately.
                    </p>
                  </div>

                  <div className="p-3.5 bg-neutral-900/30 rounded-xl space-y-1.5 border border-[#1b1514]">
                    <p className="font-extrabold text-amber-400 flex items-center gap-1">
                      <span>3</span> No contact information swapping
                    </p>
                    <p className="text-[10.5px] text-neutral-400 leading-relaxed">
                      Never swap, request or write WhatsApp details, phone digits, or Instagram accounts. Chats remain encrypted and anonymous.
                    </p>
                  </div>

                  <div className="p-3.5 bg-neutral-900/30 rounded-xl space-y-1.5 border border-[#1b1514]">
                    <p className="font-extrabold text-emerald-400 flex items-center gap-1">
                      <span>4</span> Instant moderator reports
                    </p>
                    <p className="text-[10.5px] text-neutral-400 leading-relaxed">
                      If your peer behaves rudely or violates safe conditions, hit the report trigger immediately. We take active bans seriously.
                    </p>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 1: SUPPORT MATCH SPACE */}
          {activeTab === 'match' && (
            <motion.div
              key="match_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full"
            >
              <AnimatePresence mode="wait">
                {!activeMatch ? (
                  /* DUAL COUPLING MATCH MODE COMPONENT */
                  <motion.div
                    key="match_lobby_directory"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="max-w-4xl mx-auto py-6 space-y-6"
                  >
                   
                   {/* DYNAMIC MODE SWITCHER TO ALLOW BROWSED CHATS vs QUICK QUEUE */}
                   <div className="flex justify-center">
                     <div className="bg-neutral-950 p-1 border border-neutral-900 rounded-2xl flex gap-1.5 flex-wrap justify-center">
                       <button
                         type="button"
                         onClick={() => setMatchMode('chats')}
                         className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                           matchMode === 'chats' 
                             ? `bg-gradient-to-r ${style.accentGradients} text-white shadow-lg` 
                             : 'text-neutral-400 hover:text-white'
                         }`}
                       >
                         💬 My Saved Chats ({activeConversations.length})
                       </button>
                       <button
                         type="button"
                         onClick={() => setMatchMode('grid')}
                         className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                           matchMode === 'grid' 
                             ? `bg-gradient-to-r ${style.accentGradients} text-white shadow-lg` 
                             : 'text-neutral-400 hover:text-white'
                         }`}
                       >
                         💖 Browse {userSession?.gender === 'male' ? 'Girls' : 'Boys'} ({
                           realRegisteredUsers.filter(p => p.uid !== userSession?.uid && p.gender === (userSession?.gender === 'male' ? 'female' : 'male')).length
                         })
                       </button>
                       <button
                         type="button"
                         onClick={() => setMatchMode('instant')}
                         className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                           matchMode === 'instant' 
                             ? `bg-gradient-to-r ${style.accentGradients} text-white shadow-lg` 
                             : 'text-neutral-400 hover:text-white'
                         }`}
                       >
                         ⚡ Instant Matcher
                       </button>
                     </div>
                   </div>

                   {/* OPTION A: VERIFIED OPPOSITE GENDER DISCOVERY GRID */}
                   {matchMode === 'chats' ? (
                     /* OPTION C: COMPREHENSIVE WHATSAPP STYLE CHATS OVERVIEW */
                     <div className="space-y-4 max-w-xl mx-auto">
                       <div className="bg-neutral-950/70 p-4 border border-neutral-900 rounded-3xl text-center space-y-1">
                         <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
                           💬 WhatsApp Secured Chats ({activeConversations.length})
                         </h3>
                         <p className="text-[10.5px] text-neutral-400">
                           All your conversations are stored securely. You can return, read your uploaded images, play voice notes, and resume chats instantly.
                         </p>
                       </div>

                       {activeConversations.length === 0 ? (
                         <div className="bg-[#0f0b0a] border border-neutral-900 p-8 rounded-2xl text-center space-y-4 flex flex-col items-center">
                           <span className="text-3xl">💬</span>
                           <div className="space-y-1">
                             <p className="text-xs text-neutral-200 font-bold">No saved conversations yet</p>
                             <p className="text-[10px] text-neutral-500 max-w-xs leading-relaxed">
                               Get started by searching for Indian girls or boys nearby and requesting a friendly direct chat!
                             </p>
                           </div>
                           <button
                             type="button"
                             onClick={() => setMatchMode('grid')}
                             className={`px-4 py-2 bg-gradient-to-r select-none cursor-pointer uppercase text-xs tracking-widest font-bold ${style.accentGradients} text-white rounded-xl`}
                           >
                             Explore Profiles Nearby
                           </button>
                         </div>
                       ) : (
                         <div className="space-y-2 max-h-[30rem] overflow-y-auto pr-1">
                           {activeConversations.map((chat) => {
                             const peer = chat.user1.uid === userSession?.uid ? chat.user2 : chat.user1;
                             const lastMsgTime = chat.lastMessageAt 
                               ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                               : 'Just now';

                             return (
                               <div
                                 key={chat.id}
                                 onClick={() => handleOpenConversation(chat)}
                                 className="group bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01]"
                                >
                                 <div className="flex items-center gap-3 min-w-0">
                                   <div className="relative w-11 h-11 shrink-0 rounded-full overflow-hidden border border-neutral-850 bg-neutral-900">
                                     <img referrerPolicy="no-referrer" src={peer.avatar} className="w-full h-full object-cover" />
                                     <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-neutral-950 rounded-full" />
                                   </div>
                                   <div className="text-left min-w-0">
                                     <div className="flex items-center gap-1.5">
                                       <h4 className="text-xs font-black text-white group-hover:text-rose-400 transition-colors uppercase tracking-wider truncate">{peer.nickname}</h4>
                                       {peer.voiceVerified && (
                                         <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-500/20 px-1 py-0.2 rounded font-extrabold uppercase shrink-0">★ VOICE</span>
                                       )}
                                     </div>
                                     <p className="text-[11px] text-neutral-400 mt-0.5 truncate font-medium max-w-[240px] md:max-w-[320px]">
                                       {chat.lastMessage}
                                     </p>
                                   </div>
                                 </div>

                                 <div className="flex flex-col items-end gap-1 shrink-0">
                                   <span className="text-[9px] text-neutral-500 font-bold font-mono uppercase tracking-wider">{lastMsgTime}</span>
                                   <span className="text-[8px] text-neutral-400 bg-neutral-950 border border-neutral-850 px-1.5 py-0.5 rounded uppercase tracking-widest font-bold">
                                     {peer.gender}
                                   </span>
                                 </div>
                               </div>
                             );
                           })}
                         </div>
                       )}
                     </div>
                   ) : matchMode === 'grid' ? (
                     <div className="space-y-6">
                       
                       {/* MATCH DECK HEADER & FILTERS */}
                       <div className="bg-neutral-950/70 p-5 border border-neutral-900 rounded-3xl flex flex-col md:flex-row gap-4 items-center justify-between">
                         <div className="text-center md:text-left space-y-1">
                           <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center justify-center md:justify-start gap-1.5">
                             <Sparkles className="text-orange-400 w-4 h-4" /> 
                             {userSession?.gender === 'male' ? 'Verified Indian Girls Nearby' : 'Verified Good Boys Nearby'}
                           </h3>
                           <p className="text-[11px] text-neutral-400 max-w-md">
                             Suno requires 100% voice verification to guarantee human connections. Filter and find someone to talk with respectfully!
                           </p>
                         </div>

                         <div className="flex flex-wrap gap-2.5 w-full md:w-auto justify-center">
                           <div className="space-y-1 text-left min-w-[120px]">
                             <label className="text-[9px] uppercase font-bold text-neutral-500">Filter City</label>
                             <select
                               value={discoveryFilterCity}
                               onChange={(e) => setDiscoveryFilterCity(e.target.value)}
                               className="w-full bg-neutral-900 border border-neutral-850 p-2 rounded-xl text-neutral-300 text-[11px]"
                             >
                               <option value="All">All Cities 🇮🇳</option>
                               <option value="Delhi">Delhi</option>
                               <option value="Mumbai">Mumbai</option>
                               <option value="Pune">Pune</option>
                               <option value="Bengaluru">Bengaluru</option>
                               <option value="Kolkata">Kolkata</option>
                               <option value="Lucknow">Lucknow</option>
                               <option value="Hyderabad">Hyderabad</option>
                               <option value="Jaipur">Jaipur</option>
                             </select>
                           </div>

                           <div className="space-y-1 text-left min-w-[130px]">
                             <label className="text-[9px] uppercase font-bold text-neutral-500">Focus Theme</label>
                             <select
                               value={discoveryFilterInterest}
                               onChange={(e) => setDiscoveryFilterInterest(e.target.value)}
                               className="w-full bg-neutral-900 border border-neutral-850 p-2 rounded-xl text-neutral-300 text-[11px]"
                             >
                               <option value="All">Any Focus Theme</option>
                               <option value="Mental Wellness">Mental Wellness</option>
                               <option value="Relationships">Relationships</option>
                               <option value="College Life">College Life</option>
                               <option value="Motivation">Motivation</option>
                               <option value="Career">Career Pivots</option>
                               <option value="Technology">Technology</option>
                               <option value="Fitness">Fitness</option>
                             </select>
                           </div>
                         </div>
                       </div>

                       {/* GRAPHICAL PROFILES GRID */}
                       {(() => {
                         const searchGender = userSession?.gender === 'male' ? 'female' : 'male';
                         const discoveryList = realRegisteredUsers.filter(peer => {
                           if (peer.uid === userSession?.uid) return false;
                            if (peer.gender !== searchGender) return false;
                           if (discoveryFilterCity !== 'All') {
                              const peerCity = (peer.city || '').toLowerCase();
                              const filterCity = discoveryFilterCity.toLowerCase();
                              const nicknameMatch = peer.nickname.toLowerCase().includes(filterCity);
                              const bioMatch = peer.bio.toLowerCase().includes(filterCity);
                              
                              if (!peerCity.includes(filterCity) && !filterCity.includes(peerCity) && !nicknameMatch && !bioMatch) {
                                return false;
                              }
                            }
                           if (discoveryFilterInterest !== 'All' && !peer.interests.includes(discoveryFilterInterest)) return false;
                           return true;
                         });

                         if (discoveryList.length === 0) {
                           return (
                             <div className="p-12 text-center bg-neutral-950/30 border border-neutral-900 rounded-3xl space-y-3">
                               <HeartCrack className="w-10 h-10 text-neutral-600 mx-auto animate-pulse" />
                               <p className="text-xs text-neutral-300 font-bold">No verified profile filters matched.</p>
                               <p className="text-[10px] text-neutral-500">Try selecting "All Cities" or changing your focus theme filters!</p>
                             </div>
                           );
                         }

                         return (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                             {discoveryList.map((peer) => {
                               const isLiked = likedPeers.includes(peer.uid);
                               return (
                                 <motion.div
                                   key={peer.uid}
                                   className="bg-neutral-950/80 border border-neutral-900 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:border-neutral-800 transition-all duration-300 shadow-xl overflow-hidden relative"
                                   initial={{ opacity: 0, y: 10 }}
                                   animate={{ opacity: 1, y: 0 }}
                                 >
                                   <div className="flex gap-4">
                                     <div className="relative">
                                       <img
                                         referrerPolicy="no-referrer"
                                         src={peer.avatar}
                                         className="w-14 h-14 rounded-2xl object-cover border border-neutral-800 bg-neutral-900 shrink-0"
                                         alt={peer.nickname}
                                       />
                                       <span className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-neutral-950 animate-pulse" />
                                     </div>

                                     <div className="space-y-1 text-left flex-1 min-w-0">
                                       <div className="flex items-center justify-between gap-1.5">
                                         <h4 className="text-sm font-extrabold text-white truncate">
                                           {peer.nickname}
                                         </h4>
                                         <span className="text-[9px] font-bold text-orange-400 bg-orange-600/10 border border-orange-500/20 px-2 py-0.5 rounded">
                                           ⭐ Score {peer.trustScore}
                                         </span>
                                       </div>

                                       <p className="text-[10.5px] text-neutral-400 flex items-center gap-1.5 flex-wrap">
                                         <span className="bg-neutral-900 px-1.5 py-0.2 rounded text-neutral-300 font-medium">Age {peer.ageRange}</span>
                                         <span className="bg-neutral-900 px-1.5 py-0.2 rounded text-neutral-300 flex items-center gap-1 font-medium">
                                           <MapPin size={10} className="text-orange-400" /> {peer.nickname.split('_')[1] || 'India'}
                                         </span>
                                         <span className="text-neutral-550 font-mono">{peer.language}</span>
                                       </p>
                                     </div>
                                   </div>

                                   {/* BIO TEXT */}
                                   <div className="bg-neutral-900/40 p-3 rounded-2xl border border-neutral-900/50">
                                     <p className="text-[11px] text-neutral-300 leading-relaxed italic">
                                       "{peer.bio}"
                                     </p>
                                   </div>

                                   {/* FOCUS THEME PILLS */}
                                   <div className="flex flex-wrap gap-1.5">
                                     {peer.interests.map((interest) => (
                                       <span
                                         key={interest}
                                         className="text-[9px] font-bold uppercase tracking-wider bg-neutral-900 border border-neutral-900 text-neutral-400 px-2 py-0.5 rounded"
                                       >
                                         {interest}
                                       </span>
                                     ))}
                                   </div>

                                   {/* PHOTO GALLERY THUMBNAILS ROW */}
                                   {(() => {
                                     const photos = peer.uploadedPhotos && peer.uploadedPhotos.length > 0
                                       ? peer.uploadedPhotos
                                       : getSeededPhotosForPeer(peer.uid, peer.gender, peer.avatar);
                                     return (
                                       <div className="space-y-1.5 bg-[#080505]/80 p-2.5 rounded-2xl border border-neutral-900 text-left w-full">
                                         <div className="flex items-center justify-between">
                                           <span className="text-[9.5px] uppercase font-black text-neutral-400 flex items-center gap-1">
                                             🖼️ Profile Photo Album (Tap to Zoom)
                                           </span>
                                           <span className="text-[8.5px] font-mono text-neutral-500 font-bold">
                                             {photos.length} Portal{photos.length > 1 ? 's' : ''}
                                           </span>
                                         </div>
                                         <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                                           {photos.map((src, idx) => (
                                             <button
                                               key={idx}
                                               type="button"
                                               onClick={() => {
                                                 setActiveLightboxPhotos(photos);
                                                 setActiveLightboxIndex(idx);
                                               }}
                                               className="w-12 h-12 rounded-xl overflow-hidden border border-neutral-850 hover:border-orange-500 hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer text-left relative focus:outline-none"
                                             >
                                               <img 
                                                 referrerPolicy="no-referrer"
                                                 src={src} 
                                                 className="w-full h-full object-cover" 
                                                 alt={`${peer.nickname} gallery ${idx + 1}`} 
                                               />
                                               {src === peer.avatar && (
                                                 <span className="absolute bottom-0 left-0 right-0 bg-orange-650/80 text-[6.5px] text-center uppercase font-mono font-bold py-0.2 text-white">Main</span>
                                               )}
                                             </button>
                                           ))}
                                         </div>
                                       </div>
                                     );
                                   })()}

                                   {/* ACOUSTIC PROFILE PREVIEW BOX */}
                                   {peer.voiceVerified && (
                                     <div className="flex items-center justify-between p-2 bg-[#ea580c]/5 border border-dashed border-[#ea580c]/15 rounded-xl">
                                       <div className="flex items-center gap-2 text-left">
                                         <Mic size={12} className="text-orange-400 shrink-0" />
                                         <div>
                                           <span className="text-[8.5px] uppercase font-bold text-neutral-500 block leading-none">AI Checked Acoustic Frequency</span>
                                           <span className="text-[10px] font-mono text-orange-300 font-bold leading-none mt-0.5 block">
                                             {peer.voiceVerification?.pitchHz}Hz &bull; {peer.voiceVerification?.toneLabel}
                                           </span>
                                         </div>
                                       </div>
                                       <button
                                         type="button"
                                         onClick={() => triggerPlayPeerVoiceGreeting(peer)}
                                         className="text-[9px] font-extrabold uppercase bg-neutral-950 hover:bg-neutral-900 text-orange-400 px-2 py-1 border border-dashed border-[#ea580c]/25 rounded-md transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                       >
                                         <Volume2 size={10} /> Test Vocal DNA
                                       </button>
                                     </div>
                                   )}

                                   {/* INTERACTION ACTION FOOTER ROW */}
                                   <div className="grid grid-cols-2 gap-2 mt-1">
                                     <button
                                       type="button"
                                       onClick={() => handleLikePeer(peer.uid, peer.nickname)}
                                       className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                         isLiked
                                           ? 'bg-rose-950/20 text-rose-400 border-rose-500/40'
                                           : 'bg-neutral-950 hover:bg-neutral-900 text-neutral-300 border-neutral-900'
                                       }`}
                                     >
                                       <Heart size={13} className={isLiked ? 'fill-rose-500 text-rose-500 animate-pulse' : 'text-neutral-400'} />
                                       {isLiked ? 'Liked!' : 'Like Profile'}
                                     </button>

                                     <button
                                       type="button"
                                       onClick={() => startMatchWithPeer(peer)}
                                       className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5 shadow-md cursor-pointer bg-gradient-to-r ${style.accentGradients} text-white hover:opacity-90`}
                                     >
                                       <MessageCircle size={13} />
                                       Start Chat
                                     </button>
                                   </div>

                                 </motion.div>
                               );
                             })}
                           </div>
                         );
                       })()}
                     </div>
                   ) : (
                     /* OPTION B: TRADITIONAL SMART MATCHMAKING MODULE */
                     <div className="max-w-xl mx-auto flex flex-col items-center justify-center py-6 space-y-6">
                       
                       {/* SEARCH DECK HERO HEADER */}
                       <div className="text-center space-y-2">
                         <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center justify-center gap-2">
                            Supportive Chat Matcher
                         </h2>
                         <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                           Overlap standard keywords or language choices. We connect you instantly into a secure peer thread. No swiping. No trivial rating tags. 
                         </p>
                       </div>

                       {/* PREFERENCES BLOCK */}
                       <div className="w-full bg-[#0f0b0a] border border-neutral-800 p-5 rounded-2xl space-y-4">
                         <p className="text-[10px] uppercase font-bold tracking-widest text-[#ea580c] border-b border-neutral-900 pb-1.5 flex items-center gap-1">
                           <Clock size={11} /> Filter Demographics Overlaps
                         </p>

                         <div className="grid grid-cols-2 gap-3.5 text-xs">
                           <div className="space-y-1.5">
                             <label className="text-neutral-400 font-semibold block">Select Matches Language</label>
                             <select
                               value={matchLanguageFilter}
                               onChange={(e) => setMatchLanguageFilter(e.target.value)}
                               className="w-full bg-neutral-950 border border-neutral-850 p-2 rounded-xl text-neutral-200"
                             >
                               <option value="English">English</option>
                               <option value="Hindi">Hindi / हिन्दी</option>
                               <option value="Spanish">Spanish / Español</option>
                               <option value="German">German / Deutsch</option>
                             </select>
                           </div>

                           <div className="space-y-1.5">
                             <label className="text-neutral-400 font-semibold block">Top Focus Theme</label>
                             <select
                               value={matchInterestFilter}
                               onChange={(e) => setMatchInterestFilter(e.target.value)}
                               className="w-full bg-neutral-950 border border-neutral-850 p-2 rounded-xl text-neutral-100"
                             >
                               <option value="Any">Intersects Any Theme</option>
                               <option value="Mental Wellness">Mental Wellness</option>
                               <option value="Entrepreneurship">Entrepreneurship</option>
                               <option value="College Life">College Life</option>
                               <option value="Career">Career Pivots</option>
                               <option value="Motivation">Habit Motivation</option>
                             </select>
                           </div>
                         </div>

                         {/* FEMALE SAFETY BLOCK INSIDE SETTINGS */}
                         <div className="pt-2 border-t border-neutral-900/65 space-y-3">
                           <div className="flex items-center justify-between">
                             <div>
                               <p className="text-xs font-bold text-neutral-200">Female Safety Mode (Verified Match Only)</p>
                               <p className="text-[10px] text-neutral-500">Only trigger matches with peer members holding reputation trust scores higher than 95%.</p>
                             </div>
                             <input
                               type="checkbox"
                               checked={userSession.safetySettings.verifiedUsersOnly}
                               onChange={handleToggleVerifiedOnly}
                               className="rounded h-4 w-4 accent-orange-500"
                             />
                           </div>

                           <div className="flex items-center justify-between">
                             <div>
                               <p className="text-xs font-bold text-neutral-200">Mask Profile Gender Tag</p>
                               <p className="text-[10px] text-neutral-500">Completely hides gender metadata tags inside dynamic conversation headers.</p>
                             </div>
                             <input
                               type="checkbox"
                               checked={userSession.safetySettings.hideGender}
                               onChange={handleToggleHideGender}
                               className="rounded h-4 w-4 accent-orange-500"
                             />
                           </div>
                         </div>

                         {/* CORE VOICE VERIFICATION CARD */}
                         <div className="pt-2.5 border-t border-neutral-900/65">
                           <div className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-900 rounded-xl relative overflow-hidden">
                             <div>
                               <p className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1">
                                 ★ Acoustic Voice Trust Sign
                               </p>
                               <p className="text-[10px] text-neutral-400 mt-1 max-w-[280px] leading-relaxed">
                                 {userSession.voiceVerified 
                                   ? `Verified signature: ${userSession.voiceVerification?.pitchHz}Hz (${userSession.voiceVerification?.toneLabel})`
                                   : 'Real voice verification builds mutual trust and proves your identity. Highly recommended!'}
                               </p>
                             </div>
                             <button
                               type="button"
                               onClick={() => setShowVoiceModal(true)}
                               className={`text-[9px] uppercase font-bold px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                                 userSession.voiceVerified 
                                   ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' 
                                   : 'bg-orange-600 hover:bg-orange-700 text-white'
                               }`}
                             >
                               {userSession.voiceVerified ? '★ Verified' : 'Start Scan'}
                             </button>
                           </div>
                         </div>

                       </div>

                       {/* ACTION TRIGGER */}
                       <div className="w-full">
                         {isSearchingMatch ? (
                           <div className="w-full bg-[#0f0b0a] border border-neutral-800 p-8 rounded-2xl text-center space-y-3 flex flex-col items-center">
                             <RefreshCw className="animate-spin text-orange-500 w-8 h-8" />
                             <p className="text-xs text-neutral-200 font-bold">Scanning for respectful peer sessions...</p>
                             <p className="text-[10px] text-neutral-500 max-w-xs leading-relaxed">
                               Enforcing security filters. Matching based on common focus interest: {matchInterestFilter} &bull; Language: {matchLanguageFilter}
                             </p>
                           </div>
                         ) : (
                           <button
                             type="button"
                             onClick={handleTriggerMatch}
                             className={`w-full py-4 bg-gradient-to-r ${style.accentGradients} text-white font-extrabold text-sm uppercase tracking-widest rounded-2xl shadow-xl hover:opacity-95 transition-all text-center flex items-center justify-center gap-2 cursor-pointer`}
                           >
                              Request Instant Support Match
                           </button>
                         )}
                       </div>

                       <div className="flex gap-2.5 justify-center items-center text-[10px] text-neutral-500">
                         <Lock size={11} /> End-to-End Encrypted Match Broker
                       </div>

                     </div>
                   )}

                 </motion.div>
               ) : (
                /* CHAT INTERACTIVE WINDOW */
                <motion.div
                  key="match_chat_room"
                  initial={{ opacity: 0, scale: 0.98, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -15 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-5 h-full"
                >
                  
                  {/* ACTIVE SIDEBAR (REPUTATION AND EXIT CRITERIAS) */}
                  <div className="md:col-span-4 bg-[#0f0b0a] border border-neutral-800 p-4 rounded-3xl flex flex-col justify-between space-y-4">
                    
                    <div className="space-y-4">
                      {/* Peer info badge */}
                      <div className="text-center p-4 bg-neutral-950/80 border border-neutral-900 rounded-2xl relative overflow-hidden">
                        
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-neutral-800 mx-auto mb-2 bg-neutral-900">
                          <img referrerPolicy="no-referrer" src={activeMatch.peer.avatar} className="w-full h-full object-cover" />
                        </div>

                        <h3 className="text-sm font-black text-white">{activeMatch.peer.nickname}</h3>
                        
                        {/* Gender masking checks */}
                        <div className="flex items-center justify-center gap-1 text-[9.5px] font-bold text-neutral-400 mt-0.5">
                          <span>{activeMatch.peer.ageRange}</span>
                          {!userSession.safetySettings.hideGender && activeMatch.peer.gender !== 'prefer-not-to-say' && (
                            <>
                              <span>&bull;</span>
                              <span className="uppercase">{activeMatch.peer.gender}</span>
                            </>
                          )}
                          <span>&bull;</span>
                          <span>{activeMatch.peer.country}</span>
                        </div>

                        <p className="text-[10.5px] text-neutral-400 italic mt-2 py-2 border-t border-neutral-900/60 leading-relaxed font-medium">"{activeMatch.peer.bio}"</p>

                        <div className="flex flex-wrap gap-1 items-center justify-center pt-1.5 border-t border-neutral-900/40">
                          {activeMatch.peer.interests.map((interest) => (
                            <span key={interest} className="px-2 py-0.5 bg-rose-500/10 text-rose-300 font-bold border border-rose-500/10 text-[8px] rounded-full uppercase tracking-wider">{interest}</span>
                          ))}
                        </div>

                        <p className="text-[9.5px] bg-[#1d3d25] text-emerald-300 border border-emerald-500/15 py-1 px-2.5 rounded-full mt-3 inline-flex items-center gap-1 font-bold">
                          <ShieldCheck size={11} className="stroke-[3px]" /> Trust Score: {activeMatch.peer.trustScore}/100
                        </p>

                        {/* PEER VOICE VERIFIED SEAL CHECK */}
                        {activeMatch.peer.voiceVerified && (
                          <div id="peer_voice_seal_container" className="mt-3 py-2.5 border-t border-neutral-900/60 text-center">
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/15 text-[8.5px] text-emerald-400 font-extrabold tracking-wider uppercase animate-pulse">
                              ★ VOICE DNA VERIFIED
                            </div>
                            <div className="mt-2 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => triggerPlayPeerVoiceGreeting(activeMatch.peer)}
                                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-[#1b3d21] rounded-xl text-[10px] text-neutral-200 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Volume2 size={11} className="text-emerald-400" /> Play Voice Greeting
                              </button>
                            </div>
                            <p className="text-[8.5px] text-neutral-500 mt-1.5 leading-relaxed font-mono">
                              Acoustic Pitch: {activeMatch.peer.voiceVerification?.pitchHz}Hz &bull; {activeMatch.peer.voiceVerification?.toneLabel}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Remaining Trial Timer Panel */}
                      <div className="bg-neutral-950 border border-neutral-900 p-3.5 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-[9px] uppercase font-black text-neutral-500">Remaining Free Dialogs</p>
                          <p className="text-xs font-extrabold text-neutral-200 mt-0.5">
                            {userSession.paymentDetails.isPremiumSignedUp ? 'Unlimited Core' : `${Math.floor(freeTrialSeconds / 60)} minutes, ${freeTrialSeconds % 60} seconds`}
                          </p>
                        </div>
                        
                        {!userSession.paymentDetails.isPremiumSignedUp && (
                          <button
                            onClick={() => {
                              setPaymentStep('init');
                              setShowPaymentModal(true);
                            }}
                            className="text-[9px] uppercase font-black bg-[#ca8a04]/20 hover:bg-[#ca8a04]/30 text-amber-300 border border-amber-500/15 px-2 py-1 rounded"
                          >
                            Extend Unlimited
                          </button>
                        )}
                      </div>

                      {/* Female Safety settings sidebar info (Limited screenshots warning overlay etc.) */}
                      <div className="p-3 bg-rose-950/5 border border-rose-500/10 rounded-2xl">
                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">🛡️ Female Safety Warning</p>
                        <ul className="text-[9.5px] text-neutral-400 leading-relaxed space-y-1 list-disc pl-3.5 mt-1">
                          <li>Screenshots disabled automatically.</li>
                          <li>Any unsolicited telephone request is flagged instantly.</li>
                          <li>Report harassment in 1 click below for immediate profile locking.</li>
                        </ul>
                      </div>
                    </div>

                    {/* ACTIONS BAR (instant leave, report) */}
                    <div className="space-y-2 border-t border-neutral-900/65 pt-3">
                      <button
                        onClick={handleInstantExitChat}
                        className="w-full py-2 bg-neutral-950 hover:bg-[#1a0c0c] border border-neutral-900 text-neutral-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <HeartCrack size={12} className="text-rose-500" /> Instant Safe Exit & Block
                      </button>

                      {/* Flag report triggers */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => handleReportPeer('Harassment')}
                          className="py-1.5 bg-neutral-950 border border-neutral-900 hover:border-red-500/20 text-neutral-400 hover:text-red-400 text-[10px] font-semibold rounded-lg"
                        >
                          Report Harassment
                        </button>
                        <button
                          onClick={() => handleReportPeer('PII Sharing')}
                          className="py-1.5 bg-neutral-950 border border-neutral-900 hover:border-red-500/20 text-neutral-400 hover:text-red-400 text-[10px] font-semibold rounded-lg"
                        >
                          Report File/PII
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* ACTIVE MESSAGES CHAT LOG */}
                  <div className="md:col-span-8 bg-[#0f0b0a] border border-neutral-800 rounded-3xl overflow-hidden flex flex-col justify-between h-[36rem]">
                    
                    {/* Header partner handle */}
                    <div className="p-3 bg-neutral-950/60 border-b border-neutral-900/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                        <p className="text-xs font-bold text-white uppercase tracking-wider">{activeMatch.peer.nickname} Chatroom</p>
                      </div>
                      <span className="text-[8px] tracking-wider uppercase font-mono font-bold text-neutral-500 bg-neutral-900 border border-neutral-800 px-1.5 rounded">Active E2E Tunnel</span>
                    </div>

                    {/* Messages Feed */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {activeMatch.messages.map((msg) => {
                        const isUser = msg.senderId === 'user';
                        const isSystem = msg.senderId === 'system';

                        if (isSystem) {
                          return (
                            <div key={msg.id} className="p-3 rounded-2xl bg-neutral-950 border border-neutral-900 text-[10.5px] leading-relaxed text-neutral-400 max-w-sm mx-auto text-center gap-1">
                              {msg.content}
                            </div>
                          );
                        }

                        if (msg.isVoice) {
                          const isPlaying = playingVoiceMessages[msg.id] || false;
                          const progress = voicePlaybackProgress[msg.id] || 0;
                          const durationStr = msg.voiceDuration ? `${Math.floor(msg.voiceDuration / 60)}:${(msg.voiceDuration % 60).toString().padStart(2, '0')}` : '0:04';
                          
                          return (
                            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                              <div className="flex gap-2.5 max-w-[85%]">
                                {!isUser && (
                                  <img referrerPolicy="no-referrer" src={activeMatch.peer.avatar} className="w-6 h-6 rounded-full self-end object-cover border border-neutral-800 bg-neutral-900 shrink-0" />
                                )}
                                <div className="flex flex-col">
                                  <div className={`px-4 py-3 rounded-2xl flex items-center gap-3.5 min-w-[245px] md:min-w-[280px] shadow-lg ${
                                    isUser 
                                      ? 'bg-rose-600 text-white rounded-br-none' 
                                      : 'bg-neutral-950 border border-neutral-900 text-neutral-200 rounded-bl-none'
                                  }`}>
                                    {/* Play Round Button */}
                                    <button
                                      type="button"
                                      onClick={() => playVoiceMessage(msg.id, msg.content, isUser, msg.voiceDuration || 4)}
                                      className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center cursor-pointer transition-all ${
                                        isUser 
                                          ? 'bg-white/20 hover:bg-white/30 text-white' 
                                          : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-400'
                                      }`}
                                    >
                                      {isPlaying ? (
                                        <span className="text-[10px] font-black">❚❚</span>
                                      ) : (
                                        <span className="text-xs pl-0.5">▶</span>
                                      )}
                                    </button>

                                    {/* Waves columns */}
                                    <div className="flex-1 space-y-1">
                                      <div className="flex items-end gap-[2px] h-5.5 px-0.5">
                                        {[14, 22, 10, 28, 20, 12, 24, 8, 16, 26, 18, 14, 6, 16, 22, 10, 14].map((val, idx) => {
                                          const stepLimit = (idx / 17) * 100;
                                          const completed = progress >= stepLimit;
                                          return (
                                            <div
                                              key={idx}
                                              className={`w-1 rounded-full transition-colors ${
                                                completed
                                                  ? (isUser ? 'bg-amber-400' : 'bg-rose-500')
                                                  : (isUser ? 'bg-white/25' : 'bg-neutral-800')
                                              }`}
                                              style={{ height: `${val}px` }}
                                            />
                                          );
                                        })}
                                      </div>
                                      
                                      {/* Audio Timeline slider */}
                                      <div className="w-full h-0.5 bg-neutral-900/60 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full transition-all duration-300 ${isUser ? 'bg-amber-400' : 'bg-rose-500'}`} 
                                          style={{ width: `${progress}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Duration timer */}
                                    <div className="flex flex-col items-end shrink-0">
                                      <span className="text-[9.5px] font-bold font-mono tracking-wider">{isPlaying ? `${Math.round((progress/100) * (msg.voiceDuration || 4))}s` : durationStr}</span>
                                      <span className="text-[7px] text-neutral-400 uppercase tracking-widest font-extrabold select-none">VOICE</span>
                                    </div>
                                  </div>
                                  <span className={`text-[8.5px] text-neutral-500 mt-1 block ${isUser ? 'text-right' : 'text-left'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (msg.imageUrl) {
                          return (
                            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                              <div className="flex gap-2.5 max-w-[85%]">
                                {!isUser && (
                                  <img referrerPolicy="no-referrer" src={activeMatch.peer.avatar} className="w-6 h-6 rounded-full self-end object-cover border border-neutral-800 bg-neutral-900 shrink-0" />
                                )}
                                <div className="flex flex-col">
                                  <div className={`p-1 rounded-2xl shadow-lg border relative overflow-hidden group cursor-pointer ${
                                    isUser 
                                      ? 'bg-rose-600 text-white rounded-br-none border-rose-500/30' 
                                      : 'bg-neutral-950 border border-neutral-900 text-neutral-200 rounded-bl-none'
                                  }`}
                                  onClick={() => {
                                    setActiveLightboxPhotos([msg.imageUrl]);
                                    setActiveLightboxIndex(0);
                                  }}
                                  >
                                    <img 
                                      referrerPolicy="no-referrer"
                                      src={msg.imageUrl} 
                                      className="w-44 h-44 rounded-xl object-cover hover:scale-[1.02] transition-transform duration-300"
                                      alt="Chat Attachment" 
                                    />
                                    {msg.content && msg.content !== '[Image Attachment]' && (
                                      <p className="p-1 px-1.5 text-[11px] leading-normal font-medium max-w-[176px]">{msg.content}</p>
                                    )}
                                  </div>
                                  <span className={`text-[8.5px] text-neutral-500 mt-1 block ${isUser ? 'text-right' : 'text-left'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <div className="flex gap-2.5 max-w-[85%]">
                              {!isUser && (
                                <img referrerPolicy="no-referrer" src={activeMatch.peer.avatar} className="w-6 h-6 rounded-full self-end object-cover border border-neutral-800 bg-neutral-900 shrink-0" />
                              )}
                              <div className="flex flex-col">
                                <div className={`px-3.5 py-2 rounded-2xl text-[12px] leading-relaxed ${
                                  isUser 
                                    ? 'bg-rose-600 text-white rounded-br-none' 
                                    : 'bg-neutral-950 border border-neutral-900 text-neutral-200 rounded-bl-none'
                                }`}>
                                  {msg.content}
                                </div>
                                <span className={`text-[8.5px] text-neutral-500 mt-1 block ${isUser ? 'text-right' : 'text-left'}`}>
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {isPeerTyping && (
                        <div className="flex justify-start">
                          <div className="flex gap-2 items-center">
                            <img referrerPolicy="no-referrer" src={activeMatch.peer.avatar} className="w-6 h-6 rounded-full self-end object-cover border border-neutral-800 bg-neutral-900 shrink-0" />
                            <div className="bg-neutral-950 border border-neutral-900 px-3 py-2 rounded-xl rounded-bl-none text-neutral-500 text-xs flex gap-0.5 shrink-0">
                              <span className="w-1 bg-neutral-500 h-1 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-1 bg-neutral-500 h-1 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-1 bg-neutral-500 h-1 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>

                    {/* Form Input */}
                    {isRecordingVoice ? (
                      <div className="p-3 bg-neutral-950/80 border-t border-neutral-900 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-rose-500 pl-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 border border-rose-500/10 px-2 py-0.5 bg-rose-500/5 rounded-full">
                            🎙️ Recording voice DNA note: {Math.floor(voiceRecordSeconds / 60)}:{(voiceRecordSeconds % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsRecordingVoice(false)}
                            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white text-[10px] uppercase font-black tracking-wider rounded-xl cursor-pointer"
                          >
                            Discard
                          </button>
                          <button
                            type="button"
                            onClick={handleSendVoiceNote}
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] uppercase font-black tracking-widest cursor-pointer animate-pulse"
                          >
                            Send Wave
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSendMessage} className="p-3 bg-neutral-950/70 border-t border-neutral-900 flex gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => setIsRecordingVoice(true)}
                          className="w-10 h-10 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-rose-400 rounded-xl text-sm flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                          title="Record and send voice note"
                        >
                          🎙️
                        </button>

                        {/* WhatsApp-Style Camera Attachment */}
                        <label className="w-10 h-10 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-[#ca8a04] rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-colors" title="Send photo attachment">
                          <Camera size={16} />
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleChatImageUpload} 
                          />
                        </label>

                        <input
                          type="text"
                          required
                          disabled={userSession.offenseStatus === 'muted' || userSession.offenseStatus === 'banned'}
                          placeholder={userSession.offenseStatus === 'muted' ? 'Your profile is temporarily muted from writing...' : `Reply safely anonymously...`}
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          className="flex-1 bg-neutral-950 border border-neutral-900 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none placeholder-neutral-500 font-medium"
                        />
                        <button
                          type="submit"
                          disabled={userSession.offenseStatus === 'muted' || userSession.offenseStatus === 'banned'}
                          className="w-10 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50"
                        >
                          <Send size={13} />
                        </button>
                      </form>
                    )}

                  </div>

                </motion.div>
              )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* TAB 2: PUBLIC SPACES & LOBBIES */}
          {activeTab === 'community' && (
            <motion.div
              key="community_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CommunityRooms
                rooms={rooms}
                userSession={userSession}
                onVote={handleVotePoll}
                onAddPost={handleAddCommunityPost}
                onAddReply={handleAddCommunityReply}
              />
            </motion.div>
          )}

          {/* TAB 3: MODERATOR CONSOLE */}
          {activeTab === 'admin' && (
            <motion.div
              key="admin_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {userSession?.isAdmin === true ? (
                <AdminPanel
                  reports={reports}
                  analytics={analytics}
                  onReviewReport={handleReviewReport}
                />
              ) : (
                <div className="max-w-md mx-auto bg-[#0f0b0a] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6 relative">
                  {/* Lock head badge */}
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                      <Lock size={22} className="animate-pulse" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#fff] flex items-center justify-center gap-1.5">
                      🔒 Guarded Console Access
                    </h3>
                    <p className="text-[10px] text-neutral-400 max-w-xs mx-auto leading-relaxed">
                      Enter administrative credentials below to inspect live support reports, ban users, and manage platform safety.
                    </p>
                  </div>

                  {/* Tab switches */}
                  <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-900">
                    <button
                      type="button"
                      onClick={() => { setAdminFormTab('login'); setAdminAuthError(''); }}
                      className={`flex-1 py-2 text-[10.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        adminFormTab === 'login'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      Sign In as Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAdminFormTab('signup'); setAdminAuthError(''); }}
                      className={`flex-1 py-2 text-[10.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        adminFormTab === 'signup'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      Privileged Sign-Up
                    </button>
                  </div>

                  {/* Credential Notification Banner */}
                  <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4 space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-500/80 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 inline-block">
                      📋 Master System Credentials Verified
                    </span>
                    <div className="space-y-1 text-xs select-all text-neutral-300 font-mono text-[11px] leading-relaxed">
                      <p className="flex justify-between items-center bg-neutral-900/60 p-2 rounded border border-neutral-900">
                        <span className="text-neutral-500 uppercase text-[9.5px] font-bold">Admin Username</span>
                        <span className="text-rose-400 font-bold font-mono">admin</span>
                      </p>
                      <p className="flex justify-between items-center bg-neutral-900/60 p-2 rounded border border-neutral-900">
                        <span className="text-neutral-500 uppercase text-[9.5px] font-bold">Admin Password</span>
                        <span className="text-rose-400 font-bold font-mono text-[11px]">suno_admin_2026</span>
                      </p>
                      <p className="flex justify-between items-center bg-neutral-900/60 p-2 rounded border border-neutral-900">
                        <span className="text-neutral-500 uppercase text-[9.5px] font-bold">Master Signup Key</span>
                        <span className="text-rose-400 font-bold font-mono text-[11px]">suno_admin_2026</span>
                      </p>
                    </div>
                  </div>

                  {/* Error Alert Display */}
                  {adminAuthError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-red-400 text-xs text-center flex items-center justify-center gap-2"
                    >
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{adminAuthError}</span>
                    </motion.div>
                  )}

                  {/* LOGIN FORM TAB */}
                  {adminFormTab === 'login' ? (
                    <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-wider text-neutral-400">Username</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. admin"
                          value={adminUsername}
                          onChange={(e) => setAdminUsername(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs focus:ring-1 focus:ring-rose-500 text-neutral-200 uppercase font-mono font-bold placeholder-neutral-700"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-wider text-neutral-400">Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••••••"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs focus:ring-1 focus:ring-rose-500 text-neutral-200 font-mono placeholder-neutral-700"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-rose-950/20 flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck size={14} /> Engage Admin Session
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleAdminSignupSubmit} className="space-y-4">
                      {userSession && (
                        <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[11px] text-neutral-300">
                          Active Profile target to elevate: <span className="text-white font-bold">{userSession.nickname}</span> (Unique ID: #{userSession.uid.slice(-6)})
                        </div>
                      )}
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black tracking-wider text-neutral-400">Master Passcode</label>
                        <input
                          type="password"
                          required
                          placeholder="e.g. suno_admin_2026"
                          value={adminPasscode}
                          onChange={(e) => setAdminPasscode(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs focus:ring-1 focus:ring-rose-500 text-neutral-200 font-mono placeholder-neutral-700"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-1.5"
                      >
                        <Shield size={14} /> Elevate Account to Moderator
                      </button>
                    </form>
                  )}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* MODAL WINDOW: SIGNUP AND TRIAL EXTENSION ₹5 GATEWAY SIMULATOR */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0f0b0a] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6 relative"
            >
              <button 
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentStep('init');
                }} 
                className="absolute top-4 right-4 text-neutral-500 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
                  <Wallet size={24} />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Free Conversation Trial Expired</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Thank you for using Suno! To maintain excellent server quality and keep abuse levels minimal, we charge a microscopic access fee.
                </p>
              </div>

              {paymentStep === 'init' && (
                <div className="space-y-4">
                  
                  {/* Select billing option */}
                  <div className="space-y-2.5">
                    <p className="text-[10px] uppercase font-bold text-rose-400">Select Access Plan</p>
                    
                    <button
                      type="button"
                      onClick={() => setPaymentOption('initial_only')}
                      className={`w-full text-left p-3 rounded-xl border flex justify-between items-center ${
                        paymentOption === 'initial_only' 
                          ? 'bg-neutral-900 border-rose-500 text-white' 
                          : 'bg-neutral-950 border-neutral-900 text-neutral-400'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold">Standard Single Access Ticket</p>
                        <p className="text-[10px] text-neutral-500">Allows another premium unbounded conversation match.</p>
                      </div>
                      <span className="text-xs font-black text-rose-400">₹5 Once</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentOption('recurring')}
                      className={`w-full text-left p-3 rounded-xl border flex justify-between items-center ${
                        paymentOption === 'recurring' 
                          ? 'bg-neutral-900 border-rose-500 text-white' 
                          : 'bg-neutral-950 border-neutral-900 text-neutral-400'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold">VIP Autopay Subscription</p>
                        <p className="text-[10px] text-neutral-500">Unlimited permanent support rooms, verified badges.</p>
                      </div>
                      <span className="text-xs font-black text-rose-400">₹500 / month</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setPaymentStep('pay')}
                    className="w-full py-3 bg-[#e11d48] text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-rose-700 transition-colors flex items-center justify-center gap-1"
                  >
                    Confirm & Proceed Payment Gateway
                    <ArrowRight size={13} />
                  </button>
                  
                </div>
              )}

              {paymentStep === 'pay' && (
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  {paymentError && (
                    <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-300 text-[10.5px] rounded-lg">
                      {paymentError}
                    </div>
                  )}

                  <div className="p-3 bg-neutral-950 border border-neutral-900 rounded-xl text-center">
                    <p className="text-[10px] text-neutral-500 font-bold upper">Total Amount Payable</p>
                    <p className="text-xl font-bold text-rose-400 mt-0.5">{paymentOption === 'recurring' ? '₹500 / month' : '₹5 Once'}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-neutral-400">Cardholder Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Serene Listener"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-neutral-400">Visa / Mastercard / UPI Number</label>
                      <input
                        type="text"
                        maxLength={16}
                        required
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-[#10b981] text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 flex items-center justify-center gap-1.5"
                  >
                    🚀 Trigger Simulated Autopay Core
                  </button>
                </form>
              )}

              {paymentStep === 'complete' && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-full border border-emerald-500/25 text-emerald-400 flex items-center justify-center mx-auto">
                    <Check size={20} className="stroke-[3px]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Access Approved & Cleared!</h4>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1 leading-relaxed">
                      Your trial limits have been revoked. Unlimited secure supportive match lobbies are now open.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPaymentStep('init');
                    }}
                    className="w-full py-2 bg-neutral-900 border border-neutral-800 text-neutral-100 font-bold text-xs rounded-xl hover:bg-neutral-800"
                  >
                    Got It! Back to Chats
                  </button>
                </div>
              )}

            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* ACOUSTIC VOICE TRUST TEST ENTRY PANEL */}
      <AnimatePresence>
        {showVoiceModal && (
          <VoiceVerificationModal
            userSession={userSession}
            onComplete={(updatedSession) => {
              setUserSession(updatedSession);
              setNotifications(prev => [
                { 
                  id: `not_vsu_${Date.now()}`, 
                  text: `🥇 Acoustic voice signature verified successfully at ${updatedSession.voiceVerification?.pitchHz}Hz! Trust Star badge unlocked!`, 
                  time: 'Just now', 
                  type: 'success' 
                },
                ...prev
              ]);
            }}
            onClose={() => setShowVoiceModal(false)}
          />
        )}
      </AnimatePresence>

      {/* METICULOUS BOTTOM SYSTEM BAR */}
      <footer className="bg-[#0b0807] border-t border-neutral-900 p-4 text-center text-[10px] text-neutral-600 relative z-10 select-none">
        <p>&copy; {new Date().getFullYear()} Suno Safe Spaces. Fully Moderated E2E Tunnel.</p>
      </footer>

    </div>
  );
}
