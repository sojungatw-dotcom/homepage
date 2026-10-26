/* A draft is accepted only from the same-origin admin parent, and never persisted. */
window.oveChatbotPreview = true;
window.oveChatbotPreviewReady = new Promise(resolve => {
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== location.origin || event.data?.type !== 'ove-chatbot-draft') return;
    if (window.OveChatSchema.validate(event.data.content).length) return;
    window.oveChatbotPreviewNonce = event.data.nonce;
    resolve(event.data.content);
  });
});
window.parent.postMessage({type:'ove-chatbot-preview-ready'},location.origin);
