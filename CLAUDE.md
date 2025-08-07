# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Unwebarchiver is a web-based tool for extracting and viewing content from Safari `.webarchive` files. It's a client-side JavaScript application that parses Apple's binary property list format to extract web resources (HTML, CSS, JS, images) from webarchive files.

## Architecture

### Core Components

- **WebArchive Class** (`assets/js/unwebarchiver.js:109-341`): Binary plist parser that handles webarchive file format
  - Parses header, trailer, offset table, and object table
  - Implements Apple's binary property list specification
  - Handles various data types: strings, dates, binary data, arrays, dictionaries
  - Uses custom `ArrayBuffer.prototype.readUIntBE` extension for big-endian integer reading

- **UI Controller** (`unwebarchiver` object): Manages file upload, parsing, and results display
  - File input handling with webarchive MIME type validation
  - Dynamic table generation for extracted resources
  - Blob URL creation for downloadable resources
  - Error handling and user feedback

### File Structure
```
/
├── index.html              # Main application page
├── assets/
│   ├── js/unwebarchiver.js # Core parsing logic and UI
│   ├── css/unwebarchiver.css # Styling with light/dark mode
│   └── example/            # Sample webarchive file
└── prepros.config          # Build tool configuration
```

### Key Technical Details

- **Apple Date Handling**: Converts Apple's epoch (2001-01-01) to JavaScript dates
- **Binary Format Parsing**: Implements reading of Apple's binary plist format
- **Memory Management**: Uses ArrayBuffer slicing for efficient binary data processing
- **Error Recovery**: Graceful handling of malformed webarchive files with detailed error messages

## Development

### Build System
This project uses Prepros for development workflow:
- Live reload enabled for HTML, CSS, and JS files
- CSS autoprefixing and minification available
- JavaScript minification configured but disabled by default

### Testing
- Use the provided example file at `assets/example/example.com.webarchive` for testing
- Test with various webarchive files from Safari to ensure compatibility
- Verify error handling with malformed or non-webarchive files

### Browser Compatibility
- Modern browsers with FileReader, ArrayBuffer, and Blob support required
- Uses modern CSS features like `light-dark()` for theme switching
- ES6+ features used throughout (classes, arrow functions, const/let)

## Important Implementation Notes

- The binary parser expects big-endian byte order (Apple's format)
- Object references use variable byte sizes based on trailer configuration
- Date calculations account for Apple's custom epoch (not Unix epoch)  
- Error messages include hex offset information for debugging binary parsing issues
- The application runs entirely client-side - no server processing required