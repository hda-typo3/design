var $container = $('#DES');
$container.imagesLoaded( function() {
  $container.packery({
    itemSelector: '.teaser',
    gutter: 0,
  });
});