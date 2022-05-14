function videoControl() {
  // config  
  const useShiftAlt = true
  const useStopKeyPropagation = true
  
  // all messages:
  const msgNoVideo = "No presentation found"
  const msgNoVisibleVideo = "No visible presentation found"
  const msgNoFullscreen = "Error: Can't make full-screen"
  
  // panning delta (in %):
  const deltaPan = 1
  // zooming delta (in %):
  const deltaZoom = 0.1
  
  // only one instance 
  if (!!window.video_transform) return

  // init
  resetValues()

  // get all videos
  const videos = document.getElementsByTagName("video")
  let noVideo = !(!!videos && videos.length > 0)
  if (noVideo) {
    console.log(msgNoVideo)
    return
  }
  
  // all logic is in the keys handler
  document.addEventListener('keydown', function(event) {
    event = event || window.event
    
    if (useShiftAlt && !(event.altKey && event.shiftKey)) return

    // control only visible videos
    noVideo = true
    for (const v of videos) {
      if (isVisible(v)) {
        if (doCommandOnVideo(v, event.key)) {
          stopKeyPropagation(event)
        }
        noVideo = false
      }
    }

    if (noVideo) console.log(msgNoVisibleVideo)
  })

  function doCommandOnVideo(videoElement, cmdKey) {
      let changeStyle = true

      switch (`${cmdKey}`.toUpperCase()) {
        case 'S':
          // pan down
          window.video_transform.panY -= deltaPan
          window.video_transform.panY = Math.max(-100, window.video_transform.panY)
          break
        case 'W':
          // pan up
          window.video_transform.panY += deltaPan
          window.video_transform.panY = Math.min(100, window.video_transform.panY)
          break
        case 'D':
          // pan left
          window.video_transform.panX -= deltaPan
          window.video_transform.panX = Math.max(-100, window.video_transform.panX)
          break
        case 'A':
          // pan right
          window.video_transform.panX += deltaPan
          window.video_transform.panX = Math.min(100, window.video_transform.panX)
          break

        case '+':
          // fast zoom-in
          window.video_transform.zoom += deltaZoom * 3.0
          break
        case 'E':
          // zoom-in
          window.video_transform.zoom += deltaZoom
          break

        case '-':
          // fast zoom-out
          window.video_transform.zoom -= deltaZoom * 3.0
          window.video_transform.zoom = Math.max(deltaZoom, window.video_transform.zoom)
          break
        case 'Q':
          // zoom-out
          window.video_transform.zoom -= deltaZoom
          window.video_transform.zoom = Math.max(deltaZoom, window.video_transform.zoom)
          break

        case "R":
          // reset to defaults
          resetValues()
          break

        case 'F':
          // full-screen on/off
          if (!isFullscreen(videoElement)) {
            try {
              videoElement.requestFullscreen()
            } catch {
              console.log(msgNoFullscreen)
            }
          } else {
            document.exitFullscreen()
          }
          changeStyle = false
          break
        // case "ESCAPE":
        //   // full-screen off
        //   document.exitFullscreen()
        //   changeStyle = false
        //   break

        default:
          changeStyle = false
          break
      }

      if (changeStyle) {
        videoElement.style.transform = `scale(${window.video_transform.zoom}) translate(${window.video_transform.panX}%, ${window.video_transform.panY}%)`
      }

      return changeStyle
  }

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

  /**
  * Return whether an element is practically visible, considering things like 0
  * size or opacity, ``visibility: hidden`` and ``overflow: hidden``.
  *
  * Merely being scrolled off the page in either horizontally or vertically
  * doesn't count as invisible; the result of this function is meant to be
  * independent of viewport size.
  *
  * @throws {Error} The element (or perhaps one of its ancestors) is not in a
  *     window, so we can't find the `getComputedStyle()` routine to call. That
  *     routine is the source of most of the information we use, so you should
  *     pick a different strategy for non-window contexts.
  */
  function isVisible(element) {
    const elementWindow = window;
    const elementRect = element.getBoundingClientRect();
    const elementStyle = elementWindow.getComputedStyle(element);
    // Alternative to reading ``display: none`` due to Bug 1381071.
    if (elementRect.width === 0 && elementRect.height === 0 && elementStyle.overflow !== 'hidden') {
        return false;
    }
    if (elementStyle.visibility === 'hidden') {
        return false;
    }
    // Check if the element is irrevocably off-screen:
    if (elementRect.x + elementRect.width < 0 ||
        elementRect.y + elementRect.height < 0
    ) {
        return false;
    }
    for (const ancestor of ancestors(element)) {
        const isElement = ancestor === element;
        const style = isElement ? elementStyle : elementWindow.getComputedStyle(ancestor);
        if (style.opacity === '0') {
            return false;
        }
        if (style.display === 'contents') {
            // ``display: contents`` elements have no box themselves, but children are
            // still rendered.
            continue;
        }
        const rect = isElement ? elementRect : ancestor.getBoundingClientRect();
        if ((rect.width === 0 || rect.height === 0) && elementStyle.overflow === 'hidden') {
            // Zero-sized ancestors don’t make descendants hidden unless the descendant
            // has ``overflow: hidden``.
            return false;
        }
    }
    return true;


    /**
     * Yield an element and each of its ancestors.
     */
    function *ancestors(element) {
      yield element;
      let parent;
      while ((parent = element.parentNode) !== null && parent.nodeType === parent.ELEMENT_NODE) {
          yield parent;
          element = parent;
      }
    }
  }
  
  function stopKeyPropagation(event) {
    if (!useStopKeyPropagation) return

    event.preventDefault()
    if (!!event.stopImmediatePropagation) event.stopImmediatePropagation()
    if (!!event.stopPropagation) event.stopPropagation()
    else event.cancelBubble = true
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
