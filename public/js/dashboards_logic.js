// ########## password functions from register_user.html
function password_visibility(spaceid, button) { // function to change the password to visible/invisible
    var space = document.getElementById(spaceid);
    if (space.type === "password") { // if was inv, === is an identity operator, means is identity equal to "password"
        space.type = "text";
        button.textContent = "Hide";
    } else { // if was visible
        space.type = "password";
        button.textContent = "Show";
    }
}

function is_password_the_same(password_id, confirm_password_id, password_message_id) {
    var password = document.getElementById(password_id).value;
    var confirm_pswrd = document.getElementById(confirm_password_id).value;
    var password_message_div = document.getElementById(password_message_id);
    if (password !== confirm_pswrd) {
        password_message_div.innerHTML = "Passwords don't match!";
    } else {
        password_message_div.innerHTML = "";
    }
}

function forbidden_sequences(password) {
    var forbidden_words = ["band", "music", "mpanta", "mousiki"];
    var password_in_lowercase = password.toLowerCase();
    for (var i = 0; i < forbidden_words.length; i++) {
        if (password_in_lowercase.indexOf(forbidden_words[i]) !== -1) { // if(forbidden_words[i] in password_in_lowercase)
            // java script looks for index where forbidden word starts, if it finds none - returns -1
            return true; // returns true if forbidden word has been found = weak pswrd
        }
    }
    return false; // false if lack of forbidden words
}

function too_much_numbers(password) { // weak password if at least 40% of the characters are numbers
    var number_count = 0;
    for (var i = 0; i < password.length; i++) {
        if (password.charAt(i) >= "0" && password.charAt(i) <= "9") {
            number_count++;
        }
    }
    var percentage = number_count / password.length;
    if (percentage >= 0.4) { return true; } else { return false; } // true if pswrd is weak
}

function repetitive_characters(password) {
    var char_dict_count = {};
    for (var i = 0; i < password.length; i++) {
        var char = password.charAt(i);
        if (char in char_dict_count) {
            char_dict_count[char]++;
        } else {
            char_dict_count[char] = 1;
        }
    }
    for (var char in char_dict_count) { // msg if one character is at least 50% of the whole password
        var percentage = char_dict_count[char] / password.length;
        if (percentage >= 0.5) {
            return true; // true if password is weak
        }
    }
    return false;
}

function password_is_strong(password) { // strong when at least 1 symbol, 1 uppercase letter, 1 number, and 1 lowercase letter
    var has_symbol = false;
    var has_uppercase = false;
    var has_number = false;
    var has_lowercase = false;
    var symbols = "!@#$%^&*+=-_";

    for (var i = 0; i < password.length; i++) {
        var char = password.charAt(i);
        if (char >= "a" && char <= "z") { // is there a lower letter?
            has_lowercase = true;
        } else if (char >= "A" && char <= "Z") { // is there a upper letter?
            has_uppercase = true;
        } else if (char >= "0" && char <= "9") { // is there a num?
            has_number = true;
        } else if (symbols.indexOf(char) !== -1) { // is there a symbol?
            has_symbol = true;
        }
    }
    return has_lowercase && has_uppercase && has_number && has_symbol; // has all of them = strong
}

function password_strength() {
    var password = document.getElementById("password").value; // get string of password
    var message_set_div = document.getElementById("password-strength-message"); // div where to display msg

    if (forbidden_sequences(password)) {
        message_set_div.innerHTML = "Weak password: contains forbidden words";
        return "weak";
    }
    if (too_much_numbers(password)) {
        message_set_div.innerHTML = "Weak password: too many numbers (>=40%)";
        return "weak";
    }
    if (repetitive_characters(password)) {
        message_set_div.innerHTML = "Weak password: too many repeated characters (>=50%)";
        return "weak";
    }
    if (password_is_strong(password)) {
        message_set_div.innerHTML = "Strong password";
        return "strong";
    }
    message_set_div.innerHTML = "Medium password";
    return "medium";
}