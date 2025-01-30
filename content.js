let isEnabled = true;
let extensionInitialized = false;

chrome.storage.local.get('enabled', (data) => {
  isEnabled = data.enabled !== false;
  if (isEnabled) initializeExtension();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    isEnabled = changes.enabled.newValue;
    if (isEnabled && !extensionInitialized) {
      initializeExtension();
    } else if (!isEnabled && extensionInitialized) {
      cleanupExtension();
    }
  }
});

function initializeExtension() {
  extensionInitialized = true;
  const injectedScript = document.createElement('script');
  injectedScript.textContent = `
    (function() {
      'use strict';
      
      function updateOrCreateDiv(parent, id, content, style = {}) {
        let element = document.getElementById(id);
        if (!element) {
          element = document.createElement('div');
          element.id = id;
          Object.assign(element.style, style);
          parent.appendChild(element);
        }
        element.innerHTML = content;
      }

      const originalValues = {
        observer: null,
        RTCPeerConnection: window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection
      };

      function startMonitoring() {
        originalValues.observer = new MutationObserver(() => {
          const monitoredDiv = document.querySelector('.monitoredSec1');
          if (monitoredDiv) {
            const textDiv = monitoredDiv.querySelector('div');
            if (textDiv) textDiv.textContent = 'Salbeh Was Here.';
          }
        });
        originalValues.observer.observe(document.body, { childList: true, subtree: true });

        if (originalValues.RTCPeerConnection) {
          window.RTCPeerConnection = function(...args) {
            const pc = new originalValues.RTCPeerConnection(...args);
            const originalAddIceCandidate = pc.addIceCandidate.bind(pc);

            pc.addIceCandidate = function(iceCandidate, ...rest) {
              try {
                if (iceCandidate?.candidate) {
                  const fields = iceCandidate.candidate.split(' ');
                  if (fields[7] === 'srflx') {
                    const ipAddress = fields[4];
                    const countryInfoDiv = document.querySelector('.countryInfo');
                    if (countryInfoDiv) {
                      const ipElementId = 'ipAddress';
                      const initialContent = \`
                        <div>IP Address: \${ipAddress}</div>
                        <div>Loading IP information...</div>
                        <button id="copyIPButton" style="
                          margin-top: 10px;
                          padding: 8px 12px;
                          background-color: #007bff;
                          color: white;
                          border: none;
                          border-radius: 5px;
                          cursor: pointer;
                          font-size: 14px;
                        ">Copy IP</button>
                        <div style="color: red;">Thanks Salbeh</div>
                      \`;
                      updateOrCreateDiv(
                        countryInfoDiv,
                        ipElementId,
                        initialContent,
                        { marginLeft: '10px' }
                      );

                      fetch(\`https://get.geojs.io/v1/ip/geo/\${ipAddress}.json\`)
                        .then(response => response.json())
                        .then(data => {
                          const importantDetails = \`
                            <div>Organization: \${data.organization_name}</div>
                            <div>Location: \${data.city}, \${data.region}, \${data.country}</div>
                            <div>Timezone: \${data.timezone}</div>
                            <div>Coordinates: \${data.latitude}, \${data.longitude}</div>
                          \`;
                          const updatedContent = \`
                            <div>IP Address: \${ipAddress}</div>
                            \${importantDetails}
                            <button id="copyIPButton" style="
                              margin-top: 10px;
                              padding: 8px 12px;
                              background-color: #007bff;
                              color: white;
                              border: none;
                              border-radius: 5px;
                              cursor: pointer;
                              font-size: 14px;
                            ">Copy IP</button>
                            <div style="color: red;">Thanks Salbeh</div>
                          \`;
                          const element = document.getElementById(ipElementId);
                          if (element) element.innerHTML = updatedContent;
                        })
                        .catch(error => {
                          console.error('Error fetching IP info:', error);
                          const element = document.getElementById(ipElementId);
                          if (element) {
                            const errorDiv = element.querySelector('div:nth-child(2)');
                            if (errorDiv) errorDiv.textContent = 'Failed to load IP details';
                          }
                        });
                    }
                  }
                }
              } catch (error) {
                console.error('Error processing ICE Candidate:', error);
              }
              return originalAddIceCandidate(iceCandidate, ...rest);
            };
            return pc;
          };
        }
      }

      function stopMonitoring() {
        if (originalValues.observer) originalValues.observer.disconnect();
        window.RTCPeerConnection = originalValues.RTCPeerConnection;
        const ipElement = document.getElementById('ipAddress');
        if (ipElement) ipElement.remove();
        const monitoredDivs = document.querySelectorAll('.monitoredSec1 div');
        monitoredDivs.forEach(div => div.textContent = '');
      }

      startMonitoring();
      window.addEventListener('extensionDisable', stopMonitoring);
    })();
  `;
  document.documentElement.appendChild(injectedScript);
}

function cleanupExtension() {
  extensionInitialized = false;
  const cleanupEvent = new Event('extensionDisable');
  window.dispatchEvent(cleanupEvent);
}

document.addEventListener('click', function(event) {
  if (!isEnabled) return;
  
  const button = event.target.closest('#copyIPButton');
  if (button) {
    const ipDiv = button.previousElementSibling;
    if (ipDiv) {
      const ipMatch = ipDiv.textContent.match(/IP Address: (\S+)/);
      if (ipMatch) {
        const ip = ipMatch[1];
        navigator.clipboard.writeText(ip)
          .then(() => {
            button.textContent = 'Copied!';
            button.style.backgroundColor = '#28a745';
            setTimeout(() => {
              button.textContent = 'Copy IP';
              button.style.backgroundColor = '#007bff';
            }, 2000);
          })
          .catch(err => console.error('Failed to copy IP:', err));
      }
    }
  }
});
