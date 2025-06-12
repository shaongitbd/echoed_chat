# Appwrite Schema Documentation

This document outlines the database schema for the AI Chat UI application using Appwrite Collections.

## Collections

### Users

Stores user profile information and usage statistics.

**Attributes:**
- `id`: string (auto-generated)
- `name`: string
- `email`: string
- `createdAt`: datetime
- `plan`: string (free, pro, ultra)
- `usageStats`: object
  - `textQueries`: number
  - `imageGeneration`: number
  - `videoGeneration`: number
- `profileImage`: string (optional, URL to profile image)

**Indexes:**
- Primary: `id`
- Unique: `email`
- Search: `name`

**Permissions:**
- Create: Role (guests)
- Read: Role (users) + Document (owner)
- Update: Document (owner)
- Delete: Document (owner)

### ChatThreads

Stores information about chat conversations.

**Attributes:**
- `id`: string (auto-generated)
- `title`: string
- `createdAt`: datetime
- `createdBy`: string (user ID)
- `updatedAt`: datetime
- `participants`: array of user IDs
- `isShared`: boolean
- `shareSettings`: object
  - `public`: boolean
  - `invitedUsers`: array of objects
    - `email`: string
    - `role`: string (viewer, editor)
- `lastMessageAt`: datetime
- `defaultProvider`: string
- `defaultModel`: string

**Indexes:**
- Primary: `id`
- Search: `title`
- Ordering: `lastMessageAt`, `createdAt`
- Key: `createdBy`
- Key: `participants`

**Permissions:**
- Create: Role (users)
- Read: Document (owner) + Document (participants)
- Update: Document (owner) + Document (editor participants)
- Delete: Document (owner)

### Messages

Stores all messages in chat threads.

**Attributes:**
- `id`: string (auto-generated)
- `threadId`: string (reference to ChatThreads)
- `sender`: string (user ID or system)
- `content`: string
- `contentType`: string (text, image, video, code, thinking)
- `createdAt`: datetime
- `model`: string
- `provider`: string
- `fileIds`: array of string (references to Files)
- `parentMessageId`: string (for branching conversations)
- `isEdited`: boolean
- `searchMetadata`: object (for web search results)
  - `query`: string
  - `sources`: array of objects
    - `url`: string
    - `title`: string
    - `summary`: string
- `rawResponse`: object (original response from the model)
- `contextLength`: number (tokens used)
- `tokensUsed`: number

**Indexes:**
- Primary: `id`
- Key: `threadId`
- Key: `parentMessageId`
- Ordering: `createdAt`
- Key: `sender`

**Permissions:**
- Create: Role (users)
- Read: Function (matchThreadParticipant)
- Update: Document (owner)
- Delete: Document (owner)

### Files

Stores metadata for files uploaded to the application.

**Attributes:**
- `id`: string (auto-generated)
- `name`: string
- `type`: string (image, video, pdf, etc.)
- `size`: number
- `uploadedBy`: string (user ID)
- `uploadedAt`: datetime
- `storageId`: string (reference to Appwrite Storage)
- `threadId`: string (reference to ChatThreads)
- `messageId`: string (optional, reference to Messages)
- `public`: boolean

**Indexes:**
- Primary: `id`
- Key: `uploadedBy`
- Key: `threadId`
- Key: `messageId`
- Ordering: `uploadedAt`

**Permissions:**
- Create: Role (users)
- Read: Function (matchThreadParticipant) + Document (public:true)
- Update: Document (owner)
- Delete: Document (owner)

### UserSettings

Stores user preferences and API keys.

**Attributes:**
- `id`: string (user ID)
- `providers`: array of objects
  - `name`: string
  - `enabled`: boolean
  - `apiKey`: string (encrypted)
  - `models`: array of objects
    - `id`: string
    - `enabled`: boolean
    - `capabilities`: array of strings (text, image, video)
- `theme`: string (light, dark, system)
- `notifications`: object
  - `email`: boolean
  - `inApp`: boolean
- `defaultSearchProvider`: string

**Indexes:**
- Primary: `id`

**Permissions:**
- Create: Role (users)
- Read: Document (owner)
- Update: Document (owner)
- Delete: Document (owner)

### UsageLimits

Defines limits for different subscription tiers.

**Attributes:**
- `id`: string (plan name)
- `textQueries`: number
- `imageGeneration`: number
- `videoGeneration`: number
- `maxContextLength`: number
- `maxCollaborators`: number
- `webSearchEnabled`: boolean
- `maxFileSizeMB`: number
- `maxStorageGB`: number
- `monthlyPrice`: number
- `description`: string

**Indexes:**
- Primary: `id`

**Permissions:**
- Create: Role (admins)
- Read: Role (users)
- Update: Role (admins)
- Delete: Role (admins)

### Invitations

Tracks invitations sent to collaborate on chat threads.

**Attributes:**
- `id`: string (auto-generated)
- `threadId`: string (reference to ChatThreads)
- `invitedBy`: string (user ID)
- `invitedEmail`: string
- `role`: string (viewer, editor)
- `status`: string (pending, accepted, rejected)
- `createdAt`: datetime
- `expiresAt`: datetime
- `acceptedAt`: datetime (optional)

**Indexes:**
- Primary: `id`
- Key: `threadId`
- Key: `invitedEmail`
- Ordering: `createdAt`

**Permissions:**
- Create: Role (users)
- Read: Document (invitedBy) + Document (invitedEmail)
- Update: Document (invitedBy) + Document (invitedEmail)
- Delete: Document (invitedBy)

### Annotations

Stores user annotations/comments on message content.

**Attributes:**
- `id`: string (auto-generated)
- `messageId`: string (reference to Messages)
- `threadId`: string (reference to ChatThreads)
- `userId`: string (user ID who created the annotation)
- `userName`: string (name of the user who created the annotation)
- `text`: string (the annotation/comment text)
- `content`: string (the highlighted text being annotated)
- `startOffset`: number (start position of annotation in message content)
- `endOffset`: number (end position of annotation in message content)
- `createdAt`: datetime
- `updatedAt`: datetime
- `color`: string (hex color code for the highlight)

**Indexes:**
- Primary: `id`
- Key: `messageId`
- Key: `threadId`
- Key: `userId`
- Ordering: `createdAt`

**Permissions:**
- Create: Role (users)
- Read: Function (matchThreadParticipant)
- Update: Document (owner)
- Delete: Document (owner)

### CollaborationEvents

Tracks real-time collaboration events for shared threads.

**Attributes:**
- `id`: string (auto-generated)
- `threadId`: string (reference to ChatThreads)
- `userId`: string (user ID)
- `eventType`: string (join, leave, cursor_move, selection)
- `payload`: object (event-specific data)
- `timestamp`: datetime

**Indexes:**
- Primary: `id`
- Key: `threadId`
- Key: `userId`
- Ordering: `timestamp`

**Permissions:**
- Create: Role (users)
- Read: Function (matchThreadParticipant)
- Update: Document (owner)
- Delete: None (events are read-only)

### Memories

Stores user-created memory/knowledge items for persistent context across conversations.

**Attributes:**
- `id`: string (auto-generated)
- `userId`: string (user ID who created the memory)
- `name`: string (title/name of the memory)
- `content`: string (the memory content)
- `tags`: array of strings (categorization tags)
- `threadId`: string (optional, reference to ChatThreads where it was created)
- `createdAt`: datetime
- `updatedAt`: datetime

**Indexes:**
- Primary: `id`
- Key: `userId`
- Search: `name`
- Search: `content`
- Key: `tags`
- Ordering: `updatedAt`

**Permissions:**
- Create: Role (users)
- Read: Document (owner)
- Update: Document (owner)
- Delete: Document (owner)

## Appwrite Storage Buckets

### profile_images
- **Purpose**: Store user profile images
- **Permissions**: Public read, user-specific write
- **File types**: image/jpeg, image/png, image/gif
- **Maximum file size**: 5MB

### chat_attachments
- **Purpose**: Store files shared in chat threads
- **Permissions**: Thread participant read, user-specific write
- **File types**: Various (images, PDFs, documents, etc.)
- **Maximum file size**: Depends on user plan

### generated_content
- **Purpose**: Store AI-generated images and videos
- **Permissions**: Thread participant read
- **File types**: image/jpeg, image/png, video/mp4
- **Maximum file size**: Depends on user plan

## Appwrite Functions

### matchThreadParticipant
Validates if a user is a participant in a chat thread for permission checks

### processWebSearch
Handles web search requests and returns summarized results

### modelProxy
Proxies requests to different LLM providers

### inviteUser
Sends invitation emails to users for thread collaboration

### trackUsage
Updates usage statistics for users

### syncUserPlans
Synchronizes user plans with payment provider

### generateThreadTitle
Automatically generates thread titles based on content

### detectTaskType
Analyzes user input to detect the type of task and recommend appropriate models 