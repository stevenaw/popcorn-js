test("Popcorn Flickr Plugin", function () {
  
  var popped = Popcorn("#video"),
      expects = 11, 
      count = 0,
      interval,
      interval2,
      flickrdiv = document.getElementById('flickrdiv');
  
  expect( expects );
  
  function plus() {
    if ( ++count === expects) {
      start();
    }
  }
  
  function testVisible() {
    ok( /display: inline;/.test( flickrdiv.innerHTML ), "Div contents are displayed" );
    plus();
    ok( /img/.test( flickrdiv.innerHTML ), "An image exists" );
    plus();
  }
  
  function testHidden() {
    ok( /display: none;/.test( flickrdiv.innerHTML ), "Div contents are hidden again" );
    plus();
  }

  stop();   
 
  ok('flickr' in popped, "flickr is a method of the popped instance");
  plus();

  equals ( flickrdiv.innerHTML, "", "initially, there is nothing inside the flickrdiv" );
  plus();
  
  /*popped.flickr({
    start: 1, // seconds
    end: 3, // seconds
    userid: '35034346917@N01',
    numberofimages: '1',
    target: 'flickrdiv'
  } );*/
  
  popped.flickr({
    start: 1, // seconds
    end: 3, // seconds
    tags: 'georgia',
    numberofimages: '1',
    target: 'flickrdiv'
  } )
  .flickr({
    start: 5, // seconds
    end: 7, // seconds
    userid: '35034346917@N01',
    tags: 'georgia',
    numberofimages: '2',
    target: 'flickrdiv'
  } )
  .flickr({
    start: 9, // seconds
    end: 11, // seconds
    userid: '35034346917@N01',
    numberofimages: '1',
    target: 'flickrdiv'
  } );

  interval = setInterval( function() {
    if( popped.currentTime() < 3 ) {
      testVisible();
    } else if ( popped.currentTime() < 5 ) {
      testHidden();
    } else if ( popped.currentTime() < 7 ) {
      testVisible();
    } else if ( popped.currentTime() < 9 ) {
      testHidden();
    } else if ( popped.currentTime() < 11 ) {
      testVisible();
    } else {
      testHidden();
      clearInterval( interval );
    }
  }, 2000);
  
  popped.volume( 0 )
  .play();
});
