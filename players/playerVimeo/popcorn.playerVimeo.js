( function () {
  var undef;
  
  // base object for DOM-related behaviour like events
  var LikeADOM = function () {
    var evts = {};
    
    return {
      addEventListener: function( evtName, fn, doFire ) {
        evtName = evtName.toLowerCase();
        
        if ( !evts[evtName] ) {
          evts[evtName] = [];
          
          // Create a wrapper function to all registered listeners
          this["on"+evtName] = function() {
            var subEvts = evts[evtName];
        
            for ( var i = 0, l = subEvts.length; i < l; i++ ) {
              subEvts[i]();
            }
          }
        }
        
        evts[evtName].push(fn);
        
        if ( doFire ) {
          this["on"+evtName]();
        }
        
        return fn;
      },
      removeEventListener: function( evtName, fn ) {
        var evtArray = getEventListeners( evtName );
        
        // Find and remove from events array
        for ( var i = 0, l = evtArray.length; i < l; i++) {
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
    // Extract the numeric video id from container uri: 'http://player.vimeo.com/video/11127501' or 'http://player.vimeo.com/video/4282282'
    // Expect id to be a valid 32/64-bit unsigned integer
    // Returns string, empty string if could not match
    function extractIdFromUri( uri ) {
      var matches = uri.match( /^http:\/\/player\.vimeo\.com\/video\/[\d]+/i );
      return matches ? matches[0].substr(30) : "";
    };
    
    // Extract the numeric video id from url: 'http://vimeo.com/11127501' or simply 'vimeo.com/4282282'
    // Ignores protocol and subdomain, but one would expecct it to be http://www.vimeo.com/#######
    // Expect id to be a valid 32/64-bit unsigned integer
    // Returns string, empty string if could not match
    function extractIdFromUrl( url ) {
      var matches = url.match( /vimeo\.com\/[\d]+/ );
      return matches ? matches[0].substr(10) : "";
    };
  
    // If container id is not supplied, assumed to be same as player id
    var ctor = function ( containerId ) {
      if ( !containerId ) {
        throw "Must supply an id!";
      }
      
      var swfObj = document.getElementById( containerId ),
          hasLoggeddLoading = false,
          vidId = extractIdFromUri( swfObj.src ),
          evtHolder = new LikeADOM();
          
      swfObj.paused = true;
      swfObj.duration = -1;
      swfObj.readyState = 0;
      swfObj.currentTime = -1;
      swfObj.volume = 0.5;
      swfObj.autoplay;
          
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
        } else if ( evt === "play" || evt === "pause" || evt === "load" ) {
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
      
      var retObj = Popcorn.extend(swfObj, {
        // Popcorn's extend can't current handle get/set
        
        setLoop: function( val ) {
          var doLoop = val === "loop" ? 1 : 0;
          swfObj.api('api_setLoop', doLoop);
        },
        setVolume: function( val ) {
          // Normalize value to between 0 and 1
          if ( val < 0 ) {
            val = -val;
          }
          
          if ( val > 1 ) {
            val %= 1;
          }
          
          // HTML video expeccts to be 0.0 -> 1.0, Vimeo expects 0-100
          swfObj.volume = val;
          swfObj.api( "api_setVolume", val*100 );
          evtHolder.dispatchEvent( "volumechange" );
        },
        play: function() {
          swfObj.api( "api_play" );
        },
        pause: function() {
          swfObj.api( "api_pause" );
        },
        seek: function ( time ) {
          swfObj.api( "api_seekTo", time );
          evtHolder.dispatchEvent( "seeked" );
        },
      });
      
      // Set up listeners to internally track state as needed
      retObj.addEventListener( "load", function() {
        swfObj.get( "api_getDuration", function( duration ) {
          swfObj.duration = duration;
          evtHolder.dispatchEvent( "durationchange" );
        });
        
        swfObj.addEvent( "onProgress", function() {
          swfObj.get( "api_getCurrentTime", function( time ) {
            swfObj.currentTime = time;
            evtHolder.dispatchEvent( "timeupdate" );
          });
        });
        
        // Add pause listener to keep track of playing state
        retObj.addEventListener( "pause", function() {
          swfObj.paused = true;
        });
        
        // Add play listener to keep track of playing state
        retObj.addEventListener( "play", function() {
          swfObj.paused = false;
        });
        
        // Add ended listener to keep track of playing state
        retObj.addEventListener( "ended", function() {
          swfObj.paused = true;
        });
        
        // Add progress listener to keep track of ready state
        retObj.addEventListener( "progress", function() {
          if ( !hasLoggeddLoading ) {
            hasLoggedLoading = true;
            swfObj.readyState = 3;
            evtHolder.dispatchEvent( "readystatechange" );
          }
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
})();