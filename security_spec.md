# Security Specification & Threat Model

## 1. Data Invariants
1. **Public Read Isolation**: Unauthenticated users may ONLY read articles and videos where `status == 'published'`. Draft or archived items are strictly invisible to the public.
2. **Category Immutability for Public**: Categories can be read by anyone, but only edited/created by authenticated staff members with `admin` or `editor` roles.
3. **Identity Verification & Anti-Spoofing**: When creating an article or video, `authorId` MUST match `request.auth.uid`. A user cannot forge content under another journalist's UID.
4. **Role Enforcement**:
   - `admin` can read, create, update, and delete any article, video, category, or user.
   - `editor` can read all articles, edit/publish any article, upload/manage videos, and view media.
   - `reporter` can only create drafts and update their own articles (`authorId == request.auth.uid`), and cannot change role or publish directly without approval unless granted.
5. **No Public Writes**: Absolutely zero writes or deletes are allowed without valid authentication (`request.auth != null`).
6. **PII Isolation**: User profiles in `/users/{userId}` can only be updated by the owner or an admin. Admin roles in `/admins/{adminId}` can never be self-assigned.
7. **Size & Type Hardening**: All strings, IDs, and payload sizes must conform to boundaries to prevent Denial-of-Wallet attacks.

## 2. The "Dirty Dozen" Threat Payloads
1. **Unauthenticated Public Article Creation**: Anonymous user posts `{ title: "Fake News", status: "published" }` -> EXPECTED: PERMISSION_DENIED.
2. **Anonymous Video Upload Metadata**: Anonymous user attempts writing to `/videos/malicious1` -> EXPECTED: PERMISSION_DENIED.
3. **Public Reading of Drafts**: Anonymous user querying `/articles` with `status: 'draft'` -> EXPECTED: PERMISSION_DENIED.
4. **Author UID Spoofing**: Reporter A (`uid: "user_a"`) submits an article with `authorId: "user_b"` -> EXPECTED: PERMISSION_DENIED.
5. **Privilege Escalation via Profile Update**: Standard user updates their own `/users/{uid}` with `role: "admin"` -> EXPECTED: PERMISSION_DENIED (role update restricted).
6. **Self-Promotion to Admins Collection**: User creates `/admins/{request.auth.uid}` -> EXPECTED: PERMISSION_DENIED (only existing admins or pre-seeded admin).
7. **Reporter Deleting Another Reporter's Published Article**: Reporter A tries `delete /articles/article_by_b` -> EXPECTED: PERMISSION_DENIED.
8. **Oversized Payload / Wallet Drain**: Attacker tries writing a 2MB content string or 20,000 tags array -> EXPECTED: PERMISSION_DENIED.
9. **Invalid Path ID Injection**: Writing to `/articles/../../system_file` or using invalid characters -> EXPECTED: PERMISSION_DENIED.
10. **Ghost Field / Shadow Key Attack**: Inserting `{ isVerified: true, isSystemProtected: false }` -> EXPECTED: Rejected via strict key constraints.
11. **Client Timestamp Manipulation**: Sending client-spoofed `createdAt` into the past/future -> EXPECTED: PERMISSION_DENIED.
12. **Anonymous Category Deletion / Modification**: Public attempting to delete a major section -> EXPECTED: PERMISSION_DENIED.
