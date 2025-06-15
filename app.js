// Tourist data sample (Jambi) with lat,lng, rating, category, name
const tourismSpots = [
  {
    id: 1,
    name: "Bukit Tuanku Jambi",
    lat: -1.6175,
    lng: 103.5812,
    rating: 4.6,
    category: "Alam",
  },
  {
    id: 2,
    name: "Kerajaan Melayu Jambi",
    lat: -1.5836,
    lng: 103.5987,
    rating: 4.4,
    category: "Sejarah",
  },
  {
    id: 3,
    name: "Danau Sipin",
    lat: -1.6428,
    lng: 103.618,
    rating: 4.5,
    category: "Alam",
  },
  {
    id: 4,
    name: "Masjid Agung Al Falah",
    lat: -1.6048,
    lng: 103.6084,
    rating: 4.7,
    category: "Tempat Ibadah",
  },
  {
    id: 5,
    name: "Taman Rimba",
    lat: -1.5873,
    lng: 103.6299,
    rating: 4.1,
    category: "Taman",
  },
  {
    id: 6,
    name: "Museum Negeri Jambi",
    lat: -1.6041,
    lng: 103.612,
    rating: 4.3,
    category: "Museum",
  },
  {
    id: 7,
    name: "Danau Sipin Resort",
    lat: -1.644,
    lng: 103.6155,
    rating: 4.2,
    category: "Alam",
  },
  {
    id: 8,
    name: "Pulau Berseri",
    lat: -1.598,
    lng: 103.6201,
    rating: 4.5,
    category: "Alam",
  },
  {
    id: 9,
    name: "Tugu Juang",
    lat: -1.6075,
    lng: 103.601,
    rating: 4.0,
    category: "Sejarah",
  },
  {
    id: 10,
    name: "Jembatan Gentala Arasy",
    lat: -1.6062,
    lng: 103.6042,
    rating: 4.8,
    category: "Monumen",
  },
];

// Haversine distance to measure km between two lat/lng points
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius km
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// KD Tree for 2D points (latitude, longitude)
class KDNode {
  constructor(point, data, left = null, right = null) {
    this.point = point;
    this.data = data;
    this.left = left;
    this.right = right;
  }
}

class KDTree {
  constructor(points) {
    this.root = this.build(points, 0);
  }
  build(points, depth) {
    if (points.length === 0) return null;
    const axis = depth % 2;
    points.sort((a, b) => a.point[axis] - b.point[axis]);
    const median = Math.floor(points.length / 2);
    return new KDNode(
      points[median].point,
      points[median].data,
      this.build(points.slice(0, median), depth + 1),
      this.build(points.slice(median + 1), depth + 1)
    );
  }
  rangeSearch(center, radiusKm) {
    const result = [];
    function search(node, depth = 0) {
      if (!node) return;
      const axis = depth % 2;
      const distToPlaneDeg = center[axis] - node.point[axis];

      // Convert axis degrees to km
      let distToPlaneKm = 0;
      if (axis === 0) {
        distToPlaneKm = Math.abs(distToPlaneDeg) * 111; // latitude approx 111 km/deg
      } else {
        distToPlaneKm =
          Math.abs(distToPlaneDeg) *
          111 *
          Math.cos((center[0] * Math.PI) / 180); // longitude with latitude adjustment
      }

      // Distance between center point and current node point
      const d = haversine(center[0], center[1], node.point[0], node.point[1]);

      if (d <= radiusKm) {
        result.push({ distance: d, data: node.data });
      }

      // Proper subtree pruning with units considered
      if (distToPlaneDeg < 0) {
        // Search left subtree first
        search(node.left, depth + 1);
        // Search right subtree if hypersphere crosses splitting plane
        if (distToPlaneKm <= radiusKm) {
          search(node.right, depth + 1);
        }
      } else {
        // Search right subtree first
        search(node.right, depth + 1);
        // Search left subtree if hypersphere crosses splitting plane
        if (distToPlaneKm <= radiusKm) {
          search(node.left, depth + 1);
        }
      }
    }
    search(this.root);
    return result.sort((a, b) => a.distance - b.distance);
  }
}

// Build kd-tree for tourist spots
const kdPoints = tourismSpots.map((s) => ({ point: [s.lat, s.lng], data: s }));
const kdTree = new KDTree(kdPoints);

const form = document.getElementById("coordinate-form");
const resultsList = document.getElementById("results-list");
const canvas = document.getElementById("location-graph");
const ctx = canvas.getContext("2d");

const canvasSize = 450;
canvas.width = canvasSize;
canvas.height = canvasSize;

// Draw graph base - Cartesian axes with padding
function drawGraph(centerLatLng, points) {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Background
  ctx.fillStyle = "#1e1b2b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padding = 40;
  const graphWidth = canvas.width - padding * 2;
  const graphHeight = canvas.height - padding * 2;

  // Draw axes
  ctx.strokeStyle = "#c4b5fd";
  ctx.lineWidth = 2;
  // X axis
  ctx.beginPath();
  ctx.moveTo(padding, canvas.height / 2);
  ctx.lineTo(canvas.width - padding, canvas.height / 2);
  ctx.stroke();
  // Y axis
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, padding);
  ctx.lineTo(canvas.width / 2, canvas.height - padding);
  ctx.stroke();

  // Draw labels
  ctx.fillStyle = "#b5b3c6";
  ctx.font = "12px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Longitude", canvas.width / 2, canvas.height - padding / 2);
  ctx.save();
  ctx.translate(padding / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Latitude", 0, 0);
  ctx.restore();

  // Map lat/lon to x,y in pixels
  let maxDeltaLat = 0;
  let maxDeltaLng = 0;
  const latToKm = 111;
  const lngToKm = 111 * Math.cos((centerLatLng[0] * Math.PI) / 180);

  points.forEach((p) => {
    maxDeltaLat = Math.max(maxDeltaLat, Math.abs(p.lat - centerLatLng[0]));
    maxDeltaLng = Math.max(maxDeltaLng, Math.abs(p.lng - centerLatLng[1]));
  });

  const maxLatKm = maxDeltaLat * latToKm;
  const maxLngKm = maxDeltaLng * lngToKm;

  const maxRangeKm = Math.max(maxLatKm, maxLngKm, 10);

  function mapX(lng) {
    return (
      canvas.width / 2 +
      ((lng - centerLatLng[1]) * lngToKm * (graphWidth / 2)) / maxRangeKm
    );
  }
  function mapY(lat) {
    return (
      canvas.height / 2 -
      ((lat - centerLatLng[0]) * latToKm * (graphHeight / 2)) / maxRangeKm
    );
  }

  // Draw current location • Anda (red dot)
  ctx.fillStyle = "#ef4444";
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Anda", cx, cy - 12);

  // Draw each tourist spot (purple dots) with labels
  ctx.fillStyle = "#a78bfa";
  ctx.font = "normal 12px Inter, sans-serif";
  ctx.textAlign = "left";
  points.forEach((p) => {
    const x = mapX(p.lng);
    const y = mapY(p.lat);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillText(p.name, x + 8, y + 4);
  });
}

// Render search results list
function renderResults(results) {
  resultsList.innerHTML = "";
  if (results.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Tidak ditemukan wisata dalam radius 10 km.";
    resultsList.appendChild(li);
    return;
  }
  results.forEach((r) => {
    const li = document.createElement("li");
    const data = r.data;

    const titleEl = document.createElement("strong");
    titleEl.textContent = data.name;
    li.appendChild(titleEl);

    const categoryEl = document.createElement("div");
    categoryEl.className = "category";
    categoryEl.textContent = data.category;
    li.appendChild(categoryEl);

    const ratingEl = document.createElement("div");
    ratingEl.className = "rating";

    const starCount = Math.floor(data.rating);
    for (let i = 0; i < starCount; i++) {
      const starIcon = document.createElement("span");
      starIcon.className = "material-icons star";
      starIcon.textContent = "star";
      ratingEl.appendChild(starIcon);
    }
    const ratingText = document.createElement("span");
    ratingText.textContent = `${data.rating.toFixed(1)} / 5`;
    ratingEl.appendChild(ratingText);

    li.appendChild(ratingEl);
    resultsList.appendChild(li);
  });
}

// Form submit handler with console log debug
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const lat = parseFloat(form.latitude.value);
  const lng = parseFloat(form.longitude.value);

  console.log("Latitude input:", form.latitude.value);
  console.log("Longitude input:", form.longitude.value);
  console.log("Parsed lat:", lat, "Parsed lng:", lng);

  if (isNaN(lat) || isNaN(lng)) {
    alert("Masukkan koordinat valid!");
    return;
  }

  const found = kdTree.rangeSearch([lat, lng], 10);
  console.log("Jumlah hasil ditemukan:", found.length);
  console.log("Data hasil:", found);
  console.log("Jumlah wisata ditemukan:", found.length);
  console.log("Wisata ditemukan:", found);

  renderResults(found); // kirim data lengkap
  drawGraph(
    [lat, lng],
    found.map((r) => r.data)
  ); // draw tetap pakai data saja
});

// Initial placeholder render with empty data
renderResults([]);
drawGraph([0, 0], []);
