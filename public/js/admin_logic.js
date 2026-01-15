// ============================ getting and updating review statuses ==============================
function updateStatus(reviewId, newStatus) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const messageDiv =document.getElementById('put-message');
    $.ajax({
        url: '/reviewStatus/'+ reviewId + '/' + newStatus + '/' + now,
        method: 'PUT',
        success: function(response) {
            $('#get-reviews-form').submit(); 
            messageDiv.innerHTML= "record put successfully";
            messageDiv.style.color ="green";
        },
        error: function(xhr) {
            messageDiv.innerHTML= "error";
            messageDiv.style.color ="red";
        }
    });
}

function getReviews(event) {
    event.preventDefault();
    const bandName = $('#get-band-name').val();
    const ratingFrom = $('#get-rating-from').val();
    const ratingTo = $('#get-rating-to').val();
    const pickedStatus = $('#get-like-status').val();
    let url = '/reviews/' + bandName;
    
    if (ratingFrom) { url += `?ratingFrom=${ratingFrom}&ratingTo=${ratingTo}`; }
    if (pickedStatus && pickedStatus != "all" ) { url += `?pickedStatus=${pickedStatus}`; }
    
    $.ajax({
        url: url,
        method: 'GET',
        success: function(response) {
            const container = $('#get-reviews-result');
            container.empty();
            
            if (response.data && response.data.length > 0) {
                response.data.forEach(function(review) {
                    let buttons = '';

                    const statusColors = {
                        'pending': 'blue',
                        'published': 'green',
                        'rejected': 'red'
                    };
                    const displayColor = statusColors[review.status];

                    if (review.status === 'pending') { // buttons only for pending
                        buttons = `
                            <div style="margin-top: 10px;">
                                <button onclick="updateStatus(${review.review_id}, 'published')" class="password-show-hide">Accept</button>
                                <button onclick="updateStatus(${review.review_id}, 'rejected')" class="password-show-hide">Reject</button>
                            </div>`;
                    }

                    const dateShow =new Date(review.date_time);
                    const msgTime = dateShow.toLocaleDateString() + ' ' + dateShow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    container.append(`
                        <div class="event-band-card">
                            <h4>Band: ${review.band_name} (Rating: ${review.rating}/5)</h4>
                            From: ${review.sender}<br>
                            "${review.review}"<br>
                            <span style="color: ${displayColor};">Status: ${review.status}, Date: ${msgTime}</span>
                            ${buttons}
                        </div>
                    `);
                });
            } else {
                container.html('<p>No reviews found.</p>');
            }
        }
    });
}

// =============================== get and delete users ==================================
function getUsers(event) {
    event.preventDefault();
    const userName = $('#get-user-name').val();
    let url = '/users/' + userName;
    
    $.ajax({
        url: url,
        method: 'GET',
        success: function(response) {
            const container = $('#delete-users-result');
            container.empty();
            
            if (response.data && response.data.length > 0) {
                response.data.forEach(function(user) {

                    container.append(`
                        <div class="event-band-card">
                            <h4>Username: ${user.username} (id: ${user.user_id})</h4>
                            email: ${user.email}<br>
                            ${user.firstname} ${user.lastname}<br>
                            <button onclick="deleteUser(${user.user_id})" class="password-show-hide">Delete User</button>
                        </div>
                    `);
                });
            } else {
                container.html('<p>No users found</p>');
            }
        }
    });
}

function deleteUser(userId) {
    const messageDiv =document.getElementById('put2-message');

    if (!confirm("Are you sure you want to delete this user? This action cannot be undone")) {
        return;
    }

    $.ajax({
        url: '/deleteUser/' + userId,
        method: 'DELETE',
        success: function(response) {
            $('#get-users-form').submit(); 
            messageDiv.innerHTML= "user deleted successfully";
            messageDiv.style.color ="green";
        },
        error: function(xhr) {
            messageDiv.innerHTML= "error";
            messageDiv.style.color ="red";
        }
    });
}

// ======================= google charts ==================================
google.charts.load('current', {'packages':['corechart']});

$(document).ready(function() {
    $('a[href="#statistics"]').on('shown.bs.tab', function (e) { // we start to load google charts when the tab is opened
        google.charts.setOnLoadCallback(loadStatistics);
    });
});

$(window).resize(function() {
    if ($('#statistics').hasClass('active')) {
        loadStatistics();
    }
});

async function loadStatistics() {
    try {
        const response = await $.get('/api/admin/statistics'); // downloading data from endpoint
        if (!response.success) return;

        const cityData = new google.visualization.DataTable(); // chart 1, we retrieve the data with loop
        cityData.addColumn('string', 'City');
        cityData.addColumn('number', 'Bands');
        response.bandsByCity.forEach(item => {
            cityData.addRows([[item.city, item.count]]);
        });

        const eventData = google.visualization.arrayToDataTable([ // chart 2
            ['Type', 'Count'],
            ['Public', response.counts.publicEvents],
            ['Private', response.counts.privateEvents]
        ]);

        const userBandData = google.visualization.arrayToDataTable([ // chart 3
            ['Role', 'Count'],
            ['Users', response.counts.users],
            ['Bands', response.counts.bands]
        ]);

        var options1 = {'title':'Bands per City'};
        var options2 = {'title':'Public vs Private Events'};
        var options3 = {'title':'Users vs Bands'};

        var chart1 = new google.visualization.ColumnChart(document.getElementById('chart-bands-city'));
        var chart2 = new google.visualization.PieChart(document.getElementById('chart-events-type'));
        var chart3 = new google.visualization.PieChart(document.getElementById('chart-users-bands'));
        chart1.draw(cityData, options1);
        chart2.draw(eventData, options2);
        chart3.draw(userBandData, options3);

        $('#total-revenue').text(parseFloat(response.revenue).toFixed(2) + " EUR");
    } catch (error) {
        $('#total-revenue').text("Error");
    }
}