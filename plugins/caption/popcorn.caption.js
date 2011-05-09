// PLUGIN: Subtitle

(function ( Popcorn, doc ) {
  var undef,
      i = 0;
  
  Popcorn.plugin( "caption" , function( options ) {
    var pos         = this.position(),
        _target     = options.target ? doc.getElementById( options.target ) : undef,
        divCreated  = 0,
        _className  = options.className || "",
        _x          = options.x || 0,
        _y          = options.y || 0,
        _width      = options.width || ( pos.width - _x ),
        _height     = options.height,
        _text       = options.text;

    // No target or invalid id, create parent element to overlay ontop of video
    // Positioning is all done relative to this div
    if ( !_target ) {
      _target                 = doc.createElement( "div" );
      _target.id              = "caption" + i;
      _target.style.position  = "absolute";
      _target.style.color     = "white";
      divCreated              = 1;
      
      overlay( _target, pos );
      doc.body.appendChild( _target );
      i++;
    }
    
    function overlay( target, pos ) {
      target.style.maxWidth = ( pos.width - _x ) + "px";
      target.style.maxHeight = ( pos.height - _y ) + "px";
      target.style.width = ( _width ) + "px";
      target.style.height = ( _height ) + "px";
      target.style.top = ( pos.top + _y ) + "px";
      target.style.left = ( pos.left + _x ) + "px";
    }
    
    function posToString( val ) {
      if ( !val ) {
        return;
      }
      
      if ( typeof val === "number" || val.test( /^\d+$/ ) ) {
        val = ( +val ) + "px";
      }
      
      return val;
    }
    
    return (function() {
      var target = _target,
          wrapper = doc.createElement( "p" ),
          autoTarget = divCreated;
          
      // Positioning is relative to "target"
      wrapper.style.position = "absolute";
      wrapper.style.display = "none";
      wrapper.style.left = posToString( _x );
      wrapper.style.top = posToString( _y );
      wrapper.style.maxWidth = posToString( _width );
      wrapper.style.maxHeight = posToString( _height );
      wrapper.style.wordWrap = "break-word";
      wrapper.innerHTML = _text;
      
      if ( _className && wrapper.className.indexOf( _className ) === -1 ) {
        wrapper.className += " "+_className
      }
      
      target.appendChild( wrapper );
      
      return {
        /**
         * @member caption 
         * The start function will be executed when the currentTime 
         * of the video  reaches the start time provided by the 
         * options variable
         */
        start: function( event, options ){
          // Update position of target
          overlay( target, this.position() );
            
          wrapper.style.display = "inline";
        },
        /**
         * @member caption 
         * The end function will be executed when the currentTime 
         * of the video  reaches the end time provided by the 
         * options variable
         */
        end: function( event, options ){      
          wrapper.style.display = "none";
        }
      }
    })()
  },
  {
    about:{
      name: "Popcorn Caption Plugin",
      version: "0.1",
      author:  "Steven Weerdenburg",
      website: "http://sweerdenburg.wordpress.com/"
    },
    options:{
      start    : {elem:'input', type:'text', label:'In'},
      end      : {elem:'input', type:'text', label:'Out'},
      target  :  'Subtitle-container',
      text     : {elem:'input', type:'text', label:'Text'}
    }
  });
})( Popcorn, document );
