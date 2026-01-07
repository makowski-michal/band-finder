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
                    <h2 style="color: orange;"><strong>${band.band_name}</strong></h2>
                    <p><strong>Genres: </strong>${band.music_genres}<br><strong>Description:</strong>${band.band_description}</p>
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