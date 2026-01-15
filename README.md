# Band Finder Project

## Description
This is a web application designed to help people find music bands and events. It also allows band owners to manage their profiles, public concerts, and private booking requests.

## Main Features

### For Guest Users:
* **Explore Content:** Browse a comprehensive list of music bands and public events.
* **Smart Filtering:** Filter bands and events by music genre, city, and date.
* **AI Chatbot:** Interact with a smart music assistant powered by **Google Gemini AI** to ask questions about music history or get recommendations.
* **AI-Powered Search:** Use natural language prompts (e.g., "Show me rock bands in Heraklion") to filter results via AI-generated SQL queries.
* **Weather Forecast:** View a 5-day weather forecast for the local area (OpenWeatherMap API).
* **Interactive Map:** View event locations on an interactive map (OpenLayers).

### For Registered Bands:
* **Dashboard Management:** A dedicated panel to manage profile details (members, description, genres).
* **Public Events:** Create, edit, and delete public concerts or festivals.
* **Dynamic Availability Calendar:** Manage available dates. The system automatically updates availability based on booked events to prevent double-booking.
* **Private Booking Requests:** Receive and manage requests for private performances (weddings, parties). Bands can accept (mark as "to be done") or reject requests with a justification.
* **Communication:** Chat directly with users regarding private event details.

### For Registered Users:
* **Private Bookings:** Request bands for private events (e.g., weddings) by selecting a date from the band's real-time availability calendar.
* **Distance Sorting:** Sort public events based on driving distance from the user's home address (using **Trueway Matrix API**).
* **Reviews & Ratings:** Rate bands and write reviews (which are subject to admin moderation).
* **Chat System:** Communicate directly with bands to discuss booking details.

### For Administrators:
* **Statistics Dashboard:** View visual data insights using **Google Charts** (e.g., Bands per City, Public vs. Private Events, Total Revenue).
* **User Management:** Ability to delete users or bands from the system.
* **Review Moderation:** Approve or reject user reviews before they are published on the band's profile.

## Technology Stack
* **Frontend:** HTML, CSS (Bootstrap 3), and JavaScript (jQuery, Flatpickr for calendars).
* **Backend:** Node.js with the Express framework.
* **Database:** MySQL for storing users, bands, events, reviews, and messages.
* **AI Integration:** Google Gemini AI for the chatbot and Text-to-SQL filtering.
* **Maps:** OpenStreetMap (OpenLayers) and Geocoding API for address verification.
* **Weather:** OpenWeatherMap API.

## How to Run the Project
1.  **Prerequisites:**
    * Node.js installed.
    * MySQL Database installed and running.

2.  **Installation:**
    ```bash
    # Clone the repository
    git clone <[repository_url](https://github.com/makowski-michal/band-finder/)>
    
    # Navigate to the project directory
    cd Band-Finder
    
    # Install dependencies
    npm install
    ```

3.  **Database Setup:**
    * Make sure your MySQL server is running.
    * Update the database credentials in `database.js` or `app.js` if necessary (default: user `root`, no password).
    * Fill in the `app.js` file with your own api keys (weather, gemini, trueway matrix).
    * Initialize the database structure by visiting `http://localhost:3000/initdb` after starting the server.

4.  **Start the Server:**
    ```bash
    node app.js
    ```

5.  **Access the Application:**
    * Open your browser and go to: `http://localhost:3000/html/guest.html`
    * **Admin Login:** `http://localhost:3000/html/admin_login.html` (Credentials: `admin` / `admiN12@*`)

---
Author: Michał Makowski
