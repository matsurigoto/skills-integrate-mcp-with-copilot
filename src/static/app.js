document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const adminLoginBtn = document.getElementById("admin-login-btn");
  const adminModal = document.getElementById("admin-modal");
  const adminForm = document.getElementById("admin-form");
  const closeModal = document.querySelector(".close");
  const adminStatus = document.getElementById("admin-status");

  // Admin state
  let isAdmin = false;
  let adminToken = null;

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li>
                        <span class="participant-email">${email}</span>
                        ${isAdmin ? 
                          `<button class="delete-btn admin-delete" data-activity="${name}" data-email="${email}">🗑️ Admin Remove</button>` :
                          `<button class="delete-btn self-delete" data-activity="${name}" data-email="${email}">❌ Remove Me</button>`
                        }
                      </li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    // Get current user email for self-removal
    const currentUserEmail = document.getElementById("email").value;
    
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add admin authorization if user is admin
      if (isAdmin && adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const url = new URL(`/activities/${encodeURIComponent(activity)}/unregister`, window.location.origin);
      url.searchParams.set('email', email);
      
      // For non-admin users, add student_email parameter for self-removal
      if (!isAdmin) {
        url.searchParams.set('student_email', currentUserEmail);
      }

      const response = await fetch(url, {
        method: "DELETE",
        headers: headers
      });

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Admin login functionality
  adminLoginBtn.addEventListener("click", () => {
    adminModal.style.display = "block";
  });

  closeModal.addEventListener("click", () => {
    adminModal.style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target === adminModal) {
      adminModal.style.display = "none";
    }
  });

  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.getElementById("admin-password").value;

    try {
      const response = await fetch(`/admin/login?password=${encodeURIComponent(password)}`, {
        method: "POST"
      });

      const result = await response.json();

      if (response.ok) {
        isAdmin = true;
        adminToken = password;
        adminStatus.textContent = "Admin Mode: ON";
        adminStatus.className = "admin-active";
        adminLoginBtn.textContent = "Logout Admin";
        adminModal.style.display = "none";
        
        // Refresh activities to show admin controls
        fetchActivities();
        
        messageDiv.textContent = "Admin login successful!";
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
      } else {
        messageDiv.textContent = result.detail || "Invalid admin password";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 3000);
    } catch (error) {
      messageDiv.textContent = "Admin login failed. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error during admin login:", error);
    }
  });

  // Toggle admin mode
  adminLoginBtn.addEventListener("click", () => {
    if (isAdmin) {
      // Logout
      isAdmin = false;
      adminToken = null;
      adminStatus.textContent = "Admin Mode: OFF";
      adminStatus.className = "";
      adminLoginBtn.textContent = "Admin Login";
      fetchActivities(); // Refresh to hide admin controls
    } else {
      // Show login modal
      adminModal.style.display = "block";
    }
  });

  // Initialize app
  fetchActivities();
});
