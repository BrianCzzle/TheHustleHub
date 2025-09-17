// --- Firebase Setup ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  child,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCjp85WZDZbVHzIyqSO1ZkOZKcHwrGx9Q0",
  authDomain: "thehustlehub-c39ed.firebaseapp.com",
  databaseURL: "https://thehustlehub-c39ed-default-rtdb.firebaseio.com",
  projectId: "thehustlehub-c39ed",
  storageBucket: "thehustlehub-c39ed.appspot.com",
  messagingSenderId: "315377229226",
  appId: "1:315377229226:web:741d9d45f0e5adfdabdfd3",
  measurementId: "G-WW94CRTJRJ",
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
console.log("🌐 browse.js loaded");

// Get the current user from localStorage
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
const welcomeUser = document.getElementById("welcomeUser");

// Redirect to auth.html if no user is logged in
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", () => {
  console.log("🚪 Logging out...");
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
});

// If hustler is logged in
if (currentUser) {
  welcomeUser.textContent = `Hey, ${currentUser.username}`;
  welcomeUser.setAttribute("data-user", "true");
  logoutBtn.style.display = "inline-block"; // Show logout
} else {
  // Client browsing, hide login-specific stuff
  welcomeUser.textContent = `Welcome, visitor.`;
  welcomeUser.removeAttribute("data-user");
  logoutBtn.style.display = "none"; // Hide logout
}

// Fetch all users from Firebase
const hustlersList = document.getElementById("hustlersList");
let hustlers = [];

get(ref(db, "users")).then((snapshot) => {
  if (snapshot.exists()) {
    const allUsers = Object.values(snapshot.val());
    // Do NOT filter out the current user; show all users
    hustlers = allUsers;
    console.log("👥 All users:", allUsers);
    console.log("🧠 Hustlers list:", hustlers);
    if (hustlers.length === 0) {
      hustlersList.innerHTML =
        "<p>No hustlers found. Be the first to sign up!</p>";
    } else {
      renderHustlers(hustlers);
      populateLocationFilter(hustlers);
      setupFilterListeners();
    }
  } else {
    hustlersList.innerHTML =
      "<p>No hustlers found. Be the first to sign up!</p>";
  }
});

function renderHustlers(hustlersToRender) {
  hustlersList.innerHTML = "";

  if (hustlersToRender.length === 0) {
    document.getElementById("noResults").style.display = "block";
    return;
  }

  document.getElementById("noResults").style.display = "none";

  hustlersToRender.forEach((hustler) => {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-location", hustler.location || "");
    card.setAttribute("data-rate", hustler.price || "0");
    card.setAttribute(
      "data-skills",
      hustler.description ? hustler.description.toLowerCase() : ""
    );

    const isCurrentUser = currentUser && hustler.email === currentUser.email;

    card.innerHTML = `
      <div style="position: relative;">
        ${
          isCurrentUser
            ? `
          <button id="editBtn">Edit</button>
        `
            : ""
        }
        <h3>${hustler.username}</h3>
        <p><strong>Location:</strong> ${hustler.location || "Unknown"}</p>
        <p><strong>Skills:</strong> ${
          hustler.description || "No description provided."
        }</p>
        <p><strong>Rate:</strong> ${
          hustler.price ? `ZAR ${hustler.price}` : "Negotiable"
        }</p>
        <div class="card-actions">
          <button class="whatsappBtn"><i class="fab fa-whatsapp"></i> WhatsApp</button>
          <button class="emailBtn"><i class="fas fa-envelope"></i> Email</button>
        </div>
      </div>
    `;

    hustlersList.appendChild(card);

    // WhatsApp and Email Buttons
    const whatsappBtn = card.querySelector(".whatsappBtn");
    const emailBtn = card.querySelector(".emailBtn");

    whatsappBtn.addEventListener("click", () => {
      contactViaWhatsApp(hustler.whatsApp);
    });

    emailBtn.addEventListener("click", () => {
      contactViaEmail(hustler.email);
    });

    // Edit feature
    if (isCurrentUser) {
      const editBtn = card.querySelector("#editBtn");
      editBtn.addEventListener("click", () => {
        editHustler(hustler);
      });
    }
  });
}

function contactViaWhatsApp(number) {
  if (!number) {
    Swal.fire("Oops!", "This hustler didn't add a WhatsApp number.", "warning");
    return;
  }

  // Sanitize number and prepend country code (e.g., South Africa: 27)
  const cleaned = number.replace(/\D/g, ""); // Remove non-digits
  const formatted = cleaned.startsWith("0")
    ? "27" + cleaned.slice(1) // Replace starting 0 with SA's country code
    : cleaned;

  const url = `https://wa.me/${formatted}`;
  window.open(url, "_blank");
}

function contactViaEmail(email) {
  if (!email) {
    Swal.fire("Oops!", "No email found for this hustler.", "warning");
    return;
  }
  window.location.href = `mailto:${email}`;
}

function editHustler(hustler) {
  Swal.fire({
    title: "Edit Your Info",
    html: `
      <input id="editUsername" class="swal2-input" placeholder="Username" value="${hustler.username}">
      <input id="editLocation" class="swal2-input" placeholder="Location" value="${hustler.location || ''}">
      <input id="editDescription" class="swal2-input" placeholder="Skills / Description" value="${hustler.description || ''}">
      <input id="editPrice" class="swal2-input" placeholder="Price" value="${hustler.price || ''}">
      <input id="editWhatsapp" class="swal2-input" placeholder="WhatsApp Number" value="${hustler.whatsApp || ''}">
      <input id="editEmail" class="swal2-input" value="${hustler.email}" disabled style="background:#eee;cursor:not-allowed;" title="Email cannot be changed">
    `,
    confirmButtonText: "Save Changes",
    focusConfirm: false,
    preConfirm: () => {
      return {
        username: document.getElementById("editUsername").value.trim(),
        location: document.getElementById("editLocation").value.trim(),
        description: document.getElementById("editDescription").value.trim(),
        price: document.getElementById("editPrice").value.trim(),
        whatsApp: document.getElementById("editWhatsapp").value.trim(),
        email: hustler.email // always use original email
      };
    },
  }).then((result) => {
    if (result.isConfirmed) {
      const updatedData = result.value;
      // Find the Firebase key for this user
      get(ref(db, "users")).then((snapshot) => {
        if (snapshot.exists()) {
          const usersObj = snapshot.val();
          const userKey = Object.keys(usersObj).find(
            (key) => usersObj[key].email === hustler.email
          );
          if (userKey) {
            // Update user in Firebase
            set(ref(db, `users/${userKey}`), {
              ...usersObj[userKey],
              ...updatedData,
            })
              .then(() => {
                // Update currentUser in localStorage
                localStorage.setItem(
                  "currentUser",
                  JSON.stringify({ ...usersObj[userKey], ...updatedData })
                );
                Swal.fire({
                  icon: "success",
                  title: "Profile Updated",
                  timer: 1000,
                  showConfirmButton: false,
                }).then(() => location.reload());
              })
              .catch((err) => {
                Swal.fire("Error", err.message, "error");
              });
          }
        }
      });
    }
  });
}

function populateLocationFilter(hustlers) {
  const locationFilter = document.getElementById("locationFilter");
  if (!locationFilter) return;

  // Get unique locations
  const locations = [
    ...new Set(hustlers.map((h) => h.location).filter(Boolean)),
  ];

  // Add locations to filter
  locations.forEach((location) => {
    const option = document.createElement("option");
    option.value = location;
    option.textContent = location;
    locationFilter.appendChild(option);
  });
}

function setupFilterListeners() {
  const searchInput = document.getElementById("searchInput");
  const locationFilter = document.getElementById("locationFilter");
  const rateFilter = document.getElementById("rateFilter");

  if (searchInput) searchInput.addEventListener("input", filterHustlers);
  if (locationFilter) locationFilter.addEventListener("change", filterHustlers);
  if (rateFilter) rateFilter.addEventListener("change", filterHustlers);
}

function filterHustlers() {
  const searchText = document.getElementById("searchInput").value.toLowerCase();
  const locationFilter = document.getElementById("locationFilter").value;
  const rateFilter = document.getElementById("rateFilter").value;

  const filteredHustlers = hustlers.filter((hustler) => {
    // Search filter
    const matchesSearch =
      searchText === "" ||
      hustler.username.toLowerCase().includes(searchText) ||
      (hustler.description &&
        hustler.description.toLowerCase().includes(searchText)) ||
      (hustler.location && hustler.location.toLowerCase().includes(searchText));

    // Location filter
    const matchesLocation =
      locationFilter === "" || hustler.location === locationFilter;

    // Rate filter
    let matchesRate = true;
    if (rateFilter !== "" && hustler.price) {
      const price = parseInt(hustler.price);
      if (rateFilter === "0-1000") matchesRate = price <= 1000;
      else if (rateFilter === "1000-5000")
        matchesRate = price > 1000 && price <= 5000;
      else if (rateFilter === "5000+") matchesRate = price > 5000;
    }

    return matchesSearch && matchesLocation && matchesRate;
  });

  renderHustlers(filteredHustlers);
}
