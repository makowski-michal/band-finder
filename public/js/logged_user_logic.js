// ========================= Actively displaying username in h4 =========================
$(document).ready(function () {
    $.ajax({
        url: '/RegistrationAndLogin/getUserInfo',
        method: 'GET',
        success: function (response) {
            if (response && response.username) {
                $('#display-username').text(response.username);
            }
        },
        error: function () {
            $('#display-username').text("Unknown");
        }
    });
});