// ========================= Actively displaying band name in h4 =========================
$(document).ready(function () {
    $.ajax({
        url: '/RegistrationAndLogin/getBandInfo',
        method: 'GET',
        success: function (response) {
            if (response && response.band_name) {
                $('#display-bandname').text(response.band_name);
            }
        },
        error: function () {
            $('#display-bandname').text("Unknown");
        }
    });
});

// ======================================== PUBLIC EVENTS MANAGMENT ========================================

$(document).ready(function () {
    $('#conversation-with-user').closest('.aside-box').hide(); // at the beginning the 2nd aside box with messages is hidden

    loadMyPublicEvents(); // list of events regarding given band
    loadMyPrivateEvents();

    $('a[href="#public-events-tab"]').on('shown.bs.tab', function (e) { // refresh after clicking in public-events-tab
        loadMyPublicEvents();
    });

    $('a[href="#private-events-tab"]').on('shown.bs.tab', function (e) {
        loadMyPrivateEvents();
    });
});

var event_location_verified = false; // in order to store lon/lat in our database, band owner will have to verify location (download the coordinates)

// ======================= VERIFY LOCATION OF THE PUBLIC EVENT =======================
function verifyEventLocation() {
    var country = $('#event_country').val();
    var city = $('#event_city').val();
    var address = $('#event_address').val();
    var msgDiv = $('#event-submit-message');

    var full_address = address + " " + city + " " + country;
    const xhr = new XMLHttpRequest();

    xhr.addEventListener("readystatechange", function () {
        if (this.readyState === this.DONE) {
            try {
                const response = JSON.parse(xhr.responseText);
                if (!response || response.length === 0) {
                    msgDiv.text("Couldn't find location, check city and address");
                    event_location_verified = false;
                } else {
                    var location_data = response[0];
                    $('#event_lat').val(parseFloat(location_data.lat));
                    $('#event_lon').val(parseFloat(location_data.lon)); // convert to lon & lat
                    event_location_verified = true;
                    msgDiv.text("Location verified: " + location_data.display_name).css("color", "green");
                }
            } catch (e) {
                msgDiv.text("Error");
                event_location_verified = false;
            }
        }
    });

    xhr.open("GET", "https://forward-reverse-geocoding.p.rapidapi.com/v1/search?q=" + encodeURIComponent(full_address) + "&accept-language=en&polygon_threshold=0.0");
    xhr.setRequestHeader("x-rapidapi-key", "6c6bf8d1e1mshc1ca0e713f01b86p1003bdjsn0e24e4fdb063"); // api-key
    xhr.setRequestHeader("x-rapidapi-host", "forward-reverse-geocoding.p.rapidapi.com");
    xhr.send();
}

// ======================= EVENTS HANDLING =======================
function handlePublicEventSubmit(event) {
    event.preventDefault();
    const formData = {
        public_event_id: $('#event_id').val(),
        event_type: $('#event_type').val(),
        event_datetime: $('#event_datetime').val(),
        event_description: $('#event_description').val(),
        participants_price: $('#participants_price').val(),
        event_city: $('#event_city').val(),
        event_address: $('#event_address').val(),
        event_lat: $('#event_lat').val(),
        event_lon: $('#event_lon').val()
    };

    if (!formData.event_lat || !formData.event_lon) { // check if user has verified the location and therefore downloaded lon and lat
        $('#event-submit-message').text("Verify location first");
        return;
    }

    let url;
    let method;

    if (formData.public_event_id) { // if a record exists we update the record
        url = '/api/updatePublicEvent';
        method = 'PUT';
    } else { // if there is no id, therefore the record does not exist, we create a new one
        url = '/api/addPublicEvent';
        method = 'POST';
    }

    $.ajax({
        url: url,
        method: method,
        contentType: 'application/json',
        data: JSON.stringify(formData),
        success: function (response) {
            $('#event-submit-message').text("Success, the event has been saved").css("color", "green");
            resetEventForm();
            loadMyPublicEvents();
        },
        error: function (xhr) {
            $('#event-submit-message').text("Save error: " + xhr.status);
        }
    });
}

function loadMyPublicEvents() {
    $.ajax({
        url: '/api/getMyPublicEvents',
        method: 'GET',
        success: function (response) {
            const container = $('#my-events-list');
            container.empty();
            if (response.data && response.data.length > 0) {
                response.data.forEach(e => {
                    const eventDate = new Date(e.event_datetime);
                    const isFuture = eventDate > new Date();
                    const formattedDate = eventDate.toLocaleDateString() + ' ' + eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    let actions = 'This event has already taken place';

                    if (isFuture) { // if the event has not taken place yet
                        actions = `
                            <button class="password-show-hide" onclick='editEvent(${JSON.stringify(e)})'>Edit</button>
                            <button class="password-show-hide" onclick="deleteEvent(${e.public_event_id})">Delete</button>
                        `;
                    }

                    container.append(`
                        <div class="event-band-card">
                            <h3>${e.event_type}</h3>
                            <div>
                                ${formattedDate} <br>
                                ${e.event_city}, ${e.event_address}
                            </div>
                            <p>${e.event_description}</p>
                            <div>${actions}</div>
                        </div>
                    `);
                });
            } else {
                container.html('<p>No planned events</p>');
            }
        }
    });
}

function editEvent(ev) {
    $('#event_id').val(ev.public_event_id);
    $('#event_type').val(ev.event_type);

    const d = new Date(ev.event_datetime);
    const dateStr = d.toISOString().slice(0, 16); // format the date back for form type
    $('#event_datetime').val(dateStr);
    $('#event_description').val(ev.event_description);
    $('#participants_price').val(ev.participants_price);
    $('#event_city').val(ev.event_city);
    $('#event_address').val(ev.event_address);
    $('#event_lat').val(ev.event_lat);
    $('#event_lon').val(ev.event_lon); // fill the form
    event_location_verified = true;
}

function deleteEvent(id) {
    if (!confirm("Are you sure you want to delete this event?")) return;
    $.ajax({
        url: '/api/deletePublicEvent/' + id,
        method: 'DELETE',
        success: function () { loadMyPublicEvents(); }
    });
}

function resetEventForm() {
    $('#add-public-event-form')[0].reset();
    $('#event_id').val('');
    event_location_verified = false;
}

// ======================= MANAGING PRIVATE EVENTS =======================
function loadMyPrivateEvents() {
    $.ajax({
        url: '/api/getMyPrivateEvents',
        method: 'GET',
        success: function (response) {
            const container = $('#private-events-list');
            container.empty();

            if (response.data && response.data.length > 0) {
                response.data.forEach(event => {
                    const eventDate = new Date(event.event_datetime);
                    let responseHtml = '';

                    if (event.status === 'requested') {
                        responseHtml = `
                            <div class="form-group">
                                <textarea id="decision-${event.private_event_id}" class="form-control" placeholder="Provide justification"></textarea>
                            </div>
                            <button class="password-show-hide" onclick="updatePrivateStatus(${event.private_event_id}, 'to be done')">Accept (To be done)</button>
                            <button class="password-show-hide" onclick="updatePrivateStatus(${event.private_event_id}, 'rejected')">Reject</button>
                        `;
                    } else if (event.status === 'rejected') {
                        responseHtml = `
                            <p style="color: red; font-style: italic;">Status: Rejected</p>
                            <button class="password-show-hide" onclick="deletePrivateEvent(${event.private_event_id})">Delete from list</button>
                        `;
                    } else if (event.status === 'to be done') {
                        responseHtml = `
                            <p style="color: blue; font-style: italic;">Status: To be done</p>
                            <button class="password-show-hide" onclick="openChat('${event.private_event_id}', '${event.event_type}', '${event.user_id}')">Open Chat with the User</button>
                        `;
                    } else if (event.status === 'done') {
                        responseHtml = `<p style="color: green; font-style: italic;">Event Completed</p>`;
                    }

                    container.append(`
                        <div class="event-band-card">
                            <h3>${event.event_type} - Request from User ID: ${event.user_id}</h3>
                            <div>
                                ${eventDate.toLocaleString()}<br>
                                ${event.event_city}, ${event.event_address}<br>
                                Description: ${event.event_description}<br>
                                Price: ${event.price} €<br>
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

function updatePrivateStatus(eventId, newStatus) {
    const decision = $(`#decision-${eventId}`).val();
    if (!decision && newStatus === 'rejected') {
        alert("Please provide a justification for rejection");
        return;
    }

    $.ajax({
        url: '/api/updatePrivateEventStatus',
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({
            private_event_id: eventId,
            status: newStatus,
            band_decision: decision
        }),
        success: function () {
            loadMyPrivateEvents();
        }
    });
}

function deletePrivateEvent(eventId) {
    if (!confirm("Are you sure you want to delete this rejected event from the list?")) {
        return;
    }

    $.ajax({
        url: '/api/deletePrivateEvent/' + eventId,
        method: 'DELETE',
        success: function (response) {
            if (response.success) {
                loadMyPrivateEvents(); // refresh
            }
        },
        error: function (xhr) {
            alert("Error deleting event");
        }
    });
}

// ============================== CHAT WITH USER ==============================
function openChat(privateEventId, eventType, userId) {
    const container = $('#conversation-with-user');
    container.empty();

    container.append(`
        <div>
            <h3>Converstaion according ${eventType} (event's id: #${privateEventId})</h3>
            <p style="margin-bottom: 15px">You are now chatting with User #${userId}</p>
        </div>

        <div id="chat-messages-box"></div>

        <form onsubmit="sendChatMessage(event, ${privateEventId}, ${userId})">
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

function closeChat() {
    const container = $('#conversation-with-user');
    container.empty();
    container.closest('.aside-box').hide(); // hide aside-box
}

function loadChatMessages(privateEventId) {
    $.ajax({
        url: '/api/chat/getMessages',
        method: 'GET',
        data: { private_event_id: privateEventId },
        success: function(response) {
            const msgBox = $('#chat-messages-box');
            
            if (!response.success) return;

            if (response.messages.length === 0) { // if there are no messages
                msgBox.html('<p style="text-align:center; color:gray; margin-top: 10px;">No messages yet</p>');
                return;
            }

            let htmlContent = '';

            response.messages.forEach(msg => {
                const isMe = (msg.sender === 'band');
                const msgDate =new Date(msg.date_time);
                const msgTime = msgDate.toLocaleDateString() + ' ' + msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                let rowClass = '';

                if (isMe) {
                    rowClass = 'message-right';
                } else {
                    rowClass = 'message-left';
                }

                htmlContent += `
                    <div class="message-row ${rowClass}">
                        <p style="margin-bottom: 2px; background: rgb(236, 236, 236); border-radius: 5px; padding: 8px; max-width: 75%; word-wrap: break-word;">${msg.message}<br></p>
                        <p style="font-size: 12px;">${msgTime}</p>
                    </div>
                `;
            });
            msgBox.html(htmlContent);
        },
        error: function(err) {
            console.error("Error loading messages", err);
        }
    });
}

function sendChatMessage(e, privateEventId, recipientId) {
    e.preventDefault(); 
    const inputField = $('#chat-message-input');
    const message = inputField.val();

    if (!message.trim()) return;

    $.ajax({
        url: '/api/chat/sendMessage',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            private_event_id: privateEventId,
            message: message,
            recipient_id: recipientId
        }),
        success: function(response) {
            inputField.val('');
            loadChatMessages(privateEventId);
        },
        error: function() {
            alert('Server error');
        }
    });
}

// ==================== OPENING MY INCOMING EVENTS WITH bandInformation FUNCT ===================
function checkBandIdAndShow() {
    $.ajax({
        url: '/RegistrationAndLogin/checkSession',
        method: 'GET',
        success: function (response) {
            const myId = response.user.band_id;
            bandInformation(myId);
        }
    });
}