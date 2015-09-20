Array.prototype.move = function (old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
}
Number.prototype.round = function(p) {
  p = p || 10;
  return parseFloat( this.toFixed(p) );
};
function rgb2hex(rgb) {
    rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)$/);
    function hex(x) {
        return ("0" + parseInt(x).toString(16)).slice(-2);
    }
    return hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}
$(document).ready(function() {
    window.addEventListener("load", function () {
        var couponcodes = document.getElementsByClassName("ctooltip");
        for (var i = 0; i < couponcodes.length; i++) {
            couponcodes[i].addEventListener("mouseover", function () {
                var coupontooltip = this.getElementsByClassName("tooltip")[0];
                coupontooltip.removeAttribute("style");
            });
            couponcodes[i].addEventListener("mouseout", function () {
                var coupontooltip = this.getElementsByClassName("tooltip")[0];
                coupontooltip.style.display = "none";
            });
        }
    });
    // Hide Color pickers.
    $(document).mouseup(function (e) {
    var container = $("#mlColorPicker");
    if (!container.is(e.target) // if the target of the click isn't the container...
        && container.has(e.target).length === 0) // ... nor a descendant of the container
        {
            container.hide('slow');
            window.colorpicker.visible = false;
        }
    });
});
