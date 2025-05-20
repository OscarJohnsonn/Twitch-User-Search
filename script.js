document.addEventListener('DOMContentLoaded', function () {
  const searchForm = document.getElementById('searchForm');
  const userInfoDiv = document.getElementById('user-info');
  const recentProfilesDiv = document.getElementById('recent-profiles');
  const pageTitle = document.querySelector('h1');
  const CACHE_KEY = 'recentTwitchProfiles';
  const MAX_PROFILES = 5;

  let recentProfiles = JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
  displayRecentProfiles();

  function loadUserFromHash() {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const channelName = hash.toLowerCase();
      document.getElementById('channel_name').value = channelName;
      fetchTwitchUser(channelName);
    }
  }

  loadUserFromHash();

  window.addEventListener('hashchange', loadUserFromHash);

  searchForm.addEventListener('submit', function (event) {
    event.preventDefault();
    let channelName = document.getElementById('channel_name').value.trim();
    if (channelName) {
      channelName = channelName.toLowerCase();
      window.location.hash = channelName;
      fetchTwitchUser(channelName);
    }
  });

  pageTitle.addEventListener('click', function () {
    userInfoDiv.innerHTML = '';
    document.getElementById('channel_name').value = '';
    window.location.hash = '';
  });

  function fetchTwitchUser(channelName) {
    const apiUrl = `https://api.ivr.fi/v2/twitch/user?login=${channelName}`;
    const twitchTrackerApiUrl = `https://twitchtracker.com/api/channels/summary/${channelName}`;

    userInfoDiv.innerHTML = '<p>Loading user data...</p>';

    Promise.all([fetch(apiUrl), fetch(twitchTrackerApiUrl)])
      .then(([twitchResponse, twitchTrackerResponse]) => {
        if (!twitchResponse.ok) {
          throw new Error(`Twitch API error! Status: ${twitchResponse.status}`);
        }
        if (!twitchTrackerResponse.ok) {
          throw new Error(
            `TwitchTracker API error! Status: ${twitchTrackerResponse.status}`
          );
        }
        return Promise.all([
          twitchResponse.json(),
          twitchTrackerResponse.json(),
        ]);
      })
      .then(([twitchData, twitchTrackerData]) => {
        if (twitchData && twitchData[0]) {
          displayUserInfo(twitchData[0], twitchTrackerData);
          updateRecentProfiles(twitchData[0]);
          addDownloadJsonButton([twitchData[0], twitchTrackerData]); // Include both data sets for download
        } else {
          userInfoDiv.innerHTML = '<p>No user found with that name.</p>';
        }
      })
      .catch((error) => {
        userInfoDiv.innerHTML = `<p>Error: ${error.message}</p>`;
      });
  }

  function calculateStreamLength(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  let streamInterval; // Variable to hold the interval ID

  function displayUserInfo(user, twitchTrackerData) {
    userInfoDiv.innerHTML = '';

    const bannerHeader = document.createElement('div');
    bannerHeader.classList.add('banner-header');

    if (user.banner) {
      bannerHeader.style.backgroundImage = `url('${user.banner}')`;
    }

    let liveStatus = '';
    let streamLength = '';

    if (user.stream) {
      streamLength = calculateStreamLength(user.stream.createdAt);
      liveStatus = `<span class="live-indicator">LIVE (<span id="viewer-count">${user.stream.viewersCount}</span> Viewers, <span id="stream-length">${streamLength}</span>)</span>`;
    }

    const rankDisplay = twitchTrackerData
      ? ` #${twitchTrackerData.rank}`
      : '';

    let userInfoHTML = `
      <div class="logo-container">
        <img id="profile-logo" src="${user.logo}" alt="Profile Image">
        <i class="fas fa-expand-alt expand-icon"></i>
      </div>

      <h2>${user.displayName}${rankDisplay} ${liveStatus}</h2>
      <p><strong>Login Name:</strong> ${user.login}</p>
      <p><strong>Bio:</strong> ${user.bio}</p>
    `;

    bannerHeader.innerHTML = userInfoHTML;
    userInfoDiv.appendChild(bannerHeader);

    // Now it’s important to display additional user details about the logo

    const dataSectionContainer = document.createElement('div');
    dataSectionContainer.classList.add('data-section-container');

    // Append to Twitch Data
    let basicInfoSection = `
      <div class="data-section">
        <h3>Basic Information</h3>
        <p><strong>ID:</strong> <span class="copyable-text">${user.id}</span></p>
        <p><strong>Login Name:</strong> ${user.login}</p>
        <p><strong>Display Name:</strong> ${user.displayName}</p>
        <p><strong>Bio:</strong> ${user.bio}</p>
        <p><strong>Created At:</strong> ${user.createdAt}</p>
        <p><strong>Updated At:</strong> ${user.updatedAt}</p>
        <p><strong>Emote Prefix:</strong> ${user.emotePrefix}</p>
      </div>
    `;

    // Function to determine rank background color
    function getRankBackground(rank) {
      if (rank === 1) {
        return 'gold';
      } else if (rank === 2) {
        return 'silver';
      } else if (rank === 3) {
        return 'bronze';
      } else {
        return 'transparent'; // Default background
      }
    }

    const rankBackgroundColor = getRankBackground(twitchTrackerData.rank);

    let twitchTrackerSection = `
      <div class="data-section">
        <h3>
          <a href="https://twitchtracker.com/${user.login}" target="_blank">
            TwitchTracker
          </a>
        </h3>
        <p style="background-color: ${rankBackgroundColor};">
          <strong>Rank:</strong> ${twitchTrackerData.rank}
        </p>
        <p><strong>Minutes Streamed:</strong> ${twitchTrackerData.minutes_streamed}</p>
        <p><strong>Average Viewers:</strong> ${twitchTrackerData.avg_viewers}</p>
        <p><strong>Max Viewers:</strong> ${twitchTrackerData.max_viewers}</p>
        <p><strong>Hours Watched:</strong> ${twitchTrackerData.hours_watched}</p>
        <p><strong>Followers (Last 30 Days):</strong> ${twitchTrackerData.followers}</p>
        <p><strong>Total Followers:</strong> ${twitchTrackerData.followers_total}</p>
      </div>
    `;

    let badgesSection = `
      <div class="data-section">
        <h3>Badges</h3>
        <div class="badges-container">
          ${user.badges
            .map(
              (badge) =>
                `<span class="badge" title="${badge.description}">${
                  badge.title
                } (Version: ${badge.version})</span>`
            )
            .join('')}
        </div>
      </div>
    `;

    let statusSection = `
      <div class="data-section">
        <h3>Status</h3>
        <p><strong>Banned:</strong> ${user.banned ? 'Yes' : 'No'}</p>
        <p><strong>Partner:</strong> ${user.roles.isPartner ? 'Yes' : 'No'}</p>
        <p><strong>Affiliate:</strong> ${user.roles.isAffiliate ? 'Yes' : 'No'}</p>
        <p><strong>Staff:</strong> ${user.roles.isStaff ? 'Yes' : 'No'}</p>
        <p><strong>Verified Bot:</strong> ${user.verifiedBot ? 'Yes' : 'No'}</p>
      </div>
    `;

    let streamDetailsSection = `
      <div class="data-section">
        <h3>Stream Details</h3>
        <p><strong>Followers:</strong> ${user.followers}</p>
        <p><strong>Profile Views:</strong> ${user.profileViewCount}</p>
        <p><strong>Chatters:</strong> ${user.chatterCount}</p>
        ${
          user.stream
            ? `<p><strong>Viewers:</strong> ${user.stream.viewersCount}</p>
                 <p><strong>Stream Title:</strong> ${user.stream.title}</p>
                 <p><strong>Stream Started At:</strong> ${user.stream.createdAt}</p>
                 <p><strong>Stream Type:</strong> ${user.stream.type}</p>
                 <p><strong>Game:</strong> ${user.stream.game.displayName}</p>`
            : '<p><strong>Currently Offline</strong></p>'
        }
         <p><strong>Last Broadcast Title:</strong> ${
           user.lastBroadcast ? user.lastBroadcast.title : 'N/A'
         }</p>
    </div>
  `;

    let chatSettingsSection = `
      <div class="data-section">
        <h3>Chat Settings</h3>
        <p><strong>Chat Delay (ms):</strong> ${user.chatSettings.chatDelayMs}</p>
        <p><strong>Followers Only Duration (minutes):</strong> ${user.chatSettings.followersOnlyDurationMinutes}</p>
        <p><strong>Slow Mode Duration (seconds):</strong> ${user.chatSettings.slowModeDurationSeconds}</p>
        <p><strong>Block Links:</strong> ${user.chatSettings.blockLinks ? 'Yes' : 'No'}</p>
        <p><strong>Subscribers Only Mode:</strong> ${user.chatSettings.isSubscribersOnlyModeEnabled ? 'Yes' : 'No'}</p>
        <p><strong>Emote Only Mode:</strong> ${user.chatSettings.isEmoteOnlyModeEnabled ? 'Yes' : 'No'}</p>
        <p><strong>Fast Subs Mode:</strong> ${user.chatSettings.isFastSubsModeEnabled ? 'Yes' : 'No'}</p>
        <p><strong>Unique Chat Mode:</strong> ${user.chatSettings.isUniqueChatModeEnabled ? 'Yes' : 'No'}</p>
        <p><strong>Require Verified Account:</strong> ${user.chatSettings.requireVerifiedAccount ? 'Yes' : 'No'}</p>
        <p><strong>Rules:</strong> <span title="${user.chatSettings.rules}" class="rules-tooltip">${
      typeof user.chatSettings.rules === 'string'
        ? user.chatSettings.rules.substring(0, 100) + '...'
        : 'N/A'
    }</span></p>
    </div>
  `;

    let panelsSection = `
      <div class="data-section">
        <h3>Panels</h3>
        <ul>
          ${user.panels.map((panel) => `<li>${panel.id}</li>`).join('')}
        </ul>
      </div>
    `;

    dataSectionContainer.innerHTML =
      basicInfoSection +
      statusSection +
      streamDetailsSection +
      twitchTrackerSection +
      chatSettingsSection +
      badgesSection +
      panelsSection;

    userInfoDiv.appendChild(dataSectionContainer);

    const downloadButtons = document.querySelectorAll('.download-image');
    downloadButtons.forEach((button) => {
      button.addEventListener('click', downloadImage);
    });

    const copyableText = document.querySelectorAll('.copyable-text'); // Use querySelectorAll to select all elements
    copyableText.forEach((element) => {
      element.addEventListener('click', copyTextToClipboard); // Attach the event listener to each selected element
    });

    // Existing logic for banner overlay remains same

    // Expanded Logo Overlay
    const expandedLogoOverlay = document.createElement('div');
    expandedLogoOverlay.classList.add('expanded-logo-overlay');

    const expandedLogoContainer = document.createElement('div');
    expandedLogoContainer.classList.add('expanded-logo-container');

    const expandedLogo = document.createElement('img');
    expandedLogo.src = user.logo;
    expandedLogo.alt = 'Full Resolution Logo';
    expandedLogo.classList.add('expanded-logo');

    const downloadOverlayButton = document.createElement('button');
    downloadOverlayButton.classList.add('download-overlay-button');
    downloadOverlayButton.innerHTML =
      '<i class="fas fa-download"></i> Download';
    downloadOverlayButton.addEventListener('click', () => {
      downloadImageFromURL(user.logo, `${user.login}_full_logo.png`);
    });

    expandedLogoContainer.appendChild(expandedLogo);
    expandedLogoContainer.appendChild(downloadOverlayButton);
    expandedLogoOverlay.appendChild(expandedLogoContainer);
    userInfoDiv.appendChild(expandedLogoOverlay);

    // Event listener for logo click
    const profileLogo = document.getElementById('profile-logo');
    profileLogo.addEventListener('click', () => {
      expandedLogoOverlay.classList.add('active');
    });

    // Get the expand icon
    const expandIcon = bannerHeader.querySelector('.expand-icon');

    // Check if expandIcon is not null before adding the event listener
    if (expandIcon) {
      expandIcon.addEventListener('click', () => {
        expandedLogoOverlay.classList.add('active');
      });
    }

    // Event listener to close the overlay when clicking outside the image
    expandedLogoOverlay.addEventListener('click', (event) => {
      if (event.target === expandedLogoOverlay) {
        expandedLogoOverlay.classList.remove('active');
      }
    });

    // Clear existing interval if any
    if (streamInterval) {
      clearInterval(streamInterval);
    }

    // Start the stream length update interval if the stream is live
    if (user.stream) {
      const streamStart = user.stream.createdAt;
      streamInterval = setInterval(() => {
        const newStreamLength = calculateStreamLength(streamStart);
        const streamLengthElement = document.getElementById('stream-length');
        if (streamLengthElement) {
          streamLengthElement.textContent = newStreamLength;
        }
      }, 1000);
    }
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
      mode: 'cors',
    })
      .then((response) => response.blob())
      .then((blob) => {
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

  // Helper function to download image from URL
  function downloadImageFromURL(imageUrl, filename) {
    fetch(imageUrl, {
      mode: 'cors',
    })
      .then((response) => response.blob())
      .then((blob) => {
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
      type: 'application/json',
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

  function updateRecentProfileData(user) {
    recentProfiles = recentProfiles.map((profile) => {
      if (profile.login === user.login) {
        profile.isLive = !!user.stream;
        profile.bio = user.bio;
        profile.displayName = user.displayName;
      }
      return profile;
    });
    localStorage.setItem(CACHE_KEY, JSON.stringify(recentProfiles));
    displayRecentProfiles();
  }

  function updateRecentProfiles(user) {
    const existingIndex = recentProfiles.findIndex(
      (profile) => profile.id === user.id
    );

    if (existingIndex !== -1) {
      recentProfiles.splice(existingIndex, 1);
    }

    recentProfiles.unshift({
      id: user.id,
      displayName: user.displayName,
      logo: user.logo,
      login: user.login,
      isLive: !!user.stream,
      bio: user.bio,
    });

    updateRecentProfileData(user);

    recentProfiles = recentProfiles.slice(0, MAX_PROFILES);

    localStorage.setItem(CACHE_KEY, JSON.stringify(recentProfiles));

    displayRecentProfiles();
  }

  function displayRecentProfiles() {
    recentProfilesDiv.innerHTML = '';

    if (recentProfiles.length === 0) {
      recentProfilesDiv.innerHTML = '<p>No recent profiles.</p>';
      return;
    }

    let recentProfilesHTML = `<h2>Recent Profiles</h2>`;
    recentProfilesHTML += recentProfiles
      .map(
        (profile) => `
          <div class="profile-card">
            <div class="profile-image-container">
              <a href="https://www.twitch.tv/${profile.login}" target="_blank">
                <img src="${profile.logo}" alt="${profile.displayName}" class="${
          profile.isLive ? 'live-profile-image' : ''
        }">
              </a>
            </div>
            <div class="profile-details">
              <div class="profile-info">
                <div class="profile-name">${profile.displayName}</div>
                <div class="profile-bio">${profile.bio}</div>
              </div>
              <button class="view-stats-button" data-channel="${
                profile.login
              }">View Stats</button>
            </div>
          </div>
        `
      )
      .join('');

    recentProfilesDiv.innerHTML = recentProfilesHTML;

    const viewStatsButtons = document.querySelectorAll('.view-stats-button');
    viewStatsButtons.forEach((button) => {
      button.addEventListener('click', function () {
        const channelName = this.dataset.channel;
        window.location.hash = channelName;
      });
    });
  }

  function copyTextToClipboard(event) {
    const text = event.target.innerText;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert('ID copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy ID to clipboard.');
      });
  }
});
