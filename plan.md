# SneakySpeak - Project Plan

## 🧠 Idea Summary

A real-time school-only chat application where students log in using their school email and chat in a shared room. A toggle allows users to switch between sending messages with their username or as "Anonymous." Students can also send memes (images/GIFs) and emojis.

## 🎨 App Theme & Name

The app will have a modern, playful student vibe with fun colors and a minimal layout.

### Final Name:
- **SneakySpeak** – a fun and mysterious name that perfectly matches the anonymous chat feature.

## 🔧 Tech Stack

- **Frontend**: Svelte
- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.IO
- **Authentication**: Email verification (school domain-based)
- **Image Uploads**: Multer or Cloud storage (e.g., Cloudinary or Firebase)

## 🗂️ Features Overview

### ✅ Core Features

- School-only login (email verification)
- Real-time group chat
- Anonymous toggle for messages
- Image/meme sending
- Emoji support and reactions

### 🧪 MVP Scope

- Basic email login
- One shared chat room
- Anonymous toggle switch
- Text messages in real time
- Emoji support

### 🚀 Post-MVP

- Meme/image uploads
- Push notifications
- Private DMs or smaller groups
- Emoji reactions on messages
- Report/block system

## 🛠️ Architecture

- Svelte frontend connects to Express backend via REST for auth
- Real-time chat via Socket.IO
- User state includes `isAnonymous: true/false`
- Each message contains: `text`, `sender (or anonymous)`, `timestamp`, `type (text/image)`

## 🎨 UI Overview

- **Login Page**: Input school email
- **Main Chat**:
  - Message input box
  - Emoji picker
  - File/image upload button
  - Anonymous toggle button
  - Message feed

## 🔐 Authentication Flow

1. User enters email
2. Backend checks for valid `@school.edu` domain
3. (Optional) Sends verification code or magic link
4. On success, store session/token

## 📦 Storage

- Messages in memory for MVP or store in a database (MySQL)
- Images stored  via Cloudinary

## 🧩 Third-party Libraries

- Socket.IO
- Emoji Picker (e.g., Emoji Mart)
- Multer (for file uploads)
- Email validation

## 📈 Growth Possibilities

- User profiles
- Leaderboards for funny/liked anonymous posts
- Custom avatars or status
- Polls & voting

---

