$(function() {
    $('[data-toggle=tab]').click(function(){
        console.log($(this));
      if ($(this).hasClass('active')){
        $($(this).attr("href")).toggleClass('active');

        window.setTimeout(function(){ // timeout neede to override incoming click
            $('a').each(function(){
                $(this).removeClass('active');
            });
        },1);
      }
    })
});