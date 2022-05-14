function videoControl() {
  const config = {
    // command keys options:
    useShiftAlt: false,           // Shift + Alt has to be pressed with the command key
    useStopKeyPropagation: false, // Stop command key propagation if consumed

    // video control parameters:
    deltaPan: 1,      // panning delta (position is <-100%, 100> in both axes)
    deltaZoom: 0.1,   // zooming delta (zoom is a multiplier in range <deltaZoom, ...>)
    fastZoomMul: 3.0  // deltaZoom multiplier for fast zooming
  }
  
  // all messages
  const messages = {
    noVideo: "No presentation found",
    noVisibleVideo: "No visible presentation found",
    noFullscreen: "Error: Can't make full-screen",
  }
  
  // all video control keys and functions
  // !controller keys are UPPERCASE!
  // !func returns bool. Returning true updates video element style.
  const controller = {
    panUp: {
      key: 'W',
      func: () => {
        window.video_transform.panY += config.deltaPan
        window.video_transform.panY = Math.min(100, window.video_transform.panY)
        return true // return true - update element style
      }},

    panDown: {
      key: 'S',
      func: () => {
        window.video_transform.panY -= config.deltaPan
        window.video_transform.panY = Math.max(-100, window.video_transform.panY)
        return true // return true - update element style
      }},
    
    panLeft: {
      key: 'A',
      func: () => {
        window.video_transform.panX += config.deltaPan
        window.video_transform.panX = Math.min(100, window.video_transform.panX)
        return true // return true - update element style
      }},

    panRight: {
      key: 'D',
      func: () => {
        window.video_transform.panX -= config.deltaPan
        window.video_transform.panX = Math.max(-100, window.video_transform.panX)
        return true // return true - update element style
      }},

    zoomInFast: {
      key: '+',
      func: () => {
        window.video_transform.zoom += config.deltaZoom * config.fastZoomMul
        return true // return true - update element style
      }},

    zoomIn: {
      key: 'E',
      func: () => {
        window.video_transform.zoom += config.deltaZoom
        return true // return true - update element style
      }},

    zoomOutFast: {
      key: '-',
      func: () => {
        window.video_transform.zoom -= config.deltaZoom * config.fastZoomMul
        window.video_transform.zoom = Math.max(config.deltaZoom, window.video_transform.zoom)
        return true // return true - update element style
      }},

    zoomOut: {
      key: 'Q',
      func: () => {
        window.video_transform.zoom -= config.deltaZoom
        window.video_transform.zoom = Math.max(config.deltaZoom, window.video_transform.zoom)
        return true // return true - update element style
      }},

    reset: {
      key: 'R',
      func: () => {
        resetValues()
        return true // return true - update element style
      }},

    fullscreen: {
      key: 'F',
      func: () => {
        // full-screen on/off
        if (!isFullscreen(videoElement)) {
          try {
            videoElement.requestFullscreen()
          } catch {
            console.log(messages.noFullscreen)
          }
        } else {
          document.exitFullscreen()
        }
        return false  // return false - do NOT update element style
      }},
  }
  

  // init
  resetValues()

  // get all videos
  const videos = document.getElementsByTagName("video")
  if (!(!!videos && videos.length > 0)) {
    console.log(messages.noVideo)
    return
  }
  
  // add global key listener
  document.addEventListener('keydown', function(event) {
    event = event || window.event
    
    if (config.useShiftAlt && !(event.altKey && event.shiftKey)) return

    // control only visible videos
    let noVisVideo = true
    for (const v of videos) {
      if (isVisible(v)) {
        if (doCommandOnVideo(v, event.key)) {
          stopKeyPropagation(event)
        }
        noVisVideo = false
      }
    }

    if (noVisVideo) console.log(messages.noVisibleVideo)
  })

  function doCommandOnVideo(videoElement, cmdKey) {
      let isKeyConsumed = false
      cmdKey = `${cmdKey}`.toUpperCase()
      
      let updateStyle = false
      // loop thru keys and invoke func on first key matching pressed key, then break
      Object.entries(controller).every((obj) => {
        if (cmdKey === obj[1].key) {
          updateStyle = obj[1].func()
          isKeyConsumed = true
          return false      // break
        } else return true  // continue
      })
      
      if (updateStyle) {
        videoElement.style.transform = `scale(${window.video_transform.zoom}) translate(${window.video_transform.panX}%, ${window.video_transform.panY}%)`
      }

      return isKeyConsumed
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
    if (!config.useStopKeyPropagation) return

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
