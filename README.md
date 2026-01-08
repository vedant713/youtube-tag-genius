# YouTube Tag Genius 🎯

> **Supercharge your YouTube video discovery with AI-powered tag generation**

A premium Chrome/Edge extension that generates highly relevant YouTube search tags to help you discover better content faster. No more manual searching - let the algorithm work for you!

![Extension Preview](https://raw.githubusercontent.com/YOUR_USERNAME/youtube-tag-genius/main/icons/icon128.png)

## ✨ Features

### 🎯 Smart Tag Generation
- **AI-Powered Suggestions**: Uses YouTube's autocomplete API to generate relevant tags
- **Strict Relevance Filtering**: Only shows tags that match your keywords
- **Visual Categorization**: Color-coded tags (Core, Phrases, Long-tail)
- **No Clutter**: Automatically removes irrelevant "how to" suggestions

### ⚡ YouTube Integration
- **Quick-Access Icon**: Floating icon in YouTube's search bar
- **One-Click Workflow**: Save YouTube searches directly to extension
- **Auto-Fill Search**: Inject generated tags into YouTube search instantly
- **Smart Persistence**: Remembers your last keyword

### 🎨 Premium UI/UX
- **Dark Mode**: Beautiful, modern dark theme
- **Glassmorphism**: Sleek card-based design
- **Smooth Animations**: Micro-interactions for better UX
- **Responsive**: Works perfectly on any screen size

## 🚀 Installation

### From Source (Developer Mode)

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/youtube-tag-genius.git
   cd youtube-tag-genius
   ```

2. **Load in Chrome/Edge**
   - Open `chrome://extensions`
   - Enable **Developer Mode** (toggle in top right)
   - Click **Load unpacked**
   - Select the cloned folder

3. **Start using!**
   - Click the extension icon
   - Enter a keyword
   - Generate tags
   - Search on YouTube!

## 📖 How to Use

1. **Basic Tag Generation**
   ```
   Extension Icon → Enter Keyword → Generate Tags → Search on YouTube
   ```

2. **From YouTube**
   ```
   YouTube Search Bar → Click Icon (saves search) → Open Extension → Generate
   ```

3. **Advanced**
   - Click individual tags to select/deselect
   - Use "Copy" to copy all tags to clipboard
   - Tags are color-coded by type for easy identification

## 🎨 Tag Categories

- 🔴 **Red (Core)**: Short, high-impact keywords (≤15 chars)
- 🔵 **Blue (Phrases)**: Medium-length search phrases (16-30 chars)
- ⚪ **Gray (Long-tail)**: Specific, targeted searches (31+ chars)

## 🛠️ Tech Stack

- **Manifest V3**: Latest Chrome extension standard
- **Vanilla JavaScript**: No frameworks, pure performance
- **CSS3**: Modern styling with custom properties
- **YouTube Autocomplete API**: Real-time suggestions

## 📂 Project Structure

```
youtube-tag-genius/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── styles.css            # Premium styling
├── background.js         # Service worker (API calls)
├── content.js            # YouTube page integration
├── icons/                # Extension icons
└── README.md             # This file
```

## 🔒 Privacy & Permissions

This extension requires minimal permissions:
- **activeTab**: To interact with YouTube page
- **scripting**: To inject search queries
- **storage**: To remember your last keyword
- **host_permissions**: For YouTube.com and Google autocomplete API

**No data is collected or sent to any third-party servers.**

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- YouTube autocomplete API
- Chrome Extensions documentation
- Open-source community

## 📧 Support

Found a bug? Have a suggestion? 
- 🐛 [Open an issue](https://github.com/YOUR_USERNAME/youtube-tag-genius/issues)
- ⭐ Star this repo if you find it useful!

---

**Made with ❤️ for better YouTube discovery**
