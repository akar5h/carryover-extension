// Allow content scripts to access chrome.storage.session.
// By default session storage is restricted to trusted contexts (service worker,
// extension pages). Both listeners are required: onInstalled covers fresh installs
// and updates; onStartup covers every subsequent browser launch.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })
})

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })
})
