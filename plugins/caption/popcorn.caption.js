// PLUGIN: Subtitle

(function ( Popcorn, doc ) {
  var undef,
      i = 0;
  
  Popcorn.plugin( "caption" , function( options ) {
    var pos         = this.position(),
        _target     = options.target ? doc.getElementById( options.target ) : undef,
        divCreated  = 0,
        _className  = options.className || "",
        _text       = options.text,
        _css        = options.css || {};
        
        _css.top    = _css.top || 0;
        _css.left   = _css.left || 0;
        _css.width  = _css.width || 0;
        _css.height = _css.height || 0;

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
      target.style.maxWidth = ( pos.width - _css.left ) + "px";
      target.style.maxHeight = ( pos.height - _css.top ) + "px";
      target.style.width = ( _css.width ) + "px";
      target.style.height = ( _css.height ) + "px";
      target.style.top = ( pos.top + _css.top ) + "px";
      target.style.left = ( pos.left + _css.left ) + "px";
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
      wrapper.style.left = posToString( _css.left );
      wrapper.style.top = posToString( _css.top );
      wrapper.style.maxWidth = posToString( _css.width );
      wrapper.style.maxHeight = posToString( _css.height );
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
