$(document).ready(function(){
    var focus = false;
    var ref;
    $("button").focus(function(){
        focus = true;
        ref = $(this).attr('id');
        $(this).find("#colour").hide();
        $(this).find("#white").show();
    });   

    $("button").hover(
        function(){
            if(focus && ($(this).attr('id') == ref)) return
            $(this).find("#colour").hide();
            $(this).find("#white").show();
        }, 

        function(){
            if(focus && ($(this).attr('id') == ref)) return
            $(this).find("#colour").show();
            $(this).find("#white").hide();
        }
    );   

    $("button").focusout(function(){
        focus = false;
        $(this).find("#colour").show();
        $(this).find("#white").hide();
    });   
});