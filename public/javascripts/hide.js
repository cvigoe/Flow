$(document).ready(function(){
	checkCookie();
	$("#hide").click(function(){
	    $("#message").hide();
	    // remember in cookie
	    setCookie("help-cookie-hidden", true, 1)
	});
	$("#help-link").click(function(){
	    console.log("shown!!!");
	    $("#message").show();
	    // remember in cookie
	    setCookie("help-cookie-hidden", false, 1)
	});	
});


function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function checkCookie() {
    var cookie = getCookie("help-cookie-hidden");
    if (cookie == 'true') {
		$("#message").hide();
    }
}