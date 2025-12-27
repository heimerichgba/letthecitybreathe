// --- 1. Navigation Logic ---
function showSection(sectionId) {
    // 1. Remove "active" class from ALL sections
    document.querySelectorAll('section').forEach(el => {
        el.classList.remove('active-section');
    });

    // 2. Add "active" class to the ONE section we want
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.add('active-section');
        
        // If opening the novel, reset to start
        if (sectionId === 'novel' && typeof mainSwiper !== 'undefined') {
            mainSwiper.slideToLoop(0, 0); 
        }
    }
}

// --- 2. Swiper Initialization (Graphic Novel ONLY) ---
// We add ":not(.reference-swiper)" so it ignores the context sliders
const mainSwiper = new Swiper('.swiper:not(.reference-swiper)', {
    loop: true,
    pagination: {
        el: '.swiper-pagination',
        clickable: true,
    },
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },
});

// --- 3. Reference Sliders (Context Section) ---
document.querySelectorAll('.reference-swiper').forEach(function(sliderElement) {
    // Find the pagination that is explicitly right AFTER this slider
    const paginationElement = sliderElement.nextElementSibling;

    new Swiper(sliderElement, {
        loop: true,
        slidesPerView: 1,
        spaceBetween: 0,
        
        pagination: {
            el: paginationElement, // Connects to the outside dots
            clickable: true,
        },
        navigation: {
            nextEl: sliderElement.querySelector('.swiper-button-next'),
            prevEl: sliderElement.querySelector('.swiper-button-prev'),
        },
    });
});

// --- 4. Map Initialization ---
var map = L.map('map').setView([47.3769, 8.5417], 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

// --- 5. Database & Interaction Logic ---
let isAddingMode = false;
let tempLatLng = null; 
let currentEditId = null; 

// Toggle the Sidebar List
document.getElementById('list-toggle-btn').addEventListener('click', () => {
    const panel = document.getElementById('void-list-panel');
    panel.style.display = (panel.style.display === 'block') ? 'none' : 'block';
});

// "Mark a Void" Button
document.getElementById('add-marker-btn').addEventListener('click', function() {
    isAddingMode = true;
    currentEditId = null; 
    document.getElementById('map').classList.add('adding-mode');
    this.innerText = "Click location on map..."; 
});

// Map Click
map.on('click', function(e) {
    if (isAddingMode) {
        tempLatLng = e.latlng;
        openModal('', ''); 
        isAddingMode = false;
        document.getElementById('map').classList.remove('adding-mode');
        document.getElementById('add-marker-btn').innerText = "Mark a Void";
    }
});

// Save Function
function submitVoid() {
    const title = document.getElementById('void-title').value;
    const desc = document.getElementById('void-desc').value;

    if (!title || !desc) {
        alert("Please fill in both fields.");
        return;
    }

    if (currentEditId) {
        database.ref('voids/' + currentEditId).update({
            title: title,
            description: desc
        });
    } else {
        database.ref('voids').push().set({
            lat: tempLatLng.lat,
            lng: tempLatLng.lng,
            title: title,
            description: desc,
            timestamp: new Date().toISOString()
        });
    }

    closeModal();
    resetForm();
}

function openModal(title, desc) {
    document.getElementById('void-title').value = title;
    document.getElementById('void-desc').value = desc;
    document.getElementById('void-modal').style.display = 'flex';
}

function resetForm() {
    document.getElementById('void-title').value = '';
    document.getElementById('void-desc').value = '';
    currentEditId = null;
    tempLatLng = null;
}

function closeModal() {
    document.getElementById('void-modal').style.display = 'none';
    resetForm();
}

// Window Functions for Popup Buttons
window.deleteVoid = function(id) {
    if (confirm("Are you sure you want to delete this void?")) {
        database.ref('voids/' + id).remove();
    }
};

window.editVoid = function(id, title, desc) {
    currentEditId = id; 
    openModal(title, desc); 
    map.closePopup(); 
};

// Read Data & Render
let voidMarkers = {}; 

database.ref('voids').on('value', (snapshot) => {
    Object.values(voidMarkers).forEach(marker => map.removeLayer(marker));
    voidMarkers = {};
    const listContainer = document.getElementById('void-list-content');
    listContainer.innerHTML = ''; 

    const data = snapshot.val();
    if (data) {
        Object.entries(data).forEach(([id, voidItem]) => {
            
            const blackIcon = L.divIcon({
                className: 'black-marker-icon',
                iconSize: [16, 16],
                iconAnchor: [8, 8],
                popupAnchor: [0, -10]
            });

            const popupContent = `
                <b>${voidItem.title}</b><br>
                ${voidItem.description}
                <div class="popup-btn-row">
                    <button class="edit-btn" onclick="editVoid('${id}', '${voidItem.title}', '${voidItem.description}')">Edit</button>
                    <button class="delete-btn" onclick="deleteVoid('${id}')">Delete</button>
                </div>
            `;

            const marker = L.marker([voidItem.lat, voidItem.lng], { icon: blackIcon })
                .addTo(map)
                .bindPopup(popupContent);
            
            voidMarkers[id] = marker;

            const listItem = document.createElement('li');
            listItem.innerText = voidItem.title;
            
            listItem.addEventListener('click', () => {
                map.flyTo([voidItem.lat, voidItem.lng], 17, {
                    animate: true,
                    duration: 1.5 
                });
                map.once('moveend', function() {
                    marker.openPopup();
                });
            });

            listContainer.appendChild(listItem);
        });
    }
});