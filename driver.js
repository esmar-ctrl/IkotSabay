/* ==========================================================
   Home page: role check + Tsuper banner
   ========================================================== */
(function () {
  var role = null;
  var jeepNo = null;
  var jeepId = null;

  try {
    role = sessionStorage.getItem("role");
    jeepNo = sessionStorage.getItem("jeepNo");
    jeepId = sessionStorage.getItem("jeepId");
  } catch (e) {
    role = "student";   // storage blocked: just show the student view
  }

  // No role chosen yet: go to the role page
  if (!role) {
    window.location.replace("index.html");
    return;
  }

  // Students see the normal page
  if (role !== "tsuper") return;

  // Tsuper: show the banner
  var bar = document.getElementById("driverBar");
  document.getElementById("driverJeep").textContent = "Jeep " + jeepNo;
  bar.hidden = false;

  // "Yes" button: start the trip
  var startBtn = document.getElementById("startTripBtn");
  var msg = document.getElementById("tripMsg");

  startBtn.addEventListener("click", function () {
    /* TODO (BACKEND): start the trip for this jeep.
       Example:
         fetch("http://localhost:3000/api/trips/start", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ jeepId: jeepId })
         });
       jeepId is "J1", "J2" or "J3". */
    startBtn.disabled = true;
    startBtn.textContent = "Trip started";
    msg.textContent = "Demo only: the back-end isn't connected yet, so the jeep hasn't really started.";
  });

  // Log out: clear the session and go back to the role page
  document.getElementById("logoutBtn").addEventListener("click", function () {
    try { sessionStorage.clear(); } catch (e) {}
    window.location.href = "index.html";
  });
})();
