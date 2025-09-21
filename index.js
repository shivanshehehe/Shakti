/* Shakti.js -- Client side */

/* ========== CONFIG ========== */
const STORAGE_KEY = 'shakti_contacts';

/* ========== CONTACTS: localStorage CRUD & rendering ========== */
function loadContacts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveContacts(contacts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

function renderContacts() {
  const list = document.getElementById('contacts-list');
  list.innerHTML = '';
  const contacts = loadContacts();
  contacts.forEach((c, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <label>
        <input type="checkbox" class="contact-checkbox" data-idx="${idx}">
        <span class="contact-text">${escapeHtml(c.name)} - ${escapeHtml(c.number)}</span>
      </label>
      <button class="delete-contact" data-idx="${idx}" aria-label="Delete contact">Delete</button>
    `;
    list.appendChild(li);
  });
}

// Simple sanitize for display
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));
}

// add contact
document.getElementById('add-contact').addEventListener('click', () => {
  const name = document.getElementById('contact-name').value.trim();
  const number = document.getElementById('contact-number').value.trim();
  if (!name || !number) return alert('Please enter both name and number!');
  // basic validation: digits and optional +, spaces, -, ()
  if (!/^[+\d][\d\s\-\(\)]{4,}$/.test(number)) {
    if (!confirm('Number looks unusual. Do you want to save anyway?')) return;
  }
  const contacts = loadContacts();
  contacts.push({ name, number });
  saveContacts(contacts);
  document.getElementById('contact-name').value = '';
  document.getElementById('contact-number').value = '';
  renderContacts();
});

// delegate delete button clicks
document.getElementById('contacts-list').addEventListener('click', (ev) => {
  if (ev.target.classList.contains('delete-contact')) {
    const idx = Number(ev.target.dataset.idx);
    const contacts = loadContacts();
    contacts.splice(idx, 1);
    saveContacts(contacts);
    renderContacts();
  }
});

/* ========== GEO + MAP (Leaflet) ========== */
let userLat = null, userLng = null;
let map = null, marker = null;

function initOrUpdateMap(lat, lng) {
  if (!map) {
    map = L.map('map').setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    marker = L.marker([lat, lng]).addTo(map).bindPopup('You are here');
    marker.openPopup();
  } else {
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng]);
  }
}

if (navigator.geolocation) {
  // use watchPosition to keep location updated
  navigator.geolocation.watchPosition(position => {
    userLat = position.coords.latitude;
    userLng = position.coords.longitude;
    document.getElementById('location').textContent =
      `Latitude: ${userLat.toFixed(6)} | Longitude: ${userLng.toFixed(6)}`;
    initOrUpdateMap(userLat, userLng);
  }, err => {
    console.error('Geolocation error', err);
    document.getElementById('location').textContent = 'Unable to fetch location';
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
} else {
  document.getElementById('location').textContent = 'Geolocation not supported';
}

/* ========== EMERGENCY: collect recipients & send ========== */
document.getElementById('emergency').addEventListener('click', () => {
  if (!userLat || !userLng) return alert('Location not yet available');

  // collect checked contacts; if none checked, ask to send to all
  const contacts = loadContacts();
  const checked = Array.from(document.querySelectorAll('.contact-checkbox:checked'))
                       .map(cb => contacts[Number(cb.dataset.idx)]);
  let recipients = checked.length ? checked : contacts.slice();

  if (!recipients.length) return alert('No contacts saved. Please add emergency contacts first.');

  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${userLat},${userLng}`;
  const defaultMsg = `🚨 EMERGENCY 🚨\nI need help. My location: ${mapsLink}\nLatitude: ${userLat.toFixed(6)}, Longitude: ${userLng.toFixed(6)}`;

  // Confirm before sending
  if (!confirm(`Send emergency alert to ${recipients.length} contact(s)?\n\nMessage preview:\n${defaultMsg}`)) return;

  // Generate sms: links directly
  const smsLinks = recipients.map(c =>
    `sms:${encodeURIComponent(formatPhoneForSms(c.number))}?body=${encodeURIComponent(defaultMsg)}`
  );

  // On desktop, provide the links for the user to copy. On mobile, open them.
  let message = 'Tap "OK" to open the SMS app for each contact. On desktop, copy the links below:\n\n';
  message += smsLinks.join('\n');
  alert(message);

  // Open each SMS link in a new window/tab, which will trigger the SMS app on mobile
  smsLinks.forEach(link => {
    window.open(link, '_blank');
  });
});

function formatPhoneForSms(num) {
  // Keep minimal formatting for sms: scheme, remove spaces
  return num.replace(/\s+/g, '');
}

/* ========== init render ========== */
renderContacts();
