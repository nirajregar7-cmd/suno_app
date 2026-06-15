/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { ANONYMOUS_PEERS } from '../profilesData.js';

const { Pool } = pg;

// Define interfaces for schema elements
export interface UserDbRecord {
  uid: string;
  nickname: string;
  avatar: string;
  uploaded_photos: string; // JSON array of string
  city: string;
  age_range: string;
  gender: string;
  country: string;
  language: string;
  interests: string; // JSON array of string
  bio: string;
  trust_score: number;
  offense_count: number;
  offense_status: string;
  phone_number: string;
  voice_verified: boolean;
  voice_verification: string; // JSON
  safety_settings: string; // JSON
  payment_details: string; // JSON
}

export interface PostDbRecord {
  id: string;
  room_id: string;
  author_nickname: string;
  author_avatar: string;
  author_trust_score: number;
  author_voice_verified: boolean;
  content: string;
  timestamp: string;
  poll: string; // JSON
  replies: string; // JSON array of reply
}

export interface ChatDbRecord {
  id: string;
  uids: string; // JSON array
  last_message: string;
  last_message_at: string;
  started_at: string;
  user1: string; // JSON
  user2: string; // JSON
}

export interface MessageDbRecord {
  id: string;
  room_id: string;
  sender_id: string;
  sender_nickname: string;
  content: string;
  timestamp: string;
  moderated: boolean;
  moderation_label: string;
  system_alert: boolean;
  is_voice: boolean;
  voice_duration: number;
  image_url: string;
}

export interface ReportDbRecord {
  id: string;
  reporter_uid: string;
  reported_uid: string;
  reported_nickname: string;
  reason: string;
  timestamp: string;
  status: string;
}

class NeonDatabaseManager {
  private pool: pg.Pool | null = null;
  private useFallback: boolean = true;
  private fallbackFilePath: string;

  // In-memory fallbacks
  private memoryUsers: Record<string, any> = {};
  private memoryPosts: Record<string, any> = {};
  private memoryChats: Record<string, any> = {};
  private memoryMessages: Record<string, any[]> = {}; // roomId -> messages
  private memoryReports: Record<string, any> = {};

  constructor() {
    this.fallbackFilePath = path.join(process.cwd(), 'src', 'db', 'fallback-db.json');
    const dbUrl = process.env.DATABASE_URL;

    if (dbUrl && dbUrl.trim() !== '' && !dbUrl.includes('placeholder')) {
      console.log('🔌 DATABASE_URL detected. Configuring Neon Postgraduate client connection pool...');
      try {
        this.pool = new Pool({
          connectionString: dbUrl,
          ssl: dbUrl.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 10000,
        });

        this.pool.on('error', (err) => {
          console.error('Unexpected error on idle Neon database client:', err);
        });

        this.useFallback = false;
      } catch (poolErr) {
        console.error('⛔ Failed to construct Postgres connection Pool. Switching to memory fallback.', poolErr);
        this.useFallback = true;
      }
    } else {
      console.log('⚠️ DATABASE_URL is not set. Operating in resilient Offline Memory Fallback mode.');
      this.useFallback = true;
    }

    this.loadFallbackFromFile();
    this.seedDefaultProfiles();
  }

  private loadFallbackFromFile() {
    if (!this.useFallback) return;

    try {
      const dirOfFallback = path.dirname(this.fallbackFilePath);
      if (!fs.existsSync(dirOfFallback)) {
        fs.mkdirSync(dirOfFallback, { recursive: true });
      }

      if (fs.existsSync(this.fallbackFilePath)) {
        const fileContent = fs.readFileSync(this.fallbackFilePath, 'utf8');
        const parsed = JSON.parse(fileContent);
        this.memoryUsers = parsed.users || {};
        this.memoryPosts = parsed.posts || {};
        this.memoryChats = parsed.chats || {};
        this.memoryMessages = parsed.messages || {};
        this.memoryReports = parsed.reports || {};
        console.log('✅ Fallback JSON database file loaded successfully.');
      }
    } catch (e) {
      console.warn('⚠️ Could not load fallback database file, using clean memory state.', e);
    }
  }

  private saveFallbackToFile() {
    if (!this.useFallback) return;

    try {
      const dataToSave = {
        users: this.memoryUsers,
        posts: this.memoryPosts,
        chats: this.memoryChats,
        messages: this.memoryMessages,
        reports: this.memoryReports,
      };
      fs.writeFileSync(this.fallbackFilePath, JSON.stringify(dataToSave, null, 2), 'utf8');
    } catch (e) {
      console.error('⚠️ Could not persist fallback database to file:', e);
    }
  }

  private seedDefaultProfiles() {
    // Check if we need to seed the fallback memory database
    if (Object.keys(this.memoryUsers).length === 0) {
      console.log('🌱 Seeding initial verified profiles into memory database...');
      ANONYMOUS_PEERS.forEach((peer) => {
        const peerSession = {
          uid: peer.uid,
          nickname: peer.nickname,
          avatar: peer.avatar,
          uploadedPhotos: [peer.avatar],
          city: peer.nickname.split('_')[1] || 'Delhi',
          ageRange: peer.ageRange,
          gender: peer.gender,
          country: peer.country,
          language: peer.language,
          interests: peer.interests,
          bio: peer.bio,
          trustScore: peer.trustScore,
          offenseCount: 0,
          offenseStatus: 'clear',
          phoneNumber: `+91 ${9812900000 + Math.floor(Math.random() * 99999)}`,
          voiceVerified: peer.voiceVerified !== false,
          voiceVerification: peer.voiceVerification ? {
            isVerified: true,
            pitchHz: peer.voiceVerification.pitchHz,
            toneLabel: peer.voiceVerification.toneLabel,
            verifiedAt: peer.voiceVerification.verifiedAt
          } : {
            isVerified: true,
            pitchHz: peer.gender === 'female' ? 212 : 124,
            toneLabel: peer.gender === 'female' ? 'High Pitch - Verified Girl' : 'Calm Baritone - Verified Boy',
            verifiedAt: new Date().toISOString()
          },
          safetySettings: {
            hideGender: false,
            anonymousMode: false,
            limitIncomingChats: false,
            verifiedUsersOnly: true
          },
          paymentDetails: {
            freeTrialMinutesLeft: 10,
            isPremiumSignedUp: true,
            hasAutoPayEnabled: false
          }
        };

        this.memoryUsers[peer.uid] = peerSession;
      });
      this.saveFallbackToFile();
    }
  }

  // Set up SQL Tables if Neon PostgreSQL is connected
  public async initializeDatabaseSchema() {
    if (this.useFallback || !this.pool) {
      console.log('📝 Schema initialization skipped: Operating in memory-fallback mode.');
      return;
    }

    const client = await this.pool.connect();
    try {
      console.log('⚡ Initializing Neon PostgreSQL Database Schema...');

      // 1. Create Users Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS suno_users (
          uid TEXT PRIMARY KEY,
          nickname TEXT,
          avatar TEXT,
          uploaded_photos TEXT,
          city TEXT,
          age_range TEXT,
          gender TEXT,
          country TEXT,
          language TEXT,
          interests TEXT,
          bio TEXT,
          trust_score INTEGER DEFAULT 100,
          offense_count INTEGER DEFAULT 0,
          offense_status TEXT DEFAULT 'clear',
          phone_number TEXT UNIQUE,
          voice_verified BOOLEAN DEFAULT false,
          voice_verification TEXT,
          safety_settings TEXT,
          payment_details TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2. Create Posts Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS suno_posts (
          id TEXT PRIMARY KEY,
          room_id TEXT,
          author_nickname TEXT,
          author_avatar TEXT,
          author_trust_score INTEGER,
          author_voice_verified BOOLEAN,
          content TEXT,
          timestamp TEXT,
          poll TEXT,
          replies TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 3. Create Chats Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS suno_chats (
          id TEXT PRIMARY KEY,
          uids TEXT,
          last_message TEXT,
          last_message_at TEXT,
          started_at TEXT,
          user1 TEXT,
          user2 TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 4. Create Messages Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS suno_messages (
          id TEXT PRIMARY KEY,
          room_id TEXT,
          sender_id TEXT,
          sender_nickname TEXT,
          content TEXT,
          timestamp TEXT,
          moderated BOOLEAN DEFAULT false,
          moderation_label TEXT,
          system_alert BOOLEAN DEFAULT false,
          is_voice BOOLEAN DEFAULT false,
          voice_duration INTEGER,
          image_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create index on room_id for fast message fetching
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_messages_room_id ON suno_messages(room_id);
      `);

      // 5. Create Reports Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS suno_reports (
          id TEXT PRIMARY KEY,
          reporter_uid TEXT,
          reported_uid TEXT,
          reported_nickname TEXT,
          reason TEXT,
          timestamp TEXT,
          status TEXT
        );
      `);

      console.log('✅ Neon PG Tables validated/created successfully.');

      // Check and seed users in PostgreSQL
      const testUserQuery = await client.query('SELECT COUNT(*) FROM suno_users');
      const count = parseInt(testUserQuery.rows[0].count, 10);
      if (count === 0) {
        console.log('🌱 Seed empty Postgres Database with verified seed profiles...');
        for (const peer of ANONYMOUS_PEERS) {
          const peerSession = {
            uid: peer.uid,
            nickname: peer.nickname,
            avatar: peer.avatar,
            uploadedPhotos: [peer.avatar],
            city: peer.nickname.split('_')[1] || 'Delhi',
            ageRange: peer.ageRange,
            gender: peer.gender,
            country: peer.country,
            language: peer.language,
            interests: peer.interests,
            bio: peer.bio,
            trustScore: peer.trustScore,
            offenseCount: 0,
            offenseStatus: 'clear',
            phoneNumber: `+91 ${9812900000 + Math.floor(Math.random() * 99999)}`,
            voiceVerified: peer.voiceVerified !== false,
            voiceVerification: peer.voiceVerification ? {
              isVerified: true,
              pitchHz: peer.voiceVerification.pitchHz,
              toneLabel: peer.voiceVerification.toneLabel,
              verifiedAt: peer.voiceVerification.verifiedAt
            } : {
              isVerified: true,
              pitchHz: peer.gender === 'female' ? 212 : 124,
              toneLabel: peer.gender === 'female' ? 'High Pitch - Verified Girl' : 'Calm Baritone - Verified Boy',
              verifiedAt: new Date().toISOString()
            },
            safetySettings: {
              hideGender: false,
              anonymousMode: false,
              limitIncomingChats: false,
              verifiedUsersOnly: true
            },
            paymentDetails: {
              freeTrialMinutesLeft: 10,
              isPremiumSignedUp: true,
              hasAutoPayEnabled: false
            }
          };

          await client.query(`
            INSERT INTO suno_users (
              uid, nickname, avatar, uploaded_photos, city, age_range, gender, country, language, interests, bio, 
              trust_score, offense_count, offense_status, phone_number, voice_verified, voice_verification, safety_settings, payment_details
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            ON CONFLICT (uid) DO NOTHING;
          `, [
            peerSession.uid,
            peerSession.nickname,
            peerSession.avatar,
            JSON.stringify(peerSession.uploadedPhotos),
            peerSession.city,
            peerSession.ageRange,
            peerSession.gender,
            peerSession.country,
            peerSession.language,
            JSON.stringify(peerSession.interests),
            peerSession.bio,
            peerSession.trustScore,
            peerSession.offenseCount,
            peerSession.offenseStatus,
            peerSession.phoneNumber,
            peerSession.voiceVerified,
            JSON.stringify(peerSession.voiceVerification),
            JSON.stringify(peerSession.safetySettings),
            JSON.stringify(peerSession.paymentDetails)
          ]);
        }
        console.log('✅ Database successfully seeded.');
      }
    } catch (e) {
      console.error('⛔ Failed to initialize Neon PostgreSQL database tables:', e);
    } finally {
      client.release();
    }
  }

  // --- REGISTRATIONS & USER CONTROLS ---

  public async getUsers(): Promise<any[]> {
    if (this.useFallback || !this.pool) {
      return Object.values(this.memoryUsers);
    }

    try {
      const res = await this.pool.query('SELECT * FROM suno_users');
      return res.rows.map((row) => ({
        uid: row.uid,
        nickname: row.nickname,
        avatar: row.avatar,
        uploadedPhotos: JSON.parse(row.uploaded_photos || '[]'),
        city: row.city,
        ageRange: row.age_range,
        gender: row.gender,
        country: row.country,
        language: row.language,
        interests: JSON.parse(row.interests || '[]'),
        bio: row.bio,
        trustScore: row.trust_score,
        offenseCount: row.offense_count,
        offenseStatus: row.offense_status,
        phoneNumber: row.phone_number,
        voiceVerified: row.voice_verified,
        voiceVerification: JSON.parse(row.voice_verification || '{}'),
        safetySettings: JSON.parse(row.safety_settings || '{}'),
        paymentDetails: JSON.parse(row.payment_details || '{}'),
      }));
    } catch (err) {
      console.error('Database query getUsers error:', err);
      return Object.values(this.memoryUsers); // fallback
    }
  }

  public async upsertUser(user: any): Promise<void> {
    if (this.useFallback || !this.pool) {
      this.memoryUsers[user.uid] = user;
      this.saveFallbackToFile();
      return;
    }

    try {
      await this.pool.query(`
        INSERT INTO suno_users (
          uid, nickname, avatar, uploaded_photos, city, age_range, gender, country, language, interests, bio, 
          trust_score, offense_count, offense_status, phone_number, voice_verified, voice_verification, safety_settings, payment_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (uid) DO UPDATE SET
          nickname = EXCLUDED.nickname,
          avatar = EXCLUDED.avatar,
          uploaded_photos = EXCLUDED.uploaded_photos,
          city = EXCLUDED.city,
          age_range = EXCLUDED.age_range,
          gender = EXCLUDED.gender,
          country = EXCLUDED.country,
          language = EXCLUDED.language,
          interests = EXCLUDED.interests,
          bio = EXCLUDED.bio,
          trust_score = EXCLUDED.trust_score,
          offense_count = EXCLUDED.offense_count,
          offense_status = EXCLUDED.offense_status,
          phone_number = EXCLUDED.phone_number,
          voice_verified = EXCLUDED.voice_verified,
          voice_verification = EXCLUDED.voice_verification,
          safety_settings = EXCLUDED.safety_settings,
          payment_details = EXCLUDED.payment_details;
      `, [
        user.uid,
        user.nickname,
        user.avatar,
        JSON.stringify(user.uploadedPhotos || []),
        user.city,
        user.ageRange,
        user.gender,
        user.country,
        user.language,
        JSON.stringify(user.interests || []),
        user.bio,
        user.trustScore,
        user.offenseCount,
        user.offenseStatus,
        user.phoneNumber,
        user.voiceVerified,
        JSON.stringify(user.voiceVerification || {}),
        JSON.stringify(user.safetySettings || {}),
        JSON.stringify(user.paymentDetails || {})
      ]);
    } catch (err) {
      console.error('Database query upsertUser failed, caching to memory:', err);
      this.memoryUsers[user.uid] = user; // backup fallback
    }
  }

  // --- PUBLIC DISCUSSION BOARDS ---

  public async getPosts(): Promise<any[]> {
    if (this.useFallback || !this.pool) {
      return Object.values(this.memoryPosts);
    }

    try {
      const res = await this.pool.query('SELECT * FROM suno_posts ORDER BY created_at DESC');
      return res.rows.map((row) => ({
        id: row.id,
        roomId: row.room_id,
        authorNickname: row.author_nickname,
        authorAvatar: row.author_avatar,
        authorTrustScore: row.author_trust_score,
        authorVoiceVerified: row.author_voice_verified,
        content: row.content,
        timestamp: row.timestamp,
        poll: JSON.parse(row.poll || 'null'),
        replies: JSON.parse(row.replies || '[]'),
      }));
    } catch (err) {
      console.error('Database query getPosts error:', err);
      return Object.values(this.memoryPosts);
    }
  }

  public async upsertPost(post: any): Promise<void> {
    if (this.useFallback || !this.pool) {
      this.memoryPosts[post.id] = post;
      this.saveFallbackToFile();
      return;
    }

    try {
      await this.pool.query(`
        INSERT INTO suno_posts (
          id, room_id, author_nickname, author_avatar, author_trust_score, author_voice_verified, content, timestamp, poll, replies
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          room_id = EXCLUDED.room_id,
          author_nickname = EXCLUDED.author_nickname,
          author_avatar = EXCLUDED.author_avatar,
          author_trust_score = EXCLUDED.author_trust_score,
          author_voice_verified = EXCLUDED.author_voice_verified,
          content = EXCLUDED.content,
          timestamp = EXCLUDED.timestamp,
          poll = EXCLUDED.poll,
          replies = EXCLUDED.replies;
      `, [
        post.id,
        post.roomId || post.room_id || '',
        post.authorNickname,
        post.authorAvatar,
        post.authorTrustScore,
        post.authorVoiceVerified,
        post.content,
        post.timestamp,
        JSON.stringify(post.poll || null),
        JSON.stringify(post.replies || [])
      ]);
    } catch (err) {
      console.error('Database query upsertPost error:', err);
      this.memoryPosts[post.id] = post;
    }
  }

  // --- PRIVATE WHATSAPP SECURED CHATS ---

  private async seedChatsForUser(userUid: string): Promise<void> {
    let user: any = null;

    if (this.useFallback || !this.pool) {
      user = this.memoryUsers[userUid];
    } else {
      try {
        const res = await this.pool.query('SELECT * FROM suno_users WHERE uid = $1', [userUid]);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          user = {
            uid: row.uid,
            nickname: row.nickname,
            avatar: row.avatar,
            uploadedPhotos: JSON.parse(row.uploaded_photos || '[]'),
            city: row.city,
            ageRange: row.age_range,
            gender: row.gender,
            country: row.country,
            language: row.language,
            interests: JSON.parse(row.interests || '[]'),
            bio: row.bio,
            trustScore: row.trust_score,
            offenseCount: row.offense_count,
            offenseStatus: row.offense_status,
            phoneNumber: row.phone_number,
            voiceVerified: row.voice_verified,
            voiceVerification: JSON.parse(row.voice_verification || '{}'),
            safetySettings: JSON.parse(row.safety_settings || '{}'),
            paymentDetails: JSON.parse(row.payment_details || '{}'),
          };
        }
      } catch (err) {
        console.error("Error retrieving user for opposite-gender seed from Neon PG:", err);
      }
    }

    // Default to a fallback user construct if not fully synchronized yet
    if (!user) {
      user = {
        uid: userUid,
        nickname: 'SweetStar_946',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
        gender: 'female',
        trustScore: 100,
        voiceVerified: true,
        language: 'Hindi'
      };
    }

    const userGender = user.gender || 'female';
    const isFemale = userGender.toLowerCase() === 'female';

    // Pick 2 opposite gender system profiles
    const targetPeers = ANONYMOUS_PEERS.filter(p => {
      const pGender = p.gender || 'male';
      return isFemale ? pGender === 'male' : pGender === 'female';
    }).slice(0, 2);

    for (const peer of targetPeers) {
      const roomId = [userUid, peer.uid].sort().join('_');

      const userPayloadForChat = {
        uid: user.uid,
        nickname: user.nickname,
        avatar: user.avatar,
        gender: user.gender,
        interests: user.interests || [],
        bio: user.bio || '',
        trustScore: user.trustScore,
        voiceVerified: user.voiceVerified || false,
        language: user.language || 'Hindi'
      };

      const peerPayloadForChat = {
        uid: peer.uid,
        nickname: peer.nickname,
        avatar: peer.avatar,
        gender: peer.gender,
        interests: peer.interests,
        bio: peer.bio,
        trustScore: peer.trustScore,
        voiceVerified: peer.voiceVerified || false,
        language: peer.language
      };

      const textMessageContent = peer.uid === 'peer_aarav'
        ? "Hey! I saw we share common interests under Mental Wellness. I'm Aarav from Mumbai. Down-to-earth and polite. Feel free to talk about career stress, future exams, or if you just need someone to vent to! How are things?"
        : peer.uid === 'peer_kabir'
          ? "Hello, nice to connect with you. I'm Kabir from Lucknow. I saw we both have interests in relationships and wellness. Just wanted to drop a humble greeting – how's your week heading so far?"
          : peer.uid === 'peer_ananya'
            ? "Hi there! I am Ananya from Delhi. I saw your profile and thought it would be great to say hello. Let me know if you want to share college stress, mock exams, or just look for a supportive discussion! Catch you soon?"
            : `Hello! I am ${peer.nickname}. Warm, patient listener. I read your profile bio and really liked your vibe. Support always matters! Tell me, what's on your mind today? Let's have a deep, safe conversation!`;

      const chat = {
        id: roomId,
        uids: [userUid, peer.uid],
        lastMessage: textMessageContent,
        lastMessageAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        startedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        user1: userPayloadForChat,
        user2: peerPayloadForChat
      };

      await this.upsertChat(chat);

      // Add a security disclaimer message and an incoming text message
      const msg1 = {
        id: `msg_seed_1_${peer.uid}_${userUid}`,
        roomId: roomId,
        senderId: peer.uid,
        senderNickname: peer.nickname,
        content: `Namaste! Standard encryption keys exchanged. Secure, real-time wellness support chatroom with ${peer.nickname} is active. Avoid sharing phone numbers or passwords. Ensure communication remains positive and secure.`,
        timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
        systemAlert: true,
        moderated: false
      };

      const msg2 = {
        id: `msg_seed_2_${peer.uid}_${userUid}`,
        roomId: roomId,
        senderId: peer.uid,
        senderNickname: peer.nickname,
        content: textMessageContent,
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        systemAlert: false,
        moderated: false
      };

      await this.addMessage(roomId, msg1);
      await this.addMessage(roomId, msg2);
    }
  }

  public async getChats(userUid: string): Promise<any[]> {
    let userHasChats = false;

    if (this.useFallback || !this.pool) {
      const userChats = Object.values(this.memoryChats).filter(
        (chat: any) => chat.uids && chat.uids.includes(userUid)
      );
      userHasChats = userChats.length > 0;
    } else {
      try {
        const checkRes = await this.pool.query(
          "SELECT COUNT(*) FROM suno_chats WHERE uids LIKE $1 OR uids LIKE $2",
          [`%"${userUid}"%`, `%${userUid}%`]
        );
        userHasChats = parseInt(checkRes.rows[0].count, 10) > 0;
      } catch (err) {
        console.error("Error checking chats count:", err);
      }
    }

    if (!userHasChats) {
      await this.seedChatsForUser(userUid);
    }

    if (this.useFallback || !this.pool) {
      return Object.values(this.memoryChats).filter(
        (chat: any) => chat.uids && chat.uids.includes(userUid)
      );
    }

    try {
      const res = await this.pool.query('SELECT * FROM suno_chats');
      const allChats = res.rows.map((row) => ({
        id: row.id,
        uids: JSON.parse(row.uids || '[]'),
        lastMessage: row.last_message,
        lastMessageAt: row.last_message_at,
        startedAt: row.started_at,
        user1: JSON.parse(row.user1 || '{}'),
        user2: JSON.parse(row.user2 || '{}'),
      }));

      return allChats.filter((chat: any) => chat.uids && chat.uids.includes(userUid));
    } catch (err) {
      console.error('Database query getChats error:', err);
      return Object.values(this.memoryChats).filter(
        (chat: any) => chat.uids && chat.uids.includes(userUid)
      );
    }
  }

  public async upsertChat(chat: any): Promise<void> {
    if (this.useFallback || !this.pool) {
      const existing = this.memoryChats[chat.id] || {};
      this.memoryChats[chat.id] = { ...existing, ...chat };
      this.saveFallbackToFile();
      return;
    }

    try {
      await this.pool.query(`
        INSERT INTO suno_chats (
          id, uids, last_message, last_message_at, started_at, user1, user2
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          uids = COALESCE(EXCLUDED.uids, suno_chats.uids),
          last_message = EXCLUDED.last_message,
          last_message_at = EXCLUDED.last_message_at,
          started_at = COALESCE(EXCLUDED.started_at, suno_chats.started_at),
          user1 = COALESCE(EXCLUDED.user1, suno_chats.user1),
          user2 = COALESCE(EXCLUDED.user2, suno_chats.user2),
          updated_at = CURRENT_TIMESTAMP;
      `, [
        chat.id,
        chat.uids ? JSON.stringify(chat.uids) : null,
        chat.lastMessage,
        chat.lastMessageAt,
        chat.startedAt || null,
        chat.user1 ? JSON.stringify(chat.user1) : null,
        chat.user2 ? JSON.stringify(chat.user2) : null
      ]);
    } catch (err) {
      console.error('Database query upsertChat error:', err);
      const existing = this.memoryChats[chat.id] || {};
      this.memoryChats[chat.id] = { ...existing, ...chat };
    }
  }

  // --- CHAT MESSAGES SUB-RESOURCES ---

  public async getMessages(roomId: string): Promise<any[]> {
    if (this.useFallback || !this.pool) {
      return this.memoryMessages[roomId] || [];
    }

    try {
      const res = await this.pool.query(
        'SELECT * FROM suno_messages WHERE room_id = $1 ORDER BY timestamp ASC',
        [roomId]
      );
      return res.rows.map((row) => ({
        id: row.id,
        roomId: row.room_id,
        senderId: row.sender_id,
        senderNickname: row.sender_nickname,
        content: row.content,
        timestamp: row.timestamp,
        moderated: row.moderated,
        moderationLabel: row.moderation_label,
        systemAlert: row.system_alert,
        isVoice: row.is_voice,
        voiceDuration: row.voice_duration,
        imageUrl: row.image_url,
      }));
    } catch (err) {
      console.error('Database query getMessages error:', err);
      return this.memoryMessages[roomId] || [];
    }
  }

  public async addMessage(roomId: string, msg: any): Promise<void> {
    if (this.useFallback || !this.pool) {
      if (!this.memoryMessages[roomId]) {
        this.memoryMessages[roomId] = [];
      }
      // Check if message already exists to emulate indempotent Firestore writes
      const existsIndex = this.memoryMessages[roomId].findIndex((m) => m.id === msg.id);
      if (existsIndex >= 0) {
        this.memoryMessages[roomId][existsIndex] = msg;
      } else {
        this.memoryMessages[roomId].push(msg);
      }
      this.saveFallbackToFile();
      return;
    }

    try {
      await this.pool.query(`
        INSERT INTO suno_messages (
          id, room_id, sender_id, sender_nickname, content, timestamp, moderated, moderation_label, system_alert, is_voice, voice_duration, image_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          moderated = EXCLUDED.moderated,
          moderation_label = EXCLUDED.moderation_label;
      `, [
        msg.id,
        roomId,
        msg.senderId || msg.sender_id || '',
        msg.senderNickname || msg.sender_nickname || '',
        msg.content,
        msg.timestamp,
        msg.moderated || false,
        msg.moderationLabel || null,
        msg.systemAlert || false,
        msg.isVoice || false,
        msg.voiceDuration || null,
        msg.imageUrl || null
      ]);
    } catch (err) {
      console.error('Database query addMessage error:', err);
      if (!this.memoryMessages[roomId]) {
        this.memoryMessages[roomId] = [];
      }
      const existsIndex = this.memoryMessages[roomId].findIndex((m) => m.id === msg.id);
      if (existsIndex >= 0) {
        this.memoryMessages[roomId][existsIndex] = msg;
      } else {
        this.memoryMessages[roomId].push(msg);
      }
    }
  }

  // --- COMPLAINT REPORTS ---

  public async getReports(): Promise<any[]> {
    if (this.useFallback || !this.pool) {
      return Object.values(this.memoryReports);
    }

    try {
      const res = await this.pool.query('SELECT * FROM suno_reports');
      return res.rows.map((row) => ({
        id: row.id,
        reporterUid: row.reporter_uid,
        reportedUid: row.reported_uid,
        reportedNickname: row.reported_nickname,
        reason: row.reason,
        timestamp: row.timestamp,
        status: row.status,
      }));
    } catch (err) {
      console.error('Database query getReports error:', err);
      return Object.values(this.memoryReports);
    }
  }

  public async upsertReport(report: any): Promise<void> {
    if (this.useFallback || !this.pool) {
      this.memoryReports[report.id] = report;
      this.saveFallbackToFile();
      return;
    }

    try {
      await this.pool.query(`
        INSERT INTO suno_reports (
          id, reporter_uid, reported_uid, reported_nickname, reason, timestamp, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          reporter_uid = EXCLUDED.reporter_uid,
          reported_uid = EXCLUDED.reported_uid,
          reported_nickname = EXCLUDED.reported_nickname,
          reason = EXCLUDED.reason,
          timestamp = EXCLUDED.timestamp,
          status = EXCLUDED.status;
      `, [
        report.id,
        report.reporterUid || report.reporter_uid || '',
        report.reportedUid || report.reported_uid || '',
        report.reportedNickname || report.reported_nickname || '',
        report.reason,
        report.timestamp,
        report.status
      ]);
    } catch (err) {
      console.error('Database query upsertReport error:', err);
      this.memoryReports[report.id] = report;
    }
  }
}

export const neonDb = new NeonDatabaseManager();
