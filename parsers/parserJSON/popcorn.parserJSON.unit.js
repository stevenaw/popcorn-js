test("Popcorn 0.3 JSON Parser Plugin", function () {
  
  var expects = 9,
      count = 0,
      timeOut = 0,
      numLoadingEvents = 5, 
      finished = false,
      trackData,
      trackEvents, 
      interval,
      dataSrc = document.getElementById( "video" ).getAttribute( "data-timeline-sources" ),
      poppercorn = Popcorn( "#video" ),
      childContainers = {
        "#iframe-container": 2,
        "#map-container": 1,
        "#footnote-container": 2
      },
      childLength = 3;
      
  function plus() {
    if ( ++count === expects ) {
      start();
      // clean up added events after tests
      clearInterval( interval );
    }
  }
  
  // DOMContentLoaded event within popcorn has already parsed data-timeline-sources
  // Clear modified DOM children to run tests
  Popcorn.forEach( childContainers, function( item, i ) {
    $(i).empty();
  });
  
  poppercorn.parseJSON( dataSrc );
  
  expect(expects);
  
  stop( 10000 );
  

  trackData = poppercorn.data;
  trackEvents = trackData.trackEvents;

  Popcorn.xhr({
    url: dataSrc, 
    success: function( data ) {

      var idx = 0;

      Popcorn.forEach( data.json.data, function (dataObj) {
        Popcorn.forEach( dataObj, function ( obj, key ) {


          equals( trackData.history[idx].indexOf(key), 0, "history item '" + trackData.history[idx] + "' matches data key '"+ key+ "' at correct index" );
          plus();

          idx++;
        });
      });


    }
  });  
  poppercorn.listen("timeupdate", function ( event ) {
  

    if ( Math.round( this.currentTime()) === 3 && !finished ) {
      finished = true;
      
      equals( trackEvents.byStart.length,  numLoadingEvents + 2 , "trackEvents.byStart.length === (5 loaded, 2 padding) " );
      plus();  

      // Count children of affeected containers
      Popcorn.forEach( childContainers, function( item, i ) {
        equals( $(i).children().length, item, '$("'+i+'").children().length' )
        plus();
      });

      this.pause();

    }


  });

  setTimeout(function () {
  
    poppercorn.currentTime(0).play()

  }, 500);
  
});
