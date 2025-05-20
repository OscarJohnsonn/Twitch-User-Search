document.addEventListener('DOMContentLoaded', function () {
  const searchForm = document.getElementById('searchForm');
  const userInfoDiv = document.getElementById('user-info');
  const recentProfilesDiv = document.getElementById('recent-profiles');
  const pageTitle = document.querySelector('h1'); // Select the h1 element
  const CACHE_KEY = 'recentTwitchProfiles';
  const MAX_PROFILES = 5;

  // Load recent profiles from localStorage
  let recentProfiles = JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
  displayRecentProfiles();

  // Function to fetch user based on channel name
  function loadUserFromHash() {
    const hash = window.location.hash.substring(1); // Remove the '#'
    if (hash) {
      const channelName = hash.toLowerCase(); // Convert to lowercase
      document.getElementById('channel_name').value = channelName; // Fill the input
      fetchTwitchUser(channelName);
    }
  }

  // Load user from hash on page load
  loadUserFromHash();

  searchForm.addEventListener('submit', function (event) {
    event.preventDefault();
    let channelName = document.getElementById('channel_name').value.trim();
    if (channelName) {
      channelName = channelName.toLowerCase(); // Convert to lowercase
      // Update the URL hash
      window.location.hash = channelName;
      fetchTwitchUser(channelName);
    }
  });

  // Add click event listener to the page title (home button)
  pageTitle.addEventListener('click', function () {
    userInfoDiv.innerHTML = ''; // Clear user info
    document.getElementById('channel_name').value = ''; // Clear input field
    window.location.hash = ''; // Clear the URL hash
  });

  function fetchTwitchUser(channelName) {
    const apiUrl = `https://api.ivr.fi/v2/twitch/user?login=${channelName}`;

    // Show loading indicator
    userInfoDiv.innerHTML = '<p>Loading user data...</p>';

    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data && data[0]) {
          displayUserInfo(data[0]);
          updateRecentProfiles(data[0]);
          addDownloadJsonButton(data); // Add the JSON download button
        } else {
          userInfoDiv.innerHTML = '<p>No user found with that name.</p>';
        }
      })
      .catch((error) => {
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
            <h2>${user.displayName} ${
      user.stream ? '<span class="live-indicator">LIVE</span>' : ''
    }</h2>
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
    dataSectionContainer.classList.add('data-section-container'); // Add grid container class
    dataSectionContainer.innerHTML = `
            <div class="data-section">
                <h3>General Information</h3>
                <p><strong>ID:</strong> <span class="copyable-text">${
                  user.id
                }</span></p>
                <p><strong>Banned:</strong> ${user.banned ? 'Yes' : 'No'}</p>
                <p><strong>Followers:</strong> ${user.followers}</p>
                <p><strong>Profile View Count:</strong> ${user.profileViewCount}</p>
                <p><strong>Chat Color:</strong> ${user.chatColor}</p>
                <p><strong>Verified Bot:</strong> ${user.verifiedBot ? 'Yes' : 'No'}</p>
                <p><strong>Created At:</strong> ${user.createdAt}</p>
                <p><strong>Updated At:</strong> ${user.updatedAt}</p>
                <p><strong>Emote Prefix:</strong> ${user.emotePrefix}</p>
            </div>

            <div class="data-section">
                <h3>Roles</h3>
                <p><strong>Is Affiliate:</strong> ${user.roles.isAffiliate ? 'Yes' : 'No'}</p>
                <p><strong>Is Partner:</strong> ${user.roles.isPartner ? 'Yes' : 'No'}</p>
                <p><strong>Is Staff:</strong> ${user.roles.isStaff ? 'Yes' : 'No'}</p>
            </div>

            <div class="data-section">
                <h3>Badges</h3>
                <div class="badges-container">
                    ${user.badges
                      .map(
                        (badge) =>
                          `<span class="badge" title="${badge.description}">${badge.title} (Version: ${badge.version})</span>`
                      )
                      .join('')}
                </div>
            </div>

            <div class="data-section">
                <h3>Chat Settings</h3>
                <p><strong>Chat Delay (ms):</strong> ${user.chatSettings.chatDelayMs}</p>
                <p><strong>Followers Only Duration (minutes):</strong> ${
                  user.chatSettings.followersOnlyDurationMinutes
                }</p>
                <p><strong>Slow Mode Duration (seconds):</strong> ${
                  user.chatSettings.slowModeDurationSeconds
                }</p>
                <p><strong>Block Links:</strong> ${
                  user.chatSettings.blockLinks ? 'Yes' : 'No'
                }</p>
                <p><strong>Subscribers Only Mode:</strong> ${
                  user.chatSettings.isSubscribersOnlyModeEnabled ? 'Yes' : 'No'
                }</p>
                <p><strong>Emote Only Mode:</strong> ${
                  user.chatSettings.isEmoteOnlyModeEnabled ? 'Yes' : 'No'
                }</p>
                <p><strong>Fast Subs Mode:</strong> ${
                  user.chatSettings.isFastSubsModeEnabled ? 'Yes' : 'No'
                }</p>
                <p><strong>Unique Chat Mode:</strong> ${
                  user.chatSettings.isUniqueChatModeEnabled ? 'Yes' : 'No'
                }</p>
                <p><strong>Require Verified Account:</strong> ${
                  user.chatSettings.requireVerifiedAccount ? 'Yes' : 'No'
                }</p>
                <p><strong>Rules:</strong> <span title="${
                  user.chatSettings.rules
                }" class="rules-tooltip">${
      typeof user.chatSettings.rules === 'string'
        ? user.chatSettings.rules.substring(0, 100) + '...'
        : 'N/A'
    }</span></p>
            </div>

            <div class="data-section">
                <h3>Stream Information</h3>
                <p><strong>Chatter Count:</strong> ${user.chatterCount}</p>
                <p><strong>Last Broadcast Title:</strong> ${
                  user.lastBroadcast ? user.lastBroadcast.title : 'N/A'
                }</p>
                <p><strong>Last Broadcast Started At:</strong> ${
                  user.lastBroadcast ? user.lastBroadcast.startedAt : 'N/A'
                }</p>
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
                ${user.panels.map((panel) => `<li>${panel.id}</li>`).join('')}
            </ul>
        `;
    userInfoDiv.appendChild(panelsDiv);

    // Add event listeners to download buttons after they are added to the DOM
    const downloadButtons = document.querySelectorAll('.download-image');
    downloadButtons.forEach((button) => {
      button.addEventListener('click', downloadImage);
    });

    // Add event listener for copyable text
    const copyableText = document.querySelector('.copyable-text');
    if (copyableText) {
      copyableText.addEventListener('click', copyTextToClipboard);
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
      mode: 'cors', // Add this to handle CORS issues
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

  // Function to update each profile with live status and bio
  function updateRecentProfileData(user) {
    recentProfiles = recentProfiles.map((profile) => {
      if (profile.login === user.login) {
        profile.isLive = user.stream ? true : false; // Add the isLive property
        profile.bio = user.bio; // Add bio
      }
      return profile;
    });
    localStorage.setItem(CACHE_KEY, JSON.stringify(recentProfiles)); // Update local storage
    displayRecentProfiles(); // Refresh the display
  }

  function updateRecentProfiles(user) {
    // Check if the profile is already in recentProfiles
    const existingIndex = recentProfiles.findIndex(
      (profile) => profile.id === user.id
    );

    if (existingIndex !== -1) {
      // If it exists, remove it to move it to the front
      recentProfiles.splice(existingIndex, 1);
    }

    // Add the current user to the beginning of the array
    recentProfiles.unshift({
      id: user.id,
      displayName: user.displayName,
      logo: user.logo,
      login: user.login,
      isLive: user.stream ? true : false, // Initialize the live status
      bio: user.bio, // Initialize the bio
    });

    updateRecentProfileData(user);

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
    recentProfilesHTML += recentProfiles
      .map(
        (profile) => `
            <div class="profile-card">
                <div class="profile-image-container">
                    <a href="https://www.twitch.tv/${profile.login}" target="_blank">
                        <img src="${profile.logo}" alt="${
          profile.displayName
        }" class="${profile.isLive ? 'live-profile-image' : ''}">
                    </a>
                </div>
                <div class="profile-details">
                <p class="profile-bio">${profile.bio}</p>
                    <button class="view-stats-button" data-channel="${
                      profile.login
                    }">View Stats</button>
                </div>
            </div>
        `
      )
      .join('');

    recentProfilesDiv.innerHTML = recentProfilesHTML;

    // Add event listeners to the view stats buttons
    const viewStatsButtons = document.querySelectorAll('.view-stats-button');
    viewStatsButtons.forEach((button) => {
      button.addEventListener('click', function (event) {
        const channelName = event.target.dataset.channel;
        // Navigate to the stats page (replace with your actual stats page URL)
        window.location.href = `stats.html#${channelName}`;
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
