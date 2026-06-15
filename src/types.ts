/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GenderType = 'male' | 'female' | 'nonbinary' | 'prefer-not-to-say';

export interface UserSession {
  uid: string;
  nickname: string;
  avatar: string;
  uploadedPhotos?: string[];
  city: string; // The city/region of India the user selected
  isAdmin?: boolean;
  ageRange: '18-24' | '25-34' | '35-44' | '45+';
  gender: GenderType;
  country: string;
  language: string;
  interests: string[];
  bio: string;
  trustScore: number; // 0 - 100
  offenseCount: number; // 0 (clear), 1 (warning), 2 (muted), 3+ (suspended/banned)
  offenseStatus: 'clear' | 'warned' | 'muted' | 'suspended' | 'banned';
  phoneNumber?: string;
  email?: string;
  
  // Female Safety Mode
  safetySettings: {
    hideGender: boolean;
    anonymousMode: boolean; // Hide from matching pools or recommendations
    limitIncomingChats: boolean; // Limits concurrent private chat requests (max 2)
    verifiedUsersOnly: boolean; // Only allow matches with reputation trust score >= 80
  };
  
  voiceVerified?: boolean;
  voiceVerification?: {
    isVerified: boolean;
    pitchHz: number;
    toneLabel: string;
    verifiedAt: string;
  };
  
  // Payment Status
  paymentDetails: {
    freeTrialMinutesLeft: number; // starts at 10:00 (600 seconds)
    isPremiumSignedUp: boolean; // Has paid the 5 rupees signup fee
    hasAutoPayEnabled: boolean; // Has enabled automatic subscription (500 rupees billing)
  };
}

export interface AnonymousPeer {
  uid: string;
  nickname: string;
  avatar: string;
  uploadedPhotos?: string[];
  city?: string; // Optional city/region name
  ageRange: '18-24' | '25-34' | '35-44' | '45+';
  gender: GenderType;
  country: string;
  language: string;
  interests: string[];
  bio: string;
  trustScore: number;
  safetyHideGender?: boolean;
  voiceVerified?: boolean;
  voiceVerification?: {
    isVerified: boolean;
    pitchHz: number;
    toneLabel: string;
    verifiedAt: string;
  };
}

export interface ChatMessage {
  id: string;
  senderId: string; // 'user' (current user) or 'peer'
  senderNickname: string;
  content: string;
  timestamp: string; // ISO string
  moderated: boolean;
  moderationLabel?: string; // e.g. "Hate Speech Checked", "PII Redacted", etc.
  warningShown?: boolean;
  systemAlert?: boolean; // system message (e.g. safety rules, timeout warnings, banner alerts)
  isVoice?: boolean;
  voiceDuration?: number; // message length in seconds
  imageUrl?: string; // uploaded image attachment URL
}

export interface ConversationMatch {
  id: string;
  peer: AnonymousPeer;
  startedAt: string;
  lastMessageAt: string;
  active: boolean;
  messages: ChatMessage[];
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
  userVotedId?: string;
}

export interface CommunityPost {
  id: string;
  authorNickname: string;
  authorAvatar: string;
  authorTrustScore: number;
  authorVoiceVerified?: boolean;
  content: string;
  timestamp: string;
  poll?: PollData;
  replies: {
    id: string;
    authorNickname: string;
    authorAvatar: string;
    content: string;
    timestamp: string;
  }[];
}

export interface DiscussionRoom {
  id: string;
  name: string;
  description: string;
  category: 'Tech' | 'College Life' | 'Entrepreneurship' | 'Mental Wellness' | 'Relationships' | 'Fitness';
  icon: string;
  posts: CommunityPost[];
}

export interface UserReport {
  id: string;
  reportedUserNickname: string;
  reportedUserId: string;
  reporterNickname: string;
  reason: 'Harassment' | 'Abuse/Threats' | 'Sexual content' | 'Fake profile' | 'Spam' | 'PII Sharing';
  evidence: string[]; // Chat snippet context
  timestamp: string;
  status: 'Pending' | 'Reviewed_Warning' | 'Reviewed_Mute' | 'Reviewed_Suspended' | 'Reviewed_Banned' | 'Dismissed';
}

export interface AppAnalytics {
  dau: number;
  retentionRate: number;
  messagesSent: number;
  abuseReports: number;
  avgTrustScore: number;
  userGrowthPct: number;
}
