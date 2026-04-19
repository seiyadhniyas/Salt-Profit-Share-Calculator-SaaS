# PWA Deployment Guide

## For Netlify Deployment

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Upload the `dist/` folder to Netlify
   - Or connect your GitHub repo and set build command to `npm run build`

3. **PWA Requirements**:
   - Your site must be served over HTTPS (Netlify provides this automatically)
   - Service worker must be in the root scope

## For Other Hosting

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Upload files**:
   - Upload all files from `dist/` to your web server
   - Ensure the server serves the files correctly

3. **HTTPS Required**:
   - PWA features only work over HTTPS in production
   - Get an SSL certificate for your domain

## Testing PWA Features

1. **Install Prompt**: Open the app in a mobile browser and look for "Add to Home Screen"
2. **Offline Mode**: Disconnect internet and try using the app
3. **Manifest**: Check that the app icon and name appear correctly when installing
4. **Icons**: The app uses SVG icons which work across all modern browsers

## Browser Support

- Chrome/Edge: Full PWA support
- Firefox: Basic PWA support
- Safari: Limited PWA support (iOS 11.3+)
- Samsung Internet: Good PWA support

**Note**: SVG icons are used by default and provide excellent compatibility. PNG icons can be generated optionally for enhanced compatibility with older browsers.

## Troubleshooting

1. **Service Worker not registering**: Check browser console for errors
2. **Icons not showing**: Ensure paths in manifest.json are correct
3. **Install prompt not appearing**: Must be over HTTPS and meet PWA criteria
4. **Offline not working**: Check service worker is caching files properly

## Future Enhancements

- Add push notifications for important updates
- Implement background sync for report saving
- Add more offline-specific features
- Create app store listings for wrapped versions