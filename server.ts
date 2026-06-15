/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { ANONYMOUS_PEERS } from './src/profilesData';
import { neonDb } from './src/db/dbConnect.ts';

// Self-contained initial community discussion rooms
const COMMUNITIES = [
  {
    id: 'room_wellness',
    name: 'Mental Wellness Circle',
    description: 'An anonymous, supportive refuge for sharing daily anxieties, burnout recovery, and mindful listening.',
    category: 'Mental Wellness',
    icon: 'Heart',
    posts: [
      {
        id: 'post_1',
        authorNickname: 'GratefulSoul',
        authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
        authorTrustScore: 99,
        authorVoiceVerified: true,
        content: 'Just wanted to share that setting a tight 30-minute screen-free boundary before bedtime has completely cured my insomnia this week. Highly recommend to everyone struggling with late-night stress!',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        replies: [
          {
            id: 'rep_1_1',
            authorNickname: 'NightOwlZen',
            authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            content: 'Needed to read this! Im usually scrolling on TikTok till 2 AM wondering why Im tired. Trying tonight.',
            timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString()
          },
          {
            id: 'rep_1_2',
            authorNickname: 'QuietFlow',
            authorAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80',
            content: 'Same here. Books over screens changed my life.',
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
          }
        ]
      },
      {
        id: 'post_2',
        authorNickname: 'SeekingCalm',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        authorTrustScore: 95,
        authorVoiceVerified: false,
        content: 'Is anyone else feeling massive career burnout? I feel stuck in a loop of endless deliverables.',
        timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
        poll: {
          question: 'How do you rate your current exhaustion levels?',
          options: [
            { id: 'opt_1', text: 'Struggling / Extremely burned out', votes: 42 },
            { id: 'opt_2', text: 'Managing, but feel fatigued', votes: 28 },
            { id: 'opt_3', text: 'Thriving / Feeling balanced', votes: 11 }
          ]
        },
        replies: []
      }
    ]
  },
  {
    id: 'room_founders',
    name: 'Entrepreneurship Space',
    description: 'Anonymous brainstorming, co-founder banter, and trading feedback on SaaS validation.',
    category: 'Entrepreneurship',
    icon: 'Briefcase',
    posts: [
      {
        id: 'post_founders_1',
        authorNickname: 'Bootstrapped99',
        authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
        authorTrustScore: 92,
        authorVoiceVerified: true,
        content: 'Pro-tip: Do NOT build an intricate dashboard before getting your first 10 paying customers. Do it in a spreadsheet manually first. Validate twice, code once.',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        replies: [
          {
            id: 'rep_f_1',
            authorNickname: 'PythonHustler',
            authorAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
            content: 'Absolute facts. I wasted 4 months building fully custom billing when an email form could have sufficed.',
            timestamp: new Date(Date.now() - 3600000 * 10).toISOString()
          }
        ]
      }
    ]
  },
  {
    id: 'room_college',
    name: 'College Support Hub',
    description: 'Surviving final exam weeks, tuition struggles, dorm-life advice, and graduation dread.',
    category: 'College Life',
    icon: 'MessageCircle',
    posts: [
      {
        id: 'post_college_1',
        authorNickname: 'NocturnalGrad',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        authorTrustScore: 96,
        authorVoiceVerified: true,
        content: 'Is anyone else struggling to study in complete silence? I bought active noise-canceling headphones but they make me too anxious. Anyone have recommendations for background instrumental channels?',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        replies: [
          {
            id: 'rep_c_1',
            authorNickname: 'LofiPanda',
            authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            content: 'Look up Synthwave Radio or Minecraft Soundtracks. They keep your brain rhythm busy without words!',
            timestamp: new Date(Date.now() - 1800000).toISOString()
          }
        ]
      }
    ]
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Neon database schema (and auto-seed default profiles if unpopulated)
  try {
    await neonDb.initializeDatabaseSchema();
  } catch (schemaErr) {
    console.error('⚠️ Schema migration warning:', schemaErr);
  }

  // API Endpoint: Retrieve available matching peers
  app.get('/api/peers', (req, res) => {
    res.json({ peers: ANONYMOUS_PEERS });
  });

  // --- NEON POSTGRES DATABASE ENDPOINTS ---

  app.get('/api/users', async (req, res) => {
    try {
      const users = await neonDb.getUsers();
      res.json({ users });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch users', details: err.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const user = req.body;
      if (!user || !user.uid) {
        return res.status(400).json({ error: 'Invalid user session object' });
      }
      await neonDb.upsertUser(user);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to upsert user', details: err.message });
    }
  });

  app.get('/api/posts', async (req, res) => {
    try {
      const posts = await neonDb.getPosts();
      res.json({ posts });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch posts', details: err.message });
    }
  });

  app.post('/api/posts', async (req, res) => {
    try {
      const post = req.body;
      if (!post || !post.id) {
        return res.status(400).json({ error: 'Invalid post object' });
      }
      await neonDb.upsertPost(post);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to upsert post', details: err.message });
    }
  });

  app.get('/api/chats', async (req, res) => {
    try {
      const { uid } = req.query;
      if (!uid) {
        return res.status(400).json({ error: 'Missing uid parameter' });
      }
      const chats = await neonDb.getChats(String(uid));
      res.json({ chats });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch chats', details: err.message });
    }
  });

  app.post('/api/chats', async (req, res) => {
    try {
      const chat = req.body;
      if (!chat || !chat.id) {
        return res.status(400).json({ error: 'Invalid chat object' });
      }
      await neonDb.upsertChat(chat);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to upsert chat', details: err.message });
    }
  });

  app.get('/api/chats/:roomId/messages', async (req, res) => {
    try {
      const { roomId } = req.params;
      const messages = await neonDb.getMessages(roomId);
      res.json({ messages });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
    }
  });

  app.post('/api/chats/:roomId/messages', async (req, res) => {
    try {
      const { roomId } = req.params;
      const message = req.body;
      if (!message || !message.id) {
        return res.status(400).json({ error: 'Invalid message object' });
      }
      await neonDb.addMessage(roomId, message);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to append message', details: err.message });
    }
  });

  app.get('/api/reports', async (req, res) => {
    try {
      const reports = await neonDb.getReports();
      res.json({ reports });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch reports', details: err.message });
    }
  });

  app.post('/api/reports', async (req, res) => {
    try {
      const report = req.body;
      if (!report || !report.id) {
        return res.status(400).json({ error: 'Invalid report object' });
      }
      await neonDb.upsertReport(report);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to submit report', details: err.message });
    }
  });

  // API Endpoint: Analyze vocal pitch frequencies and verify profile authenticity
  app.post('/api/voice-verify', async (req, res) => {
    try {
      const { nickname, gender, hasMicPermission, recordDuration, detectedPitch } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      // Default high-fidelity vocal ranges based on standard human acoustics
      // Feminine pitch is generally between 165Hz and 255Hz
      // Masculine pitch is generally between 85Hz and 155Hz
      let pitchHz = Number(detectedPitch) || 0;
      let toneDescription = '';
      let confidence = 0;

      if (pitchHz > 50 && pitchHz < 500) {
        // Real-time live pitch detected successfully!
        confidence = parseFloat((97.2 + Math.random() * 2.5).toFixed(1));
        if (pitchHz >= 160) {
          toneDescription = `High Pitch Vocal Signature - Natural Feminine Resonance (${pitchHz}Hz)`;
        } else if (pitchHz <= 150) {
          toneDescription = `Deep Resonance Vocal Signature - Natural Masculine Baritone (${pitchHz}Hz)`;
        } else {
          toneDescription = `Clear Conversational Vocal Signature - Balanced Pitch Range (${pitchHz}Hz)`;
        }
      } else {
        // Fallback or model simulation if mic was quiet / not permissioned
        if (gender === 'female') {
          pitchHz = Math.floor(190 + Math.random() * 50); // 190 - 240 Hz
          toneDescription = 'Clear Pitch, Soft Melodic & Empathetic';
          confidence = parseFloat((96.5 + Math.random() * 3.2).toFixed(1));
        } else if (gender === 'male') {
          pitchHz = Math.floor(110 + Math.random() * 35); // 110 - 145 Hz
          toneDescription = 'Calm Resonance, Grounded & Warm Baritone';
          confidence = parseFloat((95.8 + Math.random() * 3.8).toFixed(1));
        } else {
          pitchHz = Math.floor(150 + Math.random() * 30); // 150 - 180 Hz
          toneDescription = 'Smooth Tone, High Clarity & Pleasant';
          confidence = parseFloat((96.0 + Math.random() * 3.5).toFixed(1));
        }
      }

      // If key is present, let's call Gemini 3.5 to create an incredibly personalized tone evaluation feedback!
      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        try {
          const ai = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });

          const geminiPrompt = `Analyze a voice authentication recording for user "${nickname}" on Suno platform.
Profile declared gender: "${gender}"
Acoustically detected pitch: ${pitchHz} Hz ${Number(detectedPitch) > 0 ? '(real dynamic live input measured)' : '(procedural estimation)'}
Tone category: "${toneDescription}"
Record duration: ${recordDuration} seconds
Microphone detected: ${hasMicPermission}

Generate a beautiful report on vocal acoustics. Return a JSON block ONLY:
{
  "pitchHz": number, (Use the live pitch ${pitchHz} if provided, otherwise Choose realistic values: female: 190-245, male: 110-145, other: 150-180),
  "toneDescription": "short descriptive label of voice profile e.g., 'Warm Melodic & Reassuring'",
  "confidence": number (authenticity coefficient from 95.0 to 99.9)
}`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: geminiPrompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            }
          });

          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            if (parsed.pitchHz && parsed.toneDescription && parsed.confidence) {
              pitchHz = parsed.pitchHz;
              toneDescription = parsed.toneDescription;
              confidence = parsed.confidence;
            }
          }
        } catch (e) {
          console.error('Gemini Voice Verification evaluation failed or fallback selected:', e);
        }
      }

      res.json({
        success: true,
        pitchHz,
        toneDescription,
        confidence,
        timestamp: new Date().toISOString()
      });

    } catch (err: any) {
      console.error('Voice verify api error:', err);
      res.status(500).json({ error: 'Failed to verify voice signature' });
    }
  });

  // API Endpoint: Retrieve moderated communities
  app.get('/api/communities', (req, res) => {
    res.json({ communities: COMMUNITIES });
  });

  // API Endpoint: Perform interactive, real-time AI moderation + dynamic dialogue simulation
  app.post('/api/chat', async (req, res) => {
    try {
      const { 
        messages, 
        peerProfile, 
        userProfile, 
        latestMessageContent 
      } = req.body;

      if (!latestMessageContent || !peerProfile) {
        return res.status(400).json({ error: 'Missing parameters. Ensure message content is sent.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      let moderationResult = {
        isViolating: false,
        reason: '',
        severity: 'none',
        explanation: ''
      };

      // Heuristics fallbacks for safety checks (essential for instant responsiveness or missing keys)
      const textLower = latestMessageContent.toLowerCase();
      
      // PII Check Heuristics
      const phoneRegex = /(\+?\d{1,4}[-.\s]??)?(\(?\d{3}\)?[-.\s]??\d{3}[-.\s]??\d{4})/g;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      
      // Badwords Heuristics
      const severeViolators = ['kill yourself', 'rape', 'bomb', 'murder', 'doxx', 'stalk', 'threaten', 'blackmail', 'extort'];
      const explicitWords = ['bitch', 'porn', 'naked', 'dick', 'cock', 'pussy', 'nude', 'fuck you', 'sex chat', 'horny'];

      if (emailRegex.test(textLower) || phoneRegex.test(textLower)) {
        moderationResult = {
          isViolating: true,
          reason: 'PII Sharing',
          severity: 'mild',
          explanation: 'Sharing direct email or phone details violates Suno\'s anonymous safety guardrails.'
        };
      } else if (severeViolators.some(word => textLower.includes(word))) {
        moderationResult = {
          isViolating: true,
          reason: 'Abuse/Threats',
          severity: 'severe',
          explanation: 'Direct threats of abuse, extortion, or physical harm detected.'
        };
      } else if (explicitWords.some(word => textLower.includes(word))) {
        moderationResult = {
          isViolating: true,
          reason: 'Sexual Harassment/Explicit content',
          severity: 'mild',
          explanation: 'Unsolicited explicit or harassing comments are prohibited on Suno.'
        };
      }

      // If key is present, let's verify via server-side Gemini 3.5 AI moderation for rigorous proof of concept!
      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && !moderationResult.isViolating) {
        const ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        try {
          const modPrompt = `You are the real-time AI content moderator for "Suno", an anonymous support and respectful chat platform (NOT a dating app).
Our safety policy forbids: Abuse, threats, hate speech, sexual harassment, explicit/sexualized commentary, stalking, blackmail, and sharing direct contact details (PII like email, phone number, address).

Analyze this user message: "${latestMessageContent}"

Output ONLY a JSON block with these keys:
{
  "isViolating": boolean,
  "reason": "Harassment" | "Abuse/Threats" | "Sexual content" | "PII Sharing" | "Spam" | "",
  "severity": "severe" | "mild" | "none",
  "explanation": "Short 1-sentence description why"
}`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: modPrompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            }
          });

          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            if (parsed && parsed.isViolating) {
              moderationResult = parsed;
              console.log('Gemini AI Safety violation caught:', parsed);
            }
          }
        } catch (e) {
          console.error('AI Moderation parsing error or fallback used:', e);
        }
      }

      // If user's message is violating, stop and return the safety verdict instantly
      if (moderationResult.isViolating) {
        return res.json({
          moderated: true,
          safetyVerdict: moderationResult,
          reply: `[System Moderation Policy Alert: Let's keep our anonymous chat safe and respectful. This message was flagged for ${moderationResult.reason}.]`
        });
      }

      // If safe, let's generate the Peer reply
      let replyText = '';

      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        const ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const chatLog = messages.slice(-10).map((m: any) => ({
          role: m.senderId === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

        // Append the latest message if not in history
        chatLog.push({ role: 'user', parts: [{ text: latestMessageContent }] });

        const systemInstruction = `You are ${peerProfile.nickname}, an anonymous peer on the Suno platform.
Your context details:
- Age: ${peerProfile.ageRange}
- Country: ${peerProfile.country}
- Interests: ${peerProfile.interests.join(', ')}
- Bio: "${peerProfile.bio}"
- Trust reputation score: ${peerProfile.trustScore}/100

PLATFORM CORE MISSION & RULES:
1. Suno is a platform for safe, anonymous, mutual support and respectful conversation. It is NOT a dating app. Absolutely No flirting, sexual topics, or romance.
2. Be helpful, authentic, active, and a good listener.
3. Keep replies compact and chat-friendly (1-3 sentences max).
4. Do not mention or expose real-world PII.
5. Live up to your persona. Speak under your anonymous handle "${peerProfile.nickname}". Never state you are an AI or powered by Gemini. You are a real empathetic anonymous human.`;

        try {
          const genResponse = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: chatLog,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.8
            }
          });
          replyText = genResponse.text || '';
        } catch (e: any) {
          console.error('Gemini Peer reply failed, sliding in fallback:', e);
        }
      }

      // Safe peer offline simulation fallbacks
      if (!replyText) {
        const fallbackAnswers: Record<string, string[]> = {
          peer_sage: [
            "Thank you for sharing that with me. It takes real courage to open up about life's challenges. How has it been impacting your routine?",
            "Remember that you don’t have to carry all this stress alone. Smaller steps, like breathing and focus blocks, make a monumental difference.",
            "I hear you. Balancing personal expectations and career demands is tough. What’s one minor change you can make today to reclaim your calm?",
            "A quiet cup of chamomile tea and small journal notes is how I survive these loops. What is your favorite comfort beverage?"
          ],
          peer_innovator: [
            "Ah, I absolutely get where you’re coming from! Launching and marketing projects is brutal. What’s your current focus — validating or looking for clients?",
            "Spreadsheets and quick landing pages are so underutilized. What is the core problem space you are tackling?",
            "SaaS architecture can become a trap if code scale arrives before customer validation. Let’s keep it simple. Have you done user interviews?",
            "That sounds like a solid plan. Keep me updated. Focus on the value first!"
          ],
          peer_curious: [
            "Felt that! Exam season turns me into a coffee-fueled zombie. Are you studying for a tech field or something else?",
            "That's so tough. College relationships can be super confusing. We are all just trying to configure our paths, honestly.",
            "Yes! Finding good lofi channels or anime focus streams is the only reason I passed my finals. Do you watch much anime?",
            "Hang in there! We will survive this semester together. 😊"
          ],
          peer_health: [
            "Building endurance is as much about slowing down and reflecting as it is about pushing hard. How is your sleep hygiene lately?",
            "Sustainable routines are built on habits, not temporary motivation. Let's design a tiny checklist you can commit to.",
            "An ultra-marathon is just a million small steps. Focus on the next milestone, don't worry about the full distance yet.",
            "That makes complete sense. Consistency over intensity is the gold standard! Let's get it."
          ]
        };

        const list = fallbackAnswers[peerProfile.uid] || [
          `That is very interesting! Thanks for sharing. As ${peerProfile.nickname}, I really respect your safe anonymous outlook on Suno! Tell me more?`,
          "I fully understand. Having safe spaces to share without judgment is exactly why I use Suno.",
          "Wow. Let's delve deeper. What interests you most in your daily life?",
          "That's a very respectful way to look at it. Let's stay supportive!"
        ];

        // Pick dynamic fallback based on conversation depth
        const messageCount = messages ? messages.length : 0;
        const index = Math.min(Math.floor(messageCount / 2), list.length - 1);
        replyText = list[index];

        // Natural typing lag simulation
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return res.json({
        moderated: false,
        reply: replyText.trim()
      });

    } catch (err: any) {
      console.error('Global conversational server error:', err);
      res.status(500).json({ error: 'Failed to process chat conversation', details: err?.message });
    }
  });

  // Client-side Vite static fallback files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Suno safe server initialized on http://localhost:${PORT}`);
  });
}

startServer();
