// Configuration
const API_URL = window.location.origin;
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

// State variables
let currentEmail = '';
let sessionToken = ''; 
let autoRefreshInterval = null;
let timeUpdateInterval = null;
let lastEmailCount = 0;
let sessionId = generateSessionId();
let emailSecurityKey = generateSecurityKey();
let sessionStartTime = null;
let domainsLoaded = false;
let isAdminMode = false;
let isAccessMode = false;
let accessStartTime = null;

// Initialize functions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupEventListeners();
});


// Utility Functions
// Generate device ID if not exists
function getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('tempMailDeviceId');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
        localStorage.setItem('tempMailDeviceId', deviceId);
        console.log('📱 Generated new Device ID:', deviceId);
    }
    return deviceId;
}

// Check if device is banned
function checkDeviceBan() {
    const deviceId = getOrCreateDeviceId();
    
    // This will be checked in the create endpoint
    console.log('📱 Device ID:', deviceId);
    return deviceId;
}

function showBannedScreen(reason = 'Multiple policy violations detected') {
    // Stop all intervals
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    
    // Create overlay that covers everything
    const overlay = document.createElement('div');
    overlay.id = 'ban-overlay';
    overlay.innerHTML = `
        <style>
            #ban-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                animation: fadeIn 0.3s ease;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .ban-modal {
                max-width: 480px;
                width: 100%;
                background: white;
                border-radius: 20px;
                padding: 2rem;
                box-shadow: 0 30px 80px rgba(0,0,0,0.5);
                animation: slideUp 0.4s ease;
                max-height: 90vh;
                overflow-y: auto;
            }
            @keyframes slideUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .ban-icon {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #ff6b6b 0%, #c92a2a 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem;
                animation: shake 0.5s ease;
            }
            @keyframes shake {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(-10deg); }
                75% { transform: rotate(10deg); }
            }
            .ban-icon svg {
                width: 44px;
                height: 44px;
                color: white;
            }
            .ban-badge {
                display: inline-block;
                background: linear-gradient(135deg, #ff6b6b, #c92a2a);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 1rem;
            }
            .ban-title {
                font-size: 1.75rem;
                font-weight: 800;
                color: #1a1a1a;
                margin-bottom: 0.75rem;
                text-align: center;
            }
            .ban-message {
                color: #666;
                line-height: 1.6;
                margin-bottom: 1.5rem;
                text-align: center;
                font-size: 0.95rem;
            }
            .reason-box {
                background: linear-gradient(135deg, #fff5f5, #fee2e2);
                border: 2px solid #fca5a5;
                border-radius: 12px;
                padding: 1rem;
                margin-bottom: 1.5rem;
            }
            .reason-label {
                color: #991b1b;
                font-weight: 700;
                margin-bottom: 0.5rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.85rem;
            }
            .reason-text {
                color: #7f1d1d;
                font-size: 0.9rem;
                font-weight: 500;
                line-height: 1.5;
            }
            .device-box {
                background: #f8f9fa;
                border-radius: 10px;
                padding: 1rem;
                margin-bottom: 1.5rem;
                border: 2px dashed #dee2e6;
            }
            .device-label {
                font-size: 0.75rem;
                color: #888;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 0.5rem;
            }
            .device-code {
                font-family: 'Courier New', monospace;
                font-size: 0.85rem;
                color: #1a1a1a;
                font-weight: 700;
                word-break: break-all;
                background: white;
                padding: 0.5rem;
                border-radius: 6px;
                border: 1px solid #e5e5e5;
            }
            .contact-section {
                border-top: 2px solid #f0f0f0;
                padding-top: 1.5rem;
                margin-top: 1.5rem;
            }
            .contact-title {
                font-size: 0.9rem;
                font-weight: 700;
                color: #1a1a1a;
                margin-bottom: 1rem;
                text-align: center;
            }
            .contact-buttons {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.75rem;
            }
            .contact-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                padding: 0.875rem;
                border-radius: 10px;
                font-weight: 600;
                font-size: 0.85rem;
                text-decoration: none;
                transition: all 0.3s ease;
                border: none;
                cursor: pointer;
            }
            .contact-btn:active {
                transform: scale(0.95);
            }
            .contact-btn-telegram {
                background: linear-gradient(135deg, #0088cc, #00aaff);
                color: white;
                box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3);
            }
            .contact-btn-telegram:hover {
                background: linear-gradient(135deg, #006fa3, #0088cc);
                box-shadow: 0 6px 16px rgba(0, 136, 204, 0.4);
            }
            .contact-btn-facebook {
                background: linear-gradient(135deg, #1877f2, #0866ff);
                color: white;
                box-shadow: 0 4px 12px rgba(24, 119, 242, 0.3);
            }
            .contact-btn-facebook:hover {
                background: linear-gradient(135deg, #145dbf, #1877f2);
                box-shadow: 0 6px 16px rgba(24, 119, 242, 0.4);
            }
            .contact-btn svg {
                width: 20px;
                height: 20px;
            }
            .footer-note {
                text-align: center;
                color: #999;
                font-size: 0.75rem;
                margin-top: 1rem;
                line-height: 1.5;
            }
            
            /* Mobile responsive */
            @media (max-width: 640px) {
                .ban-modal {
                    padding: 1.5rem;
                    border-radius: 16px;
                }
                .ban-title {
                    font-size: 1.5rem;
                }
                .ban-icon {
                    width: 70px;
                    height: 70px;
                }
                .ban-icon svg {
                    width: 38px;
                    height: 38px;
                }
                .contact-buttons {
                    grid-template-columns: 1fr;
                }
            }
        </style>
        
        <div class="ban-modal">
            <div class="ban-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                </svg>
            </div>
            
            <div style="text-align: center;">
                <span class="ban-badge">🚫 Permanent Ban</span>
            </div>
            
            <h1 class="ban-title">Access Denied</h1>
            
            <p class="ban-message">
                Your device has been permanently banned from accessing this service.
            </p>
            
            <div class="reason-box">
                <div class="reason-label">
                    <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    Ban Reason
                </div>
                <div class="reason-text">${reason}</div>
            </div>
            
            <div class="device-box">
                <div class="device-label">Your Device ID</div>
                <div class="device-code">${getOrCreateDeviceId()}</div>
            </div>
            
            <div class="contact-section">
                <div class="contact-title">📞 Contact Administrator</div>
                <div class="contact-buttons">
                    <a href="https://t.me/whoamiSir" target="_blank" rel="noopener" class="contact-btn contact-btn-telegram">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                        </svg>
                        Telegram
                    </a>
                    <a href="https://facebook.com/aungmyomyatzaw.u" target="_blank" rel="noopener" class="contact-btn contact-btn-facebook">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                    </a>
                </div>
                <div class="footer-note">
                    Include your Device ID when contacting us for review.
                </div>
            </div>
        </div>
    `;
    
    // Append to body
    document.body.appendChild(overlay);
    
    // Prevent all interactions with background
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            e.stopPropagation();
            e.preventDefault();
        }
    });
    
    // Disable all form inputs and buttons on the page
    document.querySelectorAll('input, button, textarea, select, a').forEach(el => {
        if (!overlay.contains(el)) {
            el.style.pointerEvents = 'none';
            el.disabled = true;
        }
    });
    
    // Prevent scrolling of background
    document.body.style.overflow = 'hidden';
}

// Check for ban on page load
function checkBanOnLoad() {
    // This will be handled by the API responses
    console.log('🔍 Checking device status...');
}

function generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function generateSecurityKey() {
    return 'key_' + Math.random().toString(36).substr(2, 16);
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
function improvedCleanEmailBody(rawBody) {
    // Email is now pre-cleaned by backend with mail-parser
    // Just return the HTML as-is
    if (!rawBody || rawBody.trim() === '') {
        return '<p class="text-gray-400 text-center py-8">No content available</p>';
    }
    
    return rawBody;
}

function formatTime(timestamp) {
    try {
        let date;
        
        // Handle different timestamp formats
        if (typeof timestamp === 'string') {
            // Remove any timezone info and treat as UTC
            const cleanTimestamp = timestamp.replace(/[\+\-]\d{2}:?\d{2}$/, '');
            date = new Date(cleanTimestamp + 'Z');
            
            // If still invalid, try direct parsing
            if (isNaN(date.getTime())) {
                date = new Date(timestamp);
            }
        } else if (typeof timestamp === 'number') {
            // Assume it's already a Unix timestamp in milliseconds
            date = new Date(timestamp);
        } else {
            return 'recently';
        }
        
        // Final check for valid date
        if (isNaN(date.getTime())) {
            return 'recently';
        }
        
        // Convert to Myanmar Time (UTC+6:30)
        const utcTime = date.getTime();
        const myanmarOffset = 6.5 * 60 * 60 * 1000; // 6.5 hours in milliseconds
        const myanmarTime = new Date(utcTime + myanmarOffset);
        
        // Get current time in Myanmar timezone
        const nowUtc = new Date().getTime();
        const nowMyanmar = new Date(nowUtc + myanmarOffset);
        
        const diff = nowMyanmar - myanmarTime;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        // Return relative time
        if (seconds < 60) return 'just now';
        if (minutes < 60) return minutes + ' min ago';
        if (hours < 24) return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
        if (days < 7) return days + ' day' + (days > 1 ? 's' : '') + ' ago';
        
        // For dates older than a week, show actual date
        return myanmarTime.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
    } catch (e) {
        console.error('Error formatting time:', e);
        return 'recently';
    }
}

function openAccessModal() {
    console.log('🚪 Access button clicked - checking session state...');

    if (window.accessModalOpening) {
        console.log('🛑 Access modal already opening, ignoring click');
        return;
    }
    window.accessModalOpening = true;
    
    // ✅ FIRST: Check if we have an active access code session in localStorage
    const savedAccessCodes = getAccessCodesFromLocalStorage();
    const currentDeviceId = generateDeviceId();
    const now = new Date();
    
    // Look for active access code sessions for this device
    const activeAccessSession = savedAccessCodes.find(accessCode => {
        return accessCode.device_id === currentDeviceId && 
               new Date(accessCode.expires_at) > now;
    });
    
    console.log('🔐 Active access session found:', !!activeAccessSession);
    
    // ✅ If active access session exists, RESTORE it immediately
    if (activeAccessSession && !isAccessMode) {
        console.log('🔐 Active access session found in localStorage, restoring...', activeAccessSession.email);
        
        showNotification('🔐 Restoring access session...', 'info');
        
        // ✅ FIRST: Kill any current normal session
        if (currentEmail && sessionToken && !isAccessMode) {
            console.log('🔄 Ending current normal session before restoring access session');
            endCurrentSessionForNewEmail().then(() => {
                // After ending normal session, restore access session
                restoreAccessSession(activeAccessSession);
            });
        } else {
            // No normal session to end, restore directly
            restoreAccessSession(activeAccessSession);
        }
        
        return; // ✅ EXIT EARLY - don't proceed to show modal
    }
    
    // ✅ If already IN access mode, just show the session (no modal)
    if (isAccessMode && currentEmail) {
        console.log('🔐 Already in access mode - showing session');
        document.getElementById('access-mode-display').classList.remove('hidden');
        document.getElementById('mail-creation-section').classList.add('hidden');
        document.getElementById('mail-controls-section').classlist.add('hidden');
        return;
    }
    
    // ✅ No active access session - show code input modal
    console.log('📭 No active access session - showing code modal');
    showAccessModal();
}

function restoreAccessSession(activeAccessSession) {
    // Verify session is still valid with backend
    fetch(`${API_URL}/api/emails/${encodeURIComponent(activeAccessSession.email)}`, {
        headers: {
            'X-Session-Token': activeAccessSession.session_token,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (res.ok) {
            // Session is valid, restore it
            console.log('✅ Backend session validation successful');
            restoreAccessCodeSession(activeAccessSession);
        } else {
            // Session expired, remove from localStorage and show code modal
            console.log('❌ Access session expired, removing from localStorage');
            removeAccessCodeFromLocalStorage(activeAccessSession.email);
            showAccessModal();
        }
    })
    .catch(err => {
        console.log('❌ Error verifying access session, showing code modal:', err);
        showAccessModal();
    });
}


// UI Functions
function showModal(title, message, confirmCallback) {
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalCancel = document.getElementById('modal-cancel');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.classList.remove('hidden');
    
    // Remove previous event listeners
    const newConfirm = modalConfirm.cloneNode(true);
    const newCancel = modalCancel.cloneNode(true);
    modalConfirm.parentNode.replaceChild(newConfirm, modalConfirm);
    modalCancel.parentNode.replaceChild(newCancel, modalCancel);
    
    // Add new event listeners
    document.getElementById('modal-confirm').onclick = function() {
        modal.classList.add('hidden');
        if (confirmCallback) confirmCallback();
    };
    
    document.getElementById('modal-cancel').onclick = function() {
        modal.classList.add('hidden');
    };
}   

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        // Show success notification
        showNotification('✅ Verification code copied: ' + text, 'success');
    }).catch(function() {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('✅ Verification code copied: ' + text, 'success');
    });
}

function showNotification(message, type) {
    const notif = document.getElementById('notification');
    const text = document.getElementById('notification-text');
    text.textContent = message;
    
    let bgColor = 'bg-blue-600';
    if (type === 'success') {
        bgColor = 'bg-green-600';
    } else if (type === 'error') {
        bgColor = 'bg-red-600';
    } else if (type === 'info') {
        bgColor = 'bg-blue-600';
    }
    
    notif.className = `text-center mb-2 md:mb-4 p-2 md:p-4 rounded-xl text-white font-medium text-sm md:text-base ${bgColor}`;
    notif.classList.remove('hidden');
    setTimeout(() => notif.classList.add('hidden'), 3000);
}

function handleApiError(error, defaultMessage = "An error occurred") {
    console.error("API Error:", error);
    
    if (error.message && error.message.includes("Failed to fetch")) {
        showNotification("Network error - check your connection", "error");
    } else if (error.message && (error.message.includes("403") || error.message.includes("Session expired"))) {
        showNotification("Session expired - creating new session", "error");
        clearSession();
    } else if (error.message && (error.message.includes("401") || error.message.includes("Session expired") || error.message.includes("Session has been ended"))) {
        showNotification("Session ended - creating new session", "error");
        clearSession();
    } else if (error.message && error.message.includes("409")) {
        showNotification("This email is already in use by another session", "error");
    } else if (error.message && error.message.includes("404")) {
        // This is normal for new emails
        return;
    } else {
        showNotification(error.message || defaultMessage, "error");
    }
}


function clearSession() {
    console.log('🔄 Clearing ALL sessions for fresh start...');
    
    // Clear ALL frontend state
    currentEmail = '';
    sessionToken = '';
    sessionStartTime = null;
    // Note: We keep isAccessMode=true when in access mode
    // accessStartTime = null; // Keep this for access mode timer

    // Stop all intervals
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('✅ Auto-refresh stopped');
    }
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
        console.log('✅ Time updates stopped');
    }
    
    // Clear any session expiration timeout
    if (window.sessionExpirationTimeout) {
        clearTimeout(window.sessionExpirationTimeout);
        window.sessionExpirationTimeout = null;
    }
    
    // Clear any pending email fetch requests
    if (window.emailFetchController) {
        window.emailFetchController.abort();
        window.emailFetchController = null;
    }

    // Clear localStorage (only normal sessions)
    localStorage.removeItem('tempMailSession');
    
    // Reset UI to fresh state
    document.getElementById('username-input').value = '';
    document.getElementById('domain-select').selectedIndex = 0;
    document.getElementById('email-display').classList.add('hidden');
    document.getElementById('end-session-btn').classList.add('hidden');
    document.getElementById('email-count').textContent = '0 emails';
    document.getElementById('email-list').innerHTML = '';
    document.getElementById('no-emails-default').style.display = 'flex';
    
    // Reset email view
    document.getElementById('desktop-email-placeholder').style.display = 'flex';
    document.getElementById('desktop-email-content-inner').classList.add('hidden');
    
    // Reset title
    document.title = 'TempMail - AMMZ';
    
    console.log('✅ Normal session cleared - Fresh interface ready');
}

// Add this function to fix access code expiration time
function getAccessCodeTimeRemaining(expiresAt) {
    try {
        let date;
        
        if (typeof expiresAt === 'string') {
            // Use same parsing logic as emails
            const cleanTimestamp = expiresAt.replace(/[\+\-]\d{2}:?\d{2}$/, '');
            date = new Date(cleanTimestamp + 'Z');
            
            if (isNaN(date.getTime())) {
                date = new Date(expiresAt);
            }
        } else {
            date = new Date(expiresAt);
        }
        
        if (isNaN(date.getTime())) {
            return 'Expired';
        }
        
        // Convert to Myanmar Time (UTC+6:30) - SAME AS EMAILS
        const utcTime = date.getTime();
        const myanmarOffset = 6.5 * 60 * 60 * 1000;
        const myanmarExpireTime = new Date(utcTime + myanmarOffset);
        
        // Get current time in Myanmar timezone
        const nowUtc = new Date().getTime();
        const nowMyanmar = new Date(nowUtc + myanmarOffset);
        
        const diff = myanmarExpireTime - nowMyanmar;
        
        if (diff <= 0) return 'Expired';
        
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        // Format like email times but for future
        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m`;
        return '<1m';
        
    } catch (e) {
        console.error('Error calculating access code time remaining:', e);
        return 'Error';
    }
}

function loadSession() {
    const savedSession = localStorage.getItem('tempMailSession');
    const savedAccessCodes = getAccessCodesFromLocalStorage();
    const currentDeviceId = generateDeviceId();
    const now = new Date();
    
    // First priority: Restore access code sessions
    for (const accessCode of savedAccessCodes) {
        if (accessCode.device_id === currentDeviceId && new Date(accessCode.expires_at) > now) {
            console.log('🔐 Found active access code session:', accessCode.email);
            
            // Verify the session is still valid with backend
            fetch(`${API_URL}/api/emails/${encodeURIComponent(accessCode.email)}`, {
                headers: {
                    'X-Session-Token': accessCode.session_token,
                    'Content-Type': 'application/json'
                }
            })
            .then(res => {
                if (res.ok) {
                    // Session is still valid, restore it
                    restoreAccessCodeSession(accessCode);
                    return true;
                } else {
                    // Session expired or invalid, remove from localStorage
                    removeAccessCodeFromLocalStorage(accessCode.email);
                    return false;
                }
            })
            .catch(() => {
                removeAccessCodeFromLocalStorage(accessCode.email);
                return false;
            });
            
            return; // Stop checking other sessions
        }
    }
    
    // Second priority: Restore normal sessions (only if no access mode)
    if (savedSession && !isAccessMode) {
        try {
            const session = JSON.parse(savedSession);
            const sessionAge = Date.now() - session.createdAt;
            const sessionValid = sessionAge < SESSION_TIMEOUT;
            
            if (sessionValid && session.email && session.sessionToken) {
                // Restore normal session
                currentEmail = session.email;
                sessionToken = session.sessionToken;
                sessionStartTime = session.createdAt;
                
                console.log('🔄 Normal session restored from localStorage:', currentEmail);
                
                if (domainsLoaded) {
                    restoreSessionUI();
                }
                return true;
            } else {
                localStorage.removeItem('tempMailSession');
            }
        } catch (e) {
            localStorage.removeItem('tempMailSession');
        }
    }
    
    console.log('📭 No valid session found in localStorage');
    return false;
}

// Add this to restoreAccessCodeSession to set access mode colors
function restoreAccessCodeSession(accessCode) {
    console.log('🔄 Restoring access code session from localStorage');
    
    isAccessMode = true;
    accessStartTime = new Date(accessCode.access_start_time);
    currentEmail = accessCode.email;
    sessionToken = accessCode.session_token;
    sessionStartTime = Date.now();

    // Show/hide description section
    const descriptionSection = document.getElementById('access-description-section');
    const descriptionText = document.getElementById('access-description-text');
    
    if (accessCode.description && accessCode.description.trim() !== '') {
        descriptionText.textContent = accessCode.description;
        descriptionSection.classList.remove('hidden');
    } else {
        descriptionSection.classList.add('hidden');
    }
    
    // ✅ FORCE SHOW EMAIL LIST VIEW (not email content view)
    showEmailList();

    // ✅ ADD ACCESS MODE COLOR
    document.body.classList.add('access-mode-active');
    
    // Update UI for access mode
    document.getElementById('access-mode-display').classList.remove('hidden');
    document.getElementById('mail-creation-section').classList.add('hidden');
    document.getElementById('mail-controls-section').classList.add('hidden');
    
    document.getElementById('access-email-display').textContent = currentEmail;
    document.getElementById('current-email').innerHTML = `
        ${currentEmail} 
        <span class="bg-blue-500 text-white px-2 py-1 rounded text-xs ml-2">ACCESS CODE</span>
    `;
    document.getElementById('email-display').classList.remove('hidden');
    document.getElementById('end-session-btn').classList.remove('hidden');
    
    // Start timer with stored expiration
    startAccessCodeTimer(accessCode.expires_at);
    
    // Clear any normal session intervals
    clearSessionIntervals();
    
    // Load emails and start refresh
    loadEmails();
    startAutoRefresh();
    startTimeUpdate();
    setupSessionExpiration();
    
    // Show description if available
    if (accessCode.description) {
        showNotification(`🔐 ${accessCode.description}`, 'info');
    }
    
    console.log('✅ Access code session restored successfully');
}


function startAccessCodeTimer(expiresAt) {
    console.log('⏰ Starting access code timer with expiration:', expiresAt);
    
    // Clear any existing timer
    if (window.accessCodeTimer) {
        clearInterval(window.accessCodeTimer);
    }
    
    const updateTimer = () => {
        const timeRemaining = getAccessCodeTimeRemaining(expiresAt);
        document.getElementById('access-expire-time').textContent = timeRemaining;
        
        console.log('⏰ Time remaining:', timeRemaining);
        
        if (timeRemaining === 'Expired') {
            clearInterval(window.accessCodeTimer);
            document.getElementById('access-expire-time').textContent = 'Expired';
            showNotification('🔐 Access code session has expired', 'error');
        }
    };
    
    // Run immediately and every minute
    updateTimer();
    window.accessCodeTimer = setInterval(updateTimer, 60000);
}


function restoreSessionUI() {
    if (!currentEmail || !sessionToken) {
        console.error('❌ Cannot restore UI: missing email or token');
        return;
    }
    
    console.log('🔄 Restoring UI for:', currentEmail);
    
    const parts = currentEmail.split('@');
    document.getElementById('username-input').value = parts[0];
    
    // ✅ Wait for domain select to be populated
    const domainSelect = document.getElementById('domain-select');
    const domain = parts[1];
    
    const setDomain = () => {
        if (domainSelect.querySelector(`option[value="${domain}"]`)) {
            domainSelect.value = domain;
            
            // ✅ Validate session with backend before completing restoration
            validateSessionWithBackend();
        } else {
            // Domain not available yet, try again
            setTimeout(setDomain, 100);
        }
    };
    
    setDomain();
}

function validateSessionWithBackend() {
    console.log('🔐 Validating session with backend...');
    
    fetch(`${API_URL}/api/emails/${encodeURIComponent(currentEmail)}`, {
        headers: {
            'X-Session-Token': sessionToken,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (res.ok) {
            console.log('✅ Backend session validation successful');
            completeUIRestoration();
        } else if (res.status === 403) {
            console.log('❌ Backend session validation failed - session expired');
            showNotification('Session expired. Creating new session...', 'error');
            // Clear the invalid session and create a new one
            localStorage.removeItem('tempMailSession');
            clearSession();
        } else {
            console.log('⚠️ Backend validation issue, proceeding anyway');
            completeUIRestoration();
        }
    })
    .catch(err => {
        console.log('⚠️ Network error during validation, proceeding:', err);
        completeUIRestoration();
    });
}

function completeUIRestoration() {
    // Show the email display
    document.getElementById('current-email').textContent = currentEmail;
    document.getElementById('email-display').classList.remove('hidden');
    document.getElementById('end-session-btn').classList.remove('hidden');
    
    showNotification('✅ Session restored', 'success');
    
    // Load emails immediately
    loadEmails();
    startAutoRefresh();
    startTimeUpdate();
    setupSessionExpiration();
    
    console.log('✅ UI restoration complete');
}

function saveSession() {
    if (!currentEmail || !sessionToken) {
        console.error('❌ Cannot save session: missing email or token');
        return;
    }
    
    const session = {
        email: currentEmail,
        sessionToken: sessionToken,
        createdAt: sessionStartTime || Date.now(),
        lastEmailTime: Date.now(),
        isAccessMode: isAccessMode,
        accessStartTime: accessStartTime ? accessStartTime.toISOString() : null
    };
    
    localStorage.setItem('tempMailSession', JSON.stringify(session));
    console.log('💾 Session saved:', currentEmail, 'Access Mode:', isAccessMode);
}

window.sessionOperationInProgress = false;
window.accessModalOpening = false;
window.emailLoadingInProgress = false;

function endCurrentSessionForNewEmail() {
    if (window.sessionOperationInProgress) {
        console.log('🛑 Session operation already in progress');
        return Promise.resolve();
    }
    window.sessionOperationInProgress = true;

    return new Promise((resolve, reject) => {
        console.log('🔄 Ending current NORMAL session for new email creation...');
        
        // ✅ FIX: Don't end access mode sessions
        if (isAccessMode) {
            console.log('🔐 Access mode active - skipping session end');
            resolve();
            return;
        }
        
        // If no active normal session, just resolve immediately
        if (!currentEmail || !sessionToken) {
            console.log('📭 No normal session to end');
            resolve();
            return;
        }
        
        // Save current normal session data for backend call
        const endEmail = currentEmail;
        const endToken = sessionToken;

        // Clear frontend state immediately (only normal sessions)
        currentEmail = '';
        sessionToken = '';
        sessionStartTime = null;
        
        // Clear localStorage (only for normal sessions)
        localStorage.removeItem('tempMailSession');
        
        // Stop all refresh intervals
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
        if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
            timeUpdateInterval = null;
        }
        
        // Clear any session expiration timeout
        if (window.sessionExpirationTimeout) {
            clearTimeout(window.sessionExpirationTimeout);
            window.sessionExpirationTimeout = null;
        }
        
        // Clear any pending email fetch requests
        if (window.emailFetchController) {
            window.emailFetchController.abort();
            window.emailFetchController = null;
        }

        // Reset UI immediately
        document.getElementById('username-input').value = '';
        document.getElementById('domain-select').selectedIndex = 0;
        document.getElementById('email-display').classList.add('hidden');
        document.getElementById('end-session-btn').classList.add('hidden');
        document.getElementById('email-count').textContent = '0 emails';
        document.getElementById('email-list').innerHTML = '';
        document.getElementById('no-emails-default').style.display = 'flex';
        
        // Reset email view
        document.getElementById('desktop-email-placeholder').style.display = 'flex';
        document.getElementById('desktop-email-content-inner').classList.add('hidden');
        
        console.log('✅ Frontend normal session cleared for new email');

        // Notify backend to end session (only for normal sessions)
        if (endEmail && endToken) {
            console.log('📡 Notifying backend to end previous NORMAL session...');
            fetch(API_URL + '/api/session/end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_token: endToken,
                    email_address: endEmail
                })
            })
            .then(res => {
                if (!res.ok) {
                    console.log('⚠️ Backend session end failed, but continuing');
                } else {
                    console.log('✅ Backend normal session ended');
                }
                return res.json();
            })
            .then(data => {
                console.log('✅ Backend confirmed normal session end');
                resolve(); // Resolve the promise to continue
            })
            .catch(err => {
                console.log('❌ Backend session end error (ignoring):', err);
                resolve(); // Still resolve to continue creation
            });
        } else {
            // No session to end, just resolve
            console.log('📭 No backend normal session to end');
            resolve();
        }
    }).finally(() => {
        window.sessionOperationInProgress = false;
    });
}


function endSessionBackend() {
    return new Promise((resolve) => {
        if (!currentEmail || !sessionToken) {
            console.log('No session to end');
            resolve();
            return;
        }
        
        console.log('Ending backend session for:', currentEmail);
        
        fetch(API_URL + '/api/session/end', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_token: sessionToken,
                email_address: currentEmail
            })
        })
        .then(res => {
            if (!res.ok) {
                console.log('Backend session end failed, but continuing');
            }
            return res.json();
        })
        .then(data => {
            console.log('✅ Backend session ended successfully');
            resolve();
        })
        .catch(err => {
            console.log('❌ Backend session end error (ignoring):', err);
            resolve();
        });
    });
}

function setupSessionExpiration() {
    // Clear any existing timeout
    if (window.sessionExpirationTimeout) {
        clearTimeout(window.sessionExpirationTimeout);
    }
    
    // Set new timeout
    window.sessionExpirationTimeout = setTimeout(function() {
        showNotification('🕒 Session expired. Please create a new email address.', 'error');
        clearSession();
    }, SESSION_TIMEOUT);
}

function loadEmails() {
    if (!currentEmail || !sessionToken) {
        console.log("❌ No current email or session token to load");
        return;
    }
    
    console.log("📧 Loading emails for:", currentEmail);

    // ✅ PREVENT MULTIPLE SIMULTANEOUS REQUESTS
    if (window.emailLoadingInProgress) {
        console.log("🛑 Email load already in progress, skipping");
        return;
    }
    window.emailLoadingInProgress = true;
    
    const loader = document.getElementById('inbox-loader');
    const list = document.getElementById('email-list');
    const defaultMsg = document.getElementById('no-emails-default');
    
    loader.style.display = 'flex';
    defaultMsg.style.display = 'none';
    list.innerHTML = '';
    
    // Use AbortController to prevent multiple simultaneous requests
    if (window.emailFetchController) {
        window.emailFetchController.abort();
    }
    window.emailFetchController = new AbortController();
    
    fetch(`${API_URL}/api/emails/${encodeURIComponent(currentEmail)}`, {
        headers: {
            'X-Session-Token': sessionToken,
            'Content-Type': 'application/json'
        },
        signal: window.emailFetchController.signal
    })
    .then(res => {
        if (!res.ok) {
            if (res.status === 404) {
                return { emails: [] };
            }
            if (res.status === 403) {
                // Check if it's an access code revocation
                return res.json().then(errorData => {
                    if (errorData.error && errorData.error.includes("Access code has been revoked")) {
                        throw new Error("ACCESS_CODE_REVOKED");
                    }
                    throw new Error("SESSION_EXPIRED");
                });
            }
            throw new Error(`Failed to fetch emails: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        console.log("✅ Emails loaded:", data.emails?.length || 0);
        
        const newCount = data.emails ? data.emails.length : 0;
        document.getElementById('email-count').textContent = `${newCount} email${newCount !== 1 ? 's' : ''}`;
        if (isAccessMode) {
            document.getElementById('access-inbox-count').textContent = `${newCount} email${newCount !== 1 ? 's' : ''}`;
        }

        document.title = newCount > 0 ? `(${newCount}) TempMail - AMMZ` : 'TempMail - AMMZ';
        
        // Show new email notification
        if (newCount > lastEmailCount && lastEmailCount > 0) {
            showNotification(`${newCount - lastEmailCount} new email(s) received!`, 'success');
        }
        lastEmailCount = newCount;
        
        list.innerHTML = '';
        
        if (newCount === 0) {
            if (isAccessMode) {
                list.innerHTML = `
                    <div class="text-center py-8 text-gray-300 h-full flex flex-col justify-center">
                        <i class="fas fa-envelope-open text-3xl mb-3 opacity-60"></i>
                        <p class="text-base font-medium">No new emails yet</p>
                        <p class="text-sm mt-1 text-gray-400">Waiting for messages after ${formatTime(accessStartTime)}</p>
                        <p class="text-xs mt-2 text-blue-400">Access code mode: Only showing emails received after access started</p>
                    </div>
                `;
            } else {
                list.innerHTML = `
                    <div class="text-center py-8 text-gray-300 h-full flex flex-col justify-center">
                        <i class="fas fa-envelope-open text-3xl mb-3 opacity-60"></i>
                        <p class="text-base font-medium">No emails yet</p>
                        <p class="text-sm mt-1 text-gray-400">Waiting for messages...</p>
                    </div>
                `;
            }
        } else {
            // Render email list
            data.emails.forEach((email, index) => {
                const emailItem = document.createElement('div');
                emailItem.className = 'email-list-item bg-gray-800 rounded-lg p-3 md:p-4 border border-gray-700 cursor-pointer transition-all hover:bg-gray-700';
                emailItem.setAttribute('data-timestamp', email.timestamp || email.received_at);
                
                const subject = email.subject || 'No subject';
                const sender = email.sender || 'Unknown sender';
                const preview = extractEmailPreview(email.body);
                const time = formatTime(email.timestamp || email.received_at);
                
                emailItem.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <div class="font-semibold text-white text-sm md:text-base truncate flex-1 mr-2">${escapeHtml(subject)}</div>
                        <div class="text-xs text-gray-400 whitespace-nowrap">${time}</div>
                    </div>
                    <div class="text-xs text-gray-300 mb-1 truncate">
                        <strong>From:</strong> ${escapeHtml(sender)}
                    </div>
                    <div class="text-xs text-gray-400 email-preview">
                        ${escapeHtml(preview)}
                    </div>
                `;
                
                emailItem.addEventListener('click', () => viewEmail(email, emailItem));
                list.appendChild(emailItem);
            });
        }
    })
    .catch(err => {
        if (err.name === 'AbortError') {
            console.log("Email fetch aborted");
            return;
        }
        
        console.error("❌ Error loading emails:", err);
        
        if (err.message === "SESSION_EXPIRED") {
            console.log("🔄 Session expired, clearing frontend state");
            showNotification("Session expired", "error");
            clearSession();
        } else if (err.message === "ACCESS_CODE_REVOKED") {
            console.log("🔐 Access code revoked, ending session");
            showNotification("Access code has been revoked by admin", "error");
            clearSession();
        } else {
            handleApiError(err, "Failed to load emails");
        }
        
        list.innerHTML = `<div class="text-center py-8 text-gray-300"><i class="fas fa-envelope-open text-3xl mb-3 opacity-60"></i><p class="text-base font-medium">No emails yet</p><p class="text-sm mt-1 text-gray-400">Waiting for messages...</p></div>`;
    })
    .finally(() => {
        loader.style.display = 'none';
        window.emailFetchController = null;
        window.emailLoadingInProgress = false;
    });
}



function extractEmailPreview(body) {
    if (!body) return 'No content';
    
    let text = body;
    
    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, '');
    
    // Decode common HTML entities and email encoding
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#8217;/g, "'")
        .replace(/=3D/g, '=')
        .replace(/=20/g, ' ')
        .replace(/=2E/g, '.')
        .replace(/=\r?\n/g, '');
    
    // Remove email headers and technical content
    const unwantedPatterns = [
        /@font-face.*/gi,
        /font-family:.*/gi,
        /Content-Type:.*/gi,
        /charset=.*/gi,
        /MIME-Version:.*/gi,
        /Content-Transfer-Encoding:.*/gi,
        /boundary=.*/gi,
        /Received:.*/gi,
        /Return-Path:.*/gi,
        /Message-ID:.*/gi
    ];
    
    unwantedPatterns.forEach(pattern => {
        text = text.replace(pattern, '');
    });
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Find the first meaningful sentence
    const sentences = text.split(/[.!?]/).filter(sentence => {
        const cleanSentence = sentence.trim();
        return cleanSentence.length > 10 && 
               !cleanSentence.includes('charset') &&
               !cleanSentence.includes('utf-8') &&
               !cleanSentence.includes('Content-Type');
    });
    
    if (sentences.length > 0) {
        text = sentences[0].trim();
    }
    
    // Limit length
    if (text.length > 100) {
        text = text.substring(0, 100) + '...';
    }
    
    return text || 'No readable content';
}

function loadDomains() {
    return fetch(API_URL + '/api/domains')
    .then(res => {
        if (!res.ok) {
            throw new Error('Failed to load domains');
        }
        return res.json();
    })
    .then(data => {
        const select = document.getElementById('domain-select');
        select.innerHTML = '<option value="">Select domain</option>';
        if (data.domains && data.domains.length > 0) {
            data.domains.forEach(function(d) {
                select.innerHTML += '<option value="' + d + '">' + d + '</option>';
            });
        } else {
            // Fallback domain
            select.innerHTML += '<option value="aungmyomyatzaw.online">aungmyomyatzaw.online</option>';
        }
        domainsLoaded = true;
    })
    .catch(err => {
        console.error('Error loading domains:', err);
        // Set default domain if API fails
        const select = document.getElementById('domain-select');
        select.innerHTML = '<option value="">Select domain</option>';
        select.innerHTML += '<option value="aungmyomyatzaw.online">aungmyomyatzaw.online</option>';
        domainsLoaded = true;
    });
}

function createEmail(customName) {
    const deviceId = getOrCreateDeviceId();
    console.log('📱 Using Device ID for creation:', deviceId);
    
    const btn = document.getElementById('create-btn');
    const username = customName || document.getElementById('username-input').value.trim();
    
    if (!username) {
        showNotification('❌ Please enter a username', 'error');
        return;
    }
    
    // 🚨 IMMEDIATELY show loading state
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    
    // ✅ END CURRENT SESSION before creating new one
    endCurrentSessionForNewEmail().then(() => {
        // After ending current session, create new email with device_id
        continueEmailCreation(customName, btn, deviceId);
    }).catch(err => {
        console.error('Error ending session:', err);
        // Still try to create new email even if ending fails
        continueEmailCreation(customName, btn, deviceId);
    });
}

function continueEmailCreation(customName, btn ,deviceId) {
    // Immediate UI feedback
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    
    // Clear any previous error states
    document.getElementById('username-input').classList.remove('border-red-500');
    
    // If customName is provided (from random button), use it
    let username = customName;
    if (!username) {
        username = document.getElementById('username-input').value.trim();
    }
    
    // If no username provided, show error and reset button
    if (!username) {
        showNotification('❌ Please enter a username', 'error');
        document.getElementById('username-input').focus();
        resetButtonState();
        return;
    }
    
    // Validate username format
    if (!/^[a-zA-Z0-9-_]+$/.test(username)) {
        showNotification('❌ Username can only contain letters, numbers, hyphens, and underscores', 'error');
        document.getElementById('username-input').classList.add('border-red-500');
        document.getElementById('username-input').focus();
        resetButtonState();
        return;
    }
    
    // Get domain
    let domain = document.getElementById('domain-select').value;
    if (!domain) {
        const domainSelect = document.getElementById('domain-select');
        const availableDomains = Array.from(domainSelect.options)
            .filter(option => option.value && option.value !== '')
            .map(option => option.value);
        
        if (availableDomains.length > 0) {
            domain = availableDomains[0];
            domainSelect.value = domain;
        } else {
            domain = 'aungmyomyatzaw.online';
        }
    }
    
    // Prepare request data
    const requestData = {
        name: username,
        sessionId: sessionId,
        admin_mode: isAdminMode,
        device_id: deviceId
    };
    
    if (sessionToken && !isAccessMode) {
        requestData.current_session_token = sessionToken;
    }

    
    
    // Make API request
    fetch(API_URL + '/api/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId,
            'X-Security-Key': emailSecurityKey
        },
        body: JSON.stringify(requestData)
    })
    .then(async (res) => {
        const contentType = res.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        } else {
            const text = await res.text();
            throw new Error(text || `HTTP ${res.status}`);
        }
        
        if (!res.ok) {
            data.httpStatus = res.status;
            throw data;
        }
        
        return data;
    })
    .then(data => {
        if (!data.email) {
            throw new Error('No email returned from server');
        }
        
        // Success - update session
        currentEmail = data.email;
        sessionToken = data.session_token;
        sessionStartTime = Date.now();

        console.log('✅ Email created with device tracking:', data.device_tracked);
        
        // Update UI
        const parts = currentEmail.split('@');
        document.getElementById('username-input').value = parts[0];
        document.getElementById('domain-select').value = parts[1];
        document.getElementById('current-email').textContent = data.email;
        document.getElementById('email-display').classList.remove('hidden');
        document.getElementById('end-session-btn').classList.remove('hidden');

        // Reset email view
        document.getElementById('desktop-email-placeholder').style.display = 'flex';
        document.getElementById('desktop-email-content-inner').classList.add('hidden');
        
        if (data.existing_session) {
            showNotification('✅ Session restored: ' + data.email, 'success');
            console.log('🔄 Existing session reused for:', data.email);
        } else {
            showNotification('✅ Email created: ' + data.email, 'success');
            console.log('🆕 New session created for:', data.email);
        }
        
        // Save session and start timers
        saveSession();
        
        // Load emails after a short delay
        setTimeout(() => {
            loadEmails();
        }, 1000);
        
        startAutoRefresh();
        startTimeUpdate();
        setupSessionExpiration();
    })
    .catch(err => {
        console.error('Error creating email:', err);
        
        // ✅ CHECK FOR DEVICE BAN ERROR
        if (err.message && err.message.includes('device has been banned')) {
            showBannedScreen();
            return;
        }
        
        handleCreateError(err);
    })
    .finally(() => {
        resetButtonState();
    });
}

function resetButtonState() {
    const createBtn = document.getElementById('create-btn');
    const randomBtn = document.getElementById('big-random-btn');
    
    createBtn.disabled = false;
    createBtn.innerHTML = '<i class="fas fa-plus mr-2"></i>Create Mail';
    createBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    
    randomBtn.disabled = false;
    randomBtn.innerHTML = '<i class="fas fa-random mr-2 md:mr-3 text-lg md:text-xl"></i>Generate Random Email';
    randomBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'btn-loading');
}

// Enhanced error handling for email creation
function handleCreateError(err) {
    if (err.httpStatus === 409 || err.code === 'EMAIL_IN_USE_ACTIVE') {
        resetUIAfterConflict();
        
        showModal(
            'Email Currently in Use', 
            err.error || 'This email address is currently in use by another session. Please choose a different username or try again later.',
            function() {
                document.getElementById('username-input').focus();
                document.getElementById('username-input').select();
            }
        );
    } else if (err.code === 'USERNAME_BLACKLISTED') {
        showNotification('🚫 ' + err.error, 'error');
        document.getElementById('username-input').value = '';
        document.getElementById('username-input').classList.add('border-red-500');
        document.getElementById('username-input').focus();
        
        showModal(
            'Reserved Username',
            'This username is reserved for the system owner. Please choose a different username.',
            function() {
                document.getElementById('username-input').focus();
            }
        );
    } else if (err.code === 'INVALID_USERNAME') {
        showNotification('❌ ' + err.error, 'error');
        document.getElementById('username-input').classList.add('border-red-500');
        document.getElementById('username-input').focus();
    } else {
        handleApiError(err, 'Failed to create email');
    }
}

// 🆕 NEW FUNCTION: Reset UI when session creation fails
function resetUIAfterConflict() {
    console.log('🔄 Resetting UI after conflict error');
    
    // Clear session state
    currentEmail = '';
    sessionToken = '';
    sessionStartTime = null;
    
    // Clear localStorage session
    localStorage.removeItem('tempMailSession');
    
    // Clear UI elements that show session state
    document.getElementById('email-display').classList.add('hidden');
    document.getElementById('end-session-btn').classList.add('hidden');
    document.getElementById('email-count').textContent = '0 emails';
    document.getElementById('current-email').textContent = '';
    
    // Clear any existing emails from display
    document.getElementById('email-list').innerHTML = '';
    document.getElementById('no-emails-default').style.display = 'flex';
    
    // Reset email content views
    document.getElementById('desktop-email-placeholder').style.display = 'flex';
    document.getElementById('desktop-email-content-inner').classList.add('hidden');
    
    // Show email list view (in case we were in email view)
    document.getElementById('email-list-view').classList.remove('hidden');
    document.getElementById('email-content-view').classList.add('hidden');
    document.getElementById('header-title').textContent = 'Inbox';
    document.getElementById('back-to-list').classList.add('hidden');
    
    // Stop any auto-refresh that might have been started
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('✅ Auto-refresh stopped after conflict');
    }
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
        console.log('✅ Time updates stopped after conflict');
    }
    
    // Clear session expiration timeout
    if (window.sessionExpirationTimeout) {
        clearTimeout(window.sessionExpirationTimeout);
        window.sessionExpirationTimeout = null;
        console.log('✅ Session expiration timer stopped after conflict');
    }
    
    // Reset page title
    document.title = 'TempMail - AMMZ';
    
    console.log('✅ UI reset complete after conflict');
}

// Fallback function to create email locally if API fails
function createEmailLocally(customName) {
    const domain = document.getElementById('domain-select').value || 'aungmyomyatzaw.online';
    const username = customName || generateRandomUsername();
    currentEmail = username + '@' + domain;
    sessionStartTime = Date.now();
    
    document.getElementById('username-input').value = username;
    document.getElementById('domain-select').value = domain;
    document.getElementById('current-email').textContent = currentEmail;
    document.getElementById('email-display').classList.remove('hidden');
    document.getElementById('end-session-btn').classList.remove('hidden');
    
    showNotification('✅ Email created locally: ' + currentEmail, 'success');
    
    // Save session and start timers
    saveSession();
    
    // Try to load emails anyway (might work if email exists on server)
    loadEmails();
    startAutoRefresh();
    startTimeUpdate();
    setupSessionExpiration();
}

function generateRandomUsername() {
    const firstNames = [
        'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles',
        'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua',
        'kenneth', 'kevin', 'brian', 'george', 'timothy', 'ronald', 'edward', 'jason', 'jeffrey', 'ryan',
        'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon',
        'benjamin', 'samuel', 'gregory', 'alexander', 'frank', 'patrick', 'raymond', 'jack', 'dennis', 'jerry',
        'liam', 'noah', 'oliver', 'elijah', 'logan', 'mason', 'lucas', 'ethan', 'levi', 'sebastian',
        'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen',
        'nancy', 'lisa', 'margaret', 'betty', 'sandra', 'ashley', 'dorothy', 'kimberly', 'emily', 'donna',
        'michelle', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'laura', 'sharon', 'cynthia',
        'kathleen', 'amy', 'angela', 'shirley', 'anna', 'brenda', 'pamela', 'emma', 'nicole', 'helen',
        'samantha', 'katherine', 'christine', 'debra', 'rachel', 'carolyn', 'janet', 'ruth', 'maria', 'heather',
        'olivia', 'ava', 'isabella', 'sophia', 'charlotte', 'mia', 'amelia', 'harper', 'evelyn', 'abigail'
    ];
    
    const lastNames = [
        'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis', 'rodriguez', 'martinez',
        'hernandez', 'lopez', 'gonzalez', 'wilson', 'anderson', 'thomas', 'taylor', 'moore', 'jackson', 'martin',
        'lee', 'perez', 'thompson', 'white', 'harris', 'sanchez', 'clark', 'ramirez', 'lewis', 'robinson',
        'walker', 'young', 'allen', 'king', 'wright', 'scott', 'torres', 'nguyen', 'hill', 'flores',
        'green', 'adams', 'nelson', 'baker', 'hall', 'rivera', 'campbell', 'mitchell', 'carter', 'roberts'
    ];
    
    const patterns = [
        // Pattern 1: FirstName + LastName + Digits (1-3)
        () => {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const digitLength = Math.floor(Math.random() * 3) + 1;
            let digits = '';
            
            if (digitLength === 1) digits = Math.floor(Math.random() * 10);
            else if (digitLength === 2) digits = Math.floor(10 + Math.random() * 90);
            else digits = Math.floor(100 + Math.random() * 900);
            
            return `${firstName}${lastName}${digits}`;
        },
        
        // Pattern 2: FirstName + Random word + Digits
        () => {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const randomWords = ['star', 'moon', 'sun', 'sky', 'tech', 'web', 'net', 'cloud', 'data', 'code'];
            const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];
            const digits = Math.floor(Math.random() * 1000);
            return `${firstName}${randomWord}${digits}`;
        },
        
        // Pattern 3: Two first names combined
        () => {
            const name1 = firstNames[Math.floor(Math.random() * firstNames.length)];
            const name2 = firstNames[Math.floor(Math.random() * firstNames.length)];
            const digits = Math.floor(Math.random() * 100);
            return `${name1}${name2}${digits}`;
        },
        
        // Pattern 4: Simple first name + 3-4 digits
        () => {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const digits = Math.floor(100 + Math.random() * 9000); // 100-9999
            return `${firstName}${digits}`;
        }
    ];
    
    // Randomly select a pattern
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    return pattern();
}

// Handle window resize
window.addEventListener('resize', function() {
    if (window.innerWidth >= 768) {
        // On desktop, ensure list view is visible
        document.getElementById('email-list-view').classList.remove('hidden');
    }
});

function updateLastEmailTime() {
    const savedSession = localStorage.getItem('tempMailSession');
    if (savedSession && currentEmail) {
        try {
            const session = JSON.parse(savedSession);
            session.lastEmailTime = Date.now();
            localStorage.setItem('tempMailSession', JSON.stringify(session));
        } catch (e) {
            console.error('Error updating last email time:', e);
        }
    }
}

// Update email times automatically
function updateEmailTimes() {
    const emailItems = document.querySelectorAll('.email-list-item');
    emailItems.forEach(item => {
        const timestamp = item.getAttribute('data-timestamp');
        const timeElement = item.querySelector('.email-time');
        if (timeElement && timestamp) {
            timeElement.textContent = formatTime(timestamp);
        }
    });
    
    // Also update the time in email content if an email is open
    const emailDateElement = document.getElementById('email-date');
    if (emailDateElement && emailDateElement.getAttribute('data-timestamp')) {
        emailDateElement.textContent = formatTime(emailDateElement.getAttribute('data-timestamp'));
    }
}

function showAccessModal() {
    console.log('📭 Showing access modal...');
    
    const modal = document.getElementById('access-modal');
    if (!modal) {
        console.error('❌ Access modal not found!');
        return;
    }
    
    window.accessModalOpening = false;

    // Reset modal state
    const resultDiv = document.getElementById('access-modal-result');
    const codeInput = document.getElementById('access-code-input-modal');
    
    if (resultDiv) {
        resultDiv.classList.add('hidden');
        resultDiv.innerHTML = '';
    }
    
    if (codeInput) {
        codeInput.value = '';
        codeInput.focus();
    }
    
    // Show modal
    modal.classList.remove('hidden');
    console.log('✅ Access modal opened');
}

function showAccessModalResult(message, type) {
    const resultDiv = document.getElementById('access-modal-result');
    if (!resultDiv) return;
    
    const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    
    resultDiv.innerHTML = message;
    resultDiv.className = `text-center mb-4 p-3 rounded-lg text-white font-medium ${bgColor}`;
    resultDiv.classList.remove('hidden');
}

// Local Storage Management for Access Codes
const ACCESS_CODES_STORAGE_KEY = 'tempMailAccessCodes';

function saveAccessCodeToLocalStorage(codeData) {
    try {
        const storedCodes = getAccessCodesFromLocalStorage();
        
        // Remove any existing code for the same email to prevent duplicates
        const filteredCodes = storedCodes.filter(c => c.email !== codeData.email);
        
        // Add new code
        filteredCodes.push({
            code: codeData.code,
            email: codeData.email,
            session_token: codeData.session_token,
            access_start_time: codeData.access_start_time,
            expires_at: codeData.expires_at,
            description: codeData.description || '',
            device_id: generateDeviceId(),
            created_at: new Date().toISOString()
        });
        
        localStorage.setItem(ACCESS_CODES_STORAGE_KEY, JSON.stringify(filteredCodes));
        console.log('💾 Access code saved to localStorage:', codeData.email);
    } catch (e) {
        console.error('Error saving access code to localStorage:', e);
    }
}

function getAccessCodesFromLocalStorage() {
    try {
        const stored = localStorage.getItem(ACCESS_CODES_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error reading access codes from localStorage:', e);
        return [];
    }
}

function getActiveAccessCodeForEmail(email) {
    const storedCodes = getAccessCodesFromLocalStorage();
    const currentDeviceId = generateDeviceId();
    const now = new Date();
    
    return storedCodes.find(code => {
        return code.email === email && 
               code.device_id === currentDeviceId &&
               new Date(code.expires_at) > now;
    });
}

function removeAccessCodeFromLocalStorage(email) {
    try {
        const storedCodes = getAccessCodesFromLocalStorage();
        const filteredCodes = storedCodes.filter(c => c.email !== email);
        localStorage.setItem(ACCESS_CODES_STORAGE_KEY, JSON.stringify(filteredCodes));
        console.log('🗑️ Access code removed from localStorage:', email);
    } catch (e) {
        console.error('Error removing access code from localStorage:', e);
    }
}

function generateDeviceId() {
    let deviceId = localStorage.getItem('tempMailDeviceId');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('tempMailDeviceId', deviceId);
    }
    return deviceId;
}

function leaveAccessMode() {
    console.log('🚪 Leaving access mode - switching to clean normal mode');
    
    showModal(
        'Leave Access Mode',
        'Switch to normal interface?<br><br><strong>Your access session will be saved.</strong> You can return anytime via the Access button.',
        function() {
            // ✅ Switch to normal mode but keep access session data
            isAccessMode = false;

             window.accessModalOpening = false;
            
            // Stop access mode timers
            if (window.accessCodeTimer) {
                clearInterval(window.accessCodeTimer);
                window.accessCodeTimer = null;
            }
            
            // Stop email refresh for access mode
            clearSessionIntervals();
            
            // Clear the current session from UI (but keep in localStorage)
            currentEmail = '';
            sessionToken = '';
            sessionStartTime = null;
            
            // ✅ FORCE SHOW EMAIL LIST VIEW (not email content view)
            showEmailList();

            // ✅ REMOVE ACCESS MODE COLOR  
            document.body.classList.remove('access-mode-active');
            
            // Hide access mode UI, show normal mode UI
            document.getElementById('access-mode-display').classList.add('hidden');
            document.getElementById('mail-creation-section').classList.remove('hidden');
            document.getElementById('mail-controls-section').classList.remove('hidden');
            
            // Reset email display to fresh state
            document.getElementById('email-display').classList.add('hidden');
            document.getElementById('end-session-btn').classList.add('hidden');
            document.getElementById('current-email').textContent = '';
            document.getElementById('email-count').textContent = '0 emails';
            document.getElementById('email-list').innerHTML = '';
            document.getElementById('no-emails-default').style.display = 'flex';
            
            // Reset email content view
            document.getElementById('desktop-email-placeholder').style.display = 'flex';
            document.getElementById('desktop-email-content-inner').classList.add('hidden');
            
            // ✅ REMOVE ACCESS MODE STYLES
            document.body.style.background = '';
            document.querySelector('main').style.background = '';
            
            // Reset page title
            document.title = 'TempMail - AMMZ';
            
            showNotification('✅ Switched to normal mode - Ready for new email', 'success');
            
            console.log('✅ Clean normal mode ready for new session');
        }
    );
}

function viewEmail(email, itemEl) {
    // Set active state on the clicked email item
    document.querySelectorAll('.email-list-item').forEach(el => {
        el.classList.remove('active', 'bg-blue-600', 'border-blue-500');
    });
    itemEl.classList.add('active', 'bg-blue-600', 'border-blue-500');
    
    // MOBILE: Switch to email content view
    if (window.innerWidth < 768) {
        showEmailContent();
        displayEmailInIframe(email, 'email');
    } 
    // DESKTOP: Update right panel
    else {
        document.getElementById('desktop-email-placeholder').style.display = 'none';
        document.getElementById('desktop-email-content-inner').classList.remove('hidden');
        displayEmailInIframe(email, 'desktop-email');
    }
}

function displayEmailInIframe(email, prefix) {
    const iframe = document.getElementById(`${prefix}-iframe`);
    const fallback = document.getElementById(`${prefix}-fallback`);
    
    // Set email metadata
    document.getElementById(`${prefix}-subject`).textContent = email.subject || 'No subject';
    document.getElementById(`${prefix}-from`).textContent = email.sender || 'Unknown';
    document.getElementById(`${prefix}-date`).textContent = formatTime(email.timestamp);
    
    // ✅ ALWAYS USE FALLBACK DIV - NEVER USE IFRAME
    iframe.classList.add('hidden');
    fallback.classList.remove('hidden');
    
    // Use the raw body content directly
    fallback.innerHTML = email.body || '<p class="text-gray-400 text-center py-8">No content available</p>';
    
    // Add click handlers for verification codes only
    setTimeout(() => {
        const verificationCodes = fallback.querySelectorAll('.bg-yellow-200, [class*="verification"], [class*="code"]');
        verificationCodes.forEach(codeElement => {
            const code = codeElement.textContent.trim();
            if (code && code.length >= 4 && code.length <= 8 && /^\d+$/.test(code)) {
                codeElement.style.cursor = 'pointer';
                codeElement.addEventListener('click', function() {
                    copyToClipboard(code);
                });
            }
        });
        
        // Make all links open in new tab
        const links = fallback.querySelectorAll('a');
        links.forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
    }, 100);
}



function prepareEmailForIframe(rawBody) {
    if (!rawBody || rawBody.trim() === '') {
        return {
            isHtml: false,
            content: '<p class="text-gray-400 text-center py-8">No content available</p>'
        };
    }
    
    const isHtml = /<[a-z][\s\S]*>/i.test(rawBody);
    
    // FIXED: Remove the illegal return and fix logic
    if (isHtml) {
        // Return raw HTML content
        return { 
            isHtml: false, 
            content: rawBody 
        };
    } else {
        const formattedText = formatPlainTextEmail(rawBody);
        return { 
            isHtml: false, 
            content: formattedText 
        };
    }
}

// Make sure this function exists
function formatPlainTextEmail(text) {
    if (!text) return '<p class="text-gray-400">No content</p>';
    
    let formatted = escapeHtml(text)
        .replace(/\n/g, '<br>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-blue-400 hover:underline">$1</a>');
    
    return `<div class="text-gray-200 leading-relaxed">${formatted}</div>`;
}

function showEmailContent() {
    document.getElementById('email-list-view').classList.add('hidden');
    document.getElementById('email-content-view').classList.remove('hidden');
    document.getElementById('header-title').textContent = 'Email';
    document.getElementById('back-to-list').classList.remove('hidden');
}

function showEmailList() {
    document.getElementById('email-list-view').classList.remove('hidden');
    document.getElementById('email-content-view').classList.add('hidden');
    document.getElementById('header-title').textContent = 'Inbox';
    document.getElementById('back-to-list').classList.add('hidden');
    
    // Also for desktop
    document.getElementById('desktop-email-placeholder').style.display = 'flex';
    document.getElementById('desktop-email-content-inner').classList.add('hidden');
}

function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    
    autoRefreshInterval = setInterval(() => {
        // Double-check we still have a valid session before refreshing
        if (currentEmail && sessionToken) {
            loadEmails();
        } else {
            // Session ended, stop refreshing
            console.log('🛑 Auto-refresh stopped: no active session');
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    }, 5000);
}

function startTimeUpdate() {
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
    }
    
    timeUpdateInterval = setInterval(() => {
        // Double-check we still have a valid session
        if (currentEmail && sessionToken) {
            updateEmailTimes();
        } else {
            // Session ended, stop time updates
            console.log('🛑 Time updates stopped: no active session');
            clearInterval(timeUpdateInterval);
            timeUpdateInterval = null;
        }
    }, 1000);
}


// Initialize Access Door
function setupAccessDoor() {
    // Remove any existing onclick handlers and use event listeners instead
    const accessDoorBtn = document.getElementById('access-door-btn');
    if (accessDoorBtn) {
        accessDoorBtn.onclick = null; // Remove old onclick
        accessDoorBtn.addEventListener('click', openAccessModal);
    }
    
    // Access Modal Event Listeners
    document.getElementById('access-modal-confirm').addEventListener('click', redeemAccessCodeFromModal);
    document.getElementById('access-modal-cancel').addEventListener('click', closeAccessModal);
    
    // Enter key in access code input
    document.getElementById('access-code-input-modal').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            redeemAccessCodeFromModal();
        }
    });
    
    // Auto-uppercase and clean input
    document.getElementById('access-code-input-modal').addEventListener('input', function(e) {
        this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
}

function closeAccessModal() {
    const modal = document.getElementById('access-modal');
    const resultDiv = document.getElementById('access-modal-result');
    
    window.accessModalOpening = false;

    if (modal) {
        modal.classList.add('hidden');
    }
    if (resultDiv) {
        resultDiv.classList.add('hidden');
        resultDiv.innerHTML = '';
    }
    
    // Also clear the input field
    const codeInput = document.getElementById('access-code-input-modal');
    if (codeInput) {
        codeInput.value = '';
    }
    
    console.log('✅ Access modal closed');
}

function redeemAccessCodeFromModal() {
    const codeInput = document.getElementById('access-code-input-modal');
    const resultDiv = document.getElementById('access-modal-result');
    const confirmBtn = document.getElementById('access-modal-confirm');
    
    if (!codeInput || !resultDiv || !confirmBtn) {
        console.error('Access modal elements not found');
        return;
    }
    
    const code = codeInput.value.trim().toUpperCase();
    const deviceId = getOrCreateDeviceId(); 
    
    if (!code) {
        showAccessModalResult('❌ Please enter an access code', 'error');
        return;
    }
    
    // Show loading state
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Checking...';
    confirmBtn.disabled = true;
    
    // ✅ FIX: Clear any existing session before redeeming new code
    if (currentEmail && sessionToken) {
        console.log('🔄 Clearing existing session before redeeming new access code');
        clearSession();
    }
    
    fetch(API_URL + '/api/access-codes/redeem', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            code: code,
            device_id: deviceId
        })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(errorData => {
                throw new Error(errorData.error || `HTTP ${res.status}`);
            });
        }
        return res.json();
    })
    .then(data => {
        if (data.success) {
            
            // ✅ Remove any expired session data for this email first
            removeAccessCodeFromLocalStorage(data.email);
            
            // ✅ Save the new access code session
            saveAccessCodeToLocalStorage(data);
            
            showAccessModalResult(`✅ Success! Access granted to: ${data.email}`, 'success');
            
            
            // ✅ Close modal after successful redemption
            setTimeout(() => {
                closeAccessModal();
                activateAccessMode(data);
            }, 1500);
            
        } else {
            showAccessModalResult(`❌ ${data.error}`, 'error');
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    })
    .catch(err => {
        console.error('Error redeeming access code:', err);

        let errorMessage = err.message || 'Network error - please try again';
        if (err.message.includes('ACCESS_CODE_REVOKED')) {
            errorMessage = 'This access code has been revoked by admin';
        } else if (err.message.includes('ACCESS_CODE_EXPIRED')) {
            errorMessage = 'This access code has expired';
        } else if (err.message.includes('ACCESS_CODE_USED_UP')) {
            errorMessage = 'This access code has been used up';
        } else if (err.message.includes('currently in use')) {
            errorMessage = 'This email address is currently in use by another session';
        }else if (err.message.includes('ACCESS_DENIED_DEVICE_BANNED')) {
            errorMessage = 'Your device has been banned from using this service';
            showBannedScreen();
            return // Show banned screen
        }
        
        showAccessModalResult(`❌ ${errorMessage}`, 'error');
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    });
}

function handleRevokedAccessCode(email) {
    console.log(`🔐 Handling revoked access code for: ${email}`);
    
    // Remove from localStorage
    removeAccessCodeFromLocalStorage(email);
    
    // Clear any active session
    if (currentEmail === email) {
        clearSession();
    }
    
    // Show notification
    showNotification('🔐 Access code has been revoked', 'error');
}

function activateAccessMode(data) {
    isAccessMode = true;
    accessStartTime = new Date(data.access_start_time);
    currentEmail = data.email;
    sessionToken = data.session_token;
    sessionStartTime = Date.now();
    
    console.log('🔐 Access mode activated:', currentEmail);
    
    // ✅ FIX: Hide modal FIRST
    closeAccessModal();
    
    // Show/hide description section based on data
    const descriptionSection = document.getElementById('access-description-section');
    const descriptionText = document.getElementById('access-description-text');
    
    if (data.description && data.description.trim() !== '') {
        descriptionText.textContent = data.description;
        descriptionSection.classList.remove('hidden');
    } else {
        descriptionSection.classList.add('hidden');
    }

    // ✅ Show only access mode UI, hide normal mode
    document.getElementById('access-mode-display').classList.remove('hidden');
    document.getElementById('mail-creation-section').classList.add('hidden');
    document.getElementById('mail-controls-section').classList.add('hidden');
    
    document.getElementById('access-email-display').textContent = currentEmail;
    document.getElementById('current-email').innerHTML = `
        ${currentEmail} 
        <span class="bg-blue-500 text-white px-2 py-1 rounded text-xs ml-2">ACCESS CODE</span>
    `;
    document.getElementById('email-display').classList.remove('hidden');
    document.getElementById('end-session-btn').classList.remove('hidden');
    
    // Use the backend expiration time directly
    const backendExpiresAt = data.expires_at;
    startAccessCodeTimer(backendExpiresAt);
    
    // Save session properly
    saveSession();
    
    loadEmails();
    startAutoRefresh();
    startTimeUpdate();
    setupSessionExpiration();
    
    if (data.description) {
        showNotification(`🔐 ${data.description}`, 'info');
    }
}

function startAccessCodeTimer(expiresAt) {
    const updateTimer = () => {
        const timeRemaining = getAccessCodeTimeRemaining(expiresAt);
        document.getElementById('access-expire-time').textContent = timeRemaining;
        
        if (timeRemaining === 'Expired') {
            clearInterval(timerInterval);
        }
    };
    
    updateTimer(); // Run immediately
    const timerInterval = setInterval(updateTimer, 60000); // Update every minute
}

// Add this function to your main app JavaScript
function getTimeRemaining(expiresAt) {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
}


function updateAccessExpiration(expiresAt) {
    const expireDate = new Date(expiresAt);
    const updateTimer = () => {
        const now = new Date();
        const diff = expireDate - now;
        
        if (diff <= 0) {
            document.getElementById('access-expire-time').textContent = 'Expired';
            return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById('access-expire-time').textContent = `${hours}h ${minutes}m`;
    };
    
    updateTimer();
    setInterval(updateTimer, 60000); // Update every minute
}

function copyAccessEmail() {
    const email = document.getElementById('access-email-display').textContent;
    navigator.clipboard.writeText(email);
    showNotification('📋 Email copied to clipboard!', 'success');
}


// Clear session intervals (helper function)
function clearSessionIntervals() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
    }
}


function setupAMMZDoor() {
    const ammzElements = document.querySelectorAll('.text-yellow-300');
    
    ammzElements.forEach((el) => {
        if (el.textContent === 'AMMZ' && el.closest('marquee')) {
            console.log('✅ Setting up AMMZ door');
            el.title = 'Click to enter Admin Mode';
            el.classList.add('hover:underline', 'transition-all', 'duration-200');
            el.style.cursor = 'pointer';
            
            // Remove any existing listeners first
            el.replaceWith(el.cloneNode(true));
            const newEl = document.querySelector('.text-yellow-300[title="Click to enter Admin Mode"]');
            
            // Add click event
            newEl.addEventListener('click', function(e) {
                console.log('🎯 AMMZ door clicked!');
                e.preventDefault();
                e.stopPropagation();
                toggleAdminMode();
            });
        }
    });
}



function endSession() {
    console.log('🛑 Ending session...');
    
    // Save current session data for backend call BEFORE clearing
    const endEmail = currentEmail;
    const endToken = sessionToken;

    // Clear frontend state immediately
    currentEmail = '';
    sessionToken = '';
    sessionStartTime = null;
    
    // Clear localStorage
    localStorage.removeItem('tempMailSession');
    
    // Stop all refresh intervals
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('✅ Auto-refresh stopped');
    }
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
        console.log('✅ Time update stopped');
    }
    
    // Clear any session expiration timeout
    if (window.sessionExpirationTimeout) {
        clearTimeout(window.sessionExpirationTimeout);
        window.sessionExpirationTimeout = null;
        console.log('✅ Session expiration timer stopped');
    }
    
    // Clear any pending email fetch requests
    if (window.emailFetchController) {
        window.emailFetchController.abort();
        window.emailFetchController = null;
        console.log('✅ Pending requests cancelled');
    }
    
    // Reset UI immediately
    document.getElementById('username-input').value = '';
    document.getElementById('domain-select').selectedIndex = 0;
    document.getElementById('email-display').classList.add('hidden');
    document.getElementById('end-session-btn').classList.add('hidden');
    document.getElementById('email-count').textContent = '0 emails';
    document.getElementById('email-list').innerHTML = '';
    document.getElementById('no-emails-default').style.display = 'flex';
    
    // Reset email view
    document.getElementById('desktop-email-placeholder').style.display = 'flex';
    document.getElementById('desktop-email-content-inner').classList.add('hidden');
    
    // Reset title
    document.title = 'TempMail - AMMZ';
    
    console.log('✅ Frontend session cleared');

    // Notify backend to end session (fire and forget - don't wait for response)
    if (endEmail && endToken) {
        console.log('📡 Notifying backend to end session...');
        fetch(API_URL + '/api/session/end', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_token: endToken,
                email_address: endEmail
            })
        })
        .then(res => {
            if (!res.ok) {
                console.log('⚠️ Backend session end failed, but continuing');
            } else {
                console.log('✅ Backend session ended');
            }
            return res.json();
        })
        .then(data => {
            console.log('✅ Backend confirmed session end');
        })
        .catch(err => {
            console.log('❌ Backend session end error (ignoring):', err);
        })
        .finally(() => {
            // Show success notification WITHOUT reloading the page
            showNotification('✅ Session ended successfully', 'success');
            console.log('🎯 Session end process complete - NO PAGE RELOAD');
        });
    } else {
        // No session data, just show success
        showNotification('✅ Session cleared', 'success');
        console.log('🎯 Session cleared - NO PAGE RELOAD');
    }
}

function toggleAdminMode() {
    console.log('Toggle admin mode, current:', isAdminMode);
    
    if (!isAdminMode) {
        // Simple approach for now - just show password modal
        showPasswordModal();
    } else {
        // Leaving admin mode
        fetch('/api/admin/logout', {
            method: 'POST',
            credentials: 'include'
        }).then(() => {
            deactivateAdminMode();
        }).catch(() => {
            deactivateAdminMode();
        });
    }
}

// Add this function
function clearAdminSessions() {
    fetch('/api/admin/clear-sessions', {
        method: 'POST',
        credentials: 'include'
    }).catch(err => console.log('Admin sessions cleared'));
}

function showPasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 glass-effect">
            <div class="text-center mb-6">
                <i class="fas fa-shield-alt text-3xl text-yellow-400 mb-3"></i>
                <h3 class="text-xl font-bold text-white mb-2">Admin Access</h3>
                <p class="text-gray-300">Enter admin password to continue</p>
            </div>
            <input type="password" id="admin-password-input" 
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white mb-4 focus:outline-none focus:border-yellow-400" 
                   placeholder="Enter password">
            <div class="flex gap-3">
                <button onclick="closePasswordModal()" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors">
                    Cancel
                </button>
                <button onclick="verifyAdminPassword()" class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg transition-colors font-semibold">
                    Verify
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Focus input and handle Enter key
    const input = document.getElementById('admin-password-input');
    input.focus();
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') verifyAdminPassword();
    });
}

function closePasswordModal() {
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) modal.remove();
}

async function verifyAdminPassword() {
    const password = document.getElementById('admin-password-input').value;
    if (!password) {
        alert('❌ Please enter a password');
        return;
    }
    
    try {
        const response = await fetch('/api/verify-admin', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include',
            body: JSON.stringify({password: password})
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                closePasswordModal();
                activateAdminMode();
            } else {
                alert('❌ Invalid password');
            }
        } else {
            const error = await response.json();
            alert('❌ ' + (error.error || 'Verification failed'));
        }
    } catch (error) {
        console.error('Admin login error:', error);
        alert('❌ Connection error');
    }
}

function activateAdminMode() {
    isAdminMode = true;
    
    // Clear any existing session when entering admin mode
    clearSession();
    
    // Change UI colors
    document.body.classList.add('admin-mode');
    document.querySelector('header').classList.add('admin-header');
    
    // Fix icon size and text alignment
    const header = document.querySelector('h1');
    header.innerHTML = '<i class="fas fa-shield-alt text-xl md:text-3xl mr-2 md:mr-3"></i><span class="text-xl md:text-4xl lg:text-5xl font-bold">ADMIN MODE - TempMail</span>';
    header.classList.add('admin-text');
    
    // Update the subtitle
    const subtitle = document.querySelector('header p');
    if (subtitle) {
        subtitle.innerHTML = '<span class="admin-text">Admin Mode Active - Blacklist Bypass Enabled</span>';
    }
    
    showNotification('🔓 Admin Mode Activated - Session cleared', 'success');
}

function deactivateAdminMode() {
    isAdminMode = false;
    
    // ✅ Use clearSession instead of custom logic to ensure intervals are cleared
    clearSession();
    
    // Force logout from admin backend
    fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
    }).catch(err => console.log('Admin logout completed'));
    
    // Restore normal UI
    document.body.classList.remove('admin-mode');
    const header = document.querySelector('header');
    if (header) header.classList.remove('admin-header');
    
    // Restore original header
    const h1 = document.querySelector('h1');
    if (h1) {
        h1.innerHTML = '<i class="fas fa-envelope text-xl md:text-3xl mr-2 md:mr-3"></i><span class="text-xl md:text-4xl lg:text-5xl font-bold">Secure TempMail By AMMZ</span>';
        h1.classList.remove('admin-text');
    }
    
    // Restore original subtitle
    const subtitle = document.querySelector('header p');
    if (subtitle) {
        subtitle.textContent = 'Disposable email addresses';
        subtitle.classList.remove('admin-text');
    }
    
    showNotification('🔓 Admin Mode Deactivated', 'success');
    
    // Force page reload after a short delay to ensure clean state
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// Enhanced session validation
function validateCurrentSession() {
    if (!currentEmail || !sessionToken) return false;
    
    // Check if session is expired
    if (sessionStartTime) {
        const sessionAge = Date.now() - sessionStartTime;
        if (sessionAge > SESSION_TIMEOUT) {
            console.log('Session expired, clearing...');
            clearSession();
            return false;
        }
    }
    
    return true;
}


function initApp() {
    function displayDeviceIdForDebug() {
    const deviceId = getOrCreateDeviceId();
    console.log('🔍 Current Device ID:', deviceId);
}
    
    console.log('🚀 Initializing app...');
    
    setupAccessDoor();

    function displayDeviceIdForDebug() {
    const deviceId = getOrCreateDeviceId();
    console.log('🔍 Current Device ID:', deviceId);
    
    // Optional: Show in UI for debugging
    const debugElement = document.createElement('div');
    debugElement.style.position = 'fixed';
    debugElement.style.bottom = '10px';
    debugElement.style.right = '10px';
    debugElement.style.background = 'rgba(0,0,0,0.8)';
    debugElement.style.color = 'white';
    debugElement.style.padding = '5px';
    debugElement.style.fontSize = '10px';
    debugElement.style.zIndex = '9999';
    debugElement.style.borderRadius = '5px';
    debugElement.textContent = `Device: ${deviceId.substring(0, 10)}...`;
    debugElement.title = deviceId;
    document.body.appendChild(debugElement);
}
    
    // Initialize app
    loadDomains().then(() => {
        console.log('✅ Domains loaded');
        
        // ✅ Check for access code sessions FIRST
        const savedAccessCodes = getAccessCodesFromLocalStorage();
        const currentDeviceId = generateDeviceId();
        const now = new Date();
        
        const activeAccessSession = savedAccessCodes.find(accessCode => {
            return accessCode.device_id === currentDeviceId && 
                   new Date(accessCode.expires_at) > now;
        });
        
        if (activeAccessSession) {
            console.log('🔐 Active access session found on page load');
            // Don't auto-restore here - let user click Access button
        } else {
            // Try to restore normal session
            if (!loadSession()) {
                console.log('ℹ️ No valid session found or restored');
                clearSession();
            }
        }
    }).catch(err => {
        console.error('❌ Error loading domains:', err);
        if (!loadSession()) {
            clearSession();
        }
    });
    
    // Set up periodic session validation
    setInterval(validateCurrentSession, 30000);
}

function setupEventListeners() {
    // Create button
    document.getElementById('create-btn').addEventListener('click', function() {
        const btn = this;
        const username = document.getElementById('username-input').value.trim();
        
        if (!username) {
            showNotification('❌ Please enter a username', 'error');
            document.getElementById('username-input').focus();
            return;
        }
        
        // Validate username format
        if (!/^[a-zA-Z0-9-_]+$/.test(username)) {
            showNotification('❌ Username can only contain letters, numbers, hyphens, and underscores', 'error');
            document.getElementById('username-input').classList.add('border-red-500');
            document.getElementById('username-input').focus();
            return;
        }
        
        // 🚨 IMMEDIATELY show loading state
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        
        // ✅ END CURRENT SESSION before creating new one
        endCurrentSessionForNewEmail().then(() => {
            // After ending current session, create new email
            createEmail(username);
        }).catch(err => {
            console.error('Error ending session:', err);
            // Still try to create new email even if ending fails
            createEmail(username);
        });
    });

    // Enter key in username field - works exactly like Create button
    document.getElementById('username-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            const username = document.getElementById('username-input').value.trim();
            
            if (!username) {
                showNotification('❌ Please enter a username', 'error');
                document.getElementById('username-input').focus();
                return;
            }
            
            if (!/^[a-zA-Z0-9-_]+$/.test(username)) {
                showNotification('❌ Username can only contain letters, numbers, hyphens, and underscores', 'error');
                document.getElementById('username-input').classList.add('border-red-500');
                document.getElementById('username-input').focus();
                return;
            }
            
            createEmail(username);
        }
    });
    
    // Random email button
    document.getElementById('big-random-btn').addEventListener('click', function() {
        const btn = this;
        console.log('🎲 Random button clicked - checking current session...');
        
        // 🚨 IMMEDIATELY show loading state
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        
        // If there's an active session, end it first
        if (currentEmail && sessionToken) {
            console.log('🔄 Ending current session before creating new one...');
            
            endSessionForNewEmail().then(() => {
                console.log('✅ Current session ended, now creating new email...');
                
                const randomUsername = generateRandomUsername();
                document.getElementById('username-input').value = randomUsername;
                
                createEmail(randomUsername);
                
            }).catch(err => {
                console.error('❌ Error ending session:', err);
                
                const randomUsername = generateRandomUsername();
                document.getElementById('username-input').value = randomUsername;
                
                createEmail(randomUsername);

            });
            
        } else {
            console.log('📭 No active session, creating new email directly...');
            
            const randomUsername = generateRandomUsername();
            document.getElementById('username-input').value = randomUsername;
            
            setTimeout(() => {
                createEmail(randomUsername);
            }, 10);
        }
    });
    
    // Copy button
    document.getElementById('copy-btn').addEventListener('click', function() {
        if (!currentEmail) {
            showNotification('❌ No email to copy', 'error');
            return;
        }
        
        navigator.clipboard.writeText(currentEmail).then(function() {
            showNotification('✅ Email copied to clipboard', 'success');
        }).catch(function() {
            const textArea = document.createElement('textarea');
            textArea.value = currentEmail;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('✅ Email copied to clipboard', 'success');
        });
    });
    
    // End session button
    document.getElementById('end-session-btn').addEventListener('click', function() {
        showModal(
            'End Session',
            'Are you sure you want to end this session? All emails will be cleared.',
            function() {
                console.log('🎯 User confirmed session end');
                endSession();
            }
        );
    });

    // ✅ ACCESS BUTTON - This was missing!
    document.getElementById('access-door-btn').addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔑 Access door button clicked');
        openAccessModal();
    });

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', function() {
        if (currentEmail && sessionToken) {
            loadEmails();
            showNotification('🔄 Refreshing inbox...', 'info');
        } else {
            showNotification('❌ No active session', 'error');
        }
    });
    
    // Back to list button (mobile)
    document.getElementById('back-to-list').addEventListener('click', function() {
        showEmailList();
    });
    
    // Clear username error when typing
    document.getElementById('username-input').addEventListener('input', function() {
        this.classList.remove('border-red-500');
    });
    
    // Admin mode keyboard shortcut (Ctrl+Alt+A)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.altKey && e.key === 'a') {
            e.preventDefault();
            toggleAdminMode();
        }
    });
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && currentEmail) {
            loadEmails();
        }
    });

    // ✅ AMMZ DOOR Setup - This was also missing!
    setupAMMZDoor();
}

function endSessionForNewEmail() {
    return new Promise((resolve, reject) => {
        console.log('🔄 Ending session for new email creation...');
        
        // Save current session data for backend call
        const endEmail = currentEmail;
        const endToken = sessionToken;

        // Clear frontend state immediately
        currentEmail = '';
        sessionToken = '';
        sessionStartTime = null;
        
        // Clear localStorage
        localStorage.removeItem('tempMailSession');
        
        // Stop all refresh intervals
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
        if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
            timeUpdateInterval = null;
        }
        
        // Clear any session expiration timeout
        if (window.sessionExpirationTimeout) {
            clearTimeout(window.sessionExpirationTimeout);
            window.sessionExpirationTimeout = null;
        }
        
        // Clear any pending email fetch requests
        if (window.emailFetchController) {
            window.emailFetchController.abort();
            window.emailFetchController = null;
        }
        
        // Reset UI immediately
        document.getElementById('username-input').value = '';
        document.getElementById('domain-select').selectedIndex = 0;
        document.getElementById('email-display').classList.add('hidden');
        document.getElementById('end-session-btn').classList.add('hidden');
        document.getElementById('email-count').textContent = '0 emails';
        document.getElementById('email-list').innerHTML = '';
        document.getElementById('no-emails-default').style.display = 'flex';
        
        // Reset email view
        document.getElementById('desktop-email-placeholder').style.display = 'flex';
        document.getElementById('desktop-email-content-inner').classList.add('hidden');
        
        // Reset title
        document.title = 'TempMail - AMMZ';
        
        console.log('✅ Frontend session cleared for new email');

        // Notify backend to end session
        if (endEmail && endToken) {
            console.log('📡 Notifying backend to end previous session...');
            fetch(API_URL + '/api/session/end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_token: endToken,
                    email_address: endEmail
                })
            })
            .then(res => {
                if (!res.ok) {
                    console.log('⚠️ Backend session end failed, but continuing');
                } else {
                    console.log('✅ Backend session ended');
                }
                return res.json();
            })
            .then(data => {
                console.log('✅ Backend confirmed session end');
                resolve(); // Resolve the promise to continue
            })
            .catch(err => {
                console.log('❌ Backend session end error (ignoring):', err);
                resolve(); // Still resolve to continue creation
            });
        } else {
            // No session to end, just resolve
            console.log('📭 No backend session to end');
            resolve();
        }
    });
}
