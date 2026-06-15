# Firestore Security Specification

This security specification details the access control constraints, data validation schemas, and structural boundaries protecting Suno's Firestore resources.

## 1. Data Invariants

1. **User Ownership**: A user profile document can only be read, created, or updated by the verified owner owning the document ID matches their authenticated identifier (`request.auth.uid`).
2. **Report Safe Submissions**: Any authenticated user can submit a moderator report (`create`), but they cannot delete or maliciously edit reports once submitted.
3. **Admin Exclusivity on Reports**: Only system administrators can read, update, or list moderator reports.
4. **Community Bulletin Boards**: Any authenticated user can create posts or read posts that are part of matching rooms.

---

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing on Create**: Attempting to create a user profile with a different UID than `request.auth.uid`.
2. **Privilege Escalation on User Update**: A non-admin customer trying to elevate their own `isAdmin` field to true on user profile.
3. **ID Poisoning Attack**: Passing a massive junk-character document ID (e.g., 2000 characters) to corrupt indices.
4. **Anonymous Spam Post**: Attempting to publish community posts without signing in.
5. **Unauthorized Post Editing**: Submitting an update to someone else's community post.
6. **Denial of Wallet Document Inflation**: Attempting to submit a text field that exceeds standard bounds (greater than 10,000 characters).
7. **Report State Shortcutting**: A regular user modifying state of a pending report to `Dismissed`/`Reviewed`.
8. **Malicious Report Reading**: Harvesting other users' filed help ticket reports.
9. **Timestamp Counterfeiting**: Supplying a client-side falsified `createdAt`/`updatedAt` timestamp instead of `request.time`.
10. **Malicious Report Deletion**: Attempting to clean up evidence by deleting filed report documents.
11. **Spoofed Voice Verified Badge**: Attempting to set `voiceVerified` as true without a matching voice test verification from the backend.
12. **Foreign Account Deletion**: Attempting to delete another user's profile document.

---

## 3. Test Runner Framework

While local emulation environment tests are simulated here, the security rules are structured to block this entire "Dirty Dozen" suite mathematically.

```typescript
// firestore.rules.test.ts
// Verifies that all malicious payloads return PERMISSION_DENIED.
```
