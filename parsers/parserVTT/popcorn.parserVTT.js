// PARSER: 0.3 WebSRT/VTT

(function ( Popcorn ) {
  /**
   * WebSRT/VTT popcorn parser plug-in 
   * Parses subtitle files in the WebSRT/VTT format.
   * Styles which appear after timing information are ignored.
   * Inline styling tags follow HTML conventions and are left in for the browser to handle
   * TrackEvents (cues) which are malformed are ignored.
   * Data parameter is given by Popcorn, will need a text.
   * Text is the file contents to be parsed
   * 
   * @param {Object} data
   * 
   * Example:
    Track-3
    00:00:15.542 --> 00:00:18.542 A:start D:vertical L:98%
    It's a <i>trap!</i>
   */
  Popcorn.parser( "parseVTT", function( data ) {
  
    // declare needed variables
    var retObj = {
          title: "",
          remote: "",
          data: []
        },
        subs = [],        
        i = 0,
        len = 0,
        lines,
        time,
        text,
        sub,
        idx,
        settings,
        wrapper,
        css = getCSSRules(),
        rCustomTags = /<\/?[cv](\.[\w]+)*>/g,
        rSpeakerTag = /^<v\.([\w]+)>/,
        rLinebreak = /(?:\r\n|\r|\n)/gm,
        rTimeSep = /[\t ]*-->[\t ]*/,
        rTrimWhitespace = /^\s+|\s+$/g;
    
    function parseText( text ) {
      //text = text.replace(/<\/[cv]>/g, "").split( /<\/?[cv]\.[\w]+>/g ); // No break when should be
      //text = text.split( /<\/?[cv](\.[\w]+)*>/g ); // Leaves residual ".Beatrix"
      var tags = text.match( rCustomTags ),
          i,
          len;
      
      Popcorn.forEach( tags, function ( tag ) {
        var className,
            newClass,
            newStyle,
            existingStyle,
            idx;
            
        if ( tag[1] === "/" && tag[2] === "c" ) {
          text = text.replace( tag, "</span>" );
          return;
        } else if ( tag[1] !== "c" ) {
          return;
        }
        
        idx = tag.indexOf( "." );
        className = tag.substring( idx + 1, tag.length - 1 );
        
        // Firefox ignores ::cue pseudoelement, Chrome doesn't
        // Will apply styles of pseudoelement if it exists, otherwise will look for regular style
        existingStyle = css.rules["::cue ."+className] || css.rules["."+className];
        
        if ( existingStyle ) {
          // Create alias for css style
          newClass = Popcorn.guid( className );
          css.appendClass( "." + newClass, existingStyle[0].cssText );
          text = text.replace( tag, "<span class=\"" + newClass + "\">" );
        }
      });
      
      // replace voice tags with quotations. Must begin at beginning of string
      // <v.Arthur> becomes <q title="Arthur">
      text = text.replace( rSpeakerTag, "<q title=\"$1\">" ).replace( "</v>", "</q>" );
      
      //"mystring#".substr(-1) === "#"
      
      // Replace <c.className>...</c> with <span class="className">...</span>
      //text = text.replace( /<c\.([\w]+)>/, "<span class=\"$1\">" ).replace( "</c>", "</span>" );
      
      return text;
    }
    
    function getCSSRules() {
      if ( !document.styleSheets ) { return; }
      
      var prop = document.styleSheets[0].cssRules ? "cssRules" : "rules",
          sheet,
          currentRule,
          ret = {
            sheets: [],
            rules: {},
            exists: function( selector ) {
              return ret.rules[selector];
            },
            appendClass: (function() {
              var customSheet;
              
              return function( className, styles ) {
                var newRule;
                
                if ( !customSheet ) {
                  customSheet = document.createElement( "style" );
                  ret.sheets.push( customSheet );
                  document.getElementsByTagName( "head" )[0].appendChild( customSheet );
                }
                
                // Class definition exists, do not modify styles
                if ( ret.exists( className ) ) {
                  return;
                } else {
                  customSheet.innerHTML += className + "{"+styles+"}";
                  ret.rules[className] = ret.rules[className] || [];
                  
                  // Create new rule
                  newRule = styles.split( ";" );
                  newRule.cssText = styles;
                  
                  ret.rules[className].push( newRule );
                }
              }
            })()
          };
          
      Popcorn.forEach( document.styleSheets, function( obj ) {
        sheet = obj[prop];
        
        Popcorn.forEach( obj[prop], function( rule ) {
          currentRule = ret.rules[rule.selectorText] = ret.rules[rule.selectorText] || [];
          currentRule.push( rule.style );
        });
        
        ret.sheets.push( sheet );
      });
      
      return ret;
    }
  
    // [HH:]MM:SS.mmm string to SS.mmm float
    // Throws exception if invalid
    function toSeconds( t_in ) {
      var t = t_in.split( ":" ),
          l = t_in.length,
          time;
      
      // Invalid time string provided
      if ( l !== 12 && l !== 9 ) {
        throw "Bad cue";
      }
      
      l = t.length - 1;
      
      try {        
        time = parseInt( t[l-1], 10 )*60 + parseFloat( t[l], 10 );
        
        // Hours were given
        if ( l === 2 ) {
          time += parseInt( t[0], 10 )*3600;
        }
      } catch ( e ) {
        throw "Bad cue";
      }
      
      return time;
    };
    
    function extractSetting( text ) {
      var data = {};
      
      Popcorn.forEach( text.split( " " ), function( cmd ) {
        data[cmd[0]] = cmd.substr( 2 );
      });
      
      return data;
    }
    
    function createTrack( name, attributes ) {
      var track = {};
      track[name] = attributes;
      return track;
    };
  
    var processSettings = (function() {
      var defaults = {
        "A" : "middle",
        "S" : "100%",
        "T" : "50%",
        "L" : "auto",
        "D" : "horizontal",
        "snap-to-lines" : 1
      };
      
      var map = {
        // Alignment
        "A" : {
          css : "text-align",
          translate : (function () {
            var map = {
              // Rules for ltr
              "middle" : "center",
              "start" : "left",
              "end" : "right"
            };
            
            return function ( val, attr ) {
              return map[val];
            }
          })()
        },
        // Size
        "S" : {
          css: "font-size",
          translate : function ( val, attr ) {
            return val;
          }
        },
        // Text position (horizontal)
        "T" : {
          css: "",
          translate : function ( val, attr ) {
            return val;
          }
        },
        // Line position (vertical)
        "L" : {
          // Valid values can be anything in regex except -n%
          css: "position: absolute; top",
          translate : function ( val, attr ) {
            return val;
          }
        },
        // Direction (tricky. Only ltr for now?)
        "D" : {
          css : "",
          translate : function ( val, attr ) {
            return val;
          },
          map : {
            "vertical" : "",
            "vertical-lr" : ""
          }
        }
      };
      
      return function ( text, attr ) {
        var styles = {},
            styleStr = "";
            
        // Map defaults to attr
        Popcorn.forEach( defaults, function( value, setting ) {
          if ( !attr[setting] ) {
            attr[setting] = value;
          }
        });
        
        // Convert to HTML styles
        Popcorn.forEach( attr, function( value, setting ) {
          if ( setting !== "S" && setting !== "A" ) {
            return;
          }
          
          styles[map[setting].css] = map[setting].translate( value, attr );
        });
        
        // Build master style string
        Popcorn.forEach( styles, function( value, style ) {
          styleStr += style+":"+value+";";
        });
        
        // Wrap text with span and styles
        return '<span style="'+styleStr+'">'+text+'</span>';
      }
    })();
    
    // Here is where the magic happens
    // Split on line breaks
    lines = data.text.split( rLinebreak );
    len = lines.length;
    
    while ( i < len ) {
      sub = {};
      text = [];
      
      try {
        sub.id = lines[i++];
        // Ignore if id contains "-->"
        if ( !sub.id || sub.id.indexOf( "-->" ) !== -1 ) {
          throw "Bad cue";
        }
        
        time = lines[i++].split( rTimeSep );
        
        if ( time.length != 2 ) {
          throw "Bad cue";
        }
        
        // Work with end-of-line positioning
        idx = time[1].indexOf( " " );
        if ( idx !== -1 ) {
          settings = extractSetting( time[1].substr( idx + 1 ) );
          time[1] = time[1].substr( 0, idx );
        }
        
        sub.start = toSeconds( time[0] );
        sub.end = toSeconds( time[1] );
        
        // Build single line of text from multi-line subtitle in file
        while ( i < len && lines[i] ) {
          text.push( lines[i++] );
        }
        
        // Join lines together to one and build subtitle, trimming whitespace
        sub.text = parseText( text.join( "<br />" ).replace( rTrimWhitespace,"") );
        
        if ( settings ) {
          // End of line settings found
          sub.text = processSettings( sub.text, settings );
          
          // GC, also reset for next time through loop
          settings = null;
        }
      
        subs.push( createTrack( "subtitle", sub ) );
      } catch ( e ) {
         // Bad cue, advance to end of cue
        while ( i < len && lines[i] ) {
          i++;
        }
      }
      
      // Consume empty whitespace after a cue
      while ( i < len && !lines[i] ) {
        i++;
      }
    }
    
    retObj.data = subs;
    return retObj;
  });

})( Popcorn );
