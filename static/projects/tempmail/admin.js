var API_URL = window.location.origin;
var selectedAddress = null;
var autoRefreshInterval = null;
var DOMAIN = 'aungmyomyatzaw.online';
var currentViewingEmail = null;

// Stop refresh loop - check if we're already trying to login
let loginAttemptInProgress = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🛑 Admin panel loaded - NO AUTO-REFRESH');

        // Clear any client-side session indicators
    localStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminAuthenticated');
    
    // Set up ALL event listeners here
        const randomButtons = document.querySelectorAll('button[id*="random"], button[onclick*="random"], button[class*="random"]');
    randomButtons.forEach(btn => {
        console.log('Removing random button:', btn);
        btn.remove();
    });
    
    // Also remove any random generator inputs
    const randomInputs = document.querySelectorAll('input[placeholder*="random"], input[id*="random"]');
    randomInputs.forEach(input => input.remove());
    
    // Prevent multiple clicks on generate button
    const generateBtn = document.querySelector('button[onclick="generateAccessCode()"]');
    if (generateBtn) {
        let isGenerating = false;
        generateBtn.addEventListener('click', function(e) {
            if (isGenerating) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            isGenerating = true;
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Generating...';
            
            setTimeout(() => {
                isGenerating = false;
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-plus mr-1"></i> Generate Access Code';
            }, 3000);
        });
    }
    document.getElementById('admin-login-btn').addEventListener('click', adminLogin);
    document.getElementById('admin-password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') adminLogin();
    });
    document.getElementById('logout-btn').addEventListener('click', adminLogout);
    document.getElementById('admin-back-btn').addEventListener('click', showAdminEmailList);
    document.getElementById('admin-delete-email-btn').addEventListener('click', deleteCurrentEmail);
    
    // Enhanced search functionality
    const searchInput = document.getElementById('email-search');
    if (searchInput) {
        searchInput.addEventListener('input', searchEmails);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchEmails();
            }
        });
    }
    showLoginScreen();
    // ONLY check admin status - NO data loading until logged in
    checkAdminStatus();
});

function checkAdminStatus() {
    console.log('🔐 Checking admin authentication status...');
    
    // FORCE LOGIN SCREEN - Always show login regardless of backend status
    console.log('🛑 Forcing login screen display');
    showLoginScreen();
    
    // Optional: Still check backend but don't auto-login
    fetch(`${API_URL}/api/admin/status`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Cache-Control': 'no-cache'
        }
    })
    .then(res => {
        console.log('Admin status response:', res.status);
        return res.json();
    })
    .then(data => {
        console.log('Admin status data (for info only):', data);
        // Don't auto-login even if backend says authenticated
        // showLoginScreen(); // Already called above
    })
    .catch(err => {
        console.log('Admin status check failed:', err.message);
        showLoginScreen();
    });
}




function showLoginScreen() {
    console.log('🛑 FORCING login screen display');
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-dashboard').style.display = 'none';
    
    // Clear any password field and errors
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-login-error').style.display = 'none';
    
    // Focus on password field
    setTimeout(() => {
        document.getElementById('admin-password').focus();
    }, 100);
}

function showAdminDashboard() {
    console.log('🔄 Loading admin dashboard with all data...');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    
    // Load all admin data
    loadStats();
    loadAddresses();
    loadActiveSessions();
    loadAccessCodes();
    loadBlacklist();
    loadDomainsForAdmin();
    loadDeviceData(); 
    
    // Start auto-refresh and countdown
    startAutoRefresh();
    startAccessCodeCountdown();
    
    showNotification('✅ Admin dashboard loaded successfully', 'success');
}

function startAccessCodeCountdown() {
    setInterval(() => {
        // Update all active access code displays
        document.querySelectorAll('[data-expires-at]').forEach(element => {
            const expiresAt = element.getAttribute('data-expires-at');
            if (expiresAt) {
                const timeRemaining = getTimeRemaining(expiresAt);
                element.textContent = timeRemaining;
                
                // Update status if expired
                if (timeRemaining === 'Expired') {
                    const statusElement = element.closest('.access-code-item').querySelector('.status-badge');
                    if (statusElement) {
                        statusElement.innerHTML = '<span class="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">Expired</span>';
                    }
                }
            }
        });
    }, 60000); // Update every minute
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function loadBlacklist() {
    fetch(`${API_URL}/api/admin/blacklist`, {
        credentials: 'include'
    })
    .then(res => {
        if (res.status === 401) {
            location.reload();
            return;
        }
        return res.json();
    })
    .then(data => {
        const blacklistEl = document.getElementById('blacklist-list');
        
        if (!data || data.error) {
            blacklistEl.innerHTML = '<p class="text-red-400 text-center py-8">Error loading blacklist</p>';
            return;
        }
        
        if (!data.blacklist || data.blacklist.length === 0) {
            blacklistEl.innerHTML = '<p class="text-gray-400 text-center py-8">No blacklisted usernames</p>';
            return;
        }
        
        blacklistEl.innerHTML = '';
        
        // Sort blacklist by added_at (newest first)
        const sortedBlacklist = data.blacklist.sort((a, b) => {
            const timeA = a.added_at ? new Date(a.added_at) : new Date(0);
            const timeB = b.added_at ? new Date(b.added_at) : new Date(0);
            return timeB - timeA;
        });
        
        sortedBlacklist.forEach(item => {
            let username;
            let addedAt;
            
            if (typeof item === 'string') {
                username = item;
                addedAt = null;
            } else if (typeof item === 'object' && item !== null) {
                username = item.username || item.name || item.value || String(item);
                addedAt = item.added_at;
            } else {
                username = String(item);
                addedAt = null;
            }
            
            const addedTime = addedAt ? formatTimeDetailed(addedAt) : 'unknown';
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'bg-gray-800 p-3 rounded-lg border border-red-500 flex justify-between items-center blacklisted-item';
            itemDiv.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-ban text-red-400 mr-3"></i>
                    <div>
                        <span class="text-white font-semibold text-sm">${escapeHtml(username)}</span>
                        <span class="text-xs text-gray-400 ml-2">@${DOMAIN}</span>
                        <div class="text-xs text-gray-500 mt-1">
                            ${item.added_by ? `by ${escapeHtml(item.added_by)} • ` : ''}${addedTime}
                        </div>
                    </div>
                </div>
                <button onclick="removeFromBlacklist('${escapeHtml(username)}')" 
                        class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center"
                        title="Remove from blacklist">
                    <i class="fas fa-times mr-1"></i>Remove
                </button>
            `;
            blacklistEl.appendChild(itemDiv);
        });
    })
    .catch(err => {
        console.error('Error loading blacklist:', err);
        document.getElementById('blacklist-list').innerHTML = 
            '<p class="text-red-400 text-center py-8">Failed to load blacklist</p>';
    });
}

// Delete all emails for address - ENDS sessions
function deleteAddress(address) {
    showModal(
        'Delete All Emails',
        `Are you sure you want to delete ALL emails for <strong>${escapeHtml(address)}</strong>?<br><br>This action cannot be undone and will permanently remove all emails for this address. All active sessions for this address will be ended.`,
        function() {
            fetch(API_URL + '/api/admin/delete-address/' + encodeURIComponent(address), {
                method: 'DELETE',
                credentials: 'include'
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    // Also end any active sessions for this address
                    endSessionsForAddress(address);
                    
                    loadAddresses();
                    loadStats();
                    document.getElementById('email-details').innerHTML = '<p class="text-gray-400 text-center py-8">Select an email address to view emails</p>';
                    document.getElementById('selected-address').textContent = 'None selected';
                    document.getElementById('email-count-badge').classList.add('hidden');
                    showNotification('✅ All emails deleted and sessions ended for ' + address, 'success');
                } else {
                    showNotification('❌ Failed to delete emails', 'error');
                }
            })
            .catch(err => {
                console.error('Error deleting address:', err);
                showNotification('❌ Error deleting emails', 'error');
            });
        }
    );
}

// Function to end sessions for a specific address
function endSessionsForAddress(emailAddress) {
    fetch(API_URL + '/api/admin/end-sessions/' + encodeURIComponent(emailAddress), {
        method: 'POST',
        credentials: 'include'
    })
    .then(res => {
        if (res.ok) {
            console.log(`✅ Sessions ended for ${emailAddress}`);
        }
    })
    .catch(err => {
        console.error('Error ending sessions:', err);
    });
}

// Add detailed time formatting function
function formatTimeDetailed(timestamp) {
    if (!timestamp) return 'unknown';
    
    try {
        let date;
        if (typeof timestamp === 'string') {
            const cleanTimestamp = timestamp.replace(/[\+\-]\d{2}:?\d{2}$/, '');
            date = new Date(cleanTimestamp + 'Z');
            
            if (isNaN(date.getTime())) {
                date = new Date(timestamp);
            }
        } else {
            date = new Date(timestamp);
        }
        
        if (isNaN(date.getTime())) {
            return 'unknown';
        }
        
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes} min ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
    } catch (e) {
        console.error('Error formatting detailed time:', e);
        return 'unknown';
    }
}



// Add this new function for access code creation times
function formatAccessCodeTime(timestamp) {
    try {
        let date;
        
        if (typeof timestamp === 'string') {
            // Parse the timestamp directly without timezone manipulation
            date = new Date(timestamp);
        } else {
            return 'recently';
        }
        
        if (isNaN(date.getTime())) {
            return 'recently';
        }
        date = new Date(date.getTime() + (6.5 * 60 * 60 * 1000));

        // Use server time directly without Myanmar conversion
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        // Return relative time (same logic but no timezone conversion)
        if (seconds < 60) return 'just now';
        if (minutes < 60) return minutes + ' min ago';
        if (hours < 24) return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
        if (days < 7) return days + ' day' + (days > 1 ? 's' : '') + ' ago';
        
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
    } catch (e) {
        console.error('Error formatting access code time:', e);
        return 'recently';
    }
}

function addToBlacklist() {
    var usernameInput = document.getElementById('new-blacklist-username');
    var username = usernameInput.value.trim().toLowerCase();
    
    if (!username) {
        showNotification('❌ Please enter a username', 'error');
        return;
    }
    
    if (!/^[a-zA-Z0-9-_]+$/.test(username)) {
        showNotification('❌ Username can only contain letters, numbers, hyphens, and underscores', 'error');
        return;
    }
    

    showModal(
        'Add to Blacklist',
        `Are you sure you want to blacklist the username "<strong>${escapeHtml(username)}</strong>"?<br><br>This will prevent all users from using this username.`,
        function() {
            fetch(API_URL + '/api/admin/blacklist', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({username: username})
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showNotification(`✅ ${data.message}`, 'success');
                    usernameInput.value = '';
                    loadBlacklist();
                } else {
                    showNotification(`❌ ${data.error || 'Failed to add to blacklist'}`, 'error');
                }
            })
            .catch(err => {
                console.error('Error adding to blacklist:', err);
                showNotification('❌ Error adding to blacklist', 'error');
            });
        }
    );
}

function removeFromBlacklist(username) {
    showModal(
        'Remove from Blacklist',
        `Are you sure you want to remove "<strong>${escapeHtml(username)}</strong>" from the blacklist?<br><br>Users will be able to use this username again.`,
        function() {
            fetch(API_URL + '/api/admin/blacklist/' + encodeURIComponent(username), {
                method: 'DELETE',
                credentials: 'include'
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showNotification(`✅ ${data.message}`, 'success');
                    loadBlacklist();
                } else {
                    showNotification(`❌ ${data.error || 'Failed to remove from blacklist'}`, 'error');
                }
            })
            .catch(err => {
                console.error('Error removing from blacklist:', err);
                showNotification('❌ Error removing from blacklist', 'error');
            });
        }
    );
}

// Device Management Functions
function loadBannedDevices() {
    fetch(`${API_URL}/api/admin/banned-devices`, {
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        const list = document.getElementById('banned-devices-list');
        
        if (!data || data.error || !data.banned_devices || data.banned_devices.length === 0) {
            list.innerHTML = '<p class="text-gray-400 text-center py-4">No banned devices</p>';
            return;
        }
        
        list.innerHTML = '';
        
        data.banned_devices.forEach(device => {
            const item = document.createElement('div');
            item.className = 'bg-red-900/20 border border-red-500 rounded-lg p-3 flex justify-between items-center';
            item.innerHTML = `
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <i class="fas fa-laptop text-red-400"></i>
                        <code class="text-white font-mono text-sm break-all">${device.device_id}</code>
                        ${device.is_active ? 
                            '<span class="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">Banned</span>' : 
                            '<span class="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">Unbanned</span>'
                        }
                    </div>
                    <div class="text-xs text-gray-400">
                        <div>Banned by: ${device.banned_by} • ${formatTime(device.banned_at)}</div>
                        ${device.reason ? `<div>Reason: ${escapeHtml(device.reason)}</div>` : ''}
                    </div>
                </div>
                ${device.is_active ? `
                    <button onclick="unbanDevice('${device.device_id}')" 
                            class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors ml-3 flex items-center"
                            title="Unban Device">
                        <i class="fas fa-unlock mr-1"></i> Unban
                    </button>
                ` : ''}
            `;
            list.appendChild(item);
        });
    })
    .catch(err => {
        console.error('Error loading banned devices:', err);
        document.getElementById('banned-devices-list').innerHTML = 
            '<p class="text-red-400 text-center py-4">Failed to load banned devices</p>';
    });
}

function loadDeviceSessions() {
    fetch(`${API_URL}/api/admin/device-sessions`, { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
        const list = document.getElementById('device-sessions-list');
        
        if (!data || data.error || !data.device_sessions || data.device_sessions.length === 0) {
            list.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fas fa-mobile-alt text-3xl mb-2"></i><div>No device sessions found</div></div>';
            return;
        }
        
        // Group sessions by device_id
        const deviceGroups = {};
        data.device_sessions.forEach(session => {
            const deviceId = session.device_id;
            if (!deviceGroups[deviceId]) {
                deviceGroups[deviceId] = [];
            }
            deviceGroups[deviceId].push(session);
        });
        
        list.innerHTML = '';
        
        // Render each device group
        Object.keys(deviceGroups).forEach(deviceId => {
            const sessions = deviceGroups[deviceId];
            const totalEmails = sessions.length;
            const showLimit = 3;
            const hasMore = totalEmails > showLimit;
            
            const deviceDiv = document.createElement('div');
            deviceDiv.className = 'bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3';
            
            // Device header
            const headerHtml = `
                <div class="flex justify-between items-center pb-3 border-b border-gray-700">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-mobile-alt text-blue-400"></i>
                        <span class="font-mono text-sm text-gray-300">\`${deviceId}\`</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs text-gray-400">${totalEmails} email${totalEmails > 1 ? 's' : ''}</span>
                        <button onclick="banDeviceById('${deviceId}')" class="text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition-colors">
                            <i class="fas fa-ban mr-1"></i>Ban
                        </button>
                    </div>
                </div>
            `;
            
            // Email list (show first 3)
            let emailListHtml = '<div class="space-y-2 email-list">';
            sessions.slice(0, showLimit).forEach(session => {
                emailListHtml += `
                    <div class="bg-gray-900 p-2 rounded text-xs flex justify-between items-center">
                        <div class="flex-1 truncate">
                            <i class="fas fa-envelope text-green-400 mr-2"></i>
                            <span class="text-gray-300">${escapeHtml(session.email_address)}</span>
                        </div>
                        <span class="text-gray-500 text-xs ml-2">${formatTime(session.last_activity)}</span>
                    </div>
                `;
            });
            emailListHtml += '</div>';
            
            // "Show more" button if needed
            let showMoreHtml = '';
            if (hasMore) {
                const remainingCount = totalEmails - showLimit;
                showMoreHtml = `
                    <button onclick="toggleDeviceEmails(this, '${deviceId}')" 
                            class="w-full text-xs text-blue-400 hover:text-blue-300 py-2 transition-colors"
                            data-expanded="false">
                        <i class="fas fa-chevron-down mr-1"></i>
                        Show ${remainingCount} more email${remainingCount > 1 ? 's' : ''}
                    </button>
                    <div class="hidden-emails hidden space-y-2">
                        ${sessions.slice(showLimit).map(session => `
                            <div class="bg-gray-900 p-2 rounded text-xs flex justify-between items-center">
                                <div class="flex-1 truncate">
                                    <i class="fas fa-envelope text-green-400 mr-2"></i>
                                    <span class="text-gray-300">${escapeHtml(session.email_address)}</span>
                                </div>
                                <span class="text-gray-500 text-xs ml-2">${formatTime(session.last_activity)}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            deviceDiv.innerHTML = headerHtml + emailListHtml + showMoreHtml;
            list.appendChild(deviceDiv);
        });
    })
    .catch(err => {
        console.error('Error loading device sessions:', err);
        document.getElementById('device-sessions-list').innerHTML = 
            '<div class="text-center py-4 text-red-400"><i class="fas fa-exclamation-circle mr-2"></i>Failed to load device sessions</div>';
    });
}

// Add toggle function for "Show more" button
function toggleDeviceEmails(button, deviceId) {
    const isExpanded = button.getAttribute('data-expanded') === 'true';
    const hiddenEmails = button.nextElementSibling;
    
    if (isExpanded) {
        // Collapse
        hiddenEmails.classList.add('hidden');
        button.innerHTML = '<i class="fas fa-chevron-down mr-1"></i>Show more emails';
        button.setAttribute('data-expanded', 'false');
    } else {
        // Expand
        hiddenEmails.classList.remove('hidden');
        button.innerHTML = '<i class="fas fa-chevron-up mr-1"></i>Show less';
        button.setAttribute('data-expanded', 'true');
    }
}


function banDevice() {
    const deviceId = document.getElementById('ban-device-input').value.trim();
    const reason = document.getElementById('ban-reason-input').value.trim();
    
    if (!deviceId) {
        showNotification('❌ Please enter a Device ID', 'error');
        return;
    }
    
    fetch(`${API_URL}/api/admin/ban-device`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({ device_id: deviceId, reason: reason })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification(`✅ Device ${deviceId} banned successfully`, 'success');
            document.getElementById('ban-device-input').value = '';
            document.getElementById('ban-reason-input').value = '';
            loadBannedDevices();
            loadDeviceSessions();
        } else {
            showNotification(`❌ ${data.error}`, 'error');
        }
    })
    .catch(err => {
        console.error('Error banning device:', err);
        showNotification('❌ Error banning device', 'error');
    });
}

function banDeviceById(deviceId) {
    document.getElementById('ban-device-input').value = deviceId;
    document.getElementById('ban-reason-input').focus();
}

function unbanDevice(deviceId) {
    showModal(
        'Unban Device',
        `Are you sure you want to unban device <strong>${deviceId}</strong>?`,
        function() {
            fetch(`${API_URL}/api/admin/unban-device/${encodeURIComponent(deviceId)}`, {
                method: 'POST',
                credentials: 'include'
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showNotification(`✅ Device ${deviceId} unbanned successfully`, 'success');
                    loadBannedDevices();
                } else {
                    showNotification(`❌ ${data.error}`, 'error');
                }
            })
            .catch(err => {
                console.error('Error unbanning device:', err);
                showNotification('❌ Error unbanning device', 'error');
            });
        }
    );
}

// Load device data when admin panel loads
function loadDeviceData() {
    loadBannedDevices();
    loadDeviceSessions();
}



function generateAccessCode() {
    const usernameInput = document.getElementById('generate-code-username');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const domainSelect = document.getElementById('generate-code-domain');
    const domain = domainSelect ? domainSelect.value : 'aungmyomyatzaw.online';
    const customCodeInput = document.getElementById('generate-code-custom');
    const customCode = customCodeInput ? customCodeInput.value.trim() : '';
    const descriptionInput = document.getElementById('generate-code-description');
    const description = descriptionInput ? descriptionInput.value.trim() : '';
    const durationSelect = document.getElementById('generate-code-duration');
    const durationMinutes = durationSelect ? parseInt(durationSelect.value) : 1440;
    const usesInput = document.getElementById('generate-code-uses');
    const maxUses = usesInput ? parseInt(usesInput.value) || 1 : 1;
    
    console.log('📝 Generating access code with:', {
        username: username,
        domain: domain,
        customCode: customCode,
        description: description,
        durationMinutes: durationMinutes,
        maxUses: maxUses
    });
    
    if (!username) {
        showNotification('❌ Please enter a username', 'error');
        return;
    }
    
    const generateBtn = document.getElementById('generate-code-btn');
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
    }
    
    // ✅ FIX: Proper request data structure
    const requestData = {
        username: username,
        domain: domain,
        duration_minutes: durationMinutes,
        max_uses: maxUses
    };
    
    // Only include if provided
    if (customCode) {
        requestData.custom_code = customCode;
    }
    
    if (description) {
        requestData.description = description;
    }
    
    console.log('📤 Sending request data:', requestData);
    
    fetch(`${API_URL}/api/admin/access-codes/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
    })
    .then(res => {
        console.log('📥 Response status:', res.status);
        if (!res.ok) {
            return res.json().then(errorData => {
                console.log('📥 Error response:', errorData);
                throw new Error(errorData.error || `HTTP ${res.status}`);
            });
        }
        return res.json();
    })
    .then(data => {
        console.log('📥 Success response:', data);
        if (data.success) {
            showNotification(`✅ Access code generated: ${data.code} for ${data.email_address}`, 'success');
            
            // Clear form
            if (usernameInput) usernameInput.value = '';
            if (customCodeInput) customCodeInput.value = '';
            if (descriptionInput) descriptionInput.value = '';
            
            // Hide availability result
            const availabilityResult = document.getElementById('availability-result');
            if (availabilityResult) availabilityResult.classList.add('hidden');
            
            // Reload access codes list
            loadAccessCodes();
        } else {
            showNotification(`❌ ${data.error}`, 'error');
        }
    })
    .catch(err => {
        console.error('❌ Error generating access code:', err);
        let errorMessage = err.message || 'Error generating access code';
        
        // Better error messages
        if (err.message.includes('username is required')) {
            errorMessage = 'Username is required';
        } else if (err.message.includes('already exists')) {
            errorMessage = 'This custom code is already in use. Please choose a different one.';
        } else if (err.message.includes('blacklisted')) {
            errorMessage = 'This username is blacklisted. Please choose a different one.';
        } else if (err.message.includes('active session')) {
            errorMessage = 'This username has an active session. Please choose a different one or wait for the session to expire.';
        }
        
        showNotification(`❌ ${errorMessage}`, 'error');
    })
    .finally(() => {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-plus mr-2"></i> Generate Access Code';
        }
    });
}

function checkUsernameAvailability() {
  const username = document.getElementById('generate-code-username').value.trim().toLowerCase();
  const availabilityDiv = document.getElementById('username-availability');
  
  if (!username) {
    if (availabilityDiv) availabilityDiv.innerHTML = '';
    return;
  }
  
  const isBlacklisted = blacklistedUsernames.includes(username);
  const message = isBlacklisted 
    ? `❌ "@${username}" is blacklisted` 
    : `✅ "@${username}" is available`;
  
  if (availabilityDiv) {
    availabilityDiv.innerHTML = message;
    availabilityDiv.style.color = isBlacklisted ? '#ef4444' : '#10b981';
  }
}


function revokeAccessCode(code) {
    if (!code) {
        showNotification('❌ No access code provided', 'error');
        return;
    }
    
    showModal(
        'Revoke Access Code',
        `Are you sure you want to revoke access code <strong>${code}</strong>?<br><br>This will prevent anyone from using this code to access the email.`,
        function() {
            fetch(`${API_URL}/api/admin/access-codes/${code}/revoke`, {
                method: 'POST',
                credentials: 'include'
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
                    showNotification(`✅ Access code ${code} revoked`, 'success');
                    loadAccessCodes(); // Reload the list
                } else {
                    showNotification(`❌ ${data.error}`, 'error');
                }
            })
            .catch(err => {
                console.error('Error revoking access code:', err);
                showNotification(`❌ ${err.message || 'Error revoking access code'}`, 'error');
            });
        }
    );
}

// Enhanced error handling wrapper
function handleAdminApiError(error, context = 'operation') {
    console.error(`Admin ${context} error:`, error);
    
    if (error.message && error.message.includes('Failed to fetch')) {
        showNotification('❌ Network error - check your connection', 'error');
    } else if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
        showNotification('❌ Session expired - please login again', 'error');
        setTimeout(() => location.reload(), 2000);
    } else {
        showNotification(`❌ ${error.message || `Failed to complete ${context}`}`, 'error');
    }
}

// Enhanced fetch wrapper with error handling
async function adminFetch(url, options = {}) {
    try {
        const response = await fetch(url, {
            credentials: 'include',
            ...options
        });
        
        if (response.status === 401) {
            throw new Error('Session expired');
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        handleAdminApiError(error, 'fetch operation');
        throw error;
    }
}


// End user session from admin
function endUserSession(sessionToken, email) {
    showModal(
        'End User Session',
        `Are you sure you want to end the session for <strong>${escapeHtml(email)}</strong>?<br><br>The user will be logged out and lose access to their emails.`,
        function() {
            fetch(API_URL + '/api/admin/session/' + sessionToken + '/end', {
                method: 'POST',
                credentials: 'include'
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showNotification(`✅ Session ended for ${email}`, 'success');
                    loadActiveSessions();
                } else {
                    showNotification(`❌ ${data.error || 'Failed to end session'}`, 'error');
                }
            })
            .catch(err => {
                console.error('Error ending session:', err);
                showNotification('❌ Error ending session', 'error');
            });
        }
    );
}

function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    
    // Only refresh if we're actually in the admin dashboard
    autoRefreshInterval = setInterval(() => {
        if (document.getElementById('admin-dashboard').style.display !== 'none') {
            loadStats();
            loadAddresses();
            loadActiveSessions();
            loadBlacklist();
            loadAccessCodes();
        }
    }, 15000);
}

// Custom Modal Functions
function showModal(title, message, confirmCallback) {
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalCancel = document.getElementById('modal-cancel');
    
    modalTitle.textContent = title;
    modalMessage.innerHTML = message;
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

function adminLogin() {
    if (loginAttemptInProgress) {
        console.log('🛑 Login attempt already in progress');
        return;
    }
    
    var password = document.getElementById('admin-password').value;
    var errorEl = document.getElementById('admin-login-error');
    var btn = document.getElementById('admin-login-btn');
    
    if (!password) {
        errorEl.textContent = '❌ Please enter password';
        errorEl.style.display = 'block';
        return;
    }
    
    // Set loading state
    loginAttemptInProgress = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Logging in...';
    btn.disabled = true;
    errorEl.style.display = 'none';
    
    console.log('🔐 Attempting admin login...');
    
    fetch(API_URL + '/api/admin/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({password: password})
    })
    .then(res => {
        console.log('Login response status:', res.status);
        if (res.ok) {
            return res.json();
        }
        throw new Error('Login failed');
    })
    .then(data => {
        if (data.success) {
            console.log('✅ Admin login successful');
            showAdminDashboard();
            showNotification('✅ Successfully logged in', 'success');
        } else {
            throw new Error('Invalid password');
        }
    })
    .catch(err => {
        console.error('❌ Admin login error:', err);
        errorEl.textContent = '❌ ' + (err.message || 'Login failed');
        errorEl.style.display = 'block';
    })
    .finally(() => {
        // Reset button state
        loginAttemptInProgress = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Login';
        btn.disabled = false;
    });
}

// Logout handler
function adminLogout() {
    showModal(
        'Confirm Logout',
        'Are you sure you want to logout from the admin panel?',
        function() {
            fetch(API_URL + '/api/admin/logout', {
                method: 'POST',
                credentials: 'include'
            })
            .then(() => {
                location.reload();
            })
            .catch(() => {
                location.reload();
            });
        }
    );
}



function formatPlainTextEmail(text) {
    if (!text) return '<p class="text-gray-400">No content</p>';
    
    let formatted = escapeHtml(text)
        .replace(/\n/g, '<br>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-blue-400 hover:underline">$1</a>');
    
    return `<div class="text-gray-200 leading-relaxed">${formatted}</div>`;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        showNotification('✅ Copied: ' + text, 'success');
    }).catch(function() {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('✅ Copied: ' + text, 'success');
    });
}


function prepareEmailForIframe(rawBody) {
    if (!rawBody || rawBody.trim() === '') {
        return {
            isHtml: false,
            content: '<p class="text-gray-400 text-center py-8">No content available</p>'
        };
    }

    // Return the raw body wrapped in a dark container
    return { 
        isHtml: false, 
        content: `<div class="bg-gray-900/80 p-4 rounded-lg min-h-full email-original">${rawBody}</div>`
    };
}

// Global variables for search
let allAddresses = [];
let blacklistedUsernames = [];
let currentSearchTerm = '';

// Search function
function searchEmails() {
    currentSearchTerm = document.getElementById('email-search').value.toLowerCase().trim();
    const clearBtn = document.getElementById('clear-search-btn');
    
    // Show/hide clear button
    if (currentSearchTerm) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }
    
    if (!allAddresses.length) {
        document.getElementById('address-list').innerHTML = '<p class="text-gray-400 text-center py-8">No addresses to search</p>';
        return;
    }
    
    let filteredAddresses = allAddresses;
    
    if (currentSearchTerm) {
        filteredAddresses = allAddresses.filter(addr => {
            const username = addr.address.split('@')[0].toLowerCase();
            return username.includes(currentSearchTerm);
        });
    }
    
    renderAddressList(filteredAddresses);
}

// Clear search
function clearSearch() {
    document.getElementById('email-search').value = '';
    currentSearchTerm = '';
    document.getElementById('clear-search-btn').classList.add('hidden');
    searchEmails();
}

function loadDomainsForAdmin() {
    fetch(`${API_URL}/api/domains`)
    .then(res => res.json())
    .then(data => {
        const domainSelect = document.getElementById('generate-code-domain');
        if (domainSelect && data.domains && data.domains.length > 0) {
            domainSelect.innerHTML = '<option value="">Select domain</option>';
            data.domains.forEach(domain => {
                const option = document.createElement('option');
                option.value = domain;
                option.textContent = `@${domain}`;
                domainSelect.appendChild(option);
            });
            
            // Auto-select the first domain if only one exists
            if (data.domains.length === 1) {
                domainSelect.value = data.domains[0];
            }
        }
    })
    .catch(err => {
        console.error('Error loading domains for admin:', err);
        // Fallback to default domain
        const domainSelect = document.getElementById('generate-code-domain');
        if (domainSelect) {
            domainSelect.innerHTML = '<option value="">Select domain</option>';
            const option = document.createElement('option');
            option.value = 'aungmyomyatzaw.online';
            option.textContent = '@aungmyomyatzaw.online';
            domainSelect.appendChild(option);
        }
    });
}

// Enhanced address list rendering
function renderAddressList(addresses) {
    const list = document.getElementById('address-list');
    
    if (addresses.length === 0) {
        if (currentSearchTerm) {
            list.innerHTML = '<p class="text-gray-400 text-center py-8">No addresses found for "' + currentSearchTerm + '"</p>';
        } else {
            list.innerHTML = '<p class="text-gray-400 text-center py-8">No email addresses yet</p>';
        }
        return;
    }
    
    list.innerHTML = '';
    
    // Sort addresses by last_email_time (newest first)
    addresses.sort((a, b) => {
        if (!a.last_email_time && !b.last_email_time) return 0;
        if (!a.last_email_time) return 1;
        if (!b.last_email_time) return -1;
        return new Date(b.last_email_time) - new Date(a.last_email_time);
    });
    
    addresses.forEach(addr => {
        const username = addr.address.split('@')[0];
        const isBlacklisted = blacklistedUsernames.includes(username.toLowerCase());
        
        // Highlight search term in username
        let displayUsername = escapeHtml(username);
        if (currentSearchTerm) {
            const regex = new RegExp(`(${escapeRegex(currentSearchTerm)})`, 'gi');
            displayUsername = username.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">$1</mark>');
        }
        
        const item = document.createElement('div');
        item.className = `address-item rounded-lg border p-3 transition-all cursor-pointer ${
            isBlacklisted 
                ? 'bg-red-900/20 border-red-500 hover:bg-red-800/30' 
                : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-700'
        }`;

        // Access code badges
        const accessCodeBadges = [];
        if (addr.has_active_access_code) {
            accessCodeBadges.push('<span class="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center"><i class="fas fa-key mr-1"></i>Active Access</span>');
        }
        if (addr.has_valid_access_code) {
            accessCodeBadges.push('<span class="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center"><i class="fas fa-unlock mr-1"></i>Valid Code</span>');
        }

        
        item.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="flex items-center min-w-0 flex-1">
                            <p class="text-white font-semibold truncate text-sm">
                                <span class="username">${displayUsername}</span>
                                <span class="text-gray-400">@${DOMAIN}</span>
                            </p>
                            ${isBlacklisted ? 
                                '<span class="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold flex-shrink-0 ml-2 flex items-center"><i class="fas fa-ban mr-1"></i>Blacklisted</span>' : 
                                ''
                            }
                            ${accessCodeBadges.join('')}
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4 text-xs text-gray-400">
                            <span class="flex items-center">
                                <i class="fas fa-envelope mr-1"></i>
                                ${addr.count || 0} email${(addr.count || 0) !== 1 ? 's' : ''}
                            </span>
                            <span class="flex items-center">
                                <i class="fas fa-clock mr-1"></i>
                                ${addr.last_email || 'never'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="flex gap-1 ml-3 flex-shrink-0">
                    <button onclick="event.stopPropagation(); viewEmails('${escapeHtml(addr.address)}')" 
                            class="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors flex items-center justify-center"
                            title="View emails">
                        <i class="fas fa-eye text-xs"></i>
                    </button>
                    <button onclick="event.stopPropagation(); deleteAddress('${escapeHtml(addr.address)}')" 
                            class="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors flex items-center justify-center"
                            title="Delete all emails">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                    ${!isBlacklisted ? 
                        `<button onclick="event.stopPropagation(); blacklistFromAddress('${escapeHtml(username)}')" 
                                class="bg-orange-600 hover:bg-orange-700 text-white p-2 rounded transition-colors flex items-center justify-center"
                                title="Blacklist username">
                            <i class="fas fa-ban text-xs"></i>
                        </button>` : 
                        ''
                    }
                </div>
            </div>
        `;
        
        // Add click handler to view emails
        item.addEventListener('click', function(e) {
            if (!e.target.closest('button')) {
                viewEmails(addr.address);
            }
        });
        
        list.appendChild(item);
    });
}

// Load blacklist for highlighting
function loadBlacklistForHighlight() {
    return fetch(`${API_URL}/api/admin/blacklist`, {
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.blacklist) {
            blacklistedUsernames = data.blacklist.map(item => {
                if (typeof item === 'string') return item.toLowerCase();
                if (typeof item === 'object' && item.username) return item.username.toLowerCase();
                return String(item).toLowerCase();
            }).filter(username => username); // Remove empty strings
            console.log('Loaded blacklisted usernames:', blacklistedUsernames);
        }
        return data;
    })
    .catch(err => {
        console.error('Error loading blacklist for highlighting:', err);
        return [];
    });
}

// Blacklist username directly from address list
function blacklistFromAddress(username) {
    showModal(
        'Blacklist Username',
        `Are you sure you want to blacklist the username "<strong>${escapeHtml(username)}</strong>"?<br><br>This will prevent all users from using this username.`,
        function() {
            fetch(API_URL + '/api/admin/blacklist', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({username: username.toLowerCase()})
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showNotification(`✅ Username ${username} added to blacklist`, 'success');
                    // Reload blacklist and refresh the display
                    loadBlacklistForHighlight().then(() => {
                        searchEmails(); // Re-apply current search/filter
                    });
                } else {
                    showNotification(`❌ ${data.error || 'Failed to blacklist username'}`, 'error');
                }
            })
            .catch(err => {
                console.error('Error blacklisting username:', err);
                showNotification('❌ Error blacklisting username', 'error');
            });
        }
    );
}

function getTimeRemaining(expiresAt) {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return 'Less than 1m';
}

// Update the existing loadAddresses function
function loadAddresses() {
    fetch(API_URL + '/api/admin/addresses', {
        credentials: 'include'
    })
    .then(res => {
        if (res.status === 401) {
            location.reload();
            return;
        }
        return res.json();
    })
    .then(data => {
        if (!data || data.error) {
            document.getElementById('address-list').innerHTML = '<p class="text-red-400 text-center py-8">Error loading addresses</p>';
            return;
        }
        
        allAddresses = data.addresses || [];
        console.log('Loaded addresses:', allAddresses.length);
        
        // Load blacklist for highlighting, then render
        loadBlacklistForHighlight().then(() => {
            searchEmails(); // This will render the list with current search
        });
    })
    .catch(err => {
        console.error('Error loading addresses:', err);
        document.getElementById('address-list').innerHTML = '<p class="text-red-400 text-center py-8">Failed to load addresses</p>';
    });
}

// Utility function to escape regex characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Show email list
function showAdminEmailList() {
    document.getElementById('admin-email-list-view').classList.remove('hidden');
    document.getElementById('admin-email-content-view').classList.add('hidden');
    currentViewingEmail = null;
}

// Delete current email
function deleteCurrentEmail() {
    if (!currentViewingEmail) return;
    deleteEmail(currentViewingEmail.id);
}


function viewEmails(address) {
    selectedAddress = address;
    document.getElementById('selected-address').textContent = address;
    
    fetch(API_URL + '/api/admin/emails/' + encodeURIComponent(address), {
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        var details = document.getElementById('email-details');
        var badge = document.getElementById('email-count-badge');
        
        if (!data || data.error) {
            details.innerHTML = '<p class="text-red-400 text-center py-8">Error loading emails</p>';
            badge.classList.add('hidden');
            return;
        }
        
        if (!data.emails || data.emails.length === 0) {
            details.innerHTML = '<p class="text-gray-400 text-center py-8">No emails for this address</p>';
            badge.textContent = '0 emails';
            badge.classList.remove('hidden');
            return;
        }
        
        // Update badge
        badge.textContent = data.emails.length + ' email' + (data.emails.length !== 1 ? 's' : '');
        badge.classList.remove('hidden');
        
        details.innerHTML = '';
        
        data.emails.forEach((email, index) => {
            var item = document.createElement('div');
            item.className = 'bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer';
            
            // Make entire card clickable
            item.onclick = function() {
                // Remove active class from all items
                document.querySelectorAll('#email-details > div').forEach(el => {
                    el.classList.remove('bg-blue-600', 'border-blue-500');
                });
                // Add active class to clicked item
                item.classList.add('bg-blue-600', 'border-blue-500');
                
                viewFullAdminEmail(email);
            };
            
            // Clean and truncate body for preview
            var cleanBody = email.body ? email.body.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : 'No content';
            var previewBody = cleanBody.length > 100 ? cleanBody.substring(0, 100) + '...' : cleanBody;
            
            // Create session badges
            let badges = '';
            if (email.is_admin_session) {
                badges += '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-600 text-white ml-2">Admin</span>';
            }
            if (email.is_access_code) {
                badges += '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500 text-white ml-2">Access</span>';
            }

            item.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                        <p class="text-white font-semibold text-xs md:text-sm truncate">${escapeHtml(email.sender || 'Unknown')}</p>
                        <p class="text-gray-300 text-xs md:text-sm font-medium mt-1">
                            ${escapeHtml(email.subject || 'No subject')}
                            ${badges}
                        </p>
                        <p class="text-xs text-gray-400 mt-1">${email.display_time}</p>
                    </div>
                    <button onclick="event.stopPropagation(); deleteEmail(${email.id})" 
                            class="text-red-400 hover:text-red-300 p-1 md:p-2 rounded transition-colors ml-2" 
                            title="Delete email">
                        <i class="fas fa-trash text-xs md:text-sm"></i>
                    </button>
                </div>
                <p class="text-xs text-gray-400 mt-2">${escapeHtml(previewBody)}</p>
                <div class="mt-2 text-xs text-blue-400 hover:text-blue-300">
                    <i class="fas fa-eye mr-1"></i>Click to view full email
                </div>
            `;

            
            details.appendChild(item);
        });
    })
    .catch(err => {
        console.error('Error loading emails:', err);
        document.getElementById('email-details').innerHTML = '<p class="text-red-400 text-center py-8">Failed to load emails</p>';
    });
}

function viewFullAdminEmail(email) {
    currentViewingEmail = email;
    
    // Hide list, show content
    document.getElementById('admin-email-list-view').classList.add('hidden');
    document.getElementById('admin-email-content-view').classList.remove('hidden');
    
    // Populate email details
    document.getElementById('admin-email-subject').textContent = email.subject || 'No subject';
    document.getElementById('admin-email-from').textContent = email.sender || 'Unknown';
    document.getElementById('admin-email-date').textContent = formatTime(email.timestamp);

     // Add access code info if available
    const emailHeader = document.querySelector('#admin-email-content-view .border-b');
    if (email.is_access_code && email.access_code) {
        const accessCodeInfo = document.createElement('div');
        accessCodeInfo.className = 'flex items-center text-xs text-blue-400 mt-2';
        accessCodeInfo.innerHTML = `
            <i class="fas fa-key mr-1"></i>
            <strong>Access Code:</strong> ${email.access_code}
            ${email.access_code_description ? ` - ${email.access_code_description}` : ''}
        `;
        emailHeader.appendChild(accessCodeInfo);
    }
    
    const iframe = document.getElementById('admin-email-iframe');
    const fallback = document.getElementById('admin-email-fallback');
    
    // ✅ ALWAYS USE FALLBACK DIV - NEVER USE IFRAME
    iframe.classList.add('hidden');
    fallback.classList.remove('hidden');
    
    // Use the raw body content directly
    fallback.innerHTML = email.body || '<p class="text-gray-400 text-center py-8">No content available</p>';
    
    // Add click handlers for verification codes and improve styling
    setTimeout(() => {
        // Make verification codes clickable to copy
        const verificationCodes = fallback.querySelectorAll('.bg-yellow-200, .bg-gradient-to-r, [class*="verification"], [class*="code"]');
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
            link.classList.add('text-blue-400', 'hover:underline');
        });
        
        // Improve overall styling for dark mode
        const emailContent = fallback.querySelector('.email-original');
        if (emailContent) {
            emailContent.classList.add('text-gray-200', 'leading-relaxed');
        }
    }, 100);
}

// Add this copy function to admin panel JavaScript
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
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

// Delete single email
function deleteEmail(emailId) {
    showModal(
        'Delete Email',
        'Are you sure you want to delete this email? This action cannot be undone.',
        function() {
            fetch(API_URL + '/api/admin/delete/' + emailId, {
                method: 'DELETE',
                credentials: 'include'
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (selectedAddress) viewEmails(selectedAddress);
                    loadStats();
                    showNotification('✅ Email deleted successfully', 'success');
                } else {
                    showNotification('❌ Failed to delete email', 'error');
                }
            })
            .catch(err => {
                console.error('Error deleting email:', err);
                showNotification('❌ Error deleting email', 'error');
            });
        }
    );
}

// Delete all emails for address
function deleteAddress(address) {
    showModal(
        'Delete All Emails',
        `Are you sure you want to delete ALL emails for <strong>${escapeHtml(address)}</strong>?<br><br>This action cannot be undone and will permanently remove all emails for this address.`,
        function() {
            fetch(API_URL + '/api/admin/delete-address/' + encodeURIComponent(address), {
                method: 'DELETE',
                credentials: 'include'
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadAddresses();
                    loadStats();
                    document.getElementById('email-details').innerHTML = '<p class="text-gray-400 text-center py-8">Select an email address to view emails</p>';
                    document.getElementById('selected-address').textContent = 'None selected';
                    document.getElementById('email-count-badge').classList.add('hidden');
                    showNotification('✅ All emails deleted for ' + address, 'success');
                } else {
                    showNotification('❌ Failed to delete emails', 'error');
                }
            })
            .catch(err => {
                console.error('Error deleting address:', err);
                showNotification('❌ Error deleting emails', 'error');
            });
        }
    );
}

// Load stats
function loadStats() {
    fetch(API_URL + '/api/admin/stats', {
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (data && !data.error) {
            document.getElementById('stat-emails').textContent = data.total_emails || 0;
            document.getElementById('stat-addresses').textContent = data.total_addresses || 0;
            document.getElementById('stat-recent').textContent = data.recent_emails || 0;
        }
    })
    .catch(err => {
        console.error('Error loading stats:', err);
    });
}

// Load active sessions with end session functionality
function loadActiveSessions() {
    fetch(API_URL + '/api/admin/sessions', {
        credentials: 'include'
    })
    .then(res => {
        if (res.status === 401) {
            location.reload();
            return;
        }
        return res.json();
    })
    .then(data => {
        var sessionsEl = document.getElementById('active-sessions');
        
        if (!data || data.error) {
            sessionsEl.innerHTML = '<p class="text-red-400 text-center py-8">Error loading sessions</p>';
            return;
        }
        
        if (!data.sessions || data.sessions.length === 0) {
            sessionsEl.innerHTML = '<p class="text-gray-400 text-center py-8">No active sessions</p>';
            return;
        }
        
        sessionsEl.innerHTML = '';
        
        data.sessions.forEach(session => {
            var item = document.createElement('div');
            item.className = 'session-item bg-gray-800 p-3 md:p-4 rounded-lg border border-gray-700 hover:border-gray-600';
            item.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <p class="text-white font-semibold text-xs md:text-sm truncate">${escapeHtml(session.email)}</p>
                        <div class="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-400">
                            <div>
                                <i class="fas fa-play-circle mr-1"></i>
                                ${session.session_age_minutes} min ago
                            </div>
                            <div>
                                <i class="fas fa-clock mr-1"></i>
                                ${session.time_remaining_minutes} min left
                            </div>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">
                            Last active: ${formatTime(session.last_activity)}
                        </p>
                    </div>
                    <button onclick="endUserSession('${session.session_token}', '${escapeHtml(session.email)}')" class="text-red-400 hover:text-red-300 p-1 md:p-2 rounded transition-colors ml-2" title="End Session">
                        <i class="fas fa-times-circle text-xs md:text-sm"></i>
                    </button>
                </div>
            `;
            sessionsEl.appendChild(item);
        });
    })
    .catch(err => {
        console.error('Error loading sessions:', err);
        document.getElementById('active-sessions').innerHTML = '<p class="text-red-400 text-center py-8">Failed to load sessions</p>';
    });
}

function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Replace the formatTime function with this:
function formatTime(timestamp) {
    if (!timestamp) return 'never';
    
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'invalid';
        
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return date.toLocaleDateString();
    } catch (e) {
        return 'error';
    }
}

function formatFutureTime(timestamp) {
    if (!timestamp) return 'never';
    
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'invalid';
        
        // Add 6 hours to the display ONLY
        const displayDate = new Date(date.getTime() + (6.5 * 60 * 60 * 1000));
        
        const now = new Date();
        const diff = displayDate - now;
        
        if (diff <= 0) return 'Expired';
        
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m`;
        return '<1m';
    } catch (e) {
        return 'error';
    }
}


// Update the loadAccessCodes function to use proper time display:
function loadAccessCodes() {
    fetch(`${API_URL}/api/admin/access-codes`, {
        credentials: 'include'
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        const list = document.getElementById('access-codes-list');
        
        if (!data || data.error) {
            list.innerHTML = '<p class="text-red-400 text-center py-8">Error loading access codes</p>';
            return;
        }
        
        if (!data.access_codes || data.access_codes.length === 0) {
            list.innerHTML = '<p class="text-gray-400 text-center py-8">No access codes generated yet</p>';
            return;
        }
        
        list.innerHTML = '';
        
        data.access_codes.forEach(code => {
            const now = new Date();
            const expiresAt = new Date(code.expires_at);
            const isExpired = expiresAt < now;
            const isUsedUp = code.remaining_uses <= 0;
            const isRevoked = !code.is_active;
            
            const statusClass = isRevoked ? 'border-red-500 bg-red-900/20' : 
                              isExpired ? 'border-orange-500 bg-orange-900/20' :
                              isUsedUp ? 'border-yellow-500 bg-yellow-900/20' : 
                              'border-green-500 bg-green-900/20';
            
            // Use future time for expiration, regular time for creation
            const timeRemaining = formatFutureTime(code.expires_at);
            const createdTime = formatAccessCodeTime(code.created_at);
            
            const item = document.createElement('div');
            item.className = `p-4 rounded-lg border ${statusClass} transition-all hover:scale-[1.02] access-code-item`;
            
            item.innerHTML = `
                <div class="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div class="flex-1 min-w-0 w-full">
                        <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <code class="text-white font-mono font-bold text-lg bg-black/30 px-3 py-2 rounded break-all w-full sm:w-auto">${code.code}</code>
                            <div class="flex flex-wrap gap-2">
                                ${isExpired ? '<span class="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold whitespace-nowrap">Expired</span>' : ''}
                                ${isRevoked ? '<span class="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold whitespace-nowrap">Revoked</span>' : ''}
                                ${isUsedUp ? '<span class="bg-orange-500 text-white px-3 py-1 rounded text-xs font-bold whitespace-nowrap">Used Up</span>' : ''}
                                ${!isExpired && !isRevoked && !isUsedUp ? '<span class="bg-green-500 text-white px-3 py-1 rounded text-xs font-bold whitespace-nowrap">Active</span>' : ''}
                            </div>
                        </div>
                        <p class="text-white font-medium mb-1 break-words">${code.email_address}</p>
                        ${code.description ? `<p class="text-gray-300 text-sm mb-2 break-words">${escapeHtml(code.description)}</p>` : ''}
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-300">
                            <div class="flex items-center">
                                <i class="fas fa-clock mr-2 text-xs"></i>
                                <span>${isExpired ? 'Expired' : `Expires: ${timeRemaining}`}</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-chart-bar mr-2 text-xs"></i>
                                <span>Uses: ${code.used_count || 0}/${code.max_uses}</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-calendar mr-2 text-xs"></i>
                                <span>Created: ${createdTime}</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-bolt mr-2 text-xs"></i>
                                <span>Status: ${isRevoked ? 'Revoked' : isExpired ? 'Expired' : isUsedUp ? 'Used Up' : 'Active'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                        ${!isRevoked && !isExpired ? `
                            <button onclick="revokeAccessCode('${code.code}')" 
                                    class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center flex-1 md:flex-none"
                                    title="Revoke Code">
                                <i class="fas fa-ban mr-2"></i>Revoke
                            </button>
                        ` : ''}
                        <button onclick="copyToClipboard('${code.code}')" 
                                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center flex-1 md:flex-none"
                                title="Copy Code">
                            <i class="fas fa-copy mr-2"></i>Copy
                        </button>
                    </div>
                </div>
            `;
            
            list.appendChild(item);
        });
    })
    .catch(err => {
        console.error('Error loading access codes:', err);
        document.getElementById('access-codes-list').innerHTML = 
            '<p class="text-red-400 text-center py-8">Failed to load access codes</p>';
    });
}

function showNotification(message, type) {
    var bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    var icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    var notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 md:px-6 py-2 md:py-3 rounded-lg shadow-lg z-50 fade-in flex items-center text-sm md:text-base`;
    notification.innerHTML = `<i class="fas ${icon} mr-2"></i>${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('opacity-0');
        notification.classList.add('transition-opacity');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}