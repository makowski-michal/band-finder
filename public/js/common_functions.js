var map = null;

// ================================= MAP =================================
function setPosition(lat, lon) {
    // define the source coordinate system (gps coordinates in degrees)
    var fromProjection = new OpenLayers.Projection("EPSG:4326"); // // Transform from WGS 1984
    // define the target coordinate system (used by openlayers maps)
    var toProjection = new OpenLayers.Projection("EPSG:900913"); // to Spherical Mercator Projection
    // create a longitude/latitude object and transform it, from wgs84 (epsg:4326) to spherical mercator (epsg:900913)
    var position = new OpenLayers.LonLat(lon, lat).transform(fromProjection, toProjection); // 9.2_OSM Maps_EN.pdf
    // return the transformed coordinates ready to use on the map
    return position;
}

function initialize_map() {
    var map = new OpenLayers.Map("Map"); // 9.2_OSM Maps_EN.pdf
    var mapnik = new OpenLayers.Layer.OSM(); // adds OpenStreetMap layer - visible map background
    map.addLayer(mapnik);
    return map;
}

function add_markers_layer(mapObject) {
    var markers = new OpenLayers.Layer.Markers("Markers"); // creates new layer for markers
    mapObject.addLayer(markers); // adds new layer to the map
    return markers;
}

function toggleMapVisibility() {
    const mapContainer = $("#map-container");
    const button = $("#toggle-map-button");
    mapContainer.toggle();

    if (mapContainer.is(":visible")) {
        button.text("Hide Map");
        if (map) {
            map.updateSize();
        }
    } else {
        button.text("Show map");
    }
}

function initMapEvents(events) {
    if (map) { // destroying old maps
        map.destroy();
        map = null;
    }

    map = initialize_map();
    var markers = add_markers_layer(map);
    let bounds = new OpenLayers.Bounds();
    let markersAdded = false;

    events.forEach(event => {
        const lat = parseFloat(event.event_lat); // convert string lat/lon to numbers
        const lon = parseFloat(event.event_lon);
        // check if coordinates are valid numbers
        if (!isNaN(lat) && !isNaN(lon) && event.event_lat !== null && event.event_lon !== null) {
            var position = setPosition(lat, lon); // convert wgs84 coords to map coords
            markers.addMarker(new OpenLayers.Marker(position)); // add marker on the map
            bounds.extend(position); // expand map bounds to include this marker
            markersAdded = true;// flag that at least one marker was added
        }
    });

    if (markersAdded) {
        map.zoomToExtent(bounds);
    } else {
        var defaultPosition = setPosition(35.33, 25.13); // Heraklion lat long
        map.setCenter(defaultPosition, 8); // 8 zoom scale
    }

    if ($('#map-container').is(':visible') && map) {
        map.updateSize();
    }
}

// ================================= LOGIN =================================
function handleLogin(event, loginType) {
    event.preventDefault();
    const username = $('#login-username').val();
    const password = $('#login-password').val();

    $.ajax({
        url: '/RegistrationAndLogin/login',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username, password, login_type: loginType }),

        success: function (response) {
            const messageDiv = document.getElementById('login-message');
            messageDiv.innerHTML = "Login successful";
            messageDiv.style.color = "green";

            setTimeout(function () {
                window.location.href = response.redirect;
            }, 1000);
        },
        error: function (xhr) {
            const messageDiv = document.getElementById('login-message');
            let errorMsg = "Login unsuccessful";
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMsg = xhr.responseJSON.error;
            }
            messageDiv.innerHTML = errorMsg;
            messageDiv.style.color = "red";
        }
    });
}

// ================================= LOGOUT =================================
function logoutUser() { // function to log out user
    $.ajax({
        url: '/RegistrationAndLogin/logout', // call backend logout endpoint
        method: 'POST',
        success: function () {
            window.location.href = 'guest.html'; // after logout go back to login page
        }
    });
}

// =================================== SHOWING INCOMING, HISTORIC EVENTS AND REVIEWS ===================================
function bandInformation(bandId) {
    const window = document.getElementById('band-popup-window');
    const content = document.getElementById('popup-content-area');
    window.style.display = 'flex';

    $.ajax({
        url: '/api/getBandDetails/' + bandId,
        method: 'GET',
        success: function (response) {
            const band = response.data;
            const now = new Date(); // we need to save current time to know which events are in the future
            let futureEventsHtml = '';
            let pastEventsHtml = '';
            let reviewsHtml = '';
            let itemHtml = '';

            band.events.forEach(function(event) {
                const eventDate = new Date(event.event_datetime);
                const dateFormatted = eventDate.toLocaleDateString();
                const timeFormatted = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                if (event.is_private === 1) { // we got is_private from app.js
                    itemHtml = `<li style="border-left: 2px solid grey; margin-bottom: 15px; padding: 10px; background: #f4f4f4;">
                                <strong>Private Event</strong> - ` + dateFormatted + `</li>`;
                } else {
                    const price = (parseFloat(event.participants_price) || 0) + ' EUR';
                    itemHtml =  `
                        <li style="margin-bottom: 15px; padding: 10px; border-left: 2px solid orange; background: #fdf9efff;">
                            <p style="color: orange;"><strong>` + event.event_type + `</strong></p>
                            <p>Date: ` + dateFormatted + ` at ` + timeFormatted + `<br>Location: ` + event.event_city + `,` + event.event_address + `<br>
                            Description: ` + event.event_description + `<br>Price: ` + price + `</p>
                        </li>`;
                }
                if (eventDate >= now) {
                    futureEventsHtml += itemHtml;
                } else {
                    pastEventsHtml += itemHtml;
                }
            });

            band.reviews.forEach(function(rev) {
                reviewsHtml += '<li> "' + rev.txt + '" - ' + rev.author + ' (' + rev.rating + '/5)</li>';
            });

            content.innerHTML = `
                <div>
                    <h2 style="color: orange;"><strong>${band.band_name} </strong><span style="color: gray; font-size: 18px;">(ID: ${band.band_id})</span></h2>
                    <p><strong>Genres: </strong>${band.music_genres}<br><strong>Description: </strong>${band.band_description}</p>
                <div class="row">
                    <div class="col-md-6">
                        <h4 style="padding-bottom: 5px; border-bottom: 2px solid orange;">Upcoming Events</h4>
                        <ul style="list-style: none; padding-left: 0;">${ futureEventsHtml || '<li>No upcoming events</li>'}</ul>
                    </div>
                    <div class="col-md-6">
                        <h4 style="padding-bottom: 5px; border-bottom: 2px grey solid;">Past Events</h4>
                        <ul style="list-style: none; padding-left: 0;">${ pastEventsHtml || '<li>No past events</li>'}</ul>
                    </div>
                </div>
                <h4>Reviews</h4>
                <div style="padding-left: 25px;">${ reviewsHtml || '<p>No reviews yet</p>'}</div>
            `;
        },
        error: function () {
            content.html('<p>Error occurred while loading data</p>');
        }
    });
}

function closePopupWindow() {
    document.getElementById('band-popup-window').style.display = 'none';
}

// ======================= VERIFY LOCATION OF THE PRIVATE/PUBLIC EVENT =======================
var event_location_verified = false; // in order to store lon/lat in our database, band owner will have to verify location (download the coordinates)

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

// ================================ CONVERSTAION WITH BAND/USER FUNCTIONS ============================
function closeChat() {
    const container = $('#conversation-with-user');
    container.empty();
    container.closest('.aside-box').hide(); // hide aside-box
}

function loadChatMessages(privateEventId) {
    $.ajax({
        url: '/RegistrationAndLogin/checkSession',
        method: 'GET',
        success: function(sessionResponse) {
            const myRole = sessionResponse.type;

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
                        const isMe = (msg.sender === myRole);
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