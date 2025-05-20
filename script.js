document.addEventListener('DOMContentLoaded', function () {
    const searchForm = document.getElementById('searchForm');
    const userInfoDiv = document.getElementById('user-info');
    const recentProfilesDiv = document.getElementById('recent-profiles');
    const CACHE_KEY = 'recentTwitchProfiles';
    const MAX_PROFILES = 5;

    // Load recent profiles from localStorage
    let recentProfiles = JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
    displayRecentProfiles();

    searchForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const channelName = document.getElementById('channel_name').value.trim();
        if (channelName) {
            fetchTwitchUser(channelName);
        }
    });

    function fetchTwitchUser(channelName) {
        const apiUrl = `https://api.ivr.fi/v2/twitch/user?login=${channelName}`;

        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data[0]) {
                    displayUserInfo(data[0]);
                    updateRecentProfiles(data[0]);
                    addDownloadJsonButton(data); // Add the JSON download button
                } else {
                    userInfoDiv.innerHTML = '<p>No user found with that name.</p>';
                }
            })
            .catch(error => {
                userInfoDiv.innerHTML = `<p>Error: ${error.message}</p>`;
            });
    }

    function displayUserInfo(user) {
        userInfoDiv.innerHTML = ''; // Clear previous data

        const bannerHeader = document.createElement('div');
        bannerHeader.classList.add('banner-header');

        if (user.banner) {
            bannerHeader.style.backgroundImage = `url('${user.banner}')`;
        }

        let userInfoHTML = `
            <img src="${user.logo}" alt="Profile Image">
            <button class="download-image" data-url="${user.logo}" data-filename="${user.login}_logo.png">Download Logo</button>
            <h2>${user.displayName} ${user.stream ? '<span class="live-indicator">LIVE</span>' : ''}</h2>
            <p><strong>Login Name:</strong> ${user.login}</p>
            <p><strong>Bio:</strong> ${user.bio}</p>
        `;

        bannerHeader.innerHTML = userInfoHTML;

        userInfoDiv.appendChild(bannerHeader);

        // Add download button for the banner
        if (user.banner) {
            const downloadBannerButton = document.createElement('button');
            downloadBannerButton.classList.add('download-image');
            downloadBannerButton.dataset.url = user.banner;
            downloadBannerButton.dataset.filename = `${user.login}_banner.png`;
            downloadBannerButton.textContent = 'Download Banner';
            bannerHeader.appendChild(downloadBannerButton);
        }

        const dataSectionContainer = document.createElement('div');
        dataSectionContainer.innerHTML = `
            <div class="data-section">
                <h3>General Information</h3>
                <p><strong>ID:</strong> ${user.id}</p>
                <p><strong>Banned:</strong> ${user.banned}</p>
                <p><strong>Followers:</strong> ${user.followers}</p>
                <p><strong>Profile View Count:</strong> ${user.profileViewCount}</p>
                <p><strong>Chat Color:</strong> ${user.chatColor}</p>
                <p><strong>Verified Bot:</strong> ${user.verifiedBot}</p>
                <p><strong>Created At:</strong> ${user.createdAt}</p>
                <p><strong>Updated At:</strong> ${user.updatedAt}</p>
                <p><strong>Emote Prefix:</strong> ${user.emotePrefix}</p>
            </div>

            <div class="data-section">
                <h3>Roles</h3>
                <p><strong>Is Affiliate:</strong> ${user.roles.isAffiliate}</p>
                <p><strong>Is Partner:</strong> ${user.roles.isPartner}</p>
                <p><strong>Is Staff:</strong> ${user.roles.isStaff}</p>
            </div>

            <div class="data-section">
                <h3>Badges</h3>
                ${user.badges.map(badge => `<span class="badge">${badge.title} (Version: ${badge.version})</span>`).join('')}
            </div>

            <div class="data-section">
                <h3>Chat Settings</h3>
                <p><strong>Chat Delay (ms):</strong> ${user.chatSettings.chatDelayMs}</p>
                <p><strong>Followers Only Duration (minutes):</strong> ${user.chatSettings.followersOnlyDurationMinutes}</p>
                <p><strong>Slow Mode Duration (seconds):</strong> ${user.chatSettings.slowModeDurationSeconds}</p>
                <p><strong>Block Links:</strong> ${user.chatSettings.blockLinks}</p>
                <p><strong>Subscribers Only Mode:</strong> ${user.chatSettings.isSubscribersOnlyModeEnabled}</p>
                <p><strong>Emote Only Mode:</strong> ${user.chatSettings.isEmoteOnlyModeEnabled}</p>
                <p><strong>Fast Subs Mode:</strong> ${user.chatSettings.isFastSubsModeEnabled}</p>
                <p><strong>Unique Chat Mode:</strong> ${user.chatSettings.isUniqueChatModeEnabled}</p>
                <p><strong>Require Verified Account:</strong> ${user.chatSettings.requireVerifiedAccount}</p>
                <p><strong>Rules:</strong> ${user.chatSettings.rules}</p>
            </div>

            <div class="data-section">
                <h3>Stream Information</h3>
                <p><strong>Chatter Count:</strong> ${user.chatterCount}</p>
                <p><strong>Last Broadcast Title:</strong> ${user.lastBroadcast ? user.lastBroadcast.title : 'N/A'}</p>
                <p><strong>Last Broadcast Started At:</strong> ${user.lastBroadcast ? user.lastBroadcast.startedAt : 'N/A'}</p>
            </div>
        `;

        userInfoDiv.appendChild(dataSectionContainer);

        if (user.stream) {
            const streamDetailsDiv = document.createElement('div');
            streamDetailsDiv.classList.add('data-section');
            streamDetailsDiv.innerHTML = `
                <h3>Live Stream Details</h3>
                <p><strong>Stream Title:</strong> ${user.stream.title}</p>
                <p><strong>Stream ID:</strong> ${user.stream.id}</p>
                <p><strong>Stream Started At:</strong> ${user.stream.createdAt}</p>
                <p><strong>Stream Type:</strong> ${user.stream.type}</p>
                <p><strong>Viewer Count:</strong> ${user.stream.viewersCount}</p>
                <p><strong>Game:</strong> ${user.stream.game.displayName}</p>
            `;
            userInfoDiv.appendChild(streamDetailsDiv);
        }

        const panelsDiv = document.createElement('div');
        panelsDiv.classList.add('data-section');
        panelsDiv.innerHTML = `
            <h3>Panels</h3>
            <ul>
                ${user.panels.map(panel => `<li>${panel.id}</li>`).join('')}
            </ul>
        `;
        userInfoDiv.appendChild(panelsDiv);

        // Add event listeners to download buttons after they are added to the DOM
        const downloadButtons = document.querySelectorAll('.download-image');
        downloadButtons.forEach(button => {
            button.addEventListener('click', downloadImage);
        });
    }

    function addDownloadJsonButton(data) {
        const downloadJsonButton = document.createElement('button');
        downloadJsonButton.textContent = 'Download JSON Data';
        downloadJsonButton.classList.add('download-json');
        downloadJsonButton.addEventListener('click', () => {
            downloadJson(data, 'twitch_user_data.json');
        });

        userInfoDiv.appendChild(downloadJsonButton);
    }

    function downloadImage(event) {
        const imageUrl = event.target.dataset.url;
        const filename = event.target.dataset.filename;

        fetch(imageUrl, {
            mode: 'cors' // Add this to handle CORS issues
        })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            });
    }

    function downloadJson(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], {
            type: 'application/json'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    function updateRecentProfiles(user) {
        // Check if the profile is already in recentProfiles
        const existingIndex = recentProfiles.findIndex(profile => profile.id === user.id);

        if (existingIndex !== -1) {
            // If it exists, remove it to move it to the front
            recentProfiles.splice(existingIndex, 1);
        }

        // Add the current user to the beginning of the array
        recentProfiles.unshift({
            id: user.id,
            displayName: user.displayName,
            logo: user.logo,
            login: user.login
        });

        // Trim the array to the maximum number of profiles
        recentProfiles = recentProfiles.slice(0, MAX_PROFILES);

        // Store the updated array in localStorage
        localStorage.setItem(CACHE_KEY, JSON.stringify(recentProfiles));

        // Update the display of recent profiles
        displayRecentProfiles();
    }

    function displayRecentProfiles() {
        recentProfilesDiv.innerHTML = ''; // Clear previous data

        if (recentProfiles.length === 0) {
            recentProfilesDiv.innerHTML = '<p>No recent profiles.</p>';
            return;
        }

        let recentProfilesHTML = `<h2>Recent Profiles</h2>`;
        recentProfilesHTML += recentProfiles.map(profile => `
            <div class="profile-card">
                <img src="${profile.logo}" alt="${profile.displayName}">
                <a href="https://www.twitch.tv/${profile.login}" target="_blank">${profile.displayName}</a>
            </div>
        `).join('');

        recentProfilesDiv.innerHTML = recentProfilesHTML;
    }
});
