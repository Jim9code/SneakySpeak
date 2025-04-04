# SneakySpeak Documentation

## Overview
SneakySpeak is a modern, real-time chat application that allows users to communicate both openly and anonymously. The application features a sleek, glass-morphic design with interactive animations and supports both text and meme-based communication.

## Features

### Authentication
- Email-based authentication system
- Secure token management
- Persistent login sessions
- Profile management with username customization

### Chat Features
- Real-time messaging using WebSocket
- Support for both text and meme messages
- Anonymous messaging mode
- Message timestamps
- Automatic scrolling to latest messages
- Visual distinction between sent and received messages
  - Own messages: Blue, right-aligned
  - Others' messages: Gray, left-aligned

### Coin System
- Virtual currency system for premium features
- Initial balance of 10 coins for new users
- Coin costs:
  - Anonymous text message: 2 coins
  - Anonymous meme: 4 coins
  - Username change: 70 coins

### User Interface
- Modern glass-morphic design
- Responsive layout (mobile & desktop)
- Animated message transitions
- Interactive background with floating elements
- Custom scrollbar styling
- Loading animations and transitions

### Media Support
- Meme sharing functionality
- Image upload with captions
- Supported formats: JPEG, PNG, GIF
- Maximum file size: 5MB

## Technical Architecture

### Frontend (Svelte)
- **Components**
  - `MessageList`: Handles message display and animations
  - `MessageInput`: Message composition and sending interface
  - `UpdateUsernameModal`: Username modification dialog
  - `IntroAnimation`: Welcome screen animation
  - `EmojiPicker`: Emoji selection interface
  - `ChatControls`: Chat control interface

- **Services**
  - `authService`: Authentication management
  - `socketService`: WebSocket communication
  - `uploadService`: File upload handling

- **Stores**
  - `authStore`: User authentication state management

### Styling
- TailwindCSS for responsive design
- Custom animations using CSS keyframes
- Glass-morphic effects using backdrop-blur
- Dynamic message styling based on sender

## User Guide

### Getting Started
1. Register with your email
2. Verify your email address
3. Set up your username
4. Start chatting!

### Using Anonymous Mode
1. Toggle anonymous mode using the eye icon
2. Ensure you have sufficient coins
3. Send messages or memes anonymously

### Sharing Memes
1. Click the image icon
2. Select a meme file (JPEG, PNG, or GIF)
3. Add an optional caption
4. Send the meme

### Managing Your Profile
- Change username (costs 70 coins)
- View your coin balance
- Purchase more coins from the plans page

## Security Features
- Secure token-based authentication
- WebSocket secure communication
- File upload validation
- Rate limiting on API endpoints
- Coin transaction validation

## Best Practices
1. Keep messages appropriate and respectful
2. Use anonymous mode responsibly
3. Ensure memes comply with community guidelines
4. Manage coins wisely

## Error Handling
- Network disconnection recovery
- Invalid file type notifications
- Insufficient coin warnings
- Authentication error handling
- API error feedback

## Performance Considerations
- Optimized image loading
- Efficient WebSocket management
- Smooth animations
- Responsive design for all devices

## Future Enhancements
- Group chat functionality
- Direct messaging
- Rich text formatting
- Voice messages
- Custom emoji sets
- Advanced moderation tools

## Support
For technical support or feature requests, please contact the development team.

---

*Last updated: [Current Date]*
