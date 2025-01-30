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

      // Store original values for cleanup
      const originalValues = {
        observer: null,
        RTCPeerConnection: window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection
      };

      function startMonitoring() {
        // Mutation Observer
        originalValues.observer = new MutationObserver(() => {
          const monitoredDiv = document.querySelector('.monitoredSec1');
          if (monitoredDiv) {
            const textDiv = monitoredDiv.querySelector('div');
            if (textDiv) textDiv.textContent = 'Salbeh Was Here.';
          }
        });
        originalValues.observer.observe(document.body, { childList: true, subtree: true });

        // WebRTC Monitoring
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
                      updateOrCreateDiv(
                        countryInfoDiv,
                        'ipAddress',
                        \`
                        <div>IP Address: \${ipAddress}</div>
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
                        \`,
                        { marginLeft: '10px' }
                      );
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
        if (originalValues.observer) {
          originalValues.observer.disconnect();
        }
        window.RTCPeerConnection = originalValues.RTCPeerConnection;
        
        // Cleanup DOM elements
        const ipElement = document.getElementById('ipAddress');
        if (ipElement) ipElement.remove();
        
        const monitoredDivs = document.querySelectorAll('.monitoredSec1 div');
        monitoredDivs.forEach(div => div.textContent = '');
      }

      // Start initial monitoring
      startMonitoring();

      // Listen for cleanup events
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