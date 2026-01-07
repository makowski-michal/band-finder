// ================================= CHATBOT =================================
function sendChatQuery() {
    const userInput = $('#user-input')
    const query = userInput.val().trim();
    const chatOutput = $('#chat-output');
    const sendRequestButton = $('#send-request-btn');

    if (query === "") return;
    chatOutput.append(`<p class="user-message">You: ${query}</p>`);
    userInput.val('');

    sendRequestButton.prop('disabled', true).text('Thinking..'); // button is blocked between asking the question and typing the answer
    const loadingMessage = $(`<p class="bot-message">Chatbot: Let me think..</p>`);
    chatOutput.append(loadingMessage);

    $.ajax({
        url: '/api/gemini-chat',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ message: query }),
        success: function (response) {
            loadingMessage.remove();
            chatOutput.append(`<p class="bot-message">Chatbot: ${response.answer || "I couldn't come up with anything :("}</p>`);
        },
        error: function (xhr) {
            loadingMessage.remove();
            chatOutput.append(`<p class="bot-message">Chatbot: Error occurred while trying to get the response</p>`)
        },
        complete: function () {
            sendRequestButton.prop('disabled', false).text("Send");
        }
    });
}

// ================================= BOOTSTRAP PILLS SWITCH =================================
$(document).ready(function () {
    loadPublicEvents(); // only active pill
    loadWeatherForecast();

    $('a[href="#bands-tab"]').on('shown.bs.tab', function (e) { // catches when user switches pill to bands
        loadAlltheBands();
    });
})

// ================================= WEATHER FORECAST FOOTER =================================
function loadWeatherForecast() {
    const pastePlace = $("#weather-forecast-container")

    $.ajax({
        url: '/api/getWeatherForecast',
        method: 'GET',
        success: function (response) {
            let html = `<div class="weather-days-list">`
            $('#weather-forecast-city').html(response.city);

            response.forecast.forEach(day => {
                const iconUrl = `https://openweathermap.org/img/wn/${day.icon}@2x.png`;
                $('#weather-forecast-container').html(response.city);
                html += `<div class="weather-single-day">
                            <span>${day.day}</span>
                            <img src="${iconUrl}" title="${day.description}" class="weather-icon">
                            <span class="weather-temp">${day.temp} *C</span>
                        </div>`;
            });
            html += `</div>`;
            pastePlace.html(html)
        },
        error: function () {
            pastePlace.html(`<p>Eroor while downloading the weather from sever</p>`);
        }
    });
}

// ================================= RESETING THE FILTERS THE OUTPUT =================================
function resetFiltersEvents() {
    $('#filter-event-genre').val('');
    $('#filter-event-city').val('');
    $('#filter-event-date').val('');
    $('#filter-event-prompt').val('');
    loadPublicEvents();
}

function resetFiltersBands() {
    $('#filter-band-genre').val('');
    $('#filter-band-city').val('');
    $('#filter-band-prompt').val('');
    loadAlltheBands();
}

// ================================= LOADING EVENTS OUTPUT BY FILTERING, 1ST PILL =================================
function loadPublicEvents() {
    const genre = $('#filter-event-genre').val(); // downloading the filters
    const city = $('#filter-event-city').val();
    const date = $('#filter-event-date').val();

    const params = {};
    if (genre) params.genre = genre; // we are sending data that is not empty, so our system doesnt treat empty string like a filter
    if (city) params.city = city;
    if (date) params.date = date;

    const ajaxSettings = {
        url: '/getPublicEvents',
        method: 'GET',
        data: params
    };

    $.ajax({
        ...ajaxSettings, // pasting ajax settings
        success: function (response) {
            const container = $('#events-container');
            container.empty();
            renderEvents(response.data || [], container);
        },
        error: function (xhr) {
            $('#events-container').html('<p class="text-center">Error while loading events from server</p>');
            initMapEvents([]);
        }
    });
}

// ================================= LOADING BANDS OUTPUT BY FILTERING, 2ND PILL =================================
function loadAlltheBands() {
    const genre = $('#filter-band-genre').val(); // downloading the filters
    const city = $('#filter-band-city').val();
    const year = $('#filter-band-year').val();

    const params = {};
    if (genre) params.genre = genre; // we are sending data that is not empty, so our system doesnt treat empty string like a filter
    if (city) params.city = city;
    if (year) params.year = year;

    const ajaxSettings = {
        url: '/getAlltheBands',
        method: 'GET',
        data: params
    };

    $.ajax({
        ...ajaxSettings, // pasting ajax settings
        success: function (response) {
            const container = $('#bands-container');
            container.empty();
            renderBands(response.data || [], container);
        },
        error: function (xhr) {
            $('#bands-container').html('<p class="text-center">Error while loading bands from server</p>');
        }
    });
}

// ================================= LOADING EVENTS BY PROMPT, 1ST PILL =================================
function loadEventsByPrompt() {
    const prompt = $('#filter-event-prompt').val().trim();
    executeFilterPrompt('events', prompt, $('#ai-event-submit-btn'), $('#events-container'));
}

// ================================= LOADING BANDS BY PROMPT, 2ND PILL =================================
function loadBandsByPrompt() {
    const prompt = $('#filter-band-prompt').val().trim();
    executeFilterPrompt('bands', prompt, $('#ai-band-submit-btn'), $('#bands-container'));
}

// =================================== EXECUTING PROMPT FILTERING ===================================
function executeFilterPrompt(type, prompt, button, container) {
    if (!prompt) return;
    button.prop('disabled', true).text('Thinking..');

    $.ajax({
        url: '/api/ai-execute-filter',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ prompt: prompt, type: type }),

        success: function (response) {
            container.empty();
            const dataList = response.data || [];

            if (type === 'events') {
                renderEvents(dataList, container);
            } else if (type === 'bands') {
                renderBands(dataList, container);
            }
        },
        error: function (xhr) {
            $('#bands-container').html(`<p class="text-center">Error occurred while trying to understand the user's prompt</p>`);
            if (type === 'events') initMapEvents([]);
        },
        complete: function () {
            button.prop('disabled', false).text("Search with Prompt");
        }
    });
}

// =================================== RENDERING FILTERED EVENTS BASED ON PROMPT OR FILTERS ===================================
function renderEvents(events, container) {
    if (events && events.length > 0) {
        events.forEach(function (event) {
            const eventDate = new Date(event.event_datetime);
            const formattedDate = eventDate.toLocaleDateString() + ' ' + eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            // const priceDisplay = event.participants_price + " euro";
            const priceDisplay = (parseFloat(event.participants_price) || 0).toFixed(2) + " euro";

            const eventHtml = `
            <div class="event-band-card">
                <h3>${event.event_type} - ${event.band_name}</h3>
                <div>
                    ${formattedDate} <br>
                    ${event.event_city}, ${event.event_address}
                </div>
                <p>${event.event_description}</p>
                <div>Price: ${priceDisplay}</div>
            </div>
        `;
            container.append(eventHtml);
        });
        initMapEvents(events);
    } else {
        container.html('<p class="text-center">No upcoming public events found</p>');
        initMapEvents([]);
    }
}

function renderBands(bandsList, container) {
    container.empty();
    if (bandsList.length > 0) {
        bandsList.forEach(function (band) {
            const webPageLink = band.webpage ?
                `<p>Website: <a href="${band.webpage}" target="_blank">${band.webpage}</a></p>` :
                '';
            const bandHtml = `
            <div class="event-band-card">
                <h3>${band.band_name}</h3>
                <div class="band-details-row" style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <span>
                        Band description: ${band.band_description} <br>
                        Music genres: ${band.music_genres} <br>
                        Founded: ${band.foundedYear}, members: ${band.members_number} <br>
                        ${band.telephone} <br>
                        ${webPageLink}
                    </span>
                    <button class="password-show-hide" onclick="bandInformation('${band.band_id}')" style="background-color: rgba(212, 170, 91, 1) !important;">Get to Know this Band</button>
                </div>
            </div>`;
            container.append(bandHtml);
        });
    } else {
        container.html('<p class="text-center">No registered bands found</p>');
    }
}