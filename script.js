

var CONFIG = {
  USE_BACKEND: false,                       // TODO (BACKEND): set true when API is ready
  API_BASE: "http://localhost:3000/api",    // TODO (BACKEND): your server URL
  REFRESH_MS: 1000,
  BACKEND_POLL_MS: 5000,
  SERVICE_START: "07:00",
  SERVICE_END: "18:00"
};

var STOPS = [
  { id: 1, name: "Magdalo Gate / Rotunda (Gate 1)",  short: "Gate 1 / Rotunda",     minFromPrev: 4 },
  { id: 2, name: "Gregoria De Jesus Hall (CBAA)",    short: "De Jesus Hall (CBAA)", minFromPrev: 3 },
  { id: 3, name: "Maria Salome Llanera Hall (CEAT)", short: "Llanera Hall (CEAT)",  minFromPrev: 3 },
  { id: 3, name: "Food Square(CEAT)", short: "Llanera Hall (CEAT)",  minFromPrev: 3 },
  { id: 4, name: "Ugnayang La Salle",                short: "Ugnayang La Salle",    minFromPrev: 4 },
  { id: 5, name: "Magdiwang Gate (Gate 3)",          short: "Gate 3 (Magdiwang)",   minFromPrev: 3 }
];

/* ---------- Derived route times ---------- */
var cumTimes = [];
var running = 0;
STOPS.forEach(function (s, i) {
  if (i === 0) { cumTimes.push(0); }
  else { running += s.minFromPrev; cumTimes.push(running); }
});
var LOOP_MIN = running + STOPS[0].minFromPrev;

/* ---------- Simulated jeeps ----------
   Spaced evenly around the loop automatically.
   TODO (BACKEND): real jeeps come from GET /jeeps               */
var JEEP_COUNT = 3;
var JEEPS_SIM = [];
for (var n = 0; n < JEEP_COUNT; n++) {
  JEEPS_SIM.push({
    id: "J" + (n + 1),
    label: "Jeep " + (n + 1),
    offsetMin: (LOOP_MIN * n) / JEEP_COUNT
  });
}

var SVG_NS = "http://www.w3.org/2000/svg";
var selectedStopId = STOPS[0].id;
var backendJeeps = null;

function $(id) { return document.getElementById(id); }

/* ---------- Helpers ---------- */
function minutesNow() {
  var d = new Date();
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}
function toMinutes(hhmm) {
  var p = hhmm.split(":");
  return Number(p[0]) * 60 + Number(p[1]);
}
function inServiceHours() {
  var now = minutesNow();
  return now >= toMinutes(CONFIG.SERVICE_START) && now < toMinutes(CONFIG.SERVICE_END);
}
function isActive() {
  return $("demoToggle").checked || inServiceHours();
}
function fmtETA(min) {
  if (min < 0.17) return "Arriving";
  var m = Math.floor(min);
  var s = Math.floor((min - m) * 60);
  return m + ":" + String(s).padStart(2, "0") + " min";
}
function to12h(hhmm) {
  var p = hhmm.split(":");
  var h = Number(p[0]);
  var m = Number(p[1]);
  var ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + ":" + String(m).padStart(2, "0") + " " + ap;
}

/* ---------- Jeep state ---------- */
function getJeepStates() {
  // TODO (BACKEND): expected shape from GET /jeeps:
  // [{ "id":"J1", "label":"Jeep 1", "progressMin": 7.5, "active": true }]
  if (CONFIG.USE_BACKEND && backendJeeps) return backendJeeps;

  var t = minutesNow();
  var active = isActive();
  return JEEPS_SIM.map(function (j) {
    return {
      id: j.id,
      label: j.label,
      progressMin: (t + j.offsetMin) % LOOP_MIN,
      active: active
    };
  });
}

/* TODO (BACKEND): fetch from your server */
function fetchJeepsFromBackend() {
  fetch(CONFIG.API_BASE + "/jeeps")
    .then(function (res) {
      if (!res.ok) throw new Error("Server error " + res.status);
      return res.json();
    })
    .then(function (data) { backendJeeps = data; })
    .catch(function (err) {
      console.warn("Backend unavailable, using simulation:", err);
      backendJeeps = null;
    });
}

/* ---------- ETA calculations ---------- */
function minutesUntilStop(jeep, i) {
  var diff = cumTimes[i] - jeep.progressMin;
  return diff >= 0 ? diff : diff + LOOP_MIN;
}
function nextStopIndex(jeep) {
  for (var i = 0; i < STOPS.length; i++) {
    if (cumTimes[i] > jeep.progressMin) return i;
  }
  return 0;
}
function bestJeepForStop(jeeps, i) {
  var best = null;
  jeeps.filter(function (j) { return j.active; }).forEach(function (j) {
    var eta = minutesUntilStop(j, i);
    if (!best || eta < best.eta) best = { jeep: j, eta: eta };
  });
  return best;
}

/* ---------- Build map ---------- */
function buildMap() {
  var routePath = $("routePath");
  var stopsLayer = $("stopsLayer");
  var jeepsLayer = $("jeepsLayer");
  var totalLen = routePath.getTotalLength();
  var center = { x: 300, y: 200 };

  STOPS.forEach(function (s, i) {
    var pt = routePath.getPointAtLength((cumTimes[i] / LOOP_MIN) * totalLen);

    var g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("data-stop-id", s.id);

    var c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", pt.x);
    c.setAttribute("cy", pt.y);
    c.setAttribute("r", 8);
    c.setAttribute("class", "stop-dot");
    c.addEventListener("click", function () { selectStop(s.id); });

    var dx = pt.x - center.x;
    var dy = pt.y - center.y;
    var horizontal = Math.abs(dx) > Math.abs(dy) * 1.3;
    var t = document.createElementNS(SVG_NS, "text");
    t.setAttribute("class", "stop-label");
    t.textContent = s.short || s.name;
    if (horizontal) {
      t.setAttribute("x", pt.x + (dx > 0 ? 16 : -16));
      t.setAttribute("y", pt.y + 4);
      t.setAttribute("text-anchor", dx > 0 ? "start" : "end");
    } else {
      t.setAttribute("x", pt.x);
      t.setAttribute("y", pt.y + (dy > 0 ? 26 : -16));
      t.setAttribute("text-anchor", "middle");
    }

    g.appendChild(c);
    g.appendChild(t);
    stopsLayer.appendChild(g);
  });

  JEEPS_SIM.forEach(function (j) {
    var g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "jeep");
    g.setAttribute("id", "marker-" + j.id);
    g.innerHTML =
      '<rect class="jeep-body" x="-14" y="-10" width="28" height="20" rx="6"></rect>' +
      '<text class="jeep-text">' + j.id + '</text>';
    jeepsLayer.appendChild(g);
  });
}

function updateMap(jeeps) {
  var routePath = $("routePath");
  var totalLen = routePath.getTotalLength();
  jeeps.forEach(function (j) {
    var m = $("marker-" + j.id);
    if (!m) return;
    var pt = routePath.getPointAtLength((j.progressMin / LOOP_MIN) * totalLen);
    m.setAttribute("transform", "translate(" + pt.x + ", " + pt.y + ")");
    if (j.active) { m.classList.remove("offline"); } else { m.classList.add("offline"); }
    m.style.display = j.active ? "" : "none";
  });
}

/* ---------- UI rendering ---------- */
function populateStopSelect() {
  var sel = $("stopSelect");
  sel.innerHTML = STOPS.map(function (s) {
    return '<option value="' + s.id + '">' + s.name + '</option>';
  }).join("");
  sel.value = selectedStopId;
  sel.addEventListener("change", function (e) { selectStop(Number(e.target.value)); });
}

function selectStop(id) {
  selectedStopId = id;
  $("stopSelect").value = id;
  var dots = document.querySelectorAll("#stopsLayer .stop-dot");
  for (var k = 0; k < dots.length; k++) {
    var sid = Number(dots[k].parentNode.getAttribute("data-stop-id"));
    if (sid === id) { dots[k].classList.add("selected"); }
    else { dots[k].classList.remove("selected"); }
  }
  render();
}

function renderFinder(jeeps) {
  var idx = STOPS.findIndex(function (s) { return s.id === selectedStopId; });
  var best = bestJeepForStop(jeeps, idx);
  if (!best) {
    $("finderResult").innerHTML = '<span class="muted">No jeeps are in service right now.</span>';
    return;
  }
  $("finderResult").innerHTML =
    'Next jeep: <strong>' + best.jeep.label + '</strong> estimate arrival time <strong>' +
    fmtETA(best.eta) + '</strong>';
}

function renderJeepCards(jeeps) {
  $("jeepCards").innerHTML = jeeps.map(function (j) {
    var ni = nextStopIndex(j);
    var next = STOPS[ni];
    var eta = minutesUntilStop(j, ni);
    var pct = (j.progressMin / LOOP_MIN) * 100;
    return '<div class="jeep-card">' +
      '<h4>' + j.label + ' <span class="badge ' + (j.active ? "" : "off") + '">' +
      (j.active ? "In service" : "Off duty") + '</span></h4>' +
      (j.active
        ? '<p>Heading to: <b>' + next.name + '</b></p>' +
          '<p>Arrives in: <b>' + fmtETA(eta) + '</b></p>' +
          '<div class="progress"><div style="width:' + pct + '%"></div></div>'
        : '<p>Not in service.</p>') +
      '</div>';
  }).join("");
}

function renderTimetable(jeeps) {
  $("timetableBody").innerHTML = STOPS.map(function (s, i) {
    var best = bestJeepForStop(jeeps, i);
    return '<tr class="' + (s.id === selectedStopId ? "selected" : "") + '">' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + s.name + '</td>' +
      '<td>' + cumTimes[i] + ' min</td>' +
      '<td class="eta">' + (best ? fmtETA(best.eta) + ' (' + best.jeep.id + ')' : '-') + '</td>' +
      '</tr>';
  }).join("");
}

function render() {
  var jeeps = getJeepStates();
  updateMap(jeeps);
  renderFinder(jeeps);
  renderJeepCards(jeeps);
  renderTimetable(jeeps);
  $("clock").textContent = new Date().toLocaleTimeString();
}

/* ---------- Full-screen map viewer ---------- */
function initLightbox() {
  var box = $("lightbox");
  var thumb = $("mapThumb");
  var closeBtn = $("lightboxClose");

  function openBox() {
    box.classList.add("open");
    box.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }
  function closeBox() {
    box.classList.remove("open");
    box.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }

  thumb.addEventListener("click", openBox);
  closeBtn.addEventListener("click", closeBox);

  // tapping the dark area outside the photo closes it
  box.addEventListener("click", function (e) {
    if (e.target !== $("lightboxImg")) closeBox();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeBox();
  });
}

/* ---------- Init ---------- */
function init() {
  $("year").textContent = new Date().getFullYear();
  $("serviceHours").textContent =
    to12h(CONFIG.SERVICE_START) + " - " + to12h(CONFIG.SERVICE_END) +
    ", Monday to Saturday (sample, update with real schedule)";

  populateStopSelect();
  buildMap();
  selectStop(selectedStopId);
  initLightbox();
  $("demoToggle").addEventListener("change", render);
  setInterval(render, CONFIG.REFRESH_MS);

  // TODO (BACKEND): poll the server for real jeep data
  if (CONFIG.USE_BACKEND) {
    fetchJeepsFromBackend();
    setInterval(fetchJeepsFromBackend, CONFIG.BACKEND_POLL_MS);
  }
}

document.addEventListener("DOMContentLoaded", init);
