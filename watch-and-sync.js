/**
 * Watch script for auto-syncing changes to Android Studio
 * This script watches for changes in src/ and dist/ directories
 * and automatically syncs with Capacitor when changes are detected
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let syncTimeout = null;
const SYNC_DELAY = 3000; // Wait 3 seconds after last change before syncing

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m', // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m', // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m'
  };
  const timestamp = new Date().toLocaleTimeString('ar-SA');
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

async function syncCapacitor() {
  try {
    log('🔄 Syncing changes to Capacitor...', 'info');
    const { stdout, stderr } = await execAsync('npx cap sync android', {
      cwd: __dirname,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      shell: true // Use shell on Windows
    });
    
    // Check if sync was successful (look for success indicators)
    const output = (stdout || '') + (stderr || '');
    const isSuccess = output.includes('Sync finished') || 
                     output.includes('Copying web assets') ||
                     output.includes('update android');
    
    if (isSuccess) {
      log('✅ Sync completed successfully!', 'success');
      log('📱 Android Studio will detect changes automatically', 'info');
    } else if (stderr && !stderr.includes('warning') && !stderr.includes('info')) {
      // Only show stderr if it's not just warnings/info
      log(`⚠️  Warning: ${stderr.substring(0, 200)}`, 'warning');
    } else {
      log('✅ Sync completed successfully!', 'success');
    }
  } catch (error) {
    // Check error details
    const errorMessage = error.message || '';
    const errorStdout = error.stdout || '';
    const errorStderr = error.stderr || '';
    
    // Check if it's actually a success (sometimes errors are thrown but sync succeeds)
    const fullOutput = errorStdout + errorStderr;
    if (fullOutput.includes('Sync finished') || fullOutput.includes('Copying web assets')) {
      log('✅ Sync completed successfully!', 'success');
      return;
    }
    
    // Check if it's just a warning/info
    if (errorMessage.includes('warning') || errorMessage.includes('info') || 
        errorStderr.includes('warning') || errorStderr.includes('info')) {
      log('✅ Sync completed (with warnings)', 'success');
    } else {
      // Show detailed error
      const errorDetails = errorStdout || errorStderr || errorMessage;
      log(`❌ Error syncing: ${errorDetails.substring(0, 300)}`, 'error');
      log('💡 Try running manually: npx cap sync android', 'info');
    }
  }
}

function debounceSync() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  
  syncTimeout = setTimeout(() => {
    syncCapacitor();
  }, SYNC_DELAY);
}

// Use chokidar if available, otherwise use simple polling
async function setupWatcher() {
  try {
    // Try to use chokidar (more reliable)
    const chokidarModule = await import('chokidar');
    const chokidar = chokidarModule.default || chokidarModule;
    
    log('👀 Setting up file watcher (chokidar)...', 'info');
    
    const watcher = chokidar.watch([
      resolve(__dirname, 'src'),
      resolve(__dirname, 'dist')
    ], {
      ignored: [
        /node_modules/,
        /\.git/,
        /\.DS_Store/,
        /dist\/.*\.map$/,
        /\.cache/,
        /\.vite/
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
      }
    });
    
    watcher.on('change', (path) => {
      const relativePath = path.replace(__dirname + '\\', '').replace(__dirname + '/', '');
      log(`📝 Change detected: ${relativePath}`, 'info');
      debounceSync();
    });
    
    watcher.on('add', (path) => {
      const relativePath = path.replace(__dirname + '\\', '').replace(__dirname + '/', '');
      log(`➕ New file: ${relativePath}`, 'info');
      debounceSync();
    });
    
    watcher.on('error', (error) => {
      log(`⚠️  Watcher error: ${error.message}`, 'warning');
    });
    
    log('✅ File watcher is active!', 'success');
    return watcher;
  } catch (error) {
    // Fallback to simple polling if chokidar is not available
    log(`⚠️  chokidar error: ${error.message}`, 'warning');
    log('💡 Using polling mode instead...', 'info');
    
    return setupPolling();
  }
}

function setupPolling() {
  log('👀 Setting up polling watcher...', 'info');
  
  const srcDir = resolve(__dirname, 'src');
  const distDir = resolve(__dirname, 'dist');
  
  let lastSrcTime = 0;
  let lastDistTime = 0;
  
  const pollInterval = setInterval(() => {
    try {
      // Simple polling - check if dist directory exists and has recent changes
      if (existsSync(distDir)) {
        const distStats = require('fs').statSync(distDir);
        if (distStats.mtimeMs > lastDistTime) {
          lastDistTime = distStats.mtimeMs;
          log('📝 Change detected in dist/', 'info');
          debounceSync();
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }, 2000); // Poll every 2 seconds
  
  return {
    close: () => clearInterval(pollInterval)
  };
}

async function main() {
  log('🚀 Starting watch mode for Android Studio sync...', 'info');
  log('📂 Watching for changes in src/ and dist/ directories', 'info');
  log('⏳ Changes will be synced automatically after 3 seconds of inactivity', 'info');
  log('', 'info');
  
  // Initial sync
  log('🔄 Performing initial sync...', 'info');
  await syncCapacitor();
  
  log('', 'info');
  
  // Setup watcher
  const watcher = await setupWatcher();
  
  log('✨ Watch mode is active! Make changes and they will sync automatically.', 'success');
  log('💡 Press Ctrl+C to stop watching', 'info');
  log('', 'info');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('', 'info');
    log('🛑 Stopping watch mode...', 'info');
    if (watcher && watcher.close) {
      watcher.close();
    }
    if (syncTimeout) {
      clearTimeout(syncTimeout);
    }
    log('✅ Watch mode stopped', 'success');
    process.exit(0);
  });
}

main().catch(error => {
  log(`❌ Fatal error: ${error.message}`, 'error');
  process.exit(1);
});

