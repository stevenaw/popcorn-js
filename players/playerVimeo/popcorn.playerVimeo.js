// Popcorn Vimeo Player Wrapper
( function ( Popcorn ) {
  /**
  * Vimeo wrapper for Popcorn.
  * This player adds enables Popcorn.js to handle Vimeo videos. It does so by masking an embedded Vimeo video iframe
  * as a video and implementing the HTML5 Media Element interface.
  *
  * To use this plug-in, include the Vimeo JavaScript API Froogaloop in the parent HTML page as well as the embedded Vimeo iframe:
  *
  *   <script src="https://github.com/downloads/vimeo/froogaloop/froogaloop.v1.0.min.js"></script>
  *
  * You can specify the video in three ways:
  *  1. Use the embed code supplied by Vimeo, and pass the iframe id into a new Popcorn.VimeoEngine object
  *
  *    <iframe id="player_1" src="http://player.vimeo.com/video/11127501?js_api=1&js_swf_id=player_1" width="500" height="281" frameborder="0"></iframe>
  *    <script type="text/javascript">
  *      document.addEventListener("DOMContentLoaded", function() {
  *        var player = new Popcorn.VimeoEngine( "player_1" );
  *      });
  *    </script>
  *
  *  2. Use an empty iframe and give both the iframe id and the web url when creating a new Popcorn.VimeoEngine
  *
  *    <iframe id="player_1" width="500" height="281" frameborder="0"></iframe>
  *    <script type="text/javascript">
  *      document.addEventListener("DOMContentLoaded", function() {
  *        var player = new Popcorn.VimeoEngine( "player_1", "http://vimeo.com/11127501" );
  *      });
  *    </script>
  *
  *  3. Set the iframe's src attribute to the vimeo video's web url, and pass the id when creating a new Popcorn.VimeoEngine
  *
  *    <iframe id="player_1" src="http://vimeo.com/11127501" width="500" height="281" frameborder="0"></iframe>
  *    <script type="text/javascript">
  *      document.addEventListener("DOMContentLoaded", function() {
  *        var player = new Popcorn.VimeoEngine( "player_1" );
  *      });
  *    </script>
  *
  * Due to Vimeo's API, certain events can be subscribed to at different times, and some not at all.
  * These events may be subscribed to during or after the DOMContentLoaded event:
  *   durationchange
  *   load
  *   play
  *   readystatechange
  *   volumechange
  *
  * These events may be subscribed to during or after the load event:
  *   abort
  *   emptied
  *   ended
  *   pause
  *   playing
  *   progress
  *   seeked
  *   timeupdate
  *
  * These events are not supported:
  *   canplay
  *   canplaythrough
  *   error
  *   loadeddata
  *   loadedmetadata
  *   loadstart
  *   ratechange
  *   seeking
  *   stalled
  *   suspend
  *   waiting
  *
  * Due to Vimeo's API, some attributes are be supported while others are not.
  * Supported media attributes:
  *   autoplay
  *   currentTime ( get only, set by calling setCurrentTime() )
  *   duration ( get only )
  *   ended ( get only )
  *   initialTime ( get only, always 0 )
  *   loop ( get only, set by calling setLoop() )
  *   muted ( get only, set by calling setVolume(0) )
  *   paused ( get only )
  *   readyState ( get only )
  *   src ( get only )
  *   volume ( get only, set by calling setVolume() )
  *
  * Unsupported media attributes:
  *   buffered
  *   defaultPlaybackRate
  *   networkState
  *   playbackRate
  *   played
  *   preload
  *   seekable
  *   seeking
  *   startOffsetTime
  */
  
  // base object for DOM-related behaviour like events
  var LikeADOM = function ( owner ) {
    var evts = {};
    
    return {
      addEventListener: function( evtName, fn, doFire ) {
        evtName = evtName.toLowerCase();
        
        if ( !evts[evtName] ) {
          evts[evtName] = [];
          
          // Create a wrapper function to all registered listeners
          this["on"+evtName] = function() {
            var subEvts = evts[evtName],
                i,
                l;
        
            for ( i = 0, l = subEvts.length; i < l; i++ ) {
              subEvts[i].call( owner );
            }
          }
        }
        
        evts[evtName].push(fn);
        
        if ( doFire ) {
          dispatchEvent( evtName );
        }
        
        return fn;
      },
      removeEventListener: function( evtName, fn ) {
        var evtArray = this.getEventListeners( evtName ),
            i,
            l;
        
        // Find and remove from events array
        for ( i = 0, l = evtArray.length; i < l; i++) {
          if ( evtArray[i] === fn ) {
            evtArray.splice( i, 1 );
            break;
          }
        }
      },
      getEventListeners: function( evtName ) {
        return evts[ evtName.toLowerCase() ] || [];
      },
      dispatchEvent: function( evt ) {        
        // If event object was passed in, toString will yield type (timeupdate)
        // If a string, toString() will return the string itself (timeupdate)
        var evt = "on"+evt.toString().toLowerCase();
        if ( this[evt] )
          this[evt]();
      }
    };
  };
  
  // A constructor, but we need to wrap it to allow for "static" functions
  Popcorn.VimeoEngine = (function() {
    var rPlayerUri = /^http:\/\/player\.vimeo\.com\/video\/[\d]+/i,
        rWebUrl = /vimeo\.com\/[\d]+/;
    
    // Extract the numeric video id from container uri: 'http://player.vimeo.com/video/11127501' or 'http://player.vimeo.com/video/4282282'
    // Expect id to be a valid 32/64-bit unsigned integer
    // Returns string, empty string if could not match
    function extractIdFromUri( uri ) {
      var matches = uri.match( rPlayerUri );
      return matches ? matches[0].substr(30) : "";
    };
    
    // Extract the numeric video id from url: 'http://vimeo.com/11127501' or simply 'vimeo.com/4282282'
    // Ignores protocol and subdomain, but one would expecct it to be http://www.vimeo.com/#######
    // Expect id to be a valid 32/64-bit unsigned integer
    // Returns string, empty string if could not match
    function extractIdFromUrl( url ) {
      var matches = url.match( rWebUrl );
      return matches ? matches[0].substr(10) : "";
    };
  
    // If container id is not supplied, assumed to be same as player id
    var ctor = function ( containerId, videoUrl ) {
      if ( !containerId ) {
        throw "Must supply an id!";
      }
      
      var swfObj = document.getElementById( containerId ),
          isLoop = 0,
          vidId,
          retObj,
          evtHolder;
          
      if ( !swfObj ) {
        throw "Invalid id, could not find it!";
      } else if ( !Froogaloop || !Froogaloop.init ) {
        // Clear source so as not to accidentally be diverted
        swfObj.src = "";
        throw "This plugin requires the Froogaloop framework!";
      }
      
      evtHolder = new LikeADOM( swfObj );
      
      swfObj.paused = true;
      swfObj.duration = -1;
      swfObj.readyState = 0;
      swfObj.ended = 0;
      swfObj.currentTime = -1;
      swfObj.volume = 0.5;
      swfObj.loop = 0;
      swfObj.initialTime = 0;
      swfObj.muted = swfObj.volume === 0;
      swfObj.autoplay;
      
      // Try and get a video id from a vimeo site url
      // Try eithere from ctor param or from iframe itself
      if( videoUrl ) {
        vidId = extractIdFromUrl( videoUrl );
      } else {
        vidId = extractIdFromUrl( swfObj.src )
      }
      
      // If was able to gete a video id
      if ( vidId ) {
        // Set iframe source to vimeo player and id
        // Note that speccifying a web url will over-write any src attribute already on the iframe
        swfObj.src = "http://player.vimeo.com/video/"+vidId+"?js_api=1&js_swf_id="+containerId;
      }
      
      // Link up with froogaloop, requires an array of iframes
      Froogaloop.init( [swfObj] );
          
      // Hook an event listener for the player event into internal event system
      // Stick to HTML conventions of add event listener and keep lowercase, without prependinng "on"
      swfObj.addEventListener = function( evt, fn, capture ) {
        var playerEvt;
        
        evt = evt.toLowerCase();
        
        // If it's an HTML media event supported by player, map
        if ( evt === "seeked" ) {
          playerEvt = "onSeek";
        } else if ( evt === "timeupdate" ) {
          playerEvt = "onProgress";
        } else if ( evt === "progress" ) {
          playerEvt = "onLoading";
        } else if ( evt === "ended" ) {
          playerEvt = "onFinish";
        } else if ( evt === "playing" ) {
          playerEvt = "onPlay";
        } else if ( evt === "pause" || evt === "load" ) {
          // Direct mapping, CamelCase the event name as vimeo API expects
          playerEvt = "on"+evt[0].toUpperCase() + evt.substr(1);
        }
        
        // Vimeo only stores 1 callback per event
        // Have vimeo call internal collection of callbacks
        evtHolder.addEventListener( evt, fn, capture );
        
        // Link manual event structure with Vimeo's if not already
        // Do not link for 'timeUpdate', that is done as a chain instead:
        // Vimeo.timeupdate calls 
        if( evt !== "timeupdate" && playerEvt && evtHolder.getEventListeners( evt ).length === 1 ) {
          swfObj.addEvent( playerEvt, function() {
            evtHolder.dispatchEvent( evt );
          });
        }
      }
      
      retObj = Popcorn.extend(swfObj, {
        // Popcorn's extend can't handle get/set
        // Do evereything as functions
        setLoop: function( val ) {
          swfObj.loop = val;
          isLoop = val === "loop" ? 1 : 0;
          // HTML convention says to loop if value is 'loop'
          swfObj.api('api_setLoop', isLoop );
        },
        // Set the volume as a value between 0 and 1
        setVolume: function( val ) {
          // Normalize in case outside rangee of expected values
          if ( val < 0 ) {
            val = -val;
          }
          
          if ( val > 1 ) {
            val %= 1;
          }
          
          // HTML video expects to be 0.0 -> 1.0, Vimeo expects 0-100
          swfObj.volume = val;
          swfObj.muted = val === 0;
          swfObj.api( "api_setVolume", val*100 );
          evtHolder.dispatchEvent( "volumechange" );
        },
        // Play the video
        play: function() {
          evtHolder.dispatchEvent( "play" );
          swfObj.api( "api_play" );
        },
        // Pauses the video
        pause: function() {
          swfObj.api( "api_pause" );
        },
        unload: function() {
          retObj.pause();
          
          evtHolder.dispatchEvent( "abort" );
          evtHolder.dispatchEvent( "emptied" );
          swfObj.api( "api_unload" );
        },
        // Seeks the video
        setCurrentTime: function ( time ) {
          swfObj.api( "api_seekTo", time );
          swfObj.currentTime = time;
          swfObj.ended = time < swfObj.duration;
          
          // Fire events for seeking and time change
          evtHolder.dispatchEvent( "timeupdate" );
          evtHolder.dispatchEvent( "seeked" );
        },
      });
      
      // Set up listeners to internally track state as needed
      retObj.addEventListener( "load", function() {
        var loadingFn;
        
        swfObj.get( "api_getDuration", function( duration ) {
          swfObj.duration = duration;
          evtHolder.dispatchEvent( "durationchange" );
        });
        
        // Chain events and calls together so that this.currentTime reflects the current time of the video
        // Done by Getting the Current Time while the video plays
        swfObj.addEvent( "onProgress", function() {
          swfObj.get( "api_getCurrentTime", function( time ) {
            swfObj.currentTime = parseFloat( time );
            evtHolder.dispatchEvent( "timeupdate" );
          });
        });
        
        // Add pause listener to keep track of playing state
        retObj.addEventListener( "pause", function() {
          swfObj.paused = true;
        });
        
        // Add play listener to keep track of playing state
        retObj.addEventListener( "playing", function() {
          swfObj.paused = false;
          swfObj.ended = 0;
        });
        
        // Add ended listener to keep track of playing state
        retObj.addEventListener( "ended", function() {
          if ( !isLoop ) {
            swfObj.paused = true;
            swfObj.ended = 1;
          }
        });
        
        // Add progress listener to keep track of ready state
        loadingFn = retObj.addEventListener( "progress", function() {
          swfObj.readyState = 3;
          evtHolder.dispatchEvent( "readystatechange" );
          evtHolder.removeEventListener( "progress", loadingFn );
        });
        
        if ( swfObj.autoplay ) {
          swfObj.play();
        }
        
        swfObj.setVolume( swfObj.volume );
      });
    
      return retObj;
    }
    return ctor;
  })();
})( Popcorn );