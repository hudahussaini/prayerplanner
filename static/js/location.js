// Location and Sunset Time Management

let sunsetHour = 18; // Default to 6 PM if location not available
let sunsetTime = '18:00';
let sunriseHour = 6; // Default to 6 AM if location not available
let sunriseTime = '06:00';
let dhuhrTime = '12:00'; // Default noon
let asrTime = '15:30'; // Default mid-afternoon
let ishaTime = '20:00'; // Default evening

// Initialize location and sunset time
async function initializeLocation() {
    // Check if we have cached sunset data for today
    const cached = getCachedSunsetData();
    if (cached && cached.sunriseTime && cached.sunriseHour !== undefined && cached.dhuhrTime) {
        // Valid cache with all prayer times
        sunsetHour = cached.hour;
        sunsetTime = cached.time;
        sunriseHour = cached.sunriseHour;
        sunriseTime = cached.sunriseTime;
        dhuhrTime = cached.dhuhrTime;
        asrTime = cached.asrTime;
        ishaTime = cached.ishaTime;
        updateLocationUI(cached);
        return;
    }

    // If cached data is missing prayer times, clear it and fetch fresh data
    if (cached && (!cached.sunriseTime || !cached.dhuhrTime)) {
        localStorage.removeItem('sunsetData');
    }

    // Request location permission and fetch sunset time
    try {
        const position = await getUserLocation();
        const sunsetData = await fetchSunsetTime(position.coords.latitude, position.coords.longitude);

        // Cache the data
        cacheSunsetData(sunsetData);

        // Update global variables
        sunsetHour = sunsetData.hour;
        sunsetTime = sunsetData.time;
        sunriseHour = sunsetData.sunriseHour;
        sunriseTime = sunsetData.sunriseTime;
        dhuhrTime = sunsetData.dhuhrTime;
        asrTime = sunsetData.asrTime;
        ishaTime = sunsetData.ishaTime;

        updateLocationUI(sunsetData);
    } catch (error) {
        console.error('Failed to get location or sunset time:', error);
        updateLocationUI({
            error: error.message,
            hour: sunsetHour,
            time: sunsetTime,
            sunriseHour: sunriseHour,
            sunriseTime: sunriseTime,
            dhuhrTime: dhuhrTime,
            asrTime: asrTime,
            ishaTime: ishaTime
        });
    }
}

function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => resolve(position),
            error => {
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        reject(new Error('Location permission denied. Using default sunset time.'));
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(new Error('Location unavailable. Using default sunset time.'));
                        break;
                    case error.TIMEOUT:
                        reject(new Error('Location request timeout. Using default sunset time.'));
                        break;
                    default:
                        reject(new Error('Unknown error. Using default sunset time.'));
                }
            }
        );
    });
}

async function fetchSunsetTime(lat, lng) {
    const response = await fetch(`/api/sunset?lat=${lat}&lng=${lng}`);
    if (!response.ok) {
        throw new Error('Failed to fetch sunset time');
    }

    const data = await response.json();

    // Parse the sunset time (it comes in local time from the API)
    // We need to convert it to local browser time
    const sunsetDate = new Date(data.sunset);
    const sunsetHour = sunsetDate.getHours();
    const sunsetMinutes = sunsetDate.getMinutes();
    const sunsetTimeStr = `${sunsetHour.toString().padStart(2, '0')}:${sunsetMinutes.toString().padStart(2, '0')}`;

    // Parse sunrise time
    const sunriseDate = new Date(data.sunrise);
    const sunriseHour = sunriseDate.getHours();
    const sunriseMinutes = sunriseDate.getMinutes();
    const sunriseTimeStr = `${sunriseHour.toString().padStart(2, '0')}:${sunriseMinutes.toString().padStart(2, '0')}`;

    return {
        hour: sunsetHour,
        time: sunsetTimeStr,
        sunriseHour: sunriseHour,
        sunriseTime: sunriseTimeStr,
        dhuhrTime: data.dhuhr_time || '12:00',
        asrTime: data.asr_time || '15:30',
        ishaTime: data.isha_time || '20:00',
        lat: lat,
        lng: lng,
        date: new Date().toDateString()
    };
}

function getCachedSunsetData() {
    try {
        const cached = localStorage.getItem('sunsetData');
        if (!cached) return null;

        const data = JSON.parse(cached);

        // Check if it's from today
        const today = new Date().toDateString();
        if (data.date !== today) {
            localStorage.removeItem('sunsetData');
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error reading cached sunset data:', error);
        return null;
    }
}

function cacheSunsetData(data) {
    try {
        localStorage.setItem('sunsetData', JSON.stringify(data));
    } catch (error) {
        console.error('Error caching sunset data:', error);
    }
}

function updateLocationUI(data) {
    const locationInfo = document.getElementById('location-info');
    if (!locationInfo) return;

    // Use current global values if not in data (handles old cache format)
    const displaySunriseTime = data.sunriseTime || sunriseTime;
    const displaySunsetTime = data.time || sunsetTime;
    const displayDhuhrTime = data.dhuhrTime || dhuhrTime;
    const displayAsrTime = data.asrTime || asrTime;
    const displayIshaTime = data.ishaTime || ishaTime;

    if (data.error) {
        locationInfo.innerHTML = `
            <span class="location-status error">⚠ ${data.error}</span>
            <span class="prayer-time">🌅 Sunrise: ${displaySunriseTime}</span>
            <span class="prayer-time">☀️ Dhuhr: ${displayDhuhrTime}</span>
            <span class="prayer-time">🌤️ Asr: ${displayAsrTime}</span>
            <span class="prayer-time">🌇 Sunset: ${displaySunsetTime}</span>
            <span class="prayer-time">🌙 Isha: ${displayIshaTime}</span>
        `;
    } else {
        locationInfo.innerHTML = `
            <span class="location-status">📍 Location detected</span>
            <span class="prayer-time">🌅 Sunrise: ${displaySunriseTime}</span>
            <span class="prayer-time">☀️ Dhuhr: ${displayDhuhrTime}</span>
            <span class="prayer-time">🌤️ Asr: ${displayAsrTime}</span>
            <span class="prayer-time">🌇 Sunset: ${displaySunsetTime}</span>
            <span class="prayer-time">🌙 Isha: ${displayIshaTime}</span>
        `;
    }
}

// Helper function to convert time to minutes from sunset
function timeToMinutesFromSunset(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const sunsetMinutes = sunsetHour * 60;

    // Calculate minutes from sunset (can be negative for before sunset)
    let minutesFromSunset = totalMinutes - sunsetMinutes;

    // Handle day wrap (if time is before sunset, it might be next day)
    if (minutesFromSunset < 0) {
        minutesFromSunset += 24 * 60; // Add 24 hours
    }

    return minutesFromSunset;
}

// Helper function to convert minutes from sunset to time string
function minutesFromSunsetToTime(minutesFromSunset) {
    const sunsetMinutes = sunsetHour * 60;
    let totalMinutes = sunsetMinutes + minutesFromSunset;

    // Handle day wrap
    if (totalMinutes >= 24 * 60) {
        totalMinutes -= 24 * 60;
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Get hour label for timeline (handles day wrap)
function getHourLabel(offsetHours) {
    let hour = (sunsetHour + offsetHours) % 24;
    return `${hour.toString().padStart(2, '0')}:00`;
}
