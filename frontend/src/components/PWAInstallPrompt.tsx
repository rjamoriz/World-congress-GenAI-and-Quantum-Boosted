'use client';

import { useEffect } from 'react';

export default function PWAInstallPrompt() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered:', registration);

            // Check for updates periodically
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000); // Check every hour
          })
          .catch((error) => {
            console.error('SW registration failed:', error);
          });
      });
    }

    // Handle install prompt
    let deferredPrompt: any;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt = e;

      // Show custom install button/prompt
      const installButton = document.getElementById('pwa-install-btn');
      if (installButton) {
        installButton.style.display = 'block';
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle install button click
    const handleInstallClick = async () => {
      if (!deferredPrompt) return;

      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);

      // Clear the deferred prompt
      deferredPrompt = null;

      // Hide the install button
      const installButton = document.getElementById('pwa-install-btn');
      if (installButton) {
        installButton.style.display = 'none';
      }
    };

    const installButton = document.getElementById('pwa-install-btn');
    if (installButton) {
      installButton.addEventListener('click', handleInstallClick);
    }

    // Detect if app is installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      deferredPrompt = null;
    });

    // Handle online/offline status
    const handleOnline = () => {
      console.log('App is online');
      // Show toast notification
      const event = new CustomEvent('app-online');
      window.dispatchEvent(event);
    };

    const handleOffline = () => {
      console.log('App is offline');
      // Show toast notification
      const event = new CustomEvent('app-offline');
      window.dispatchEvent(event);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (installButton) {
        installButton.removeEventListener('click', handleInstallClick);
      }
    };
  }, []);

  return (
    <button
      id="pwa-install-btn"
      className="fixed bottom-4 right-4 z-50 hidden px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-lg transition-all duration-300 hover:scale-105"
      aria-label="Install app"
    >
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span className="font-medium">Install App</span>
      </div>
    </button>
  );
}
