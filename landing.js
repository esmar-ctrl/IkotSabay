/* ==========================================================
   Role selection page (Student / Tsuper)
   ========================================================== */

/* Driver codes: each code belongs to one jeep. Change these anytime.
   TODO (BACKEND): codes in front-end JavaScript can be read by anyone
   who views the page source. For real use, send the code to the server
   (e.g. POST /api/driver/login) and let the server check it. */
var DRIVER_CODES = {
  "J1ILS261": { jeepId: "J1", jeepNo: 1 },
  "J2ILS262": { jeepId: "J2", jeepNo: 2 },
  "J2ILS263": { jeepId: "J3", jeepNo: 3 }
};

function $(id) { return document.getElementById(id); }

function saveSession(role, jeep) {
  try {
    sessionStorage.setItem("role", role);
    if (jeep) {
      sessionStorage.setItem("jeepId", jeep.jeepId);
      sessionStorage.setItem("jeepNo", String(jeep.jeepNo));
    } else {
      sessionStorage.removeItem("jeepId");
      sessionStorage.removeItem("jeepNo");
    }
  } catch (e) {
    console.warn("Could not save session:", e);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  $("year").textContent = new Date().getFullYear();

  // Student: go straight to the home page
  $("studentBtn").addEventListener("click", function () {
    saveSession("student", null);
    window.location.href = "home.html";
  });

  // Tsuper: show the code box
  $("tsuperBtn").addEventListener("click", function () {
    $("codePanel").hidden = false;
    $("codeInput").focus();
  });

  // Back button hides the code box
  $("cancelCode").addEventListener("click", function () {
    $("codePanel").hidden = true;
    $("codeInput").value = "";
    $("codeError").textContent = "";
  });

  // Check the code
  $("codeForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var code = $("codeInput").value.trim().toUpperCase();

    // TODO (BACKEND): replace this check with a call to the server
    if (DRIVER_CODES.hasOwnProperty(code)) {
      saveSession("tsuper", DRIVER_CODES[code]);
      window.location.href = "home.html";
    } else {
      $("codeError").textContent = "Wrong code. Please check your code and try again.";
      $("codeInput").select();
    }
  });
});