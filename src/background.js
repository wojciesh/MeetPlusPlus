function videoControl() {
  // init
  resetValues()

  // all logic is in the keys handler
  document.addEventListener('keydown', function(event) {
    const video = document.getElementsByTagName("video") || false
    if (video && video.length > 0) {
      const v = video[0]
      const key = event.key
      let changeStyle = true

      switch (key) {
        case 'ArrowUp':
          // pan up
          window.video_transform.panY -= 2
          window.video_transform.panY = Math.max(-100, window.video_transform.panY)
          break
        case 'ArrowDown':
          // pan down
          window.video_transform.panY += 2
          window.video_transform.panY = Math.min(100, window.video_transform.panY)
          break
        case 'ArrowLeft':
          // pan left
          window.video_transform.panX -= 2
          window.video_transform.panX = Math.max(-100, window.video_transform.panX)
          break
        case 'ArrowRight':
          // pan right
          window.video_transform.panX += 2
          window.video_transform.panX = Math.min(100, window.video_transform.panX)
          break

        case '+':
          // zoom-in
          window.video_transform.zoom += 0.25
          break
        case '-':
          // zooom-out
          window.video_transform.zoom -= 0.25
          window.video_transform.zoom = Math.max(0, window.video_transform.zoom)
          break

        case "0":
          // reset to defaults
          resetValues()
          break

        case 'f':
          // full-screen on/off
          if (!isFullscreen(v)) {
            v.requestFullscreen()
          } else {
            document.exitFullscreen()
          }
          changeStyle = false
          break
        case "Escape":
          // full-screen off
          document.exitFullscreen()
          changeStyle = false
          break

        default:
          changeStyle = false
          break
      }

      if (changeStyle) {
        v.style.transform = `scale(${window.video_transform.zoom}) translate(${window.video_transform.panX}%, ${window.video_transform.panY}%)`
      }

    } else {
      alert("No presentation/video found.")
    }
  })

  // reset video transform values
  function resetValues() {
    window.video_transform = {
      panX: 0,
      panY: 0,
      zoom: 1.0,
    }
  }

  // checks if element is currently full screen
  function isFullscreen(element = false) {
    return !!element
      ? document.fullscreenElement === element
      : document.fullscreenElement != null;
  }
}

chrome.action.onClicked.addListener((tab) => {
  if(!tab.url.includes("chrome://")) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: videoControl
    });
  }
});
