# ndvi-webapp
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>🌿 NDVI & Soil Moisture Viewer (Pro)</title>
    <style>
      body {
        font-family: sans-serif;
        margin: 0;
        padding: 0;
        text-align: center;
      }
      #map {
        width: 100%;
        height: 80vh;
        margin-top: 10px;
      }
      #controls {
        margin: 20px;
      }
      select, button {
        padding: 10px;
        font-size: 16px;
        margin: 5px;
        cursor: pointer;
      }
    </style>
    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDh9JdQp5xCLsPhB7q7t8U1jLzpXYtbxFg"></script>
    <script>
      function loadEarthEngine(callback) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@google/earthengine@0.1.265/build/ee_api_js.js";
        script.onload = callback;
        script.onerror = () => console.error("❌ Failed to load Earth Engine API.");
        document.head.appendChild(script);
      }
    </script>
  </head>
  <body>
    <h1>🌿 NDVI & Soil Moisture Viewer (Pro)</h1>
    <div id="controls">
      <select id="layer-select">
        <option value="NDVI">NDVI</option>
        <option value="Soil">Soil Moisture</option>
      </select>
      <button onclick="runAnalysis()">Run Analysis</button>
    </div>
    <div id="map"></div>

    <script>
      let map;
      let initialized = false;

      function initMap() {
        map = new google.maps.Map(document.getElementById("map"), {
          center: { lat: 32.25, lng: 50.75 },
          zoom: 10,
          mapTypeId: "satellite",
        });
      }

      function initEarthEngine() {
        if (typeof ee === 'undefined') {
          console.error("❌ Earth Engine API not loaded.");
          return;
        }

        ee.data.authenticateViaOauth(
          "686935018812-926ilgpd8btttcks8v763mc4gar1seb6.apps.googleusercontent.com",
          () => {
            ee.initialize(null, null, () => {
              initialized = true;
              console.log("✅ Earth Engine initialized.");
            }, (err) => console.error("❌ EE init error:", err));
          },
          (e) => console.error("❌ Auth error:", e)
        );
      }

      function runAnalysis() {
        if (!initialized || typeof ee === 'undefined') {
          alert("⚠️ Earth Engine is not initialized yet.");
          return;
        }

        const selectedLayer = document.getElementById("layer-select").value;
        const region = ee.Geometry.Rectangle([50.5, 32.0, 51.0, 32.5]);

        const collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
          .filterBounds(region)
          .filterDate("2023-01-01", "2023-03-01")
          .map(img => img.updateMask(img.select("QA60").not()));

        const composite = collection.median();
        const ndvi = composite.normalizedDifference(["B8", "B4"]).rename("NDVI");

        if (selectedLayer === "NDVI") {
          ndvi.getMap({ min: 0, max: 1, palette: ["white", "green"] }, function(mapId) {
            const overlay = new google.maps.ImageMapType({
              getTileUrl: function(coord, zoom) {
                return `https://earthengine.googleapis.com/map/${mapId.mapid}/${zoom}/${coord.x}/${coord.y}?token=${mapId.token}`;
              },
              tileSize: new google.maps.Size(256, 256),
              name: 'NDVI Layer'
            });
            map.overlayMapTypes.clear();
            map.overlayMapTypes.push(overlay);
          });
        } else if (selectedLayer === "Soil") {
          const str = composite.expression('((1 - r)**2) / (r * 2)', {
            r: composite.select("B12")
          }).rename("STR");

          const soil = composite.addBands(ndvi).addBands(str).expression(
            '(ndvi + str) / 2',
            {
              ndvi: ndvi,
              str: str
            }
          ).rename("Soil");

          soil.getMap({ min: 0, max: 1, palette: ["red", "yellow", "blue"] }, function(mapId) {
            const overlay = new google.maps.ImageMapType({
              getTileUrl: function(coord, zoom) {
                return `https://earthengine.googleapis.com/map/${mapId.mapid}/${zoom}/${coord.x}/${coord.y}?token=${mapId.token}`;
              },
              tileSize: new google.maps.Size(256, 256),
              name: 'Soil Moisture Layer'
            });
            map.overlayMapTypes.clear();
            map.overlayMapTypes.push(overlay);
          });
        }
      }

      window.addEventListener("load", () => {
        initMap();
        loadEarthEngine(initEarthEngine);
      });
    </script>
  </body>
</html>
