// ========================= Actively displaying username in h4 =========================
$(document).ready(function () {
    $('#conversation-with-user').closest('.aside-box').hide(); // at the beginning the 2nd aside box with messages is hidden

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

    $('a[href="#private-events-tab"]').on('shown.bs.tab', function (e) {
        loadMyPrivateEvents();
    });
});

// ============================= POSTING A REVIEW ==============================
// add review (post)
function addReview(event) {  
    event.preventDefault(); // stops the form from reloading the page
    const data={ // creates an object with form values
        band_name: $('#post-band-name').val(), // gets band name from input
        sender: $('#post-sender').val(), // gets sender name from input
        review: $('#post-review').val(), // gets review text
        rating: parseInt($('#post-rating').val()) // gets rating and converts it to integer
    };
    
    $.ajax({
        url: '/review',
        method: 'POST', // http method is post
        contentType: 'application/json', // tells server that data is json
        data: JSON.stringify(data), // converts js object to json string
        success: function(response){
            const messageDiv = document.getElementById('post-message');
            messageDiv.innerHTML = "record posted successfully";
            messageDiv.style.color = "green";
            $('#add-review-result').html('<pre style="color:green;">' +JSON.stringify(response, null, 2) + '</pre>');
        },
        error: function(xhr){
            $('#add-review-result').html('<pre style="color:red;">error '+xhr.status+ ': '+ JSON.stringify(xhr.responseJSON, null, 2)+'</pre>');
        }});}

// ============================= REQUESTING FOR A PRIVATE EVENT ==============================
let calendarWindow;

function proceedWithPrivEvent() {
    if(calendarWindow) {calendarWindow.destroy();} // destroying calendar, in case user changed band_name
    $('#continue-with-res').empty();

    document.getElementById("availability-calendar").innerHTML = ""; // destroying h4, in case user changed band_name
    const bandIdInput = $('#priv-request-band-id').val();
    const messageDiv = document.getElementById("ask-priv-message");
    if (bandIdInput.length > 0) {
        $.ajax({
                url: '/getAlltheBands',
                method: 'GET',
                success: function (response) {
                    const foundBandEverything = response.data.find(b => b.band_id == bandIdInput);
                    if (foundBandEverything) {
                        openCalendarPrivEvents(foundBandEverything)
                    } else {
                        messageDiv.innerHTML = "There is no such band ID";
                        messageDiv.style.color = "red";
                    }
                },
                error: function () {
                    messageDiv.innerHTML = "Error"
                }
        });
    }
}

function openCalendarPrivEvents(bandInfo) {
    let downloadedDates = bandInfo.availability_dates;

    if (downloadedDates) {
        let existingAvailabilityDates = downloadedDates.split(', ').filter(d => d.trim() !== '');
        
        if (existingAvailabilityDates.length === 0) {
            $('#continue-with-res').empty();
            document.getElementById("availability-calendar").innerHTML = "<h4>Looks like this band has no available dates anytime soon :(</h4>";
            return;
        }
        
        calendarWindow = flatpickr("#availability-calendar", {
            inline: true, // calendar is opened always
            mode: "single",
            dateFormat: "Y-m-d",
            enable: existingAvailabilityDates, // availability dates of a band
            minDate: "today", // only dates in the future are enabled
            onChange: function(selectedDates) {
                if (selectedDates.length > 0) {
                    continueWithReservation(bandInfo); 
                }
            }
        });
    } else {
        $('#continue-with-res').empty();
        document.getElementById("availability-calendar").innerHTML = "<h4>Looks like this band has no available dates anytime soon :(</h4>";
        return;
    }
}

function continueWithReservation(bandInfo) {
    const container = $('#continue-with-res');
    container.empty();

    container.append(`
        <form onsubmit="handlePrivateEventSubmit(event, ${bandInfo.band_id})">
            <div class="form-two" style="margin-top: 10px;">
                <div class="form-one">
                    <label><span class="required">* </span>Select time</label>
                    <input type="time" id="priv-request-band-time" autocomplete="off" required>
                </div>
                <div class="form-one">
                    <label><span class="required">* </span>Select Event Type</label>
                    <select id="priv-event-type" name="priv-event-type" required>
                        <option value="">Select your Event</option>
                        <option value="Baptism (700 EUR)">Baptism (700 EUR)</option>
                        <option value="Wedding (1000 EUR)">Wedding (1000 EUR)</option>
                        <option value="Party (500 EUR)">Party (500 EUR)</option>
                    </select>
                </div>
            </div>
            <div class="form-two">
                <div class="form-one">
                    <label for="event_country"><span class="required">* </span>Country</label>
                    <select id="event_country" name="event_country" required>
                        <option value="Greece">Greece</option>
                    </select>
                </div>
                <div class="form-one">
                    <label for="event_city"><span class="required">* </span>City</label>
                    <input type="text" id="event_city" name="event_city" required>
                </div>
            </div>

            <div class="form-one">
                <label for="event_address"><span class="required">* </span>Address</label>
                <input type="text" id="event_address" name="event_address" required
                    placeholder="Street, Number">

                <input type="hidden" id="event_lat" name="event_lat">
                <input type="hidden" id="event_lon" name="event_lon">
            </div>

            <button type="button" class="password-show-hide" onclick="verifyEventLocation()">Verify location</button>
            <div id="event-submit-message" class="password-mismatch-message"></div>
            <div class="form-one">
                <label><span class="required">* </span>Event Description</label>
                <textarea id="priv-request-band-description" name="priv-request-band-description" minlength="3" maxlength="1000"
                    required></textarea>
            </div>
            <button type="submit" class="submit-button" id="ask-for-private">Send</button>
        </form>
    `);
}

function handlePrivateEventSubmit (event, bandId) {
    event.preventDefault();
    let messageDiv = document.getElementById("was-res-successful");

    if (!event_location_verified) {
        messageDiv.innerHTML = "Please verify location first";
        messageDiv.style.color = "red";
        return;
    }

    const selectedDate = calendarWindow.selectedDates[0];
    if (!selectedDate) {
        messageDiv.innerHTML = "Please first pick a date"
        messageDiv.style.color = "red";
        return;
    }

    const datePart = calendarWindow.formatDate(selectedDate, "Y-m-d");
    const timePart = $('#priv-request-band-time').val();
    const fullType = $('#priv-event-type').val();
    const eventType = fullType.split(' (')[0];
    let price;
    if (eventType === "Baptism") { price = 700; } else if (eventType === "Wedding") {price = 1000;} else {price = 500;}

    const formData = {
        band_id: bandId,
        event_type: eventType,
        event_datetime: datePart + ' ' + timePart + ':00',
        event_city: $('#event_city').val(),
        event_address: $('#event_address').val(),
        event_description: $('#priv-request-band-description').val(),
        price: price,
        event_lat: parseFloat($('#event_lat').val()),
        event_lon: parseFloat($('#event_lon').val())
    };

    $.ajax({
        url: '/api/addPrivateEvent',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(formData),
        success: function(response) {
            messageDiv.innerHTML = "Request successfully sent"
            messageDiv.style.color = "green";
            location.reload(); 
        },
        error: function(xhr) {
            messageDiv.innerHTML = "Error"
            messageDiv.style.color = "red";
        }
    });
}

// ======================= VIEWING PRIVATE EVENTS ===========================
function loadMyPrivateEvents() {
    $.ajax({
        url: '/api/getMyPrivateEvents',
        method: 'GET',
        success: function (response) {
            const container = $('#private-events-list');
            container.empty();
            const now = new Date();

            if (response.data && response.data.length > 0) {
                response.data.forEach(event => {
                    const eventDate = new Date(event.event_datetime);
                    let responseHtml = '';

                    if (event.status === 'requested') {
                        responseHtml = `
                            <p style="color: brown; font-style: italic;">Status: Requested</p>
                        `;
                    } else if (event.status === 'rejected') {
                        responseHtml = `
                            <p style="color: red; font-style: italic;">Status: Rejected<br>Band decision: ${event.band_decision}</p>
                        `;

                    } else if (event.status === 'to be done') {
                        responseHtml = `
                            <p style="color: blue; font-style: italic;">Status: To be done<br>Band decision: ${event.band_decision}</p>
                            <button class="password-show-hide" onclick="openChat('${event.private_event_id}', '${event.event_type}', '${event.user_id}')">Open Chat with the User</button>
                        `;
                        if (eventDate < now) {
                            responseHtml += `<button class="password-show-hide" onclick="donePrivateEvent(${event.private_event_id})">Flag as Done</button>`;
                        }
                    } else if (event.status === 'done') {
                        responseHtml = `<p style="color: green; font-style: italic;">Event Completed</p>`
                    }

                    container.append(`
                        <div class="event-band-card">
                            <h3>${event.event_type} <span style="font-size: 15px;">(band id: ${event.band_id})</span></h3>
                            <div>
                                ${eventDate.toLocaleString()}<br>
                                ${event.event_city}, ${event.event_address}<br>
                                Description: ${event.event_description}<br>
                                You will have to pay: ${event.price} €<br>
                            </div>
                            ${responseHtml}
                        </div>
                    `);
                });
            } else {
                container.html('<p>No private event requests found</p>');
            }
        }
    });
}

// ============================== CHAT WITH USER ==============================
function openChat(privateEventId, eventType, bandId) {
    const container = $('#conversation-with-user');
    container.empty();

    container.append(`
        <div>
            <h3>Converstaion according ${eventType} (event's id: #${privateEventId})</h3>
            <p style="margin-bottom: 15px">You are now chatting with Band #${bandId}</p>
        </div>

        <div id="chat-messages-box"></div>

        <form onsubmit="sendChatMessage(event, ${privateEventId}, ${bandId})">
            <div>
                <input type="text" id="chat-message-input" placeholder="Type your response" required style="margin-top: 6px">
                <button type="submit" class="password-show-hide">Send</button>
            </div>
        </form>
        <button type="button" onclick="closeChat()" class="password-show-hide" style="margin-top: 10px;">Close Chat</button>
    `);

    container.closest('.aside-box').show(); // closest finds 'top of the tree', so it will show the lastest possible aside-box
    loadChatMessages(privateEventId);
}

// =========================== PRIVATE EVENT DONE ====================
function donePrivateEvent(eventId) {
    $.ajax({
        url: '/api/updatePrivateEventStatus',
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({
            private_event_id: eventId,
            status: "done"
        }),
        success: function () {
            loadMyPrivateEvents();
        }
    });
    closeChat();
}

// ============================== SORTING BASED ON DRIVING DISTANCE =========================
async function handleDistanceSort() {
    const user = await $.get('/RegistrationAndLogin/getUserInfo');
    $.get('/getPublicEvents', function(response) {
        const events = response.data;

        $.ajax({ // so the api is hidden in app.js
            url: '/api/getDrivingDistances',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                origin: { lat: user.lat, lon: user.lon }, // sending users coordinates
                destinations: events.map(e => ({ lat: e.event_lat, lon: e.event_lon })) // sending events coordinates
            }),
            success: function (matrixResponse) {
                if (matrixResponse.distances && matrixResponse.distances[0]) {
                    events.forEach(function (event, index) {
                        event.driving_distance = (matrixResponse.distances[0][index] / 1000).toFixed(1); // calculating
                    });

                    events.sort(function (a, b) { // sorting by distance
                        return a.driving_distance - b.driving_distance;
                    });

                    renderEvents(events, $('#events-container')); // refreshing shown events
                }
            }
        });
    });
}