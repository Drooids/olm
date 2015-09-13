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
});
