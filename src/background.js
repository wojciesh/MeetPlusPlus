function videoControl() {
  const config = {
    appName: 'Meet++',                          // app name in human readable form
    appNameCanonical: 'MeetPlusPlus',           // app name in canonical form
    attrName: `data-MeetPlusPlus-selected`,     // selected videos data attribute
    attrUID: `data-MeetPlusPlus-uid`,           // uid data attribute
    cssClassSelected: `MeetPlusPlus-selected`,  // selected videos class name without the dot!

    // command keys options:
    useShiftAlt: true,            // Shift + Alt has to be pressed with the command key
    useStopKeyPropagation: false, // Stop command key propagation if consumed

    // video control parameters:
    deltaPan: 1,      // panning delta (position is <-100%, 100> in both axes)
    deltaZoom: 0.1,   // zooming delta (zoom is a multiplier in range <deltaZoom, ...>)
    fastZoomMul: 3.0, // deltaZoom multiplier for fast zooming

    // user changeable vars:
    useBorder: true,  // show border on selected videos
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
    useBorder: {
      key: 'B',
      func: (videoElement) => {
        // change state
        config.useBorder = !config.useBorder
        // update videos
        let all = getAllSelectedVideos()
        all.forEach(v => {
          if (config.useBorder)
            v.classList.add(config.cssClassSelected)
          else
            v.classList.remove(config.cssClassSelected)
        })
        return false // return false - do NOT update element style
      }},

    panUp: {
      key: 'W',
      func: (videoElement) => {
        window.mpp_video_transform[getUID(videoElement)].panY += config.deltaPan
        window.mpp_video_transform[getUID(videoElement)].panY = Math.min(100, window.mpp_video_transform[getUID(videoElement)].panY)
        return true // return true - update element style
      }},

    panDown: {
      key: 'S',
      func: (videoElement) => {
        window.mpp_video_transform[getUID(videoElement)].panY -= config.deltaPan
        window.mpp_video_transform[getUID(videoElement)].panY = Math.max(-100, window.mpp_video_transform[getUID(videoElement)].panY)
        return true // return true - update element style
      }},
    
    panLeft: {
      key: 'A',
      func: (videoElement) => {
        window.mpp_video_transform[getUID(videoElement)].panX += config.deltaPan
        window.mpp_video_transform[getUID(videoElement)].panX = Math.min(100, window.mpp_video_transform[getUID(videoElement)].panX)
        return true // return true - update element style
      }},

    panRight: {
      key: 'D',
      func: (videoElement) => {
        window.mpp_video_transform[getUID(videoElement)].panX -= config.deltaPan
        window.mpp_video_transform[getUID(videoElement)].panX = Math.max(-100, window.mpp_video_transform[getUID(videoElement)].panX)
        return true // return true - update element style
      }},

    zoomInFast: {
      key: '+',
      func: (videoElement) => {
        window.mpp_video_transform[getUID(videoElement)].zoom += config.deltaZoom * config.fastZoomMul
        return true // return true - update element style
      }},

    zoomIn: {
      key: 'E',
      func: (videoElement) => {
        window.mpp_video_transform[getUID(videoElement)].zoom += config.deltaZoom
        return true // return true - update element style
      }},

    zoomOutFast: {
      key: '-',
      func: (videoElement) => {
        window.mpp_video_transform[getUID(videoElement)].zoom -= config.deltaZoom * config.fastZoomMul
        window.mpp_video_transform[getUID(videoElement)].zoom = Math.max(config.deltaZoom, window.mpp_video_transform[getUID(videoElement)].zoom)
        return true // return true - update element style
      }},

    zoomOut: {
      key: 'Q',
      func: (videoElement) => {
        window.mpp_video_transform[getUID(videoElement)].zoom -= config.deltaZoom
        window.mpp_video_transform[getUID(videoElement)].zoom = Math.max(config.deltaZoom, window.mpp_video_transform[getUID(videoElement)].zoom)
        return true // return true - update element style
      }},

    reset: {
      key: 'R',
      func: (videoElement) => {
        resetValues(videoElement)
        return true // return true - update element style
      }},

    // Chrome policy: Requesting fullscreen has to be handled inside the user-fired action!
    fullscreen: {
      key: 'F',
      func: (videoElement) => {
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

  
  // !only one instance allowed
  // if (!!window.mpp_video_transform) return

  // !only once - add css class
  if (!!!window.mpp_video_transform) {
    let style = document.createElement('style')
    style.type = 'text/css';
    style.innerHTML = `.${config.cssClassSelected} { border: 4px dashed rgba(224,224,0,0.62); }`
    document.getElementsByTagName('head')[0].appendChild(style)  
  }

  // init
  resetValues()

  for (let elem of document.querySelectorAll('*')) {
    elem.removeEventListener("click", selectVideo)
    elem.addEventListener("click", selectVideo)
  }

  // add global key listener
  document.removeEventListener('keydown', onKeyDown)
  document.addEventListener('keydown', onKeyDown)
  
  function onKeyDown(event) {
    event = event || window.event
    
    if (config.useShiftAlt && !(event.altKey && event.shiftKey)) return
    
    // control first selected & visible video
    let selVideo = getSelectedVisibleVideo()
    if (!!!selVideo) {
      // no selected visible video - find any visible video on the page
      selVideo = findVisibleVideoInside(document.getElementsByTagName("body")[0])
      if (!!selVideo) {
        // select it
        setVideoSelection(selVideo, true)
      }
    }

    if (!!selVideo) {
      // init if needed
      initValuesIfNone(selVideo)

      let cmdKey = event.key.toUpperCase()

      // Chrome policy: handle fullscreen here - inside user-fired event 
      if (cmdKey === controller.fullscreen.key) {
        controller.fullscreen.func(selVideo)
        stopKeyPropagation(event)
      } else if (doCommandOnVideo(selVideo, cmdKey)) {
        stopKeyPropagation(event)
      }
    } else console.log(messages.noVisibleVideo)
  }

  function getAllSelectedVideos() {
    const selVideos = document.querySelectorAll(`[${config.attrName}]`)
    if (!(!!selVideos && selVideos.length > 0)) {
      console.log(messages.noVideo)
      return []
    } else
      return selVideos
  }
  
  function getSelectedVisibleVideo() {
    return [...getAllSelectedVideos()].find(v => isVisible(v))
  }

  function doCommandOnVideo(videoElement, cmdKey) {
      let isKeyConsumed = false
      cmdKey = `${cmdKey}`.toUpperCase()
      
      let updateStyle = false
      // loop thru keys and invoke func on first key matching pressed key, then break
      Object.entries(controller).every((obj) => {
        if (cmdKey === obj[1].key) {
          updateStyle = obj[1].func(videoElement)
          isKeyConsumed = true
          return false      // break
        } else return true  // continue
      })
      
      if (updateStyle) {
        videoElement.style.transform = `scale(${window.mpp_video_transform[getUID(videoElement)].zoom}) translate(${window.mpp_video_transform[getUID(videoElement)].panX}%, ${window.mpp_video_transform[getUID(videoElement)].panY}%)`
      }

      return isKeyConsumed
  }

  function selectVideo(event) {
    // fire only once
    if (this !== event.target) return

    // deselect all selected videos
    // get all selected videos (should be only one, but for the safety assume more)
    const selVideos = getAllSelectedVideos()
    for (const selVideo of selVideos) {
      setVideoSelection(selVideo, false)
    }
    
    let me = this
    if (me.tagName.toUpperCase() !== "VIDEO") {
      // find video if needed
      const allAtMousePos = document.elementsFromPoint(event.pageX, event.pageY)
      me = allAtMousePos?.find(e => 
            e.localName.toUpperCase() === "VIDEO" && isVisible(e)) 
            ?? null

      if (!me && !!allAtMousePos) {
        for (let el of allAtMousePos) {
          me = findVisibleVideoInside(el)
          if (!!me) break
        }
      }
    }
    
    // select me
    if (me) setVideoSelection(me, true)
  }

  function findVisibleVideoInside(containerElement) {
    if (containerElement.tagName.toUpperCase() !== "VIDEO") {
      const myVideos = containerElement.getElementsByTagName("video")
      if (!(!!myVideos && myVideos.length > 0)) {
        containerElement = null  // no video under me
      } else {
        containerElement = [...myVideos].find(v => isVisible(v))
        if (!!!containerElement) {
          containerElement = null  // no visible video under me
        }
      }
    }
    return containerElement
  }

  function setVideoSelection(element, isSelected) {
    if (isSelected) {
      element.setAttribute(config.attrName, true)
      if (config.useBorder) element.classList.add(config.cssClassSelected)
      // element.style.border = '2px dotted yellow'
    } else {
      // element.style.removeProperty('border')
      element.classList.remove(config.cssClassSelected)
      element.removeAttribute(config.attrName)
    }
  }

  // reset video transform values
  function resetValues(videoElement) {
    if (!!videoElement) {
      window.mpp_video_transform[getUID(videoElement)] = null
      initValuesIfNone(videoElement)
    }
    else
      window.mpp_video_transform = window.mpp_video_transform || []
  }

  function initValuesIfNone(videoElement) {
    window.mpp_video_transform[getUID(videoElement)] = 
      window.mpp_video_transform[getUID(videoElement)] || {
        panX: 0, 
        panY: 0, 
        zoom: 1.0 
      }
  }

  function getUID(videoElement) {
    if (!!!videoElement) return "null"
    
    // !this uid is valid only for Google Meet video elements!
    // if ('uid' in videoElement.dataset) {
    //   return videoElement.dataset.uid
    // }

    // universal UID
    let uid = videoElement.getAttribute(config.attrUID)
    if (!uid) {
      uid = self.crypto.randomUUID()
      videoElement.setAttribute(config.attrUID, uid)
    }
    return uid
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
